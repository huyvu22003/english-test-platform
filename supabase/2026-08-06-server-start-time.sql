create or replace function rpc_server_now()
returns timestamptz language sql stable security definer set search_path = public as $$
  select now();
$$;

grant execute on function rpc_server_now() to anon, authenticated;
