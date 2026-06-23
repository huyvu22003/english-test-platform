-- =====================================================================
-- SEED — 11 topic Writing Task 2 (trích từ app v1 app_testwriting.xlsx)
-- Chạy SAU schema.sql, trên DB MỚI. Mỗi topic = 1 chủ đề writing;
-- mỗi đề bài = 1 dòng tests (prompt). Học sinh bốc NGẪU NHIÊN 1 đề trong topic.
-- =====================================================================

-- Education: 3 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Education', 'writing', true, 1) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Some people think that teachers should be responsible for teaching students to judge right and wrong and to behave well. Some say that teachers should teach students about academic subjects. Discuss both views and give your opinion.'),
    ('B', 'Nowadays, some universities offer graduate students skills that assist them to find employment, but some people believe that the main function of a university should be to access knowledge for its sake. What is your opinion?'),
    ('C', 'Education used to be a short period of training, but today, people treat it
like a lifelong practice. Do you agree or disagree?')
  ) as v(label, prompt);

-- Technology: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Technology', 'writing', true, 2) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Describe a hobby you enjoy and explain why it is important to you (120-180 words).')
  ) as v(label, prompt);

-- Environment: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Environment', 'writing', true, 3) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Write about a person who has influenced your life (120-180 words).')
  ) as v(label, prompt);

-- Government: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Government', 'writing', true, 4) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Modern societies need specialists in certain fields, but not others. Some people, therefore, think that governments should pay university fees for students who study subjects that are needed by society. Those who choose to study less relevant subjects should not receive government funding.
Do the advantages of such an educational policy outweigh the disadvantages?')
  ) as v(label, prompt);

-- Society (Group 1): 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Society (Group 1)', 'writing', true, 5) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Do you think technology makes our lives better or worse? Give your opinion (120-180 words).')
  ) as v(label, prompt);

-- Society (Group 2): 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Society (Group 2)', 'writing', true, 6) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Write about the most memorable trip you have ever had (120-180 words).')
  ) as v(label, prompt);

-- Lifestyle: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Lifestyle', 'writing', true, 7) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Do you think technology makes our lives better or worse? Give your opinion (120-180 words).')
  ) as v(label, prompt);

-- Animals & Plants: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Animals & Plants', 'writing', true, 8) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Write about your plans and dreams for the future (120-180 words).')
  ) as v(label, prompt);

-- Culture: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Culture', 'writing', true, 9) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Describe a book or film that you really enjoyed (120-180 words).')
  ) as v(label, prompt);

-- Others: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Others', 'writing', true, 10) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'What does a healthy lifestyle mean to you? (120-180 words).')
  ) as v(label, prompt);

-- Topic 10: 1 đề
with t as (
  insert into topics(name, skill, active, sort_order) values ('Topic 10', 'writing', true, 11) returning id
)
insert into tests(topic_id, version_label, prompt, title, time_limit_min, min_words, purpose, active)
select t.id, v.label, v.prompt, null, 40, 250, 'progress', true from t,
  (values
    ('A', 'Write about an important event in your life and what you learned from it (120-180 words).')
  ) as v(label, prompt);
