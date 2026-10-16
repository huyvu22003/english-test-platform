-- Cho phép giáo viên yêu cầu AI chấm lại Writing bằng skill hiện tại.
-- Draft mới không thay đổi điểm/status chính thức cho tới khi giáo viên lưu.

create or replace function rpc_request_writing_ai_regrade(p_submission_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_essay text;
begin
  if not public.can_grade() then
    raise exception 'Bạn không có quyền yêu cầu AI chấm lại.' using errcode = '42501';
  end if;

  select s.essay into v_essay
  from submissions s
  where s.id = p_submission_id
    and (
      public.is_ops_admin()
      or s.assigned_to = auth.uid()
      or public.teacher_can_access_student(s.student_id, s.student_email)
    );

  if not found then
    raise exception 'Không tìm thấy bài Writing hoặc bạn không có quyền truy cập.' using errcode = '42501';
  end if;
  if v_essay is null or length(btrim(v_essay)) = 0 then
    raise exception 'Bài này không có nội dung Writing để AI chấm lại.';
  end if;

  update submissions set
    ai_status = 'requested',
    ai_draft = null,
    ai_error = null,
    ai_draft_at = now()
  where id = p_submission_id;

  return jsonb_build_object('submission_id', p_submission_id, 'ai_status', 'requested');
end;
$$;

revoke execute on function rpc_request_writing_ai_regrade(uuid) from public, anon;
grant execute on function rpc_request_writing_ai_regrade(uuid) to authenticated;

create or replace function rpc_list_writing_tasks(p_limit int default 5)
returns jsonb language sql security definer set search_path = public as $$
  with eligible as (
    select s.id
    from submissions s
    join tests t on t.id = s.test_id
    join topics tp on tp.id = t.topic_id
    where tp.skill = 'writing'
      and s.essay is not null and length(btrim(s.essay)) > 0
      and (
        s.ai_status = 'requested'
        or (
          s.status <> 'graded'
          and (
            s.ai_status is null
            or s.ai_status = 'error'
            or (s.ai_status = 'pending' and (s.ai_draft_at is null or s.ai_draft_at < now() - interval '10 minutes'))
          )
        )
      )
    order by case when s.ai_status = 'requested' then 0 else 1 end, s.submitted_at
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

revoke execute on function rpc_list_writing_tasks(int) from public, anon, authenticated;
grant execute on function rpc_list_writing_tasks(int) to service_role;

create or replace function rpc_save_writing_ai_draft(
  p_submission_id uuid,
  p_score_tr numeric, p_score_cc numeric, p_score_lr numeric, p_score_gra numeric,
  p_feedback text default null, p_corrections jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from submissions where id = p_submission_id) then
    raise exception 'Không tìm thấy bài nộp %', p_submission_id;
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

revoke execute on function rpc_save_writing_ai_draft(uuid, numeric, numeric, numeric, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function rpc_save_writing_ai_draft(uuid, numeric, numeric, numeric, numeric, text, jsonb)
  to service_role;
