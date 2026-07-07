-- Nền vận hành giáo viên:
-- - mở rộng role giáo viên
-- - gán giáo viên phụ trách lớp
-- - giao bài chấm cho giáo viên
-- - chuẩn bị RLS theo role/lớp phụ trách

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz;

alter table profiles
  add constraint profiles_role_check
  check (role in ('owner','admin','teacher','grader','content_editor'));

update profiles set role = 'admin' where role is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'teacher'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into profiles(id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 'teacher'
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

create table if not exists class_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(class_id, teacher_id)
);

create index if not exists idx_class_teachers_class on class_teachers(class_id);
create index if not exists idx_class_teachers_teacher on class_teachers(teacher_id);

alter table class_teachers enable row level security;

alter table submissions
  add column if not exists assigned_to uuid references profiles(id) on delete set null,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table submissions drop constraint if exists submissions_status_check;
alter table submissions
  add constraint submissions_status_check
  check (status in ('submitted','assigned','in_review','graded'));

create index if not exists idx_submissions_assigned_to on submissions(assigned_to);

create or replace function public.current_profile_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active is true;
$$;

create or replace function public.is_ops_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_profile_role() in ('owner','admin'), false);
$$;

create or replace function public.can_manage_content()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_profile_role() in ('owner','admin','content_editor'), false);
$$;

create or replace function public.can_grade()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_profile_role() in ('owner','admin','teacher','grader'), false);
$$;

create or replace function public.teacher_can_access_student(p_student_id uuid, p_email text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from students st
    join class_teachers ct on ct.class_id = st.class_id
    where ct.teacher_id = auth.uid()
      and (st.id = p_student_id or (p_email is not null and lower(st.email) = lower(p_email)))
  );
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_ops_admin() to authenticated;
grant execute on function public.can_manage_content() to authenticated;
grant execute on function public.can_grade() to authenticated;
grant execute on function public.teacher_can_access_student(uuid, text) to authenticated;

drop policy if exists own_profile on profiles;
drop policy if exists profiles_self_read on profiles;
drop policy if exists profiles_admin_read on profiles;
drop policy if exists profiles_admin_update on profiles;
create policy profiles_self_read on profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_read on profiles for select to authenticated using (public.is_ops_admin());
create policy profiles_admin_update on profiles for update to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());

drop policy if exists class_teachers_read on class_teachers;
drop policy if exists class_teachers_admin_all on class_teachers;
create policy class_teachers_read on class_teachers for select to authenticated using (public.is_ops_admin() or teacher_id = auth.uid());
create policy class_teachers_admin_all on class_teachers for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());

-- Hạ bớt policy rộng cũ nếu tồn tại; sau migration, role quyết định phạm vi thao tác.
drop policy if exists teacher_all_topics on topics;
drop policy if exists teacher_all_tests on tests;
drop policy if exists teacher_all_passages on passages;
drop policy if exists teacher_all_questions on questions;
drop policy if exists teacher_all_sessions on exam_sessions;
drop policy if exists teacher_all_assign on assignments;
drop policy if exists teacher_read_subs on submissions;
drop policy if exists teacher_update_subs on submissions;
drop policy if exists teacher_delete_subs on submissions;
drop policy if exists teacher_all_classes on classes;
drop policy if exists teacher_all_students on students;
drop policy if exists content_all_topics on topics;
drop policy if exists content_all_tests on tests;
drop policy if exists content_all_passages on passages;
drop policy if exists content_all_questions on questions;
drop policy if exists admin_all_sessions on exam_sessions;
drop policy if exists admin_all_assignments on assignments;
drop policy if exists ops_read_classes on classes;
drop policy if exists admin_all_classes on classes;
drop policy if exists ops_read_students on students;
drop policy if exists admin_all_students on students;
drop policy if exists ops_read_submissions on submissions;
drop policy if exists ops_update_submissions on submissions;
drop policy if exists admin_delete_submissions on submissions;

create policy content_all_topics on topics for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy content_all_tests on tests for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy content_all_passages on passages for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy content_all_questions on questions for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());

create policy admin_all_sessions on exam_sessions for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());
create policy admin_all_assignments on assignments for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());

create policy ops_read_classes on classes for select to authenticated using (
  public.is_ops_admin()
  or exists (select 1 from class_teachers ct where ct.class_id = classes.id and ct.teacher_id = auth.uid())
);
create policy admin_all_classes on classes for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());

create policy ops_read_students on students for select to authenticated using (
  public.is_ops_admin()
  or exists (select 1 from class_teachers ct where ct.class_id = students.class_id and ct.teacher_id = auth.uid())
);
create policy admin_all_students on students for all to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());

create policy ops_read_submissions on submissions for select to authenticated using (
  public.is_ops_admin()
  or assigned_to = auth.uid()
  or public.teacher_can_access_student(student_id, student_email)
);
create policy ops_update_submissions on submissions for update to authenticated using (
  public.is_ops_admin()
  or assigned_to = auth.uid()
  or public.teacher_can_access_student(student_id, student_email)
) with check (
  public.is_ops_admin()
  or assigned_to = auth.uid()
  or public.teacher_can_access_student(student_id, student_email)
);
create policy admin_delete_submissions on submissions for delete to authenticated using (public.is_ops_admin());
