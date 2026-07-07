# OPERATIONS — Checklist vận hành

## 1. Smoke test production sau mỗi lần deploy

URL production: `https://english-test-platform.pages.dev`

1. Mở `/` và kiểm tra trang học sinh tải bình thường.
2. Vào phòng thi bằng mã thật hoặc mã test:
   - nhập mã thi;
   - nhập email học sinh thuộc lớp nếu buổi thi giới hạn lớp;
   - xác nhận sai lớp bị chặn trước khi vào bài.
3. Làm thử từng luồng đang dùng:
   - Writing: viết ngắn, nộp, bài vào trạng thái chờ chấm;
   - Reading/Listening/Placement: chọn đáp án, nộp, xem điểm nếu cấu hình cho hiển thị.
4. Đăng nhập giáo viên ở `/admin/login`.
5. Kiểm tra admin:
   - `Buổi thi & Mã thi`: thấy bài nộp theo buổi;
   - `Hàng đợi chấm & Điểm`: mở bài Writing, nhập 4 tiêu chí, lưu;
   - `Xem tiến bộ`: học sinh chỉ thấy bài đã chấm.
6. Chạy build local trước khi báo xong:

```bash
npm run build
```

## 2. Kiểm tra RLS và route public

Public route được phép:

- `/`
- `/exam-room`
- `/writing/:topicId`
- `/exam/:testId`
- `/placement/:testId`
- `/session/:sessionId`
- `/result`
- `/progress`

Admin route phải yêu cầu login:

- `/admin`
- `/admin/topics/*`
- `/admin/tests/*`
- `/admin/submissions`
- `/admin/roster`
- `/admin/diagnostics`
- `/admin/import`
- `/admin/sessions`

Public RPC được phép cho anon:

- `rpc_list_exams`
- `rpc_get_test`
- `rpc_submit`
- `rpc_list_writing_topics`
- `rpc_pick_prompt`
- `rpc_submit_writing`
- `rpc_get_progress`
- `rpc_student_by_code`
- `rpc_list_placements`
- `rpc_submit_placement`
- `rpc_session_by_code`
- `rpc_session_by_code_for_student`
- `rpc_submit_session`

Anon không được đọc trực tiếp bảng nội bộ như `questions`, `tests`, `submissions`, `students`, `classes`, `exam_sessions`. Nếu cần siết lại production, chạy migration:

```sql
supabase/2026-07-06-public-route-rls-hardening.sql
```

## 3. Khi Cloudflare chưa nhận asset mới

1. Kiểm tra HTML production đang trỏ asset nào:

```bash
curl -fsSL https://english-test-platform.pages.dev | grep -o '/assets/[^"]*' | sort -u
```

2. So với file build local trong `dist/assets`.
3. Nếu GitHub đã push mà asset chưa đổi:
   - đợi Cloudflare Pages build hoàn tất;
   - hard refresh trình duyệt;
   - kiểm tra lại endpoint production.
4. Không đổi biến môi trường hoặc secret chỉ để xử lý cache asset.

## 4. Import đề cho giáo viên

1. Vào `/admin/import`.
2. Chọn tab `Đề Viết` hoặc `Trắc nghiệm`.
3. Tải mẫu CSV từ giao diện.
4. Điền dữ liệu, giữ nguyên tên cột.
5. Upload CSV, xem preview trước khi import.
6. Sau import, vào `Ngân hàng đề` hoặc `Trình soạn đề` để kiểm tra prompt/câu hỏi/tư liệu.
