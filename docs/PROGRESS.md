# 📊 PROGRESS — Tiến độ dự án

> **ĐANG Ở ĐÂU, đã xong gì, còn gì.** Cập nhật mỗi khi hoàn thành/đổi trạng thái một hạng mục. Đây là nơi đầu tiên dev mới nhìn để biết "giờ làm gì tiếp".
>
> Cập nhật lần cuối: **2026-06-23**.

Chú thích: ✅ xong · 🔄 đang làm · 🔜 sắp tới · 💤 hoãn · ⬜ chưa bắt đầu

---

## Tóm tắt nhanh
- **Phase 0 (Nền móng):** ✅ xong — đã merge vào `main`.
- **Phase 1–3 (App đầy đủ):** ✅ code xong, đang ở **PR #1** (`feat/phase-1-3-app`) — *chờ review & merge*.
- **Phase 4 (Hoàn thiện):** 🔜 chưa bắt đầu.
- **Chạy thật:** ⬜ cần người dùng tạo Supabase + chạy `schema.sql` + `.env` (xem `docs/SETUP.md`).

## Việc TIẾP THEO nên làm (ưu tiên từ trên xuống)
1. ⬜ **Kết nối Supabase thật** và chạy smoke test end-to-end (đăng nhập GV → tạo đề → HS thi → nộp → thấy điểm trong dashboard).
2. 🔜 **Phase 4 — Upload R2**: thêm endpoint ký URL + nút upload audio/ảnh (thay cho dán link thủ công). Xem ADR-007.
3. 🔜 **Phase 4 — Buổi thi/mã thi**: dùng bảng `exam_sessions`/`assignments` (đã có trong schema) để mở/đóng theo giờ + mã truy cập + phân phiên bản xoay vòng.
4. 🔜 **Hiệu chỉnh `etp_band`** theo thang điểm thực của trung tâm (ADR-006).
5. 🔜 **Import Excel/CSV** danh sách câu hỏi (di trú từ v1 Google Sheet).

---

## Chi tiết theo Phase

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
