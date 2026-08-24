-- =====================================================================
-- WRITING AI DRAFT — Bot OpenClaw chấm nháp Writing, GIÁO VIÊN duyệt mới graded.
-- Mô hình giống Speaking: bot poll bài → chấm → POST draft → app lưu 'suggested'.
-- KHÔNG tự set graded. Repo không chứa AI key/bot token; chỉ 1 secret nội bộ.
-- =====================================================================

-- 1. Cột lưu bản nháp AI (ai_error đã có từ speaking-phase2).
alter table submissions add column if not exists ai_status text;        -- null/none, pending, suggested, error
alter table submissions add column if not exists ai_draft jsonb;        -- {score_tr,cc,lr,gra,feedback,corrections}
alter table submissions add column if not exists ai_draft_at timestamptz;

-- 2. RPC: bot POLL bài Writing cần AI gợi ý, đồng thời "khóa" (đặt pending) để
--    tránh 2 lần poll cùng nhặt 1 bài. Cho retry sau 10' nếu pending treo.
create or replace function rpc_list_writing_tasks(p_limit int default 5)
returns jsonb language sql security definer set search_path = public as $$
  with eligible as (
    select s.id
    from submissions s
    join tests t on t.id = s.test_id
    join topics tp on tp.id = t.topic_id
    where tp.skill = 'writing'
      and s.essay is not null and length(btrim(s.essay)) > 0
      and s.status <> 'graded'
      and (
        s.ai_status is null
        or s.ai_status = 'error'
        or (s.ai_status = 'pending' and (s.ai_draft_at is null or s.ai_draft_at < now() - interval '10 minutes'))
      )
    order by s.submitted_at
    limit greatest(1, least(p_limit, 20))
  ),
  locked as (
    update submissions s set ai_status = 'pending', ai_draft_at = now()
    from eligible e where s.id = e.id
    returning s.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id,
           'prompt', t.prompt,
           'title', t.title,
           'topic_name', coalesce(s.topic_name, tp.name),
           'essay', s.essay,
           'submitted_at', s.submitted_at
         ) order by s.submitted_at), '[]')
  from submissions s
  join locked l on l.id = s.id
  left join tests t on t.id = s.test_id
  left join topics tp on tp.id = t.topic_id;
$$;

-- 3. RPC: bot ghi bản nháp (KHÔNG graded). Idempotent: đã graded thì bỏ qua,
--    còn lại update đè (không tạo bản trùng). Validate 0–9 bước 0.5.
create or replace function rpc_save_writing_ai_draft(
  p_submission_id uuid,
  p_score_tr numeric, p_score_cc numeric, p_score_lr numeric, p_score_gra numeric,
  p_feedback text default null, p_corrections jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select status into v_status from submissions where id = p_submission_id;
  if not found then
    raise exception 'Không tìm thấy bài nộp %', p_submission_id;
  end if;
  if v_status = 'graded' then
    return jsonb_build_object('submission_id', p_submission_id, 'skipped', true, 'reason', 'already_graded');
  end if;
  if not (etp_is_valid_band(p_score_tr) and etp_is_valid_band(p_score_cc)
      and etp_is_valid_band(p_score_lr) and etp_is_valid_band(p_score_gra)) then
    raise exception 'Điểm phải nằm trong thang 0–9 theo bước 0.5.';
  end if;

  update submissions set
    ai_draft = jsonb_build_object(
      'score_tr', p_score_tr, 'score_cc', p_score_cc,
      'score_lr', p_score_lr, 'score_gra', p_score_gra,
      'feedback', p_feedback,
      'corrections', coalesce(p_corrections, '[]'::jsonb)
    ),
    ai_draft_at = now(),
    ai_status = 'suggested',
    ai_error = null
  where id = p_submission_id;

  return jsonb_build_object('submission_id', p_submission_id, 'ai_status', 'suggested');
end;
$$;

-- 4. RPC: bot báo lỗi chấm — giữ bài để GV chấm tay / retry.
create or replace function rpc_mark_writing_ai_error(p_submission_id uuid, p_error text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update submissions set ai_status = 'error', ai_error = p_error, ai_draft_at = now()
  where id = p_submission_id and status <> 'graded';
  if not found then
    raise exception 'Không tìm thấy bài Writing chưa chấm %', p_submission_id;
  end if;
  return jsonb_build_object('submission_id', p_submission_id, 'ai_status', 'error');
end;
$$;

-- 5. Khóa quyền: chỉ service_role (Edge Function/bot). KHÔNG mở anon/authenticated.
revoke execute on function rpc_list_writing_tasks(int) from public, anon, authenticated;
revoke execute on function rpc_save_writing_ai_draft(uuid, numeric, numeric, numeric, numeric, text, jsonb) from public, anon, authenticated;
revoke execute on function rpc_mark_writing_ai_error(uuid, text) from public, anon, authenticated;
grant execute on function rpc_list_writing_tasks(int) to service_role;
grant execute on function rpc_save_writing_ai_draft(uuid, numeric, numeric, numeric, numeric, text, jsonb) to service_role;
grant execute on function rpc_mark_writing_ai_error(uuid, text) to service_role;
