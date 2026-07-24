-- =====================================================================
-- Placement Suite A — bộ xếp lớp mẫu đủ kỹ năng.
-- Nội dung tự viết, dùng làm khung vận hành: Reading, Listening, Writing,
-- Use of English. Có thể chạy nhiều lần; script sẽ cập nhật lại bộ A mẫu.
-- =====================================================================

do $$
declare
  v_reading_topic uuid;
  v_listening_topic uuid;
  v_writing_topic uuid;
  v_uoe_topic uuid;
  v_reading_test uuid;
  v_listening_test uuid;
  v_writing_test uuid;
  v_uoe_test uuid;
  v_reading_passage uuid;
  v_listening_passage uuid;
begin
  alter table topics drop constraint if exists topics_skill_check;
  alter table topics add constraint topics_skill_check
    check (skill in ('writing','reading','listening','use_of_english'));

  select id into v_reading_topic from topics
  where name = 'Placement A — Reading' and skill = 'reading' and category = 'placement'
  order by created_at
  limit 1;

  select id into v_listening_topic from topics
  where name = 'Placement A — Listening' and skill = 'listening' and category = 'placement'
  order by created_at
  limit 1;

  select id into v_writing_topic from topics
  where name = 'Placement A — Writing' and skill = 'writing' and category = 'placement'
  order by created_at
  limit 1;

  select id into v_uoe_topic from topics
  where name = 'Placement A — Use of English' and skill = 'use_of_english' and category = 'placement'
  order by created_at
  limit 1;

  if v_reading_topic is null then
    insert into topics(name, skill, category, active, sort_order)
    values ('Placement A — Reading', 'reading', 'placement', true, 30)
    returning id into v_reading_topic;
  end if;
  if v_listening_topic is null then
    insert into topics(name, skill, category, active, sort_order)
    values ('Placement A — Listening', 'listening', 'placement', true, 31)
    returning id into v_listening_topic;
  end if;
  if v_writing_topic is null then
    insert into topics(name, skill, category, active, sort_order)
    values ('Placement A — Writing', 'writing', 'placement', true, 32)
    returning id into v_writing_topic;
  end if;
  if v_uoe_topic is null then
    insert into topics(name, skill, category, active, sort_order)
    values ('Placement A — Use of English', 'use_of_english', 'placement', true, 33)
    returning id into v_uoe_topic;
  end if;

  select id into v_reading_test from tests
  where topic_id = v_reading_topic and version_label = 'A' and purpose = 'placement'
  order by created_at
  limit 1;
  if v_reading_test is null then
    insert into tests(topic_id, version_label, title, purpose, time_limit_min, min_words, pass_threshold, active)
    values (v_reading_topic, 'A', 'Placement A — Reading', 'placement', 30, 0, 0.6, true)
    returning id into v_reading_test;
  else
    update tests
    set title = 'Placement A — Reading',
        time_limit_min = 30,
        min_words = 0,
        pass_threshold = 0.6,
        active = true
    where id = v_reading_test;
  end if;

  select id into v_listening_test from tests
  where topic_id = v_listening_topic and version_label = 'A' and purpose = 'placement'
  order by created_at
  limit 1;
  if v_listening_test is null then
    insert into tests(topic_id, version_label, title, purpose, time_limit_min, min_words, pass_threshold, active)
    values (v_listening_topic, 'A', 'Placement A — Listening', 'placement', 20, 0, 0.6, true)
    returning id into v_listening_test;
  else
    update tests
    set title = 'Placement A — Listening',
        time_limit_min = 20,
        min_words = 0,
        pass_threshold = 0.6,
        active = true
    where id = v_listening_test;
  end if;

  select id into v_writing_test from tests
  where topic_id = v_writing_topic and version_label = 'A' and purpose = 'placement'
  order by created_at
  limit 1;
  if v_writing_test is null then
    insert into tests(topic_id, version_label, title, prompt, purpose, time_limit_min, min_words, pass_threshold, active)
    values (
      v_writing_topic,
      'A',
      'Placement A — Writing',
      'Write about a recent change in your school, workplace, or neighbourhood. Explain what changed, why it matters, and whether you think it is a positive development. Give reasons and examples from your own experience.',
      'placement',
      30,
      150,
      0.6,
      true
    )
    returning id into v_writing_test;
  else
    update tests
    set title = 'Placement A — Writing',
        prompt = 'Write about a recent change in your school, workplace, or neighbourhood. Explain what changed, why it matters, and whether you think it is a positive development. Give reasons and examples from your own experience.',
        time_limit_min = 30,
        min_words = 150,
        pass_threshold = 0.6,
        active = true
    where id = v_writing_test;
  end if;

  select id into v_uoe_test from tests
  where topic_id = v_uoe_topic and version_label = 'A' and purpose = 'placement'
  order by created_at
  limit 1;
  if v_uoe_test is null then
    insert into tests(topic_id, version_label, title, purpose, time_limit_min, min_words, pass_threshold, active)
    values (v_uoe_topic, 'A', 'Placement A — Use of English', 'placement', 20, 0, 0.6, true)
    returning id into v_uoe_test;
  else
    update tests
    set title = 'Placement A — Use of English',
        time_limit_min = 20,
        min_words = 0,
        pass_threshold = 0.6,
        active = true
    where id = v_uoe_test;
  end if;

  delete from questions where test_id in (v_reading_test, v_listening_test, v_uoe_test);
  delete from passages where test_id in (v_reading_test, v_listening_test);

  insert into passages(test_id, kind, body, sort_order)
  values (
    v_reading_test,
    'reading',
    'A small language school in Da Nang changed its evening timetable after asking learners what made regular attendance difficult. Many students said they missed classes because the first lesson began too soon after work. The school moved the start time from 6:00 p.m. to 6:45 p.m. and added a short online review task before each lesson. After eight weeks, attendance rose from 72 percent to 86 percent. Teachers also noticed that students arrived calmer and participated more actively. However, a few learners who lived far away preferred the old schedule because they could get home earlier. The manager decided to keep the new timetable for one more term and review the data again.',
    1
  )
  returning id into v_reading_passage;

  insert into passages(test_id, kind, body, sort_order)
  values (
    v_listening_test,
    'audio',
    'Listening script for teachers to record or paste into an audio file: Welcome to Riverside Community Library. From next Monday, the library will open at 8:30 in the morning and close at 7:00 in the evening from Monday to Friday. Weekend hours will stay the same. The study room on the second floor must now be booked online before use. Bookings are free, but each person can reserve a maximum of two hours per day. The library cafe will be closed for repairs until the end of the month, so visitors should bring water if they plan to study for a long time. For questions, please speak to staff at the front desk.',
    1
  )
  returning id into v_listening_passage;

  insert into questions(test_id, passage_id, qtype, prompt, options, correct, cefr_level, points, sort_order)
  select v_reading_test, v_reading_passage, v.qtype, v.prompt, v.options::jsonb, v.correct::jsonb, v.cefr, 1, v.ord
  from (values
    ('single', 'What was the main reason for changing the timetable?', '["Students wanted shorter courses","Students could not arrive soon after work","Teachers wanted longer breaks","The school moved to a new building"]', '"Students could not arrive soon after work"', 'A1', 1),
    ('single', 'What time does the evening lesson now start?', '["6:00 p.m.","6:30 p.m.","6:45 p.m.","7:15 p.m."]', '"6:45 p.m."', 'A1', 2),
    ('single', 'What happened after eight weeks?', '["Attendance increased","The school closed the evening class","Teachers cancelled online tasks","Most students changed school"]', '"Attendance increased"', 'A2', 3),
    ('tfng', 'All students preferred the new timetable.', '[]', '"false"', 'A2', 4),
    ('single', 'Which word is closest in meaning to "participated"?', '["joined in","complained","waited","travelled"]', '"joined in"', 'B1', 5),
    ('single', 'Why did the manager keep the timetable for one more term?', '["To collect more evidence before deciding","To reduce teacher salaries","To replace classroom lessons with videos","To make every class finish earlier"]', '"To collect more evidence before deciding"', 'B2', 6),
    ('single', 'What can be inferred about the school manager?', '["The manager uses learner feedback and data","The manager ignores attendance problems","The manager wants only online classes","The manager plans to remove evening lessons"]', '"The manager uses learner feedback and data"', 'C1', 7)
  ) as v(qtype, prompt, options, correct, cefr, ord);

  insert into questions(test_id, passage_id, qtype, prompt, options, correct, cefr_level, points, sort_order)
  select v_listening_test, v_listening_passage, v.qtype, v.prompt, v.options::jsonb, v.correct::jsonb, v.cefr, 1, v.ord
  from (values
    ('single', 'What place is the announcement about?', '["A train station","A community library","A language school","A sports centre"]', '"A community library"', 'A1', 1),
    ('single', 'What time will the library open on weekdays?', '["8:00","8:30","9:00","9:30"]', '"8:30"', 'A1', 2),
    ('single', 'Which area must be booked online?', '["The cafe","The front desk","The study room","The children''s area"]', '"The study room"', 'A2', 3),
    ('single', 'How long can one person reserve the study room per day?', '["One hour","Two hours","Three hours","Four hours"]', '"Two hours"', 'A2', 4),
    ('tfng', 'The library cafe will stay open during repairs.', '[]', '"false"', 'B1', 5),
    ('single', 'Why are visitors advised to bring water?', '["The cafe will be closed temporarily","The water machines are broken","The weather is very hot","The library does not allow drinks"]', '"The cafe will be closed temporarily"', 'B2', 6),
    ('single', 'What is the overall purpose of the announcement?', '["To explain service changes to visitors","To advertise a new cafe menu","To ask people to work at the library","To cancel weekend opening hours"]', '"To explain service changes to visitors"', 'C1', 7)
  ) as v(qtype, prompt, options, correct, cefr, ord);

  insert into questions(test_id, qtype, prompt, options, correct, cefr_level, points, sort_order)
  select v_uoe_test, v.qtype, v.prompt, v.options::jsonb, v.correct::jsonb, v.cefr, 1, v.ord
  from (values
    ('single', 'My brother usually ___ breakfast at seven.', '["have","has","having","had"]', '"has"', 'A1', 1),
    ('single', 'There ___ a new bus stop near my house.', '["is","are","am","be"]', '"is"', 'A1', 2),
    ('single', 'We ___ our teacher yesterday.', '["meet","met","meeting","meets"]', '"met"', 'A2', 3),
    ('single', 'I have lived in this city ___ 2021.', '["for","since","during","ago"]', '"since"', 'A2', 4),
    ('single', 'If I have enough time, I ___ the report tonight.', '["finish","will finish","finished","would finish"]', '"will finish"', 'B1', 5),
    ('single', 'The course was ___ useful that I recommended it to my friend.', '["so","such","too","enough"]', '"so"', 'B1', 6),
    ('single', 'By the time the meeting started, she ___ the notes.', '["prepared","has prepared","had prepared","prepares"]', '"had prepared"', 'B2', 7),
    ('single', 'The new policy is likely ___ attendance next term.', '["improve","to improve","improving","improved"]', '"to improve"', 'B2', 8),
    ('single', 'Rarely ___ such a clear explanation from a speaker.', '["we hear","do we hear","we do hear","hear we"]', '"do we hear"', 'C1', 9),
    ('single', 'Had the team checked the figures earlier, they ___ the error.', '["would avoid","will avoid","would have avoided","avoid"]', '"would have avoided"', 'C1', 10)
  ) as v(qtype, prompt, options, correct, cefr, ord);
end $$;
