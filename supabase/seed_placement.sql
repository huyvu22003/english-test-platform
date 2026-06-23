-- =====================================================================
-- SEED PLACEMENT — Đề xếp lớp MẪU (Use of English), câu hỏi gắn cefr_level.
-- Chạy SAU schema.sql, trên DB mới. Đây là đề DEMO (câu hỏi gốc, không bản quyền)
-- để chạy thử engine "threshold". Trung tâm thay/bổ sung câu hỏi thật trong app.
-- Engine: mỗi mức tính tỉ lệ đúng; đạt nếu >= pass_threshold (0.6);
-- CEFR = mức cao nhất đạt liên tiếp.
-- =====================================================================

with tp as (
  insert into topics(name, skill, active, sort_order)
  values ('Placement — Use of English', 'use_of_english', true, 20) returning id
),
t as (
  insert into tests(topic_id, version_label, title, purpose, time_limit_min, min_words, pass_threshold, active)
  select id, 'A', 'Bài kiểm tra xếp lớp (Use of English)', 'placement', 20, 0, 0.6, true from tp
  returning id
)
insert into questions(test_id, qtype, prompt, options, correct, cefr_level, points, sort_order)
select t.id, 'single', v.prompt, v.options::jsonb, v.correct::jsonb, v.cefr, 1, v.ord
from t, (values
  -- A2
  ('My sister ___ television every evening.', '["watch","watches","watching","watched"]', '"watches"', 'A2', 1),
  ('There ___ two books on the table.',        '["is","are","am","be"]',                  '"are"',     'A2', 2),
  ('We ___ to the beach last weekend.',        '["go","goes","went","gone"]',             '"went"',    'A2', 3),
  -- B1
  ('If it rains tomorrow, we ___ at home.',     '["stay","will stay","stayed","have stayed"]', '"will stay"', 'B1', 4),
  ('I have known her ___ ten years.',           '["since","for","during","ago"]',          '"for"',     'B1', 5),
  ('This is the man ___ helped me yesterday.',  '["which","who","whose","where"]',         '"who"',     'B1', 6),
  -- B2
  ('By the time we arrived, the film ___.',     '["started","has started","had started","starts"]', '"had started"', 'B2', 7),
  ('She suggested ___ a taxi to the airport.',  '["to take","taking","take","took"]',      '"taking"',  'B2', 8),
  ('I would rather you ___ smoke in here.',     '["do not","did not","not","will not"]',   '"did not"', 'B2', 9),
  -- C1
  ('___ harder, he would have passed the exam.','["If he studied","Had he studied","Did he study","Have he studied"]', '"Had he studied"', 'C1', 10),
  ('No sooner ___ the door than the phone rang.','["I had opened","had I opened","I opened","opened I"]', '"had I opened"', 'C1', 11),
  ('Little ___ that she was being watched.',    '["she knew","did she know","she did know","knew she"]', '"did she know"', 'C1', 12)
) as v(prompt, options, correct, cefr, ord);
