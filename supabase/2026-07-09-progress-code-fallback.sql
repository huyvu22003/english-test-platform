-- Fix /progress lookup by student code:
-- If old submissions are not linked to students.student_id, match by the
-- roster email or a normalized Vietnamese full name from the student code.

create or replace function etp_normalize_lookup(p_text text)
returns text language plpgsql immutable as $$
declare
  v text := lower(coalesce(p_text, ''));
begin
  v := translate(v, 'àáạảãâầấậẩẫăằắặẳẵ', 'aaaaaaaaaaaaaaaaa');
  v := translate(v, 'èéẹẻẽêềếệểễ', 'eeeeeeeeeee');
  v := translate(v, 'ìíịỉĩ', 'iiiii');
  v := translate(v, 'òóọỏõôồốộổỗơờớợởỡ', 'ooooooooooooooooo');
  v := translate(v, 'ùúụủũưừứựửữ', 'uuuuuuuuuuu');
  v := translate(v, 'ỳýỵỷỹ', 'yyyyy');
  v := replace(v, 'đ', 'd');
  v := regexp_replace(v, '\s+', ' ', 'g');
  return btrim(v);
end;
$$;

create or replace function rpc_get_progress(p_email text default null, p_name text default null, p_code text default null)
returns jsonb language sql security definer set search_path = public as $$
  with target_student as (
    select st.*
    from students st
    where coalesce(btrim(p_code), '') <> ''
      and lower(st.code) = lower(btrim(p_code))
    limit 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id,
           'submitted_at', s.submitted_at,
           'skill', coalesce(tp.skill, 'writing'),
           'student_name', coalesce(st.full_name, target.full_name, s.student_name),
           'student_code', coalesce(st.code, target.code),
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
  left join target_student target on true
  left join tests t on t.id = s.test_id
  left join topics tp on tp.id = t.topic_id
  left join lateral (
    select st.*
    from students st
    where st.id = s.student_id
       or lower(st.email) = lower(s.student_email)
       or (target.id is not null and st.id = target.id)
    order by case
      when st.id = s.student_id then 0
      when target.id is not null and st.id = target.id then 1
      else 2
    end
    limit 1
  ) st on true
  left join classes c on c.id = coalesce(st.class_id, target.class_id)
  where s.status = 'graded'
    and (coalesce(btrim(p_email), '') <> '' or coalesce(btrim(p_name), '') <> '' or coalesce(btrim(p_code), '') <> '')
    and (
      (
        target.id is not null
        and (
          s.student_id = target.id
          or (
            coalesce(btrim(target.email), '') <> ''
            and lower(s.student_email) = lower(btrim(target.email))
          )
          or etp_normalize_lookup(s.student_name) = etp_normalize_lookup(target.full_name)
        )
      )
      or (
        target.id is null
        and (coalesce(btrim(p_email), '') = '' or lower(s.student_email) = lower(btrim(p_email)))
        and (coalesce(btrim(p_name), '') = '' or etp_normalize_lookup(coalesce(st.full_name, s.student_name)) = etp_normalize_lookup(p_name))
        and (coalesce(btrim(p_code), '') = '' or lower(st.code) = lower(btrim(p_code)))
      )
    );
$$;

grant execute on function rpc_get_progress(text, text, text) to anon, authenticated;
