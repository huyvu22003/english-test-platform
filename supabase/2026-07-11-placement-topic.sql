-- Tách đề xếp lớp thành nhóm topic riêng.
-- Chạy trên Supabase production sau khi deploy frontend.

alter table topics add column if not exists category text not null default 'regular';

do $$ begin
  alter table topics drop constraint if exists topics_category_check;
  alter table topics add constraint topics_category_check
    check (category in ('regular','intensive_2026','placement'));
exception when others then null; end $$;

-- Gắn lại topic placement cũ, gồm topic có tên Placement/Xếp lớp hoặc có test purpose='placement'.
update topics
set category = 'placement'
where category = 'regular'
  and (
    name ilike '%placement%'
    or name ilike '%xếp lớp%'
    or name ilike '%xep lop%'
    or exists (select 1 from tests t where t.topic_id = topics.id and t.purpose = 'placement')
  );

-- Tạo khung topic xếp lớp đủ kỹ năng để giáo viên thêm đề A/B/C vào đúng chỗ.
insert into topics(name, skill, category, active, sort_order)
select v.name, v.skill, 'placement', true, v.sort_order
from (values
  ('XẾP LỚP IELTS - Đọc', 'reading', 31),
  ('XẾP LỚP IELTS - Nghe', 'listening', 32),
  ('XẾP LỚP IELTS - Viết', 'writing', 33)
) as v(name, skill, sort_order)
where not exists (
  select 1 from topics t
  where t.category = 'placement'
    and t.skill = v.skill
    and lower(t.name) = lower(v.name)
);

-- Danh sách đề luyện tập không trả đề placement nữa, tránh lẫn vào block Đọc/Nghe/Writing thường.
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
                     from tests t where t.topic_id = tp.id and t.active and t.purpose <> 'placement')
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active
    and tp.category <> 'placement'
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active and t.purpose <> 'placement');
$$;

-- Writing thường không lấy topic xếp lớp.
create or replace function rpc_list_writing_topics()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id, 'topic_name', tp.name, 'topic_category', tp.category,
           'num_prompts', (select count(*) from tests t where t.topic_id = tp.id and t.active and t.purpose <> 'placement')
         ) order by tp.sort_order, tp.name), '[]')
  from topics tp
  where tp.active and tp.skill = 'writing' and tp.category <> 'placement'
    and exists (select 1 from tests t where t.topic_id = tp.id and t.active and t.purpose <> 'placement');
$$;

-- Placement trả riêng các đề xếp lớp, gồm Writing để giáo viên chấm tay.
create or replace function rpc_list_placements()
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', tp.id, 'topic_name', tp.name, 'topic_category', tp.category,
           'test_id', t.id, 'title', coalesce(t.title, tp.name),
           'skill', tp.skill, 'time_limit_min', t.time_limit_min,
           'num_q', (select count(*) from questions q where q.test_id = t.id)
         ) order by
             case tp.skill
               when 'use_of_english' then 1
               when 'reading' then 2
               when 'listening' then 3
               when 'writing' then 4
               else 9
             end,
             tp.sort_order, t.version_label), '[]')
  from tests t join topics tp on tp.id = t.topic_id
  where t.active and t.purpose = 'placement'
    and (
      tp.skill = 'writing'
      or exists (select 1 from questions q where q.test_id = t.id)
    );
$$;

grant execute on function rpc_list_exams() to anon, authenticated;
grant execute on function rpc_list_writing_topics() to anon, authenticated;
grant execute on function rpc_list_placements() to anon, authenticated;
