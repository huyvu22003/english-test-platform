-- =====================================================================
-- SPEAKING Phase 1 — Ghi âm nộp bài, chờ chấm AI
-- Mở rộng skill, status, cột submission, bucket private, RPC.
-- =====================================================================

-- 1. Thêm 'speaking' vào constraint skill của topics
do $$ begin
  alter table topics drop constraint if exists topics_skill_check;
  alter table topics add constraint topics_skill_check
    check (skill in ('writing','reading','listening','use_of_english','speaking'));
exception when others then null; end $$;

-- 2. Thêm 'pending_ai' vào constraint status của submissions
do $$ begin
  alter table submissions drop constraint if exists submissions_status_check;
  alter table submissions add constraint submissions_status_check
    check (status in ('submitted','assigned','in_review','graded','pending_ai'));
exception when others then null; end $$;

-- 3. Thêm cột cho Speaking
alter table submissions add column if not exists audio_path text;
alter table submissions add column if not exists audio_mime text;
alter table submissions add column if not exists audio_duration_sec numeric;
alter table submissions add column if not exists transcript text;
alter table submissions add column if not exists score_fc numeric;            -- Fluency & Coherence
alter table submissions add column if not exists score_pronunciation numeric; -- Pronunciation

-- 4. Bucket 'speaking' (private — chỉ service_role + authenticated đọc)
insert into storage.buckets (id, name, public)
values ('speaking', 'speaking', false)
on conflict (id) do update set public = false;

-- Giáo viên (authenticated) đọc file ghi âm (nghe lại khi chấm/review)
create policy "speaking teacher read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'speaking');

-- Service role upload/đọc qua signed URL — không cần policy riêng (bypass RLS).
-- KHÔNG mở anon insert/select — học viên upload qua signed upload URL từ Edge Function.

-- 5. RPC liệt kê chủ đề Speaking đang mở
create or replace function rpc_list_speaking_topics()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id, 'topic_name', tp.name, 'topic_category', tp.category,
           'num_prompts', (select count(*) from tests t where t.topic_id = tp.id and t.active and t.purpose <> 'placement')
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active and tp.skill = 'speaking' and tp.category <> 'placement'
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active and t.purpose <> 'placement');
$$;

-- 6. RPC bốc đề Speaking (tái dùng logic rpc_pick_prompt)
create or replace function rpc_pick_speaking_prompt(p_topic_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select to_jsonb(x) from (
    select t.id as test_id, t.prompt, t.title, t.time_limit_min,
           tp.name as topic_name,
           (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order), '[]'::jsonb)
            from passages p where p.test_id = t.id) as passages
    from tests t join topics tp on tp.id = t.topic_id
    where t.topic_id = p_topic_id and t.active
    order by random() limit 1
  ) x;
$$;

-- 7. RPC nộp bài Speaking (lưu audio_path, status = 'pending_ai')
create or replace function rpc_submit_speaking(
  p_test_id uuid, p_name text, p_email text, p_audio_path text,
  p_audio_mime text, p_audio_duration_sec numeric,
  p_violations int, p_log text, p_started_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_student uuid; v_topic text;
begin
  if p_email is not null and length(btrim(p_email)) > 0 then
    select id into v_student from students where lower(email) = lower(btrim(p_email)) limit 1;
    if v_student is null then
      insert into students(full_name, email) values (p_name, btrim(p_email)) returning id into v_student;
    end if;
  end if;

  select tp.name into v_topic from tests t join topics tp on tp.id = t.topic_id where t.id = p_test_id;

  insert into submissions(test_id, topic_name, student_id, student_name, student_email,
                          audio_path, audio_mime, audio_duration_sec,
                          violations, violation_log, started_at, status)
  values (p_test_id, v_topic, v_student, p_name, p_email,
          p_audio_path, p_audio_mime, p_audio_duration_sec,
          coalesce(p_violations,0), p_log, p_started_at, 'pending_ai')
  returning id into v_id;

  return jsonb_build_object('submission_id', v_id);
end;
$$;

-- 8. Grant quyền cho anon + authenticated
grant execute on function rpc_list_speaking_topics() to anon, authenticated;
grant execute on function rpc_pick_speaking_prompt(uuid) to anon, authenticated;
grant execute on function rpc_submit_speaking(uuid, text, text, text, text, numeric, int, text, timestamptz) to anon, authenticated;
