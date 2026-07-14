-- Trả thêm version_label cho đề xếp lớp để frontend gom Reading/Listening/Writing thành cùng Bộ A/B/C.
-- Không đổi schema; an toàn chạy lại nhiều lần.

create or replace function rpc_list_placements()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id,
           'topic_name', tp.name,
           'topic_category', tp.category,
           'test_id', t.id,
           'title', coalesce(t.title, tp.name),
           'version_label', t.version_label,
           'skill', tp.skill,
           'time_limit_min', t.time_limit_min,
           'num_q', (select count(*) from questions q where q.test_id = t.id)
         ) order by
             t.version_label,
             case tp.skill
               when 'reading' then 1
               when 'listening' then 2
               when 'writing' then 3
               when 'use_of_english' then 4
               else 9
             end,
             tp.sort_order, t.title), '[]')
  from tests t join topics tp on tp.id = t.topic_id
  where t.active and t.purpose = 'placement'
    and (
      tp.skill = 'writing'
      or exists (select 1 from questions q where q.test_id = t.id)
    );
$$;

grant execute on function rpc_list_placements() to anon, authenticated;
