-- Standardize student roster duplicates without deleting submissions.
--
-- Rules:
-- 1. Keep the roster row that has a student code as the canonical student.
-- 2. Move submissions from same-name no-code duplicate rows to the canonical row.
-- 3. Link old submissions with null student_id when they match exactly one coded
--    student by roster email or normalized Vietnamese name.
-- 4. Copy email from the no-code duplicate to the coded row only when the coded
--    row has no email.
-- 5. Delete no-code duplicate rows only after no submissions still reference them.

begin;

create table if not exists maintenance_student_merge_students_20260709 as
select now() as backed_up_at, s.*
from students s;

create table if not exists maintenance_student_merge_submissions_20260709 as
select now() as backed_up_at, s.*
from submissions s;

create temp table canonical_student_pairs on commit drop as
with st as (
  select s.*, etp_normalize_lookup(s.full_name) as normalized_name
  from students s
),
safe_groups as (
  select normalized_name
  from st
  group by normalized_name
  having count(*) = 2
     and count(*) filter (where coalesce(btrim(code), '') <> '') = 1
     and count(*) filter (where coalesce(btrim(code), '') = '') = 1
)
select coded.id as canonical_id,
       duplicate.id as duplicate_id,
       duplicate.email as duplicate_email
from safe_groups g
join st coded
  on coded.normalized_name = g.normalized_name
 and coalesce(btrim(coded.code), '') <> ''
join st duplicate
  on duplicate.normalized_name = g.normalized_name
 and coalesce(btrim(duplicate.code), '') = '';

create temp table unlinked_submission_matches on commit drop as
with coded as (
  select s.id, s.email, etp_normalize_lookup(s.full_name) as normalized_name
  from students s
  where coalesce(btrim(s.code), '') <> ''
),
candidates as (
  select sub.id as submission_id,
         coded.id as canonical_id,
         count(*) over (partition by sub.id) as match_count
  from submissions sub
  join coded
    on sub.student_id is null
   and (
     (
       coalesce(btrim(coded.email), '') <> ''
       and lower(btrim(sub.student_email)) = lower(btrim(coded.email))
     )
     or etp_normalize_lookup(sub.student_name) = coded.normalized_name
   )
)
select submission_id, canonical_id
from candidates
where match_count = 1;

update students canonical
set email = pairs.duplicate_email
from canonical_student_pairs pairs
where canonical.id = pairs.canonical_id
  and coalesce(btrim(canonical.email), '') = ''
  and coalesce(btrim(pairs.duplicate_email), '') <> '';

update submissions sub
set student_id = pairs.canonical_id
from canonical_student_pairs pairs
where sub.student_id = pairs.duplicate_id;

update submissions sub
set student_id = matches.canonical_id
from unlinked_submission_matches matches
where sub.id = matches.submission_id
  and sub.student_id is null;

delete from students duplicate
using canonical_student_pairs pairs
where duplicate.id = pairs.duplicate_id
  and not exists (
    select 1
    from submissions sub
    where sub.student_id = duplicate.id
  );

commit;
