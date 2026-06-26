# 📓 DEVLOG — Nhật ký phát triển

> Diễn biến công việc theo **thời gian**, mới nhất ở trên. Khác với `CHANGELOG.md` (liệt kê *cái gì đổi* theo bản phát hành), DEVLOG kể *câu chuyện*: phiên làm việc đó nhắm mục tiêu gì, làm gì, vướng gì, quyết định gì, kết quả ra sao, bước tiếp theo.
>
> **Quy tắc:** mỗi phiên làm việc đáng kể (hoặc mỗi PR) thêm 1 mục theo template ở cuối. Đọc DEVLOG từ dưới lên = xem dự án lớn lên thế nào.

---

## 2026-06-26 — Trang chủ học sinh premium hơn
- **Tác nhân:** Eagle AI · **Nhánh/PR:** `style/student-home-premium-ui`
- **Mục tiêu:** Huy đánh giá UI hiện tại hơi đơn điệu, chưa thể hiện đủ sự chuyên nghiệp, trẻ trung và năng động; cần nâng cấp điểm chạm đầu tiên của học sinh mà không đụng backend/schema.
- **Đã làm:** redesign `StudentHome` với hero lớn, headline rõ, CTA xếp lớp/phòng thi, stat cards, panel nhận diện học viên dạng glass, section “Chọn hành trình học tập”, skill cards cho Placement / Đọc-Nghe / Writing, card đề và topic Writing trực quan hơn. Bổ sung CSS visual system riêng cho student home.
- **Quyết định:** làm UI-1 chỉ trong `StudentHome.tsx` + `index.css`, giữ logic API/RPC hiện tại để giảm rủi ro; admin dashboard để phase riêng sau.
- **Kết quả:** `npm run build` PASS (101 modules).
- **Bước tiếp:** sau merge, kiểm tra live trên desktop/mobile; nếu đạt hướng nhìn, tiếp tục UI-2 cho admin SaaS dashboard.

## 2026-06-25 — Ẩn tải bài nghe ở màn học sinh
- **Tác nhân:** Eagle AI · **Nhánh/PR:** `fix/disable-student-audio-download`
- **Mục tiêu:** học sinh đang thấy menu tải audio trong lúc làm Listening; cần vô hiệu hóa nút tải ở màn làm bài, nhưng giữ quyền giáo viên upload/preview trong phần soạn đề.
- **Đã làm:** thêm `controlsList="nodownload"`, `preload="metadata"` và `onContextMenu={(e) => e.preventDefault()}` cho audio player ở `ExamPage`, `SessionExamPage`, `PlacementExamPage`; không đổi `TestEditorPage` của giáo viên.
- **Quyết định:** đây là lớp chặn UI của trình duyệt, phù hợp nhu cầu không hiện nút tải; chống tải tuyệt đối qua DevTools/link trực tiếp cần signed URL/streaming riêng nếu sau này cần.
- **Kết quả:** `npm run build` PASS (101 modules).
- **Bước tiếp:** sau merge, smoke test bài Listening public để xác nhận menu Download không còn hiện trên trình duyệt chính.

## 2026-06-25 — Lối vào Luyện Đọc & Nghe cho học sinh
- **Tác nhân:** Eagle AI · **Nhánh/PR:** `feat/student-reading-listening-entry`
- **Mục tiêu:** fix tồn đọng D.1 — học sinh chưa thấy/làm được đề Đọc/Nghe trắc nghiệm dù backend `rpc_list_exams`, `ExamPage`, `rpc_get_test`, `rpc_submit` đã sẵn sàng.
- **Đã làm:** `StudentHome` gọi `listExams()`, lọc topic `reading`/`listening`, hiển thị section **Luyện Đọc & Nghe** với badge kỹ năng, thời gian và nút **Làm bài**; dùng chung điều kiện tên/email trước khi vào `/exam/:testId`. Thêm `.npmrc` `include=dev` để Cloudflare Pages cài đủ build tools nếu môi trường đặt `NODE_ENV=production`.
- **Quyết định:** không đụng schema/RPC; giữ nguyên bất biến bảo mật: đề/chấm trắc nghiệm vẫn qua RPC server và không lộ đáp án.
- **Kết quả:** `npm run build` PASS (101 modules); tái hiện `NODE_ENV=production npm ci && npm run build` cũng PASS sau khi thêm `.npmrc`.
- **Bước tiếp:** smoke test production sau khi merge để xác nhận đề Reading/Listening hiện đúng.

## 2026-06-25 — Khung phát triển trung tâm nhiều chi nhánh
- **Tác nhân:** Eagle AI · **Nhánh/PR:** `docs/center-growth-framework`
- **Mục tiêu:** chuyển định hướng mới của chủ dự án thành khung phát triển có thể theo dõi trong repo: app dùng cho trung tâm tiếng Anh tư nhân 3 chi nhánh, có thể mở rộng thêm, phát triển theo lộ trình doanh nghiệp.
- **Đã làm:** thêm roadmap G0–G5 trong `docs/CENTER_GROWTH_ROADMAP.md`; thêm hướng dẫn dùng phiếu trong `docs/REQUIREMENTS_QUESTIONNAIRE.md`; thêm phiếu HTML tại `public/forms/Phieu-khao-sat-nang-cap-English-Test-Platform.html` để chủ trung tâm điền nhu cầu và tải kết quả `.txt`/`.json`.
- **Quyết định:** dùng phiếu khảo sát để chốt Must/Should/Could trước khi code các mảng lớn như multi-branch permission, dashboard owner, automation.
- **Kết quả:** tài liệu hóa hướng phát triển mới; build cần pass trước khi PR.
- **Bước tiếp:** sau khi có phiếu đã điền, chuyển thành backlog Phase G1/G2; nếu cần public form trên Pages thì push branch/PR.

## 2026-06-25 — UI thương hiệu + tải media + hiện đề khi chấm
- **Tác nhân:** AI · **Nhánh/PR:** `feat/ui-media-grading`
- **Mục tiêu:** gộp 3 nhóm (phát triển ở phiên khác): hoàn chỉnh logo/theme; tải MP3/ảnh qua Supabase Storage; hiện đề bài khi GV chấm.
- **Đã làm:**
  - A: `Logo.tsx` props `{height,withText,light}` (img `/logo.png` → fallback SVG 4 cánh + wordmark `.on-dark`); theme `--brand` cam-đỏ + tách `--plum`; gắn Logo 3 trang.
  - B: `lib/storage.ts uploadMedia`; PassageRow nút Tải MP3/ảnh + preview; `supabase/storage.sql` (bucket `media` + policy); cập nhật `SETUP.md`.
  - C: `listSubmissions` join `tests`; `SubmissionsPage` khối "📝 Đề bài"; `types.ts` thêm `Submission.tests`.
- **Kết quả:** `npm run build` PASS (101 modules); preview: `--brand` = cam #ee5a24, logo ảnh thật cao 48.
- **Bước tiếp:** chủ dự án chạy `supabase/storage.sql` (tạo bucket media) để upload chạy thật. `public/logo.png` đã có sẵn.

## 2026-06-25 — Nền trang sống động hơn
- **Tác nhân:** AI · **Nhánh/PR:** `style/bg-theme`
- **Mục tiêu:** nền hơi đơn điệu (phản hồi người dùng khi app đã chạy thật với Supabase) → làm sinh động, premium hơn mà vẫn dễ đọc.
- **Đã làm:** `index.css` — `--bg-glow` 4 quầng màu (cam/tím/đỏ) lan toả khắp trang; thêm `body::before` lưới chấm mảnh (24px), mask radial cho mờ dần vùng giữa.
- **Kết quả:** `npm run build` PASS; verify preview: body có 4 lớp gradient + lớp chấm masked.

## 2026-06-23 — Thương hiệu & giao diện (logo + theme)
- **Tác nhân:** AI · **Nhánh/PR:** `feat/branding-ui`
- **Mục tiêu:** đồng bộ + hoàn tất bộ giao diện thương hiệu (logo + theme) **và nâng cấp UI cao cấp/trẻ trung** (định vị thương hiệu) cho toàn app.
- **Phát hiện:** đợt "upload thủ công file giao diện" được báo là đã có nhưng thực ra **CHƯA lên main** — `src/components/Logo.tsx` không tồn tại; `index.css` thiếu toàn bộ class branding (`.hero/.auth-page/.logo/--grad/--hero`); các trang chưa import `<Logo>`; không có commit branding; `public/logo.png` cũng chưa có.
- **Đã làm:** tạo `Logo.tsx` (ưu tiên `/logo.png`, fallback **mark 4 cánh hoa cam→đỏ + wordmark 2 dòng** khớp nhận diện); gắn `<Logo>` vào `StudentHome`/`LoginPage`/`AdminLayout`. Redesign `index.css`: font **Plus Jakarta Sans**, token mới (bóng/bo góc/glow), làm mới thẻ·nút·ô nhập·hero·auth·sidebar.
- **Quyết định:** KHÔNG tạo `public/logo.png` giả — dùng mark SVG dự phòng, để chủ dự án đặt ảnh chính thức (PNG nền trong suốt).
- **Kết quả:** `npm run build` PASS; verify trên preview: `StudentHome` (hero+logo) và `LoginPage` (auth-page+logo) render đúng, không lỗi console.
- **Bước tiếp:** chủ dự án thêm `public/logo.png`; cân nhắc đồng bộ tông màu các trang admin còn lại.

## 2026-06-23 — Phase F (Buổi thi + mã thi + một-lần-nộp)
- **Tác nhân:** AI · **Nhánh/PR:** `feat/phase-f-sessions`
- **Mục tiêu:** chế độ high-stakes (exit/mock) — thi theo buổi, vào bằng mã, kiểm soát nộp & gian lận.
- **Đã làm:**
  - Schema: thêm cột `exam_sessions` (test_id, one_submission, max_violations, show_result); RPC `rpc_session_by_code`, `rpc_submit_session` (chặn nộp lại, chấm theo kỹ năng, lưu session_id).
  - Frontend: `SessionsPage` (GV tạo/xóa buổi + sinh mã + cửa sổ thời gian), `SessionEntryPage` (HS nhập mã), `SessionExamPage` (làm bài MCQ/viết, tự nộp khi vượt ngưỡng vi phạm), `ResultPage` xử lý kết quả buổi thi; nav + route + lối "Vào phòng thi".
- **Quyết định:** ADR-018 — high-stakes bằng buổi thi + mã (server kiểm soát), không proctoring nặng.
- **Kết quả:** `npm run build` PASS.
- **Bước tiếp:** smoke test toàn hệ trên Supabase; (tùy chọn) xáo đề theo HS, xuất bảng điểm buổi thi.

## 2026-06-23 — Phase E phần 1 (Import Excel/CSV)
- **Tác nhân:** AI · **Nhánh/PR:** `feat/phase-e-import`
- **Mục tiêu:** nạp nội dung hàng loạt (đề Viết + câu trắc nghiệm) thay vì gõ tay.
- **Đã làm:** `src/lib/csv.ts` (parser CSV, không thêm lib); `ImportPage` 2 chế độ (Viết / Trắc nghiệm) với tải mẫu + xem trước + import (tự tạo topic/đề, gom câu theo topic+test_title); nav + route.
- **Quyết định:** ADR-017 — dùng CSV (Excel lưu được) thay vì thêm thư viện .xlsx (tránh phụ thuộc/rủi ro bảo mật).
- **Kết quả:** `npm run build` PASS.
- **Bước tiếp:** (tùy chọn) refactor ngân hàng `items` để tái sử dụng câu; hỗ trợ .xlsx trực tiếp nếu cần.

## 2026-06-23 — Phase D (Placement tự chấm ra CEFR)
- **Tác nhân:** AI · **Nhánh/PR:** `feat/phase-d-placement`
- **Mục tiêu:** tự động xếp lớp đầu vào — trắc nghiệm ra CEFR theo ngưỡng.
- **Đã làm:**
  - Schema: `questions.cefr_level`, `tests.pass_threshold`, `submissions.result_detail`, skill `use_of_english`; hàm `etp_is_correct`; RPC `rpc_list_placements`, `rpc_submit_placement` (engine threshold).
  - `seed_placement.sql`: đề DEMO Use of English (12 câu gốc, A2–C1).
  - Frontend: `PlacementExamPage` (tái dùng `QuestionView` từ ExamPage), `ResultPage` hiện CEFR + chi tiết mức; StudentHome thêm mục xếp lớp; TestEditor thêm `purpose`/ngưỡng + gắn CEFR câu hỏi; TopicsPage thêm skill Use of English.
- **Quyết định:** ADR-016 — engine threshold (mức cao nhất đạt liên tiếp); hiện thực khớp nối engine của ADR-013.
- **Kết quả:** `npm run build` PASS.
- **Bước tiếp:** combine CEFR nhiều kỹ năng → 1 trình độ tổng; Reading/Listening thật; Phase E.

## 2026-06-23 — Phase C (Roster + đăng nhập bằng mã + chẩn đoán)
- **Tác nhân:** AI · **Nhánh/PR:** `feat/phase-c-roster-diagnostics`
- **Mục tiêu:** quản lý học viên/lớp, cho học sinh đăng nhập nhanh bằng mã, và chẩn đoán điểm yếu để dạy đúng chỗ.
- **Đã làm:**
  - Schema: RPC `rpc_student_by_code` (anon, SECURITY DEFINER).
  - Frontend: `RosterPage` (CRUD lớp + học viên), `DiagnosticsPage` (trung bình 4 tiêu chí theo lớp/học viên, tô tiêu chí yếu nhất), `StudentHome` thêm đăng nhập bằng mã; nav admin + router.
- **Quyết định:** ADR-015 — đăng nhập bằng MÃ học viên (không dùng magic-link bây giờ để khỏi phụ thuộc email provider).
- **Kết quả:** `npm run build` PASS.
- **Bước tiếp:** Phase D (placement tự chấm) / mở rộng chẩn đoán theo tag.

## 2026-06-23 — Đổi định hướng + Phase A+B (Writing chấm tay)
- **Tác nhân:** AI (theo chủ dự án) · **Nhánh/PR:** `feat/phase-a-b-writing`
- **Mục tiêu:** định vị lại sản phẩm thành hệ đánh giá năng lực & tiến bộ; dựng Writing-first chấm tay từ nội dung app v1 (11 topic).
- **Đã làm:**
  - `docs/VISION.md` (đặc tả) + ADR-009..014 + cập nhật `PLAN/PROGRESS`.
  - **Schema:** `levels` (CEFR↔IELTS), roster `students`/`classes`, `tests.prompt/purpose`, cột chấm tay 4 tiêu chí + `etp_band_to_cefr`; RPC `rpc_list_writing_topics`/`rpc_pick_prompt`/`rpc_submit_writing`/`rpc_get_progress`.
  - **`seed.sql`:** trích 11 chủ đề Writing (13 đề) từ `app_testwriting.xlsx`.
  - **Frontend:** StudentHome (chọn chủ đề) · WritingExamPage (bốc đề + viết + khóa) · ResultPage (chờ chấm) · ProgressPage (đường band) · SubmissionsPage (chấm 4 tiêu chí) · TestEditor (nhập prompt).
- **Quyết định:** xem ADR-009 (đổi định vị), 010 (CEFR lõi), 011 (roster), 012 (chấm tay 4 tiêu chí), 013 (engine tách rời), 014 (bốc ngẫu nhiên + không di trú).
- **Vướng & cách xử lý:** giữ luồng MCQ cũ (ExamPage) không đụng; thêm luồng Writing song song để không phá Phase 1–3.
- **Kết quả:** `npm run build` PASS. Chưa chạy thật (cần Supabase + seed).
- **Bước tiếp:** smoke test trên Supabase; Phase C (chẩn đoán) / D (placement tự chấm).

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
