-- Internal Academy V2: Syllabus -> Level -> Unit -> Session/Lesson plan.
-- Giữ tương thích dữ liệu MVP: bài học cũ có thể chưa gắn level/unit.

create table if not exists academy_levels (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references academy_courses(id) on delete cascade,
  title         text not null check (char_length(btrim(title)) >= 1),
  code          text not null default '',
  description   text not null default '',
  outcome       text not null default '',
  session_count int not null default 0 check (session_count >= 0),
  active        boolean not null default false,
  sort_order    int not null default 0,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists academy_units (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references academy_levels(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) >= 1),
  code        text not null default '',
  description text not null default '',
  active      boolean not null default false,
  sort_order  int not null default 0,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table academy_lessons add column if not exists level_id uuid references academy_levels(id) on delete set null;
alter table academy_lessons add column if not exists unit_id uuid references academy_units(id) on delete set null;
alter table academy_lessons add column if not exists lesson_type text not null default 'lesson';
alter table academy_lessons add column if not exists session_no int;
alter table academy_lessons add column if not exists references_text text not null default '';
alter table academy_lessons add column if not exists objectives jsonb not null default '{}'::jsonb;
alter table academy_lessons add column if not exists homework text not null default '';
alter table academy_lessons add column if not exists teacher_notes text not null default '';
alter table academy_lessons add column if not exists slide_url text;
alter table academy_lessons add column if not exists game_url text;
alter table academy_lessons add column if not exists worksheet_url text;

create index if not exists idx_academy_levels_course on academy_levels(course_id, sort_order);
create index if not exists idx_academy_units_level on academy_units(level_id, sort_order);
create index if not exists idx_academy_lessons_level_unit on academy_lessons(level_id, unit_id, sort_order);

alter table academy_levels enable row level security;
alter table academy_units enable row level security;

drop policy if exists academy_level_read on academy_levels;
create policy academy_level_read on academy_levels for select to authenticated
  using (
    can_manage_content()
    or (active and exists (
      select 1 from academy_courses c where c.id = course_id and c.active
    ))
  );
drop policy if exists academy_level_manage on academy_levels;
create policy academy_level_manage on academy_levels for all to authenticated
  using (can_manage_content()) with check (can_manage_content());

drop policy if exists academy_unit_read on academy_units;
create policy academy_unit_read on academy_units for select to authenticated
  using (
    can_manage_content()
    or (active and exists (
      select 1
      from academy_levels l
      join academy_courses c on c.id = l.course_id
      where l.id = level_id and l.active and c.active
    ))
  );
drop policy if exists academy_unit_manage on academy_units;
create policy academy_unit_manage on academy_units for all to authenticated
  using (can_manage_content()) with check (can_manage_content());

-- Bài học chỉ xuất hiện khi toàn bộ nhánh cha liên quan đã được xuất bản.
drop policy if exists academy_lesson_read on academy_lessons;
create policy academy_lesson_read on academy_lessons for select to authenticated
  using (
    can_manage_content()
    or (
      active
      and exists (
        select 1 from academy_courses c where c.id = course_id and c.active
      )
      and (
        level_id is null
        or exists (
          select 1 from academy_levels l
          where l.id = level_id and l.course_id = course_id and l.active
        )
      )
      and (
        unit_id is null
        or exists (
          select 1 from academy_units u
          where u.id = unit_id and u.level_id = level_id and u.active
        )
      )
    )
  );

revoke all on academy_levels, academy_units from anon, public;
grant select, insert, update, delete on academy_levels, academy_units to authenticated;
