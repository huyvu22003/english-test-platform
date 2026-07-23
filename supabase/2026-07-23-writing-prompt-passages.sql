-- Trả kèm tư liệu/ảnh cho đề Writing khi học sinh bốc đề ngẫu nhiên.
-- Chạy trong Supabase SQL Editor sau khi deploy frontend.

create or replace function rpc_pick_prompt(p_topic_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select to_jsonb(x) from (
    select t.id as test_id, t.prompt, t.title, t.time_limit_min, t.min_words,
           tp.name as topic_name,
           (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order), '[]'::jsonb)
            from passages p where p.test_id = t.id) as passages
    from tests t join topics tp on tp.id = t.topic_id
    where t.topic_id = p_topic_id and t.active
    order by random() limit 1
  ) x;
$$;

grant execute on function rpc_pick_prompt(uuid) to anon, authenticated;
