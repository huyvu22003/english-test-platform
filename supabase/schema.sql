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
  options     jsonb default '[]'::jsonb,   -- ["Paris","London",...] cho single/multi
  -- QUY ƯỚC ĐÁP ÁN (để an toàn khi XÁO TRỘN đáp án): correct lưu theo GIÁ TRỊ, KHÔNG theo chữ cái/chỉ số.
  --   single : "Paris"                       (đúng = đúng 1 lựa chọn)
  --   multi  : ["Paris","Hà Nội"]            (đúng = đúng đủ tập lựa chọn, không thừa thiếu)
  --   tfng   : "true" | "false" | "notgiven" (chuẩn hóa true/yes, false/no, notgiven/ng)
  --   fill   : ["library","the library"]     (đúng = khớp 1 trong các đáp án; chuẩn hóa hoa-thường, khoảng trắng)
  correct     jsonb not null,
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
-- GV chấm tay bài Viết / gán band / sửa & xóa bài nộp:
create policy teacher_update_subs  on submissions   for update to authenticated using (true) with check (true);
create policy teacher_delete_subs  on submissions   for delete to authenticated using (true);
create policy own_profile          on profiles      for select to authenticated using (id = auth.uid());

-- HS (anon): KHÔNG có policy đọc questions/correct -> chặn đọc trực tiếp.
-- Mọi thao tác của HS đi qua RPC bên dưới (SECURITY DEFINER).

-- =====================================================================
-- HÀM TIỆN ÍCH (chuẩn hóa + quy đổi band)
-- =====================================================================

-- Chuẩn hóa chuỗi để so khớp đáp án: bỏ khoảng trắng thừa + về chữ thường.
create or replace function etp_norm(p text)
returns text language sql immutable as $$
  select lower(btrim(regexp_replace(coalesce(p,''), '\s+', ' ', 'g')));
$$;

-- Quy đổi % đúng -> band IELTS (xấp xỉ, theo bảng Academic Reading/Listening phổ bi).
-- Chỉ áp dụng cho reading/listening; writing chấm tay nên trả NULL.
create or replace function etp_band(p_skill text, p_percent numeric)
returns numeric language sql immutable as $$
  select case
    when p_skill = 'writing' then null
    when p_percent is null then null
    when p_percent >= 97 then 9.0
    when p_percent >= 93 then 8.5
    when p_percent >= 88 then 8.0
    when p_percent >= 83 then 7.5
    when p_percent >= 75 then 7.0
    when p_percent >= 65 then 6.5
    when p_percent >= 58 then 6.0
    when p_percent >= 50 then 5.5
    when p_percent >= 40 then 5.0
    when p_percent >= 33 then 4.5
    when p_percent >= 25 then 4.0
    else 3.5
  end;
$$;

-- =====================================================================
-- RPC cho học sinh (chạy quyền server, giấu đáp án)
-- =====================================================================

-- Liệt kê đề đang mở cho học sinh (anon KHÔNG đọc trực tiếp được topics/tests vì RLS).
-- Chỉ trả thông tin an toàn (tên chủ đề, kỹ năng, tiêu đề đề, thời gian) — KHÔNG có câu hỏi/đáp án.
create or replace function rpc_list_exams()
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id,
           'topic_name', tp.name,
           'skill', tp.skill,
           'tests', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', t.id, 'version_label', t.version_label, 'title', t.title,
                        'time_limit_min', t.time_limit_min, 'min_words', t.min_words
                     ) order by t.version_label), '[]')
                     from tests t where t.topic_id = tp.id and t.active)
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active);
$$;

-- Lấy đề để làm bài: loại cột correct (đáp án), kèm thông tin chủ đề (skill),
-- và XÁO TRỘN thứ tự câu hỏi + thứ tự đáp án (chống nhìn bài). Đáp án so theo GIÁ TRỊ nên xáo vẫn chấm đúng.
create or replace function rpc_get_test(p_test_id uuid)
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'test', (select to_jsonb(t) from tests t where t.id = p_test_id and t.active),
    'topic', (select jsonb_build_object('name', tp.name, 'skill', tp.skill)
              from tests t join topics tp on tp.id = t.topic_id where t.id = p_test_id),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order),'[]')
                 from passages p where p.test_id = p_test_id),
    'questions', (select coalesce(jsonb_agg(
                    jsonb_build_object(
                      'id', q.id, 'passage_id', q.passage_id, 'qtype', q.qtype,
                      'prompt', q.prompt, 'points', q.points,
                      -- xáo trộn đáp án (chỉ với single/multi có options)
                      'options', (select coalesce(jsonb_agg(o order by random()), '[]'::jsonb)
                                  from jsonb_array_elements(q.options) o)
                    ) order by random()), '[]')   -- KHÔNG có correct; câu hỏi xáo ngẫu nhiên
                  from questions q where q.test_id = p_test_id)
  );
$$;

-- Chấm điểm Ở SERVER + lưu bài nộp. So khớp theo qtype, đáp án chuẩn hóa (etp_norm).
--   single/tfng: khớp đúng 1 giá trị · multi: trùng tập hợp · fill: khớp 1 trong nhiều đáp án.
-- Bài Viết (skill=writing): không có câu trắc nghiệm -> score/max=0, lưu essay để GV chấm tay.
create or replace function rpc_submit(
  p_test_id uuid, p_name text, p_email text, p_answers jsonb,
  p_violations int, p_log text, p_started_at timestamptz, p_essay text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_score numeric := 0; v_max numeric := 0; v_id uuid;
  v_skill text; v_topic_name text; v_band numeric; v_percent numeric;
  q record; v_ans jsonb; v_ok boolean;
  v_correct_set text[]; v_ans_set text[];
begin
  select tp.skill, tp.name into v_skill, v_topic_name
  from tests t join topics tp on tp.id = t.topic_id where t.id = p_test_id;

  -- Duyệt từng câu hỏi (đọc trực tiếp questions.correct — an toàn vì chạy quyền definer).
  for q in select id, qtype, correct, points from questions where test_id = p_test_id loop
    v_max := v_max + coalesce(q.points, 0);
    v_ans := p_answers -> (q.id::text);   -- đáp án HS theo question id
    v_ok := false;

    if v_ans is not null then
      if q.qtype in ('single','tfng') then
        -- so 1 giá trị (đáp án có thể lưu dạng "X" hoặc ["X"]).
        v_ok := etp_norm(
                  case when jsonb_typeof(v_ans) = 'array' then v_ans->>0 else v_ans #>> '{}' end
                ) = etp_norm(
                  case when jsonb_typeof(q.correct) = 'array' then q.correct->>0 else q.correct #>> '{}' end
                );
      elsif q.qtype = 'fill' then
        -- khớp 1 trong các đáp án chấp nhận (correct là mảng, hoặc 1 chuỗi).
        if jsonb_typeof(q.correct) = 'array' then
          select exists(
            select 1 from jsonb_array_elements_text(q.correct) c
            where etp_norm(c) = etp_norm(case when jsonb_typeof(v_ans)='array' then v_ans->>0 else v_ans #>> '{}' end)
          ) into v_ok;
        else
          v_ok := etp_norm(q.correct #>> '{}') = etp_norm(case when jsonb_typeof(v_ans)='array' then v_ans->>0 else v_ans #>> '{}' end);
        end if;
      elsif q.qtype = 'multi' then
        -- trùng tập hợp (không thừa, không thiếu), chuẩn hóa + sắp xếp.
        if jsonb_typeof(q.correct) = 'array' and jsonb_typeof(v_ans) = 'array' then
          select array_agg(distinct etp_norm(c) order by etp_norm(c))
            into v_correct_set from jsonb_array_elements_text(q.correct) c;
          select array_agg(distinct etp_norm(a) order by etp_norm(a))
            into v_ans_set from jsonb_array_elements_text(v_ans) a;
          v_ok := v_correct_set = v_ans_set;
        end if;
      end if;
    end if;

    if v_ok then v_score := v_score + coalesce(q.points, 0); end if;
  end loop;

  v_percent := case when v_max > 0 then round(v_score * 100.0 / v_max, 1) else null end;
  v_band := etp_band(v_skill, v_percent);

  insert into submissions(test_id, topic_name, student_name, student_email, answers, essay,
                          score, max_score, band, violations, violation_log, started_at)
  values (p_test_id, v_topic_name, p_name, p_email, p_answers, p_essay,
          v_score, v_max, v_band, coalesce(p_violations,0), p_log, p_started_at)
  returning id into v_id;

  return jsonb_build_object('submission_id', v_id, 'score', v_score,
                            'max_score', v_max, 'percent', v_percent, 'band', v_band);
end;
$$;

-- Cho phép anon gọi các RPC học sinh (KHÔNG cấp quyền đọc bảng questions cho anon).
grant execute on function rpc_list_exams() to anon, authenticated;
grant execute on function rpc_get_test(uuid) to anon, authenticated;
grant execute on function rpc_submit(uuid, text, text, jsonb, int, text, timestamptz, text) to anon, authenticated;


-- =====================================================================
-- PHASE A+B — Hệ đánh giá năng lực (CEFR) + Roster + Writing chấm tay
--   Mở rộng thêm, KHÔNG phá phần trên. Xem docs/VISION.md.
-- =====================================================================

-- ---------- Bảng quy đổi trình độ: CEFR <-> IELTS band <-> tên lớp nội bộ ----------
create table if not exists levels (
  cefr          text primary key check (cefr in ('A1','A2','B1','B2','C1','C2')),
  ielts_band    numeric,        -- band IELTS tham chiếu
  internal_name text,           -- tên lớp/cấp nội bộ của trung tâm
  sort_order    int not null default 0
);
insert into levels(cefr, ielts_band, internal_name, sort_order) values
  ('A1', 3.0, 'Beginner', 1),
  ('A2', 4.0, 'Elementary', 2),
  ('B1', 5.0, 'Pre-Intermediate', 3),
  ('B2', 6.0, 'Intermediate', 4),
  ('C1', 7.0, 'Upper-Intermediate', 5),
  ('C2', 8.0, 'Advanced', 6)
on conflict (cefr) do nothing;

-- ---------- Lớp/khóa + Roster học viên (để theo dõi tiến bộ theo thời gian) ----------
create table if not exists classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  code       text unique,        -- mã học viên (tùy chọn)
  full_name  text not null,
  email      text,
  class_id   uuid references classes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_students_email on students(email);

-- ---------- tests: thêm đề bài (prompt) + mục đích bài ----------
alter table tests add column if not exists prompt  text;   -- đề bài Task 2 (writing)
alter table tests add column if not exists purpose text not null default 'progress'
  check (purpose in ('placement','progress','exit'));

-- ---------- submissions: liên kết học viên + chấm tay 4 tiêu chí IELTS + trạng thái ----------
alter table submissions add column if not exists student_id   uuid references students(id) on delete set null;
alter table submissions add column if not exists status       text not null default 'submitted'
  check (status in ('submitted','graded'));
alter table submissions add column if not exists score_tr     numeric;  -- Task Response
alter table submissions add column if not exists score_cc     numeric;  -- Coherence & Cohesion
alter table submissions add column if not exists score_lr     numeric;  -- Lexical Resource
alter table submissions add column if not exists score_gra    numeric;  -- Grammatical Range & Accuracy
alter table submissions add column if not exists overall_band numeric;  -- band tổng (trung bình 4 tiêu chí)
alter table submissions add column if not exists cefr         text;     -- quy đổi từ band
alter table submissions add column if not exists feedback     text;     -- nhận xét của GV
alter table submissions add column if not exists graded_by    uuid references profiles(id);
alter table submissions add column if not exists graded_at    timestamptz;

-- Quy đổi band -> CEFR (dùng cho cả writing chấm tay lẫn báo cáo tiến bộ).
create or replace function etp_band_to_cefr(p_band numeric)
returns text language sql immutable as $$
  select case
    when p_band is null then null
    when p_band >= 8.0 then 'C2'
    when p_band >= 7.0 then 'C1'
    when p_band >= 6.0 then 'B2'
    when p_band >= 5.0 then 'B1'
    when p_band >= 4.0 then 'A2'
    else 'A1'
  end;
$$;

-- RLS cho bảng mới
alter table levels   enable row level security;
alter table classes  enable row level security;
alter table students enable row level security;
-- levels là dữ liệu tham chiếu công khai (không nhạy cảm)
create policy read_levels        on levels   for select to anon, authenticated using (true);
-- lớp + roster: chỉ giáo viên (authenticated). Học sinh được tạo qua RPC definer bên dưới.
create policy teacher_all_classes  on classes  for all to authenticated using (true) with check (true);
create policy teacher_all_students on students for all to authenticated using (true) with check (true);

-- =====================================================================
-- RPC Writing cho học sinh (anon) — chấm TAY nên không có đáp án để giấu,
-- nhưng vẫn qua RPC để: liệt kê chủ đề mở, bốc đề ngẫu nhiên, gắn hồ sơ học viên.
-- =====================================================================

-- Danh sách chủ đề Writing đang mở (có ít nhất 1 đề active).
create or replace function rpc_list_writing_topics()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id, 'topic_name', tp.name,
           'num_prompts', (select count(*) from tests t where t.topic_id = tp.id and t.active)
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active and tp.skill = 'writing'
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active);
$$;

-- Bốc NGẪU NHIÊN 1 đề (prompt) trong 1 chủ đề.
create or replace function rpc_pick_prompt(p_topic_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select to_jsonb(x) from (
    select t.id as test_id, t.prompt, t.title, t.time_limit_min, t.min_words,
           tp.name as topic_name
    from tests t join topics tp on tp.id = t.topic_id
    where t.topic_id = p_topic_id and t.active
    order by random() limit 1
  ) x;
$$;

-- Nộp bài Viết: upsert hồ sơ học viên theo email, lưu bài (status='submitted', chờ GV chấm).
create or replace function rpc_submit_writing(
  p_test_id uuid, p_name text, p_email text, p_essay text,
  p_violations int, p_log text, p_started_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_student uuid; v_topic text;
begin
  -- nối hồ sơ học viên (tạo nếu chưa có) để theo dõi tiến bộ
  if p_email is not null and length(btrim(p_email)) > 0 then
    select id into v_student from students where lower(email) = lower(btrim(p_email)) limit 1;
    if v_student is null then
      insert into students(full_name, email) values (p_name, btrim(p_email)) returning id into v_student;
    end if;
  end if;

  select tp.name into v_topic from tests t join topics tp on tp.id = t.topic_id where t.id = p_test_id;

  insert into submissions(test_id, topic_name, student_id, student_name, student_email, essay,
                          violations, violation_log, started_at, status)
  values (p_test_id, v_topic, v_student, p_name, p_email, p_essay,
          coalesce(p_violations,0), p_log, p_started_at, 'submitted')
  returning id into v_id;

  return jsonb_build_object('submission_id', v_id);
end;
$$;

-- Tiến bộ của 1 học viên: dò bằng email / họ tên / mã học sinh.
drop function if exists rpc_get_progress(text);
create or replace function rpc_get_progress(p_email text default null, p_name text default null, p_code text default null)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id,
           'submitted_at', s.submitted_at,
           'skill', coalesce(tp.skill, 'writing'),
           'student_name', coalesce(st.full_name, s.student_name),
           'student_code', st.code,
           'topic_name', coalesce(s.topic_name, tp.name),
           'test_title', t.title,
           'prompt', t.prompt,
           'essay', s.essay,
           'feedback', s.feedback,
           'score', s.score,
           'max_score', s.max_score,
           'band', s.band,
           'overall_band', coalesce(s.overall_band, s.band),
           'cefr', coalesce(s.cefr, etp_band_to_cefr(coalesce(s.overall_band, s.band))),
           'status', s.status,
           'score_tr', s.score_tr,
           'score_cc', s.score_cc,
           'score_lr', s.score_lr,
           'score_gra', s.score_gra
         ) order by s.submitted_at), '[]')
  from submissions s
  left join tests t on t.id = s.test_id
  left join topics tp on tp.id = t.topic_id
  left join lateral (
    select st.* from students st
    where st.id = s.student_id or lower(st.email) = lower(s.student_email)
    order by case when st.id = s.student_id then 0 else 1 end
    limit 1
  ) st on true
  where (coalesce(btrim(p_email), '') <> '' or coalesce(btrim(p_name), '') <> '' or coalesce(btrim(p_code), '') <> '')
    and (coalesce(btrim(p_email), '') = '' or lower(s.student_email) = lower(btrim(p_email)))
    and (coalesce(btrim(p_name), '') = '' or lower(coalesce(st.full_name, s.student_name)) = lower(btrim(p_name)))
    and (coalesce(btrim(p_code), '') = '' or lower(st.code) = lower(btrim(p_code)));
$$;

grant execute on function rpc_list_writing_topics() to anon, authenticated;
grant execute on function rpc_pick_prompt(uuid) to anon, authenticated;
grant execute on function rpc_submit_writing(uuid, text, text, text, int, text, timestamptz) to anon, authenticated;
grant execute on function rpc_get_progress(text) to anon, authenticated;


-- =====================================================================
-- PHASE C — Đăng nhập học viên bằng MÃ + chẩn đoán
-- =====================================================================

-- Học sinh nhập MÃ học viên để nhận diện (anon không đọc trực tiếp bảng students).
-- Trả hồ sơ tối thiểu để điền sẵn tên/email rồi vào làm bài.
create or replace function rpc_student_by_code(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select to_jsonb(x) from (
    select s.id, s.full_name, s.email, c.name as class_name
    from students s left join classes c on c.id = s.class_id
    where lower(s.code) = lower(btrim(p_code))
    limit 1
  ) x;
$$;

grant execute on function rpc_student_by_code(text) to anon, authenticated;


-- =====================================================================
-- PHASE D — Placement tự chấm ra CEFR (engine "threshold")
--   Đề placement = 1 test (purpose='placement') gồm câu hỏi gắn cefr_level.
--   Chấm: với mỗi mức, tính tỉ lệ đúng; "đạt mức" nếu >= pass_threshold.
--   Kết quả CEFR = mức cao nhất ĐẠT LIÊN TIẾP (gặp mức trượt đầu tiên thì dừng).
-- =====================================================================

-- Use of English là 1 "kỹ năng" placement -> mở rộng enum skill.
do $$ begin
  alter table topics drop constraint if exists topics_skill_check;
  alter table topics add constraint topics_skill_check
    check (skill in ('writing','reading','listening','use_of_english'));
exception when others then null; end $$;

alter table questions add column if not exists cefr_level text
  check (cefr_level in ('A1','A2','B1','B2','C1','C2'));
alter table tests add column if not exists pass_threshold numeric not null default 0.6;
alter table submissions add column if not exists result_detail jsonb;  -- thống kê theo mức

-- Hàm so khớp 1 câu (tách dùng lại) — cùng logic với rpc_submit.
create or replace function etp_is_correct(p_qtype text, p_correct jsonb, p_ans jsonb)
returns boolean language plpgsql immutable as $$
declare v_cs text[]; v_as text[]; v_a text;
begin
  if p_ans is null then return false; end if;
  v_a := case when jsonb_typeof(p_ans) = 'array' then p_ans->>0 else p_ans #>> '{}' end;
  if p_qtype in ('single','tfng') then
    return etp_norm(v_a) = etp_norm(
      case when jsonb_typeof(p_correct) = 'array' then p_correct->>0 else p_correct #>> '{}' end);
  elsif p_qtype = 'fill' then
    if jsonb_typeof(p_correct) = 'array' then
      return exists(select 1 from jsonb_array_elements_text(p_correct) c where etp_norm(c) = etp_norm(v_a));
    else
      return etp_norm(p_correct #>> '{}') = etp_norm(v_a);
    end if;
  elsif p_qtype = 'multi' then
    if jsonb_typeof(p_correct) = 'array' and jsonb_typeof(p_ans) = 'array' then
      select array_agg(distinct etp_norm(c) order by etp_norm(c)) into v_cs from jsonb_array_elements_text(p_correct) c;
      select array_agg(distinct etp_norm(a) order by etp_norm(a)) into v_as from jsonb_array_elements_text(p_ans) a;
      return v_cs = v_as;
    end if;
  end if;
  return false;
end;
$$;

-- Liệt kê đề placement đang mở (cho học sinh).
create or replace function rpc_list_placements()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'test_id', t.id, 'title', coalesce(t.title, tp.name),
           'skill', tp.skill, 'time_limit_min', t.time_limit_min,
           'num_q', (select count(*) from questions q where q.test_id = t.id)
         ) order by tp.sort_order, t.version_label), '[]')
  from tests t join topics tp on tp.id = t.topic_id
  where t.active and t.purpose = 'placement'
    and exists (select 1 from questions q where q.test_id = t.id);
$$;

-- Nộp + chấm placement: ra CEFR theo ngưỡng từng mức + lưu thống kê chi tiết.
create or replace function rpc_submit_placement(
  p_test_id uuid, p_name text, p_email text, p_answers jsonb,
  p_violations int, p_log text, p_started_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_levels text[] := array['A1','A2','B1','B2','C1','C2'];
  v_lvl text; v_total int; v_correct int; v_pass boolean;
  v_result text := null; v_stop boolean := false;
  v_detail jsonb := '[]'::jsonb; v_threshold numeric;
  v_student uuid; v_topic text; v_id uuid; q record;
begin
  select coalesce(pass_threshold, 0.6) into v_threshold from tests where id = p_test_id;
  select tp.name into v_topic from tests t join topics tp on tp.id = t.topic_id where t.id = p_test_id;

  foreach v_lvl in array v_levels loop
    v_total := 0; v_correct := 0;
    for q in select id, qtype, correct from questions where test_id = p_test_id and cefr_level = v_lvl loop
      v_total := v_total + 1;
      if etp_is_correct(q.qtype, q.correct, p_answers -> (q.id::text)) then
        v_correct := v_correct + 1;
      end if;
    end loop;
    if v_total > 0 then
      v_pass := (v_correct::numeric / v_total) >= v_threshold;
      v_detail := v_detail || jsonb_build_object('cefr', v_lvl, 'total', v_total, 'correct', v_correct, 'passed', v_pass);
      if not v_stop then
        if v_pass then v_result := v_lvl; else v_stop := true; end if;
      end if;
    end if;
  end loop;

  -- nối hồ sơ học viên theo email (như writing)
  if p_email is not null and length(btrim(p_email)) > 0 then
    select id into v_student from students where lower(email) = lower(btrim(p_email)) limit 1;
    if v_student is null then
      insert into students(full_name, email) values (p_name, btrim(p_email)) returning id into v_student;
    end if;
  end if;

  insert into submissions(test_id, topic_name, student_id, student_name, student_email,
                          answers, cefr, result_detail, status, violations, violation_log, started_at)
  values (p_test_id, v_topic, v_student, p_name, p_email,
          p_answers, v_result, v_detail, 'graded', coalesce(p_violations,0), p_log, p_started_at)
  returning id into v_id;

  return jsonb_build_object('submission_id', v_id, 'cefr', v_result, 'detail', v_detail);
end;
$$;

grant execute on function rpc_list_placements() to anon, authenticated;
grant execute on function rpc_submit_placement(uuid, text, text, jsonb, int, text, timestamptz) to anon, authenticated;


-- =====================================================================
-- PHASE F — Buổi thi (exit/mock) + MÃ THI + một lần nộp + chống gian lận siết
--   Tái dùng bảng exam_sessions; học sinh vào bằng access_code, làm 1 đề cố định.
-- =====================================================================

alter table exam_sessions add column if not exists test_id uuid references tests(id);
alter table exam_sessions add column if not exists one_submission boolean not null default true;
alter table exam_sessions add column if not exists max_violations int not null default 0;   -- 0 = không tự nộp
alter table exam_sessions add column if not exists show_result boolean not null default false;

-- Tra buổi thi theo MÃ THI (anon). Kiểm tra cửa sổ thời gian; trả thông tin để vào làm.
create or replace function rpc_session_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s exam_sessions; v_skill text;
begin
  select * into s from exam_sessions where lower(access_code) = lower(btrim(p_code)) limit 1;
  if not found then return null; end if;
  if s.test_id is null then return jsonb_build_object('status','no_test'); end if;
  if s.open_at is not null and now() < s.open_at then
    return jsonb_build_object('status','not_open','open_at',s.open_at);
  end if;
  if s.close_at is not null and now() > s.close_at then
    return jsonb_build_object('status','closed','close_at',s.close_at);
  end if;
  select tp.skill into v_skill from tests t join topics tp on tp.id = t.topic_id where t.id = s.test_id;
  return jsonb_build_object(
    'status','open','session_id',s.id,'name',s.name,'test_id',s.test_id,'skill',v_skill,
    'one_submission',s.one_submission,'max_violations',s.max_violations);
end;
$$;

-- Nộp bài trong buổi thi: kiểm tra cửa sổ + một-lần-nộp; chấm theo kỹ năng
--   (writing → chấm tay; còn lại → tự chấm MCQ + band). Lưu kèm session_id.
create or replace function rpc_submit_session(
  p_session_id uuid, p_name text, p_email text, p_answers jsonb, p_essay text,
  p_violations int, p_log text, p_started_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s exam_sessions; v_skill text; v_topic text; v_student uuid; v_id uuid;
  v_score numeric := 0; v_max numeric := 0; v_band numeric; v_percent numeric;
  v_status text; q record;
begin
  select * into s from exam_sessions where id = p_session_id;
  if not found then raise exception 'Buổi thi không tồn tại'; end if;
  if s.open_at is not null and now() < s.open_at then raise exception 'Buổi thi chưa mở'; end if;
  if s.close_at is not null and now() > s.close_at then raise exception 'Buổi thi đã đóng'; end if;
  if s.one_submission and exists(
       select 1 from submissions where session_id = p_session_id
       and lower(student_email) = lower(btrim(p_email))) then
    raise exception 'Bạn đã nộp bài cho buổi thi này rồi';
  end if;

  select tp.skill, tp.name into v_skill, v_topic
  from tests t join topics tp on tp.id = t.topic_id where t.id = s.test_id;

  if p_email is not null and length(btrim(p_email)) > 0 then
    select id into v_student from students where lower(email) = lower(btrim(p_email)) limit 1;
    if v_student is null then
      insert into students(full_name, email) values (p_name, btrim(p_email)) returning id into v_student;
    end if;
  end if;

  if v_skill = 'writing' then
    v_status := 'submitted';   -- giáo viên chấm tay
  else
    for q in select id, qtype, correct, points from questions where test_id = s.test_id loop
      v_max := v_max + coalesce(q.points, 0);
      if etp_is_correct(q.qtype, q.correct, p_answers -> (q.id::text)) then
        v_score := v_score + coalesce(q.points, 0);
      end if;
    end loop;
    v_percent := case when v_max > 0 then round(v_score * 100.0 / v_max, 1) else null end;
    v_band := etp_band(v_skill, v_percent);
    v_status := 'graded';
  end if;

  insert into submissions(test_id, session_id, topic_name, student_id, student_name, student_email,
                          answers, essay, score, max_score, band, status,
                          violations, violation_log, started_at)
  values (s.test_id, p_session_id, v_topic, v_student, p_name, p_email,
          case when v_skill = 'writing' then null else p_answers end,
          case when v_skill = 'writing' then p_essay else null end,
          case when v_skill = 'writing' then null else v_score end,
          case when v_skill = 'writing' then null else v_max end,
          case when v_skill = 'writing' then null else v_band end,
          v_status, coalesce(p_violations,0), p_log, p_started_at)
  returning id into v_id;

  return jsonb_build_object(
    'submission_id', v_id, 'skill', v_skill, 'status', v_status, 'show_result', s.show_result,
    'score', case when s.show_result and v_skill <> 'writing' then v_score end,
    'max_score', case when s.show_result and v_skill <> 'writing' then v_max end,
    'band', case when s.show_result and v_skill <> 'writing' then v_band end);
end;
$$;

grant execute on function rpc_session_by_code(text) to anon, authenticated;
grant execute on function rpc_submit_session(uuid, text, text, jsonb, text, int, text, timestamptz) to anon, authenticated;
