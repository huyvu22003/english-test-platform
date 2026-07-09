-- Migration: dọn dẹp cột/bảng legacy không còn dùng trong code
-- Ngày: 2026-07-09
-- VÌ SAO: exam_sessions.topic_id và exam_sessions.settings không được code đọc/ghi;
--         bảng assignments chưa từng có dữ liệu production. Xóa để giảm nhầm lẫn.

-- 1. Xóa cột legacy trên exam_sessions
alter table exam_sessions drop column if exists topic_id;
alter table exam_sessions drop column if exists settings;

-- 2. Xóa bảng assignments (0 bản ghi production, không có code tham chiếu)
drop table if exists assignments;
