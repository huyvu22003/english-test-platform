# 📊 PROGRESS — Tiến độ dự án

> **ĐANG Ở ĐÂU, đã xong gì, còn gì.** Cập nhật mỗi khi hoàn thành/đổi trạng thái một hạng mục. Đây là nơi đầu tiên dev mới nhìn để biết "giờ làm gì tiếp".
>
> Cập nhật lần cuối: **2026-06-25**.

Chú thích: ✅ xong · 🔄 đang làm · 🔜 sắp tới · 💤 hoãn · ⬜ chưa bắt đầu

---

> 🧭 **Đổi định hướng (2026-06-23):** sản phẩm là **hệ đánh giá năng lực & theo dõi tiến bộ** (xem `docs/VISION.md`, ADR-009). Lộ trình mới dùng Phase **A–F**; lộ trình 1–4 cũ vẫn liệt kê bên dưới để tham chiếu.

## Tóm tắt nhanh
- **Phase 0 + 1–3 (nền + app MCQ/Writing cơ bản):** ✅ đã merge `main` (PR #1, #2).
- **Phase A (Nền đánh giá: CEFR/levels + roster + tests.prompt/purpose):** ✅ code xong (PR này).
- **Phase B (Writing chấm tay: 11 topic, bốc đề ngẫu nhiên, 4 tiêu chí, tiến bộ):** ✅ đã merge (PR #3).
- **Phase C (Roster + đăng nhập bằng mã + chẩn đoán điểm yếu):** ✅ đã merge (PR #4).
- **Phase D (Placement tự chấm ra CEFR — engine threshold):** ✅ đã merge (PR #5).
- **Phase E (Import Excel/CSV):** ✅ đã merge (PR #6).
- **Phase F (Buổi thi + mã thi + một-lần-nộp):** ✅ code xong (PR này) — **hết lộ trình A–F**.
- **Chạy thật:** ⬜ cần tạo Supabase + chạy `schema.sql` + **`seed.sql`** + tạo GV + `.env` (xem `docs/SETUP.md`).

## Việc TIẾP THEO nên làm (ưu tiên từ trên xuống)
1. 🔄 **Khảo sát chủ trung tâm bằng phiếu nâng cấp**: gửi `public/forms/Phieu-khao-sat-nang-cap-English-Test-Platform.html`, thu câu trả lời, chốt Must/Should/Could cho trung tâm 3 chi nhánh.
2. 🔄 **Smoke test production phần Đọc/Nghe**: sau khi merge lối vào **Luyện Đọc & Nghe**, kiểm tra học sinh chọn đề Reading/Listening → làm bài → nộp → thấy điểm.
3. ⬜ **Kết nối Supabase + smoke test toàn hệ**: `schema.sql` + `seed.sql` + `seed_placement.sql` → xếp lớp (CEFR) + luyện viết + buổi thi (mã) → GV chấm/chẩn đoán/tiến bộ.
4. 🔜 **Phase G1: vận hành thật cho trung tâm nhiều chi nhánh** — export bảng điểm buổi thi, chuẩn hóa chi nhánh/lớp/học viên, tài liệu vận hành.
5. 🔜 **Combine CEFR nhiều kỹ năng** → 1 trình độ tổng (placement gồm reading+listening+UoE).
6. 🔜 **Tách ngân hàng `items`** khỏi đề để tái dùng câu (refactor lớn).
7. 🔜 **Nội dung thật** Reading/Listening; xuất bảng điểm buổi thi; upload .xlsx trực tiếp.

---

## Chi tiết theo Phase

### Phase G — Mở rộng cho trung tâm nhiều chi nhánh 🔄
- [x] Khung roadmap G0–G5 cho trung tâm tiếng Anh tư nhân 3 chi nhánh (`docs/CENTER_GROWTH_ROADMAP.md`)
- [x] Phiếu khảo sát HTML để chủ trung tâm điền nhu cầu nâng cấp (`public/forms/Phieu-khao-sat-nang-cap-English-Test-Platform.html`)
- [ ] Thu phiếu đã điền và chuyển thành backlog Must/Should/Could/Later
- [ ] Chốt Phase G1 MVP: vận hành thật + export bảng điểm buổi thi + chuẩn hóa chi nhánh/lớp
- [ ] Thiết kế schema/permission multi-branch nếu khảo sát xác nhận cần làm ngay

### Phase A — Nền đánh giá ✅ (PR này)
- [x] Bảng `levels` (CEFR ↔ IELTS band ↔ tên lớp) + seed A1–C2
- [x] Roster: bảng `classes`, `students` (+ RLS giáo viên) — upsert học viên theo email khi nộp
- [x] `tests.prompt` (đề bài Task 2) + `tests.purpose` (placement/progress/exit)
- [x] `etp_band_to_cefr` + cột chấm tay trong `submissions` (4 tiêu chí + overall + cefr + status + feedback)

### Phase B — Writing chấm tay ✅ (PR này)
- [x] `seed.sql`: 11 chủ đề Writing (13 đề) trích từ app v1
- [x] HS: chọn chủ đề → `rpc_pick_prompt` bốc ngẫu nhiên → viết (đếm từ) + khóa fullscreen/log → `rpc_submit_writing`
- [x] GV: hàng đợi chấm, chấm 4 tiêu chí IELTS → overall + CEFR + nhận xét; lọc theo trạng thái
- [x] Tiến bộ: trang `/progress` tra theo email + đường band (SVG)
- [x] Admin: nhập/sửa đề bài (prompt) cho topic Writing
- [x] (Phase C) Đăng nhập học viên bằng mã + quản lý roster/lớp trên UI

### Phase F — Buổi thi (exit/mock) + Mã thi ✅ (PR này)
- [x] Schema: cột `exam_sessions` (test_id, one_submission, max_violations, show_result); RPC `rpc_session_by_code`, `rpc_submit_session`
- [x] GV: `SessionsPage` tạo buổi + sinh mã + cửa sổ thời gian + một-lần-nộp + ngưỡng tự nộp + hiện điểm
- [x] HS: `/exam-room` (nhập mã) → `SessionExamPage` (MCQ/viết, tự nộp khi vi phạm ≥ ngưỡng) → kết quả
- [ ] 🔜 Xáo đề theo HS / nhiều đề / xuất bảng điểm buổi thi
- [ ] 🔜 Ràng buộc theo lớp (chỉ HS trong lớp được vào)

### Phase E — Import Excel/CSV ✅ (PR #6)
- [x] `src/lib/csv.ts`: parser CSV (không thêm thư viện)
- [x] `ImportPage`: nhập đề Viết (topic+prompt) và câu trắc nghiệm (cefr_level/options/correct)
- [x] Tải mẫu CSV, xem trước, tự tạo topic/đề, gom câu theo `topic + test_title`, báo lỗi theo dòng
- [ ] 🔜 Tách ngân hàng `items` khỏi đề để tái sử dụng câu (refactor lớn — để sau)
- [ ] 🔜 Hỗ trợ upload .xlsx trực tiếp (hiện dùng CSV — ADR-017)

### Phase D — Placement tự chấm ra CEFR ✅ (PR #5)
- [x] Schema: `questions.cefr_level`, `tests.pass_threshold`, `submissions.result_detail`, skill `use_of_english`; `etp_is_correct`
- [x] RPC `rpc_list_placements`, `rpc_submit_placement` (engine threshold: mức cao nhất đạt liên tiếp)
- [x] `seed_placement.sql`: đề DEMO Use of English (12 câu gốc A2–C1)
- [x] HS: mục "Kiểm tra xếp lớp" → `PlacementExamPage` → kết quả CEFR + chi tiết mức
- [x] GV: TestEditor chọn `purpose`/ngưỡng + gắn mức CEFR câu hỏi; TopicsPage thêm skill UoE
- [ ] 🔜 Combine CEFR nhiều kỹ năng thành 1 trình độ tổng
- [ ] 🔜 Nội dung Reading/Listening thật (hiện chỉ có seed Use of English demo)

### Phase C — Roster + đăng nhập bằng mã + chẩn đoán ✅ (PR #4)
- [x] RPC `rpc_student_by_code`; trang học sinh thêm đăng nhập bằng mã
- [x] `RosterPage`: CRUD lớp/khóa + học viên (mã, tên, email, lớp)
- [x] `DiagnosticsPage`: trung bình 4 tiêu chí theo lớp & học viên, tô tiêu chí yếu nhất
- [ ] 🔜 Chẩn đoán theo `tag`/kỹ năng con (cần gắn tag câu hỏi — Phase D/E)
- [ ] 🔜 Magic-link cho học viên (hiện dùng mã/email)

### Phase 0 — Nền móng ✅
- [x] Cấu trúc dự án + scaffold React + Vite + TS
- [x] `supabase/schema.sql`: bảng + RLS + RPC khung
- [x] `src/lib/supabase.ts`: client đọc `.env`
- [x] Tài liệu PLAN/SETUP/README/CONTRIBUTING/CHANGELOG

### Phase 1 — Auth + Admin + thi Viết ✅ (trong PR #1)
- [x] Đăng nhập giáo viên (Supabase Auth) + `RequireAuth`
- [x] Khung quản trị (`AdminLayout`, sidebar, đăng xuất)
- [x] CRUD chủ đề (`TopicsPage`) + CRUD đề
- [x] Trình soạn đề (`TestEditorPage`): meta đề + tư liệu + câu hỏi
- [x] Học sinh thi Viết (essay + đếm từ) với khóa fullscreen + log gian lận
- [x] Lưu bài nộp qua `rpc_submit`

### Phase 2 — Reading/Listening + chấm server ✅ (trong PR #1)
- [x] Nhập câu hỏi 4 loại: `single` / `multi` / `tfng` / `fill`
- [x] Đoạn đọc + audio (qua `media_url`)
- [x] `rpc_get_test`: xáo trộn câu hỏi + đáp án, bỏ cột `correct`
- [x] `rpc_submit`: chấm server theo từng loại + chuẩn hóa (`etp_norm`)
- [x] Quy đổi band xấp xỉ (`etp_band`) + màn kết quả
- [x] Trang chủ học sinh có mục **Luyện Đọc & Nghe** để vào đề trắc nghiệm Reading/Listening
- [x] Upload audio/ảnh **trong app** qua Supabase Storage (nút "Tải MP3/ảnh"); vẫn giữ ô dán link (R2 tùy chọn)
- [ ] 💤 Phân phiên bản xoay vòng theo học sinh (mới chỉ xáo trộn trong 1 đề)

### Phase 3 — Dashboard ✅ (trong PR #1)
- [x] Danh sách bài nộp + lọc theo tên/email/chủ đề
- [x] Xem bài Viết + nhật ký vi phạm
- [x] Chấm tay (điểm/band) cho bài Viết
- [x] Xuất CSV (mở bằng Excel, BOM UTF-8)
- [ ] 🔜 Buổi thi/mã thi (UI cho `exam_sessions`)
- [ ] 🔜 Xuất PDF / biểu đồ thống kê
- [ ] 🔜 Ngân hàng câu hỏi tái sử dụng

### Phase 4 — Hoàn thiện 🔜
- [x] Upload media trong app (Supabase Storage — bucket `media`); R2 vẫn dùng được qua ô dán link
- [ ] Buổi thi/mã thi + phân phiên bản xoay vòng
- [ ] Phân quyền nhiều giáo viên (admin/teacher)
- [ ] Import Excel/CSV (di trú dữ liệu v1)
- [ ] Tối ưu mobile + fallback khi không vào được fullscreen
- [ ] Tài liệu vận hành cho trung tâm

---

## Nợ kỹ thuật / rủi ro đang theo dõi
| Mục | Ghi chú | Liên quan |
|---|---|---|
| Band chỉ xấp xỉ | Cần hiệu chỉnh `etp_band` theo thang thật | ADR-006 |
| Học sinh ẩn danh | Email tự khai, chưa xác thực; cần mã thi để siết | ADR-004 |
| Chống gian lận không tuyệt đối | Chỉ răn đe + log; tùy trình duyệt | ADR-005 |
| Media | ✅ Upload trong app (Supabase Storage); R2 tùy chọn qua ô dán link | ADR-007 |
| Re-run schema | `create policy` chạy lại trên DB cũ sẽ lỗi "đã tồn tại" (DB mới thì OK) | — |
