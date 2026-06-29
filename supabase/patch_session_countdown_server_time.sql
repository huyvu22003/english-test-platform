-- Patch production: đồng bộ countdown phòng thi/mã thi theo giờ server Supabase.
-- Chạy file này trong Supabase SQL Editor sau khi deploy frontend.
-- Mục tiêu: rpc_session_by_code trả thêm open_at, close_at, server_now để học sinh dùng cùng một deadline.

create or replace function rpc_session_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s exam_sessions; v_skill text;
begin
  select * into s from exam_sessions where lower(access_code) = lower(btrim(p_code)) limit 1;
  if not found then return null; end if;
  if s.test_id is null then return jsonb_build_object('status','no_test'); end if;
  if s.open_at is not null and now() < s.open_at then
    return jsonb_build_object('status','not_open','open_at',s.open_at,'server_now',now());
  end if;
  if s.close_at is not null and now() > s.close_at then
    return jsonb_build_object('status','closed','close_at',s.close_at,'server_now',now());
  end if;
  select tp.skill into v_skill from tests t join topics tp on tp.id = t.topic_id where t.id = s.test_id;
  return jsonb_build_object(
    'status','open','session_id',s.id,'name',s.name,'test_id',s.test_id,'skill',v_skill,
    'one_submission',s.one_submission,'max_violations',s.max_violations,
    'open_at',s.open_at,'close_at',s.close_at,'server_now',now());
end;
$$;

grant execute on function rpc_session_by_code(text) to anon, authenticated;
