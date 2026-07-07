-- Hardening public routes/RPC:
-- - Học sinh chỉ dùng các RPC public đã định nghĩa, không đọc trực tiếp bảng nội bộ.
-- - Trang tiến bộ public chỉ trả bài đã chấm để tránh lộ bài nháp/bài chờ chấm khi biết email.

revoke all on table
  profiles, topics, tests, passages, questions, exam_sessions, assignments,
  submissions, classes, students
from anon;

revoke all on table
  profiles, topics, tests, passages, questions, exam_sessions, assignments,
  submissions, classes, students
from public;

grant select on table levels to anon, authenticated;

-- Supabase/Postgres mặc định có thể cho PUBLIC execute function. Thu hẹp về các RPC public cần dùng.
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;

grant execute on function rpc_list_exams() to anon, authenticated;
grant execute on function rpc_get_test(uuid) to anon, authenticated;
grant execute on function rpc_submit(uuid, text, text, jsonb, int, text, timestamptz, text) to anon, authenticated;
grant execute on function rpc_list_writing_topics() to anon, authenticated;
grant execute on function rpc_pick_prompt(uuid) to anon, authenticated;
grant execute on function rpc_submit_writing(uuid, text, text, text, int, text, timestamptz) to anon, authenticated;
grant execute on function rpc_get_progress(text, text, text) to anon, authenticated;
grant execute on function rpc_student_by_code(text) to anon, authenticated;
grant execute on function rpc_list_placements() to anon, authenticated;
grant execute on function rpc_submit_placement(uuid, text, text, jsonb, int, text, timestamptz) to anon, authenticated;
grant execute on function rpc_session_by_code(text) to anon, authenticated;
grant execute on function rpc_session_by_code_for_student(text, text) to anon, authenticated;
grant execute on function rpc_submit_session(uuid, text, text, jsonb, text, int, text, timestamptz) to anon, authenticated;

create or replace function rpc_get_progress(p_email text default null, p_name text default null, p_code text default null)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id,
           'submitted_at', s.submitted_at,
           'skill', coalesce(tp.skill, 'writing'),
           'student_name', coalesce(st.full_name, s.student_name),
           'student_code', st.code,
           'class_name', c.name,
           'topic_name', coalesce(s.topic_name, tp.name),
           'test_title', t.title,
           'prompt', t.prompt,
           'essay', s.essay,
           'feedback', s.feedback,
           'writing_corrections', coalesce(s.writing_corrections, '[]'::jsonb),
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
  left join classes c on c.id = st.class_id
  where s.status = 'graded'
    and (coalesce(btrim(p_email), '') <> '' or coalesce(btrim(p_name), '') <> '' or coalesce(btrim(p_code), '') <> '')
    and (coalesce(btrim(p_email), '') = '' or lower(s.student_email) = lower(btrim(p_email)))
    and (coalesce(btrim(p_name), '') = '' or lower(coalesce(st.full_name, s.student_name)) = lower(btrim(p_name)))
    and (coalesce(btrim(p_code), '') = '' or lower(st.code) = lower(btrim(p_code)));
$$;

grant execute on function rpc_get_progress(text, text, text) to anon, authenticated;
