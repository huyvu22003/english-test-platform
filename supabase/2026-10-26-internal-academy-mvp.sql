-- Internal Academy MVP: khóa học, bài học, tiến độ và yêu thích.
-- Nội dung chỉ dành cho tài khoản nội bộ đã đăng nhập.

create table if not exists academy_courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) >= 2),
  description text not null default '',
  department  text not null default 'academic',
  cover_url   text,
  active      boolean not null default false,
  sort_order  int not null default 0,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists academy_lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references academy_courses(id) on delete cascade,
  title         text not null check (char_length(btrim(title)) >= 2),
  summary       text not null default '',
  content       text not null default '',
  video_url     text,
  resource_url  text,
  duration_min  int not null default 5 check (duration_min between 1 and 180),
  version_label text not null default '1.0',
  active        boolean not null default false,
  sort_order    int not null default 0,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists academy_progress (
  user_id      uuid not null references profiles(id) on delete cascade,
  lesson_id    uuid not null references academy_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists academy_favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  lesson_id  uuid not null references academy_lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists idx_academy_courses_department on academy_courses(department, sort_order);
create index if not exists idx_academy_lessons_course on academy_lessons(course_id, sort_order);

alter table academy_courses enable row level security;
alter table academy_lessons enable row level security;
alter table academy_progress enable row level security;
alter table academy_favorites enable row level security;

drop policy if exists academy_course_read on academy_courses;
create policy academy_course_read on academy_courses for select to authenticated
  using (active or can_manage_content());
drop policy if exists academy_course_manage on academy_courses;
create policy academy_course_manage on academy_courses for all to authenticated
  using (can_manage_content()) with check (can_manage_content());

drop policy if exists academy_lesson_read on academy_lessons;
create policy academy_lesson_read on academy_lessons for select to authenticated
  using (
    can_manage_content()
    or (active and exists (
      select 1 from academy_courses c where c.id = course_id and c.active
    ))
  );
drop policy if exists academy_lesson_manage on academy_lessons;
create policy academy_lesson_manage on academy_lessons for all to authenticated
  using (can_manage_content()) with check (can_manage_content());

drop policy if exists academy_progress_own on academy_progress;
create policy academy_progress_own on academy_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists academy_favorites_own on academy_favorites;
create policy academy_favorites_own on academy_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on academy_courses, academy_lessons, academy_progress, academy_favorites from anon, public;
grant select, insert, update, delete on academy_courses, academy_lessons to authenticated;
grant select, insert, update, delete on academy_progress, academy_favorites to authenticated;

