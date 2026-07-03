-- Giới hạn buổi thi theo lớp: buổi thi có thể chỉ cho học sinh trong 1 lớp/roster vào và nộp.
-- Chạy trong Supabase SQL Editor trước khi dùng lựa chọn "Giới hạn lớp" ở trang Buổi thi.

alter table exam_sessions
  add column if not exists class_id uuid references classes(id) on delete set null;

create index if not exists idx_exam_sessions_class_id on exam_sessions(class_id);

-- RPC mới dùng khi học sinh nhập mã thi + email: kiểm tra lớp ngay trước khi cho vào phòng thi.
create or replace function rpc_session_by_code_for_student(p_code text, p_email text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s exam_sessions;
  v_skill text;
  v_class_name text;
  v_student_class uuid;
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

  if s.class_id is not null then
    select name into v_class_name from classes where id = s.class_id;
    select class_id into v_student_class
    from students
    where lower(email) = lower(btrim(coalesce(p_email, '')))
    limit 1;

    if v_student_class is distinct from s.class_id then
      return jsonb_build_object(
        'status','class_mismatch',
        'class_id',s.class_id,
        'class_name',v_class_name
      );
    end if;
  end if;

  select tp.skill into v_skill from tests t join topics tp on tp.id = t.topic_id where t.id = s.test_id;
  return jsonb_build_object(
    'status','open','session_id',s.id,'name',s.name,'test_id',s.test_id,'skill',v_skill,
    'class_id',s.class_id,'class_name',v_class_name,
    'one_submission',s.one_submission,'max_violations',s.max_violations,
    'open_at',s.open_at,'close_at',s.close_at,'server_now',now());
end;
$$;

grant execute on function rpc_session_by_code_for_student(text, text) to anon, authenticated;

-- Siết server-side lúc nộp bài: kể cả học sinh bypass frontend vẫn không nộp được nếu sai lớp.
create or replace function rpc_submit_session(
  p_session_id uuid, p_name text, p_email text, p_answers jsonb, p_essay text,
  p_violations int, p_log text, p_started_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s exam_sessions; v_skill text; v_topic text; v_student uuid; v_id uuid; v_student_class uuid;
  v_score numeric := 0; v_max numeric := 0; v_band numeric; v_percent numeric;
  v_status text; q record;
begin
  select * into s from exam_sessions where id = p_session_id;
  if not found then raise exception 'Buổi thi không tồn tại'; end if;
  if s.open_at is not null and now() < s.open_at then raise exception 'Buổi thi chưa mở'; end if;
  if s.close_at is not null and now() > s.close_at then raise exception 'Buổi thi đã đóng'; end if;

  if p_email is not null and length(btrim(p_email)) > 0 then
    select id, class_id into v_student, v_student_class
    from students
    where lower(email) = lower(btrim(p_email))
    limit 1;
  end if;

  if s.class_id is not null and v_student_class is distinct from s.class_id then
    raise exception 'Email này không thuộc lớp được phép vào buổi thi';
  end if;

  if s.one_submission and exists(
       select 1 from submissions where session_id = p_session_id
       and lower(student_email) = lower(btrim(p_email))) then
    raise exception 'Bạn đã nộp bài cho buổi thi này rồi';
  end if;

  select tp.skill, tp.name into v_skill, v_topic
  from tests t join topics tp on tp.id = t.topic_id where t.id = s.test_id;

  if v_student is null and p_email is not null and length(btrim(p_email)) > 0 then
    insert into students(full_name, email) values (p_name, btrim(p_email)) returning id into v_student;
  end if;

  if v_skill = 'writing' then
    v_status := 'submitted';
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

grant execute on function rpc_submit_session(uuid, text, text, jsonb, text, int, text, timestamptz) to anon, authenticated;
