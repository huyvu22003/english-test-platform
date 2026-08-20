-- =====================================================================
-- SPEAKING Phase 2 — Chấm tự động (AI) bài Speaking
-- Bot hạ tầng nhận signed audio URL, chấm IELTS Speaking 4 tiêu chí,
-- gọi callback ghi kết quả. Không chứa secret/model/key trong repo.
-- =====================================================================

-- 1. Cột vận hành cho lỗi/retry AI
alter table submissions add column if not exists ai_error text;
alter table submissions add column if not exists ai_attempted_at timestamptz;

-- 2. Hàm kiểm tra điểm IELTS hợp lệ: 0–9, bước 0.5.
create or replace function etp_is_valid_band(p_score numeric)
returns boolean language sql immutable as $$
  select p_score is not null
     and p_score >= 0 and p_score <= 9
     and (p_score * 2) = floor(p_score * 2);
$$;

-- 3. RPC callback: bot ghi kết quả chấm Speaking (pending_ai -> graded).
--    Chỉ service_role gọi (Edge Function dùng service role). Idempotent:
--    nếu đã graded thì không chấm lại trừ khi p_force = true.
create or replace function rpc_bot_grade_speaking(
  p_submission_id uuid,
  p_transcript text,
  p_score_fc numeric,
  p_score_lr numeric,
  p_score_gra numeric,
  p_score_pronunciation numeric,
  p_feedback text default null,
  p_force boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_audio text;
  v_overall numeric;
begin
  select status, audio_path into v_status, v_audio
  from submissions where id = p_submission_id;

  if not found then
    raise exception 'Không tìm thấy bài nộp %', p_submission_id;
  end if;
  if v_audio is null then
    raise exception 'Bài nộp % không phải bài Speaking (thiếu audio_path).', p_submission_id;
  end if;
  if v_status = 'graded' and not p_force then
    return jsonb_build_object('submission_id', p_submission_id, 'skipped', true, 'reason', 'already_graded');
  end if;

  if not (etp_is_valid_band(p_score_fc) and etp_is_valid_band(p_score_lr)
      and etp_is_valid_band(p_score_gra) and etp_is_valid_band(p_score_pronunciation)) then
    raise exception 'Điểm phải nằm trong thang 0–9 theo bước 0.5.';
  end if;

  v_overall := round(((p_score_fc + p_score_lr + p_score_gra + p_score_pronunciation) / 4) * 2) / 2;

  update submissions set
    transcript          = p_transcript,
    score_fc            = p_score_fc,
    score_lr            = p_score_lr,
    score_gra           = p_score_gra,
    score_pronunciation = p_score_pronunciation,
    overall_band        = v_overall,
    cefr                = etp_band_to_cefr(v_overall),
    feedback            = p_feedback,
    ai_error            = null,
    ai_attempted_at     = now(),
    status              = 'graded',
    graded_at           = now()
  where id = p_submission_id;

  return jsonb_build_object('submission_id', p_submission_id, 'overall_band', v_overall,
                            'cefr', etp_band_to_cefr(v_overall));
end;
$$;

-- 4. RPC callback lỗi: bot báo chấm thất bại (giữ nguyên audio + pending_ai).
create or replace function rpc_mark_speaking_ai_error(p_submission_id uuid, p_error text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update submissions set
    ai_error = p_error,
    ai_attempted_at = now()
  where id = p_submission_id and audio_path is not null;
  if not found then
    raise exception 'Không tìm thấy bài Speaking %', p_submission_id;
  end if;
  return jsonb_build_object('submission_id', p_submission_id, 'ai_error', p_error);
end;
$$;

-- 5. RPC liệt kê bài Speaking chờ chấm (cho bot poll qua Edge Function).
--    Trả kèm audio_path + đề bài; KHÔNG trả URL công khai. Edge Function
--    tạo signed read URL ngắn hạn từ audio_path.
create or replace function rpc_list_pending_speaking(p_limit int default 20)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id,
           'audio_path', s.audio_path,
           'audio_mime', s.audio_mime,
           'audio_duration_sec', s.audio_duration_sec,
           'topic_name', coalesce(s.topic_name, tp.name),
           'test_title', t.title,
           'prompt', t.prompt,
           'submitted_at', s.submitted_at,
           'ai_attempted_at', s.ai_attempted_at
         ) order by s.submitted_at), '[]')
  from submissions s
  left join tests t on t.id = s.test_id
  left join topics tp on tp.id = t.topic_id
  where s.status = 'pending_ai' and s.audio_path is not null
  limit greatest(1, least(p_limit, 100));
$$;

-- 6. Khóa quyền: các RPC này chỉ dành cho service_role (Edge Function/bot),
--    KHÔNG mở cho anon/authenticated.
revoke execute on function rpc_bot_grade_speaking(uuid, text, numeric, numeric, numeric, numeric, text, boolean) from public, anon, authenticated;
revoke execute on function rpc_mark_speaking_ai_error(uuid, text) from public, anon, authenticated;
revoke execute on function rpc_list_pending_speaking(int) from public, anon, authenticated;
grant execute on function rpc_bot_grade_speaking(uuid, text, numeric, numeric, numeric, numeric, text, boolean) to service_role;
grant execute on function rpc_mark_speaking_ai_error(uuid, text) to service_role;
grant execute on function rpc_list_pending_speaking(int) to service_role;

-- 7. Cập nhật rpc_get_progress: thêm trường Speaking (FC/Pronunciation/transcript)
--    và cho phép hiển thị bài Speaking đang chờ AI chấm (pending_ai).
drop function if exists rpc_get_progress(text, text, text);
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
           'score_gra', s.score_gra,
           'score_fc', s.score_fc,
           'score_pronunciation', s.score_pronunciation,
           'transcript', s.transcript
         ) order by s.submitted_at), '[]')
  from submissions s
  left join target_student target on true
  left join tests t on t.id = s.test_id
  left join topics tp on tp.id = t.topic_id
  left join lateral (
    select st.* from students st
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
  where (s.status = 'graded' or (s.status = 'pending_ai' and tp.skill = 'speaking'))
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
