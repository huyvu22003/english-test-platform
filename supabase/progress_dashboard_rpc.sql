-- Patch RPC cho trang /progress: dò bằng email / họ tên / mã học sinh,
-- trả dữ liệu biểu đồ theo kỹ năng + lịch sử + chi tiết bài.
-- Chạy file này trong Supabase SQL Editor nếu database production đã có schema cũ.

-- Bỏ bản cũ chỉ nhận email để PostgREST không bị lẫn signature.
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

grant execute on function rpc_get_progress(text, text, text) to anon, authenticated;
