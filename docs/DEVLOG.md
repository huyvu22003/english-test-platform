# 📓 DEVLOG — Nhật ký phát triển

> Diễn biến công việc theo **thời gian**, mới nhất ở trên. Khác với `CHANGELOG.md` (liệt kê *cái gì đổi* theo bản phát hành), DEVLOG kể *câu chuyện*: phiên làm việc đó nhắm mục tiêu gì, làm gì, vướng gì, quyết định gì, kết quả ra sao, bước tiếp theo.
>
> **Quy tắc:** mỗi phiên làm việc đáng kể (hoặc mỗi PR) thêm 1 mục theo template ở cuối. Đọc DEVLOG từ dưới lên = xem dự án lớn lên thế nào.

---

## 2026-06-23 — Lập quy trình ghi/đọc log cho bàn giao
- **Tác nhân:** AI (theo yêu cầu chủ dự án) · **Nhánh/PR:** `docs/quy-trinh-log`
- **Mục tiêu:** để bất kỳ dev tiếp nhận nào cũng nắm rõ quy trình, ý tưởng, tiến độ, các bước từ đầu.
- **Đã làm:**
  - Thêm `docs/ONBOARDING.md` (thứ tự đọc + bản đồ code + luồng dữ liệu + cách chạy).
  - Thêm `docs/DECISIONS.md` (ADR-001..008 — ghi lại *vì sao*).
  - Thêm `docs/PROGRESS.md` (đang ở đâu, việc tiếp theo, nợ kỹ thuật).
  - Thêm `docs/DEVLOG.md` (file này).
  - Bổ sung `CONTRIBUTING.md`: **quy trình ghi log bắt buộc** (thay đổi nào → ghi vào đâu) + cách đọc log + template.
- **Quyết định:** chia tài liệu theo 4 câu hỏi của người tiếp nhận (bắt đầu từ đâu / vì sao / tới đâu / đổi gì). Không gộp tất cả vào 1 file để mỗi file một nhiệm vụ rõ ràng.
- **Kết quả:** tài liệu thuần markdown, không ảnh hưởng code; không cần build lại.
- **Bước tiếp:** áp dụng quy trình này cho các thay đổi sau; cập nhật `PROGRESS.md` khi Phase 4 bắt đầu.

## 2026-06-23 — Phase 1–3: dựng ứng dụng đầy đủ
- **Tác nhân:** AI (tiếp nhận repo) · **Nhánh/PR:** `feat/phase-1-3-app` → **PR #1**
- **Mục tiêu:** biến scaffold Phase 0 thành app dùng được (auth + admin + thi + chấm server + dashboard).
- **Đã làm:**
  - **DB:** hoàn thiện `rpc_submit` (chấm single/multi/tfng/fill, chuẩn hóa `etp_norm`); thêm `etp_band`, `rpc_list_exams`; `rpc_get_test` xáo trộn câu + đáp án; RLS cho GV sửa/xóa `submissions`.
  - **Frontend:** `lib/{auth,api,types,antiCheat,useAsync}`, `components/common`, trang học sinh (`StudentHome/ExamPage/ResultPage`) và admin (`LoginPage/AdminLayout/TopicsPage/TestEditorPage/SubmissionsPage`); router trong `App.tsx`; viết lại `index.css`.
  - `public/_redirects` cho SPA trên Cloudflare Pages.
- **Quyết định nổi bật:** xem ADR-002 (chấm ở server), ADR-003 (đáp án theo giá trị), ADR-004 (anon + `rpc_list_exams`), ADR-006 (band xấp xỉ), ADR-007 (media dán link).
- **Vướng & cách xử lý:** TypeScript suy luận sai kiểu từ phản hồi Supabase (client không gắn Database generic) → đổi `unwrap` nhận `data: unknown` rồi ép kiểu tại chỗ.
- **Kết quả:** `npm run build` (tsc + vite) PASS. Chưa chạy end-to-end vì chưa có Supabase thật.
- **Bước tiếp:** review/merge PR #1; kết nối Supabase chạy smoke test; bắt đầu Phase 4.

## 2026-06-23 — Phase 0: khởi tạo nền móng v2
- **Tác nhân:** chủ dự án (commit khởi tạo) · **Nhánh/PR:** `main`
- **Mục tiêu:** dựng lại dự án trên database thật (tách khỏi v1 app tĩnh + Google Sheet).
- **Đã làm:** cấu trúc thư mục, scaffold React+Vite+TS, `schema.sql` (bảng + RLS + RPC khung), `lib/supabase.ts`, bộ tài liệu PLAN/SETUP/README/CONTRIBUTING/CHANGELOG.
- **Kết quả:** app chạy được ở chế độ "chưa cấu hình"; sẵn sàng cho Phase 1.

---

## Template thêm mục DEVLOG (sao chép phần dưới, đặt LÊN ĐẦU danh sách)
```
## YYYY-MM-DD — <tiêu đề phiên/PR>
- **Tác nhân:** ai/cái gì · **Nhánh/PR:** ...
- **Mục tiêu:** muốn đạt gì.
- **Đã làm:** các thay đổi chính.
- **Quyết định:** lựa chọn đáng kể (liên kết ADR nếu có).
- **Vướng & cách xử lý:** (nếu có).
- **Kết quả:** build/test ra sao.
- **Bước tiếp:** việc kế tiếp.
```
