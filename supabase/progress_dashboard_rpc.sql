-- Patch RPC cho trang /progress: biểu đồ theo kỹ năng + lịch sử + chi tiết bài.
-- Chạy file này trong Supabase SQL Editor nếu database production đã có schema cũ.

create or replace function rpc_get_progress(p_email text)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id,
           'submitted_at', s.submitted_at,
           'skill', coalesce(tp.skill, 'writing'),
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
  where lower(s.student_email) = lower(btrim(p_email));
$$;

grant execute on function rpc_get_progress(text) to anon, authenticated;
