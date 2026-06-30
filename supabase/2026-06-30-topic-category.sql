-- Fix phân loại topic tăng cường: không dựa vào tên hiển thị nữa.
-- Chạy trong Supabase SQL Editor trước/sau khi deploy frontend đều được.

alter table topics add column if not exists category text not null default 'regular';

do $$ begin
  alter table topics drop constraint if exists topics_category_check;
  alter table topics add constraint topics_category_check
    check (category in ('regular','intensive_2026'));
exception when others then null; end $$;

-- Gắn nhãn lại các topic tăng cường cũ đang còn tên nhận diện.
update topics
set category = 'intensive_2026'
where skill = 'writing'
  and category = 'regular'
  and (
    (name ilike '%HỌC TĂNG CƯỜNG%' and name ilike '%2026%')
    or (name ilike '%hoc tang cuong%' and name ilike '%2026%')
  );

-- Nếu có topic đã bị đổi tên và rơi sang tab Đề Viết, chạy thêm dòng dưới với tên thật.
-- Ví dụ screenshot của Huy: KIEM TRA LOI
update topics
set category = 'intensive_2026'
where skill = 'writing'
  and name in ('KIEM TRA LOI');

create or replace function rpc_list_exams()
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id,
           'topic_name', tp.name,
           'topic_category', tp.category,
           'skill', tp.skill,
           'tests', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', t.id, 'version_label', t.version_label, 'title', t.title,
                        'time_limit_min', t.time_limit_min, 'min_words', t.min_words
                     ) order by t.version_label), '[]')
                     from tests t where t.topic_id = tp.id and t.active)
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active);
$$;

create or replace function rpc_list_writing_topics()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id, 'topic_name', tp.name, 'topic_category', tp.category,
           'num_prompts', (select count(*) from tests t where t.topic_id = tp.id and t.active)
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active and tp.skill = 'writing'
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active);
$$;

grant execute on function rpc_list_exams() to anon, authenticated;
grant execute on function rpc_list_writing_topics() to anon, authenticated;
