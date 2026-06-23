-- =====================================================================
-- English Test Platform (v2) — Lược đồ database (Supabase / PostgreSQL)
-- Chạy trong Supabase: SQL Editor → dán file này → Run.
-- Nguyên tắc bảo mật: ĐÁP ÁN không bao giờ ra tới trình duyệt học sinh.
--   - Học sinh (anon) KHÔNG đọc trực tiếp bảng questions.
--   - Lấy đề + chấm điểm qua RPC SECURITY DEFINER (chạy quyền server).
-- =====================================================================

-- ---------- 1. Hồ sơ giáo viên (gắn với Supabase Auth) ----------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'teacher' check (role in ('admin','teacher')),
  created_at  timestamptz not null default now()
);

-- ---------- 2. Chủ đề ----------
create table if not exists topics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  skill       text not null check (skill in ('writing','reading','listening')),
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------- 3. Đề thi (mỗi phiên bản = 1 dòng) ----------
create table if not exists tests (
  id             uuid primary key default gen_random_uuid(),
  topic_id       uuid not null references topics(id) on delete cascade,
  version_label  text not null default 'A',       -- A / B / C ...
  title          text,
  time_limit_min int not null default 40,
  min_words      int not null default 0,           -- chỉ dùng cho writing
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------- 4. Tư liệu: đoạn văn đọc / file nghe ----------
create table if not exists passages (
  id         uuid primary key default gen_random_uuid(),
  test_id    uuid not null references tests(id) on delete cascade,
  kind       text not null check (kind in ('reading','audio')),
  body       text,           -- đoạn văn (reading)
  media_url  text,           -- link R2 (audio/ảnh)
  sort_order int not null default 0
);

-- ---------- 5. Câu hỏi (correct = ĐÁP ÁN, bảo vệ bởi RLS + RPC) ----------
create table if not exists questions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references tests(id) on delete cascade,
  passage_id  uuid references passages(id) on delete set null,
  sort_order  int not null default 0,
  qtype       text not null check (qtype in ('single','multi','tfng','fill')),
  prompt      text not null,
  options     jsonb default '[]'::jsonb,   -- ["A...","B...",...] cho single/multi
  correct     jsonb not null,              -- vd "B" | ["A","C"] | "true" | ["library","the library"]
  points      numeric not null default 1
);

-- ---------- 6. Buổi thi (tùy chọn — tổ chức 1 lần thi) ----------
create table if not exists exam_sessions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  topic_id    uuid references topics(id),
  access_code text,
  open_at     timestamptz,
  close_at    timestamptz,
  settings    jsonb default '{}'::jsonb,   -- {one_submission, show_answers, shuffle...}
  created_at  timestamptz not null default now()
);

-- ---------- 7. Phân đề (HS nào nhận phiên bản nào — xoay vòng) ----------
create table if not exists assignments (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references exam_sessions(id) on delete cascade,
  student_email text not null,
  test_id       uuid not null references tests(id),
  assigned_at   timestamptz not null default now()
);

-- ---------- 8. Bài nộp + điểm ----------
create table if not exists submissions (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid references tests(id),
  session_id    uuid references exam_sessions(id),
  topic_name    text,
  student_name  text,
  student_email text,
  answers       jsonb,            -- {question_id: đáp án HS}
  score         numeric,
  max_score     numeric,
  band          numeric,          -- quy đổi IELTS (nếu có)
  violations    int default 0,
  violation_log text,
  essay         text,             -- bài viết (writing)
  started_at    timestamptz,
  submitted_at  timestamptz not null default now()
);

create index if not exists idx_submissions_email on submissions(student_email);
create index if not exists idx_tests_topic on tests(topic_id);
create index if not exists idx_questions_test on questions(test_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles      enable row level security;
alter table topics        enable row level security;
alter table tests         enable row level security;
alter table passages      enable row level security;
alter table questions     enable row level security;
alter table exam_sessions enable row level security;
alter table assignments   enable row level security;
alter table submissions   enable row level security;

-- Giáo viên đã đăng nhập: toàn quyền trên nội dung
create policy teacher_all_topics   on topics        for all to authenticated using (true) with check (true);
create policy teacher_all_tests    on tests         for all to authenticated using (true) with check (true);
create policy teacher_all_passages on passages      for all to authenticated using (true) with check (true);
create policy teacher_all_questions on questions    for all to authenticated using (true) with check (true);
create policy teacher_all_sessions on exam_sessions for all to authenticated using (true) with check (true);
create policy teacher_all_assign   on assignments   for all to authenticated using (true) with check (true);
create policy teacher_read_subs    on submissions   for select to authenticated using (true);
create policy own_profile          on profiles      for select to authenticated using (id = auth.uid());

-- HS (anon): KHÔNG có policy đọc questions/correct -> chặn đọc trực tiếp.
-- Mọi thao tác của HS đi qua RPC bên dưới (SECURITY DEFINER).

-- =====================================================================
-- RPC cho học sinh (chạy quyền server, giấu đáp án)
-- =====================================================================

-- Lấy đề (đã loại cột correct). Phase 2 sẽ bổ sung xáo trộn + phân phiên bản xoay vòng.
create or replace function rpc_get_test(p_test_id uuid)
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'test', (select to_jsonb(t) from tests t where t.id = p_test_id),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order),'[]')
                 from passages p where p.test_id = p_test_id),
    'questions', (select coalesce(jsonb_agg(
                    jsonb_build_object('id',q.id,'passage_id',q.passage_id,'sort_order',q.sort_order,
                                       'qtype',q.qtype,'prompt',q.prompt,'options',q.options) -- KHÔNG có correct
                    order by q.sort_order),'[]')
                  from questions q where q.test_id = p_test_id)
  );
$$;

-- Chấm điểm ở server + lưu submission. Logic so khớp chi tiết hoàn thiện ở Phase 2.
create or replace function rpc_submit(
  p_test_id uuid, p_name text, p_email text, p_answers jsonb,
  p_violations int, p_log text, p_started_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_score numeric := 0; v_max numeric := 0; v_id uuid;
  -- TODO Phase 2: lặp qua questions, so p_answers với correct theo qtype
  --   (single/tfng: bằng nhau; multi: tập hợp; fill: chuẩn hóa hoa-thường + nhiều đáp án).
begin
  insert into submissions(test_id, student_name, student_email, answers, score, max_score,
                          violations, violation_log, started_at)
  values (p_test_id, p_name, p_email, p_answers, v_score, v_max, p_violations, p_log, p_started_at)
  returning id into v_id;
  return jsonb_build_object('submission_id', v_id, 'score', v_score, 'max_score', v_max);
end;
$$;

-- Cho phép anon gọi 2 RPC trên
grant execute on function rpc_get_test(uuid) to anon, authenticated;
grant execute on function rpc_submit(uuid, text, text, jsonb, int, text, timestamptz) to anon, authenticated;
