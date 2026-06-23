# 📊 PROGRESS — Tiến độ dự án

> **ĐANG Ở ĐÂU, đã xong gì, còn gì.** Cập nhật mỗi khi hoàn thành/đổi trạng thái một hạng mục. Đây là nơi đầu tiên dev mới nhìn để biết "giờ làm gì tiếp".
>
> Cập nhật lần cuối: **2026-06-23**.

Chú thích: ✅ xong · 🔄 đang làm · 🔜 sắp tới · 💤 hoãn · ⬜ chưa bắt đầu

---

> 🧭 **Đổi định hướng (2026-06-23):** sản phẩm là **hệ đánh giá năng lực & theo dõi tiến bộ** (xem `docs/VISION.md`, ADR-009). Lộ trình mới dùng Phase **A–F**; lộ trình 1–4 cũ vẫn liệt kê bên dưới để tham chiếu.

## Tóm tắt nhanh
- **Phase 0 + 1–3 (nền + app MCQ/Writing cơ bản):** ✅ đã merge `main` (PR #1, #2).
- **Phase A (Nền đánh giá: CEFR/levels + roster + tests.prompt/purpose):** ✅ code xong (PR này).
- **Phase B (Writing chấm tay: 11 topic, bốc đề ngẫu nhiên, 4 tiêu chí, tiến bộ):** ✅ code xong (PR này).
- **Phase C–F:** 🔜 chưa bắt đầu.
- **Chạy thật:** ⬜ cần tạo Supabase + chạy `schema.sql` + **`seed.sql`** + tạo GV + `.env` (xem `docs/SETUP.md`).

## Việc TIẾP THEO nên làm (ưu tiên từ trên xuống)
1. ⬜ **Kết nối Supabase + smoke test**: chạy `schema.sql`+`seed.sql` → HS chọn chủ đề → viết → nộp → GV chấm 4 tiêu chí → HS xem tiến bộ.
2. 🔜 **Phase C — Chẩn đoán**: bản đồ điểm yếu theo kỹ năng/chủ đề; lớp/cohort (`classes`).
3. 🔜 **Phase D — Placement tự chấm**: Reading/Listening/Use of English + engine `threshold` ra CEFR.
4. 🔜 **Phase E — Ngân hàng câu hỏi**: tách `items` khỏi đề + import Excel.
5. 🔜 **Phase F — Exit/Mock**: phiên thi + mã thi + chống gian lận (khi cần high-stakes).

---

## Chi tiết theo Phase

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
- [ ] 🔜 Đăng nhập học viên bằng mã/magic-link (hiện dùng email tự khai)
- [ ] 🔜 Quản lý roster/lớp trên UI (hiện tạo tự động khi nộp)

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
- [ ] 💤 Upload audio lên R2 (đang dán link — chuyển sang Phase 4)
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
- [ ] Upload R2 (signed URL)
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
| Media thủ công | Chưa upload R2, phải dán link | ADR-007 |
| Re-run schema | `create policy` chạy lại trên DB cũ sẽ lỗi "đã tồn tại" (DB mới thì OK) | — |
