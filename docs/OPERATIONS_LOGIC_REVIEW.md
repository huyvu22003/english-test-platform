# OPERATIONS LOGIC REVIEW — Trung tâm tiếng Anh

Cập nhật: 2026-07-24

Mục tiêu review: kiểm tra logic vận hành của hệ thống theo góc nhìn một trung tâm tiếng Anh dùng thật: quản lý học viên/lớp, tạo buổi thi, học sinh làm bài, giáo viên chấm, học sinh xem tiến bộ, admin theo dõi tồn đọng.

## Cập nhật sau khi xử lý ưu tiên 2026-07-24

- Đã siết `Tổng quan vận hành` theo phạm vi quyền client-side giống `Hàng đợi chấm & Điểm`: admin xem toàn hệ thống; teacher/grader chỉ tính bài được giao hoặc bài thuộc lớp phụ trách mà dữ liệu hiện tại cho phép thấy.
- Đã thêm bộ lọc vận hành theo lớp, trạng thái tồn bài và giáo viên phụ trách.
- Đã chuẩn hóa thao tác trạng thái trong màn chấm bài: `Nhận chấm`, `Gửi review`, `Đưa về đang chấm`, và `Lưu điểm & chấm xong`.
- Đã bổ sung link từ cảnh báo vận hành sang Roster filter tương ứng, kiểm tra roster thiếu/trùng mã/email, quality gate trước import, dashboard lớp trong Chẩn đoán, và mobile card view cho các bảng admin chính ở Operations/Roster/Diagnostics.
- Đã xác nhận production DB bằng Supabase Management API: `class_teachers`, `profiles.active`, `exam_sessions.class_id`, `rpc_session_by_code_for_student`, `rpc_student_by_code` đều có; Edge Function `create-staff-account` trả `OPTIONS 200`.

## Kết luận nhanh

Logic lõi hiện đúng hướng cho trung tâm tiếng Anh quy mô nhỏ/vừa:

- Có roster học viên/lớp, mã học viên, email để nối bài làm vào hồ sơ.
- Có buổi thi/mã thi, giới hạn lớp, thời gian mở/đóng, một lần nộp.
- Writing đi qua hàng đợi chấm, chấm 4 tiêu chí IELTS, có feedback và sửa câu.
- Dashboard vận hành đã có tồn bài, quá hạn, workload giáo viên, thống kê theo lớp.
- Học sinh xem tiến bộ theo band/CEFR và feedback sau khi bài đã chấm.

Điểm cần ưu tiên chỉnh tiếp: chuẩn hóa workflow giao bài/chấm bài/review để vận hành đỡ lệ thuộc thao tác thủ công của admin.

## Checklist vận hành chuẩn

### 1. Vai trò và quyền

- [x] Owner/admin có quyền quản trị staff, lớp, buổi thi, nội dung, bài nộp.
- [x] Content editor chỉ quản lý nội dung đề.
- [x] Teacher/grader có quyền chấm theo bài được giao hoặc lớp phụ trách.
- [x] Tài khoản có trạng thái active/inactive.
- [x] Trang Tổng quan vận hành lọc số liệu theo quyền giống Hàng đợi chấm ở client; RLS production vẫn là lớp bảo vệ bắt buộc.
- [ ] Cần hiển thị rõ vai trò hiện tại trên giao diện admin để giáo viên biết mình đang ở quyền nào.

### 2. Roster học viên/lớp

- [x] Có CRUD lớp và học viên.
- [x] Học viên có mã, họ tên, email, lớp.
- [x] Buổi thi có thể giới hạn theo lớp.
- [x] Học sinh vào phòng thi bằng mã học viên, không cho guest vào phòng thi.
- [x] Cần cảnh báo trùng email/trùng mã học viên ngay trên UI trước khi lưu.
- [ ] Cần màn import roster hàng loạt riêng nếu trung tâm nhập danh sách lớp lớn.

### 3. Buổi thi và mã thi

- [x] Admin tạo buổi thi gắn 1 đề, mã thi, thời gian mở/đóng.
- [x] Có tùy chọn một lần nộp.
- [x] Có ngưỡng tự nộp khi vi phạm.
- [x] Có tùy chọn hiện điểm ngay cho bài tự chấm.
- [x] Có xuất bảng điểm theo buổi thi.
- [x] Cần trạng thái rõ hơn: Sắp mở / Đang mở / Đã đóng / Đề bị khóa.
- [x] Cần nút sao chép link/mã thi để gửi giáo viên/học viên nhanh.
- [ ] Chưa có nhiều mã/phiên bản đề trong cùng một buổi thi.

### 4. Luồng học sinh

- [x] Học sinh có trang chủ, vào phòng thi, làm bài, nộp bài.
- [x] Writing có đếm từ và chống gian lận mức răn đe.
- [x] MCQ/Placement tự chấm server-side, không lộ đáp án xuống client.
- [x] Progress chỉ hiển thị bài đã chấm.
- [x] Cần làm rõ sau khi nộp Writing: bài đang chờ chấm, khi nào xem được kết quả.
- [ ] Cần luồng quên mã học viên/liên hệ giáo viên.
- [x] Cần kiểm tra kỹ mobile cho phòng thi dài, đặc biệt audio/reading + thanh timer.

### 5. Luồng chấm bài

- [x] Hàng đợi chấm có lọc tên/email/chủ đề/trạng thái/giáo viên.
- [x] Dashboard có nút Chấm mở thẳng đúng bài trong Hàng đợi chấm.
- [x] Có gán bài cho giáo viên.
- [x] Có draft local khi chấm dở.
- [x] Chấm 4 tiêu chí IELTS và tự tính overall/CEFR.
- [x] Có feedback nhanh và sửa câu chi tiết.
- [x] Có thao tác chuyển bài sang `in_review` rõ ràng bằng nút `Gửi review`.
- [x] Có thao tác đưa bài từ `in_review` về `assigned` bằng nút `Đưa về đang chấm`; hoàn tất bằng `Lưu điểm & chấm xong`.
- [ ] Chưa có SLA/ưu tiên tự động theo thời gian chờ, lớp, giáo viên phụ trách.
- [ ] Cần cảnh báo khi giáo viên đang chấm bài không thuộc lớp/không được giao, nếu quyền DB cho phép.

### 6. Dashboard vận hành

- [x] Có tổng bài chờ xử lý, bài quá 36 giờ, học viên chưa xếp lớp, buổi thi đang mở.
- [x] Có workload giáo viên.
- [x] Có thống kê theo lớp: số học viên, chờ chấm, đã chấm, band trung bình.
- [x] Có danh sách bài cần xử lý gần nhất và thao tác Chấm nhanh.
- [x] Đã thêm filter theo lớp, giáo viên và trạng thái tồn bài.
- [x] Đã thêm phân loại tồn bài: chưa giao, đã giao, quá 36 giờ, cần review.
- [x] Nên đưa cảnh báo "học viên chưa email/mã" thành link sang Roster với filter tương ứng.

### 7. Nội dung đề và import

- [x] Có ngân hàng topic/test/passage/question.
- [x] Có import CSV cho đề viết và trắc nghiệm.
- [x] Có phân quyền content editor.
- [ ] Chưa tách ngân hàng item để tái sử dụng câu hỏi giữa nhiều đề.
- [x] Cần preview chất lượng đề sau import: thiếu đáp án, thiếu level, câu trùng.

### 8. Báo cáo và tiến bộ

- [x] Student Progress có band/CEFR, biểu đồ Writing và nhận xét khích lệ.
- [x] Có export Excel/bảng điểm cho hàng đợi và buổi thi.
- [x] Cần dashboard lớp cho giáo viên: trung bình, học viên yếu, tiêu chí Writing yếu nhất.
- [ ] Cần báo cáo phụ huynh/học viên dạng PDF hoặc trang in gọn.
- [ ] Placement hiện chủ yếu Use of English demo, chưa combine đủ Reading/Listening/Writing/Speaking.

### 9. Mobile

- [x] Progress chart đã chỉnh mobile nhỏ.
- [x] Các bảng admin trọng yếu đã có dạng card mobile hoặc fallback cuộn ngang.
- [x] Dashboard vận hành đã chuyển các bảng chính sang card mobile và build kiểm tra sau thay đổi bảng/cột.
- [x] Hàng đợi chấm trên mobile đã tối ưu detail chấm/score panel và nút lưu fixed bottom.
- [x] Phòng thi mobile cần ưu tiên ổn định timer, fullscreen fallback, textarea Writing.

### 10. Dữ liệu và an toàn

- [x] Public route dùng RPC, không đọc trực tiếp bảng đáp án.
- [x] Có migration siết RLS public route.
- [x] Có RLS theo role/lớp phụ trách cho bài nộp, lớp, học viên.
- [x] Cần xác nhận production đã chạy đủ migration mới nhất trước khi dùng thật.
- [ ] `schema.sql` là baseline, còn production cần các migration bổ sung; khi onboarding phải chạy đúng thứ tự.
- [ ] Cần backup/export dữ liệu định kỳ khi bắt đầu vận hành thật.

## Đánh giá logic theo luồng thực tế

### Luồng A — Xếp lớp / đầu vào

Hiện có Placement tự chấm và roster, đủ để chạy demo xếp lớp. Tuy nhiên để dùng thật, cần nội dung placement chuẩn hơn và cách tổng hợp CEFR nhiều kỹ năng. Chưa nên coi placement hiện tại là quyết định xếp lớp cuối cùng nếu chưa có bộ đề chuẩn.

### Luồng B — Kiểm tra định kỳ Writing

Đây là luồng mạnh nhất hiện tại. Học sinh làm Writing, giáo viên chấm 4 tiêu chí, học sinh xem feedback và tiến bộ. Logic phù hợp với trung tâm IELTS vì giáo viên cần phản hồi chi tiết hơn là chỉ có điểm.

Điểm cần bổ sung là SLA vận hành: bài nào chưa giao, bài nào quá hạn, bài nào cần review, giáo viên nào đang quá tải.

### Luồng C — Buổi thi lớp/khóa

Buổi thi/mã thi đã đủ dùng cho mock/progress test: có giới hạn lớp, thời gian, chống nộp nhiều lần, xuất bảng điểm. Cần bổ sung thao tác copy mã/link và trạng thái dễ đọc để admin không nhầm buổi đang mở hay đã đóng.

### Luồng D — Chấm và trả kết quả

Hệ thống đang có đủ bước chấm cơ bản. Rủi ro là trạng thái `in_review` chưa thành workflow thật. Nếu trung tâm có người chấm và người duyệt khác nhau, cần thêm nút "Gửi review", "Duyệt", "Trả lại giáo viên".

### Luồng E — Theo dõi tiến bộ

Progress hiện đúng hướng: chỉ hiện bài đã chấm, có biểu đồ và nhận xét. Cần mở rộng từ cá nhân sang lớp để giáo viên nhìn được học viên nào tụt/tiến bộ theo kỳ.

## Ưu tiên chỉnh tiếp

### P0 — Nên làm trước khi vận hành thật

1. Xác nhận production đã chạy đủ migration RLS/vận hành/class restriction.
2. Siết dashboard Operations theo quyền giống SubmissionsPage.
3. Làm rõ workflow trạng thái bài: `submitted` → `assigned` → `in_review` → `graded`.
4. Thêm filter nhanh trong Operations: chưa giao, quá hạn, cần review, theo lớp.

### P1 — Nên làm để giáo viên dùng mượt

1. Nút copy mã/link buổi thi.
2. Link từ cảnh báo dashboard sang đúng trang/filter.
3. Modal/drawer chấm bài trên mobile thay vì mở chi tiết trong table row.
4. Import roster hàng loạt.

### P2 — Mở rộng sau

1. Báo cáo lớp/phụ huynh.
2. Combine CEFR nhiều kỹ năng.
3. Ngân hàng câu hỏi tái sử dụng.
4. Nhiều phiên bản đề trong cùng buổi thi.
