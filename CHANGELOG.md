# 📜 CHANGELOG — English Test Platform (v2)

Mọi thay đổi đáng kể, **mới nhất ở trên cùng**. Quy tắc: xem `CONTRIBUTING.md`.
Phân loại: **Thêm · Đổi · Sửa · Bỏ · Bảo mật · Tài liệu**.

---

## [Chưa phát hành]

### Đổi — Thương hiệu & giao diện (logo + theme hoàn chỉnh)
- Component `Logo` chuẩn props `{ height, withText, light }`: ưu tiên ảnh `/logo.png`, fallback **mark SVG 4 cánh hoa cam→đỏ** + wordmark (`IELTS` tím / `Ms. Trà My` gradient; `.on-dark` cho nền tối). Gắn ở `StudentHome` (48), `LoginPage` (54), `AdminLayout` (30). VÌ SAO: nhận diện nhất quán mọi nơi.
- Theme: `--brand` = cam-đỏ `#ee5a24` (tách `--plum` tím riêng), `--hero`/`--grad`/`--bg` ấm; nút primary gradient + bóng (hover brightness); thẻ bóng mềm. VÌ SAO: phong cách trẻ trung, định vị thương hiệu cao.

### Thêm — Tải MP3/ảnh cho bài nghe (Supabase Storage)
- `src/lib/storage.ts` `uploadMedia()`: upload lên bucket `media` (public-read) → trả public URL. `TestEditorPage` (PassageRow): nút **Tải MP3/ảnh** + trạng thái "Đang tải lên…" + ErrorBox + preview `<audio>`/`<img>`; vẫn giữ ô "dán link" (R2 tùy chọn). `supabase/storage.sql`: bucket + policy. VÌ SAO: GV upload media ngay trong app thay vì tự host. ⚠️ Cần chạy `storage.sql` 1 lần.

### Sửa — Hiện ĐỀ BÀI khi giáo viên chấm
- `listSubmissions` join `tests(prompt, title)`; `SubmissionsPage` hiện khối "📝 Đề bài" nổi bật (viền cam, nền vàng) ngay trên bài viết (chú thích nếu đề đã xóa). VÌ SAO: GV chấm Writing cần thấy đề ngay, khỏi mở đề riêng.

### Đổi — Nền trang sống động hơn
- Nền `body`: **4 quầng màu thương hiệu** (cam/tím/đỏ) lan toả + **lưới chấm mảnh** (`body::before`, mask mờ dần vùng giữa). VÌ SAO: nền cũ hơi đơn điệu/phẳng (phản hồi người dùng); làm sinh động + định vị thương hiệu mà vẫn giữ chữ dễ đọc (chấm rất nhạt, nội dung nằm trên thẻ trắng).

### Đổi — Thương hiệu & giao diện: logo + theme
- Thêm `src/components/Logo.tsx`: ưu tiên ảnh chính thức `public/logo.png` (nền trong suốt), **fallback mark SVG cam→đỏ + chữ** khi thiếu file → app luôn có logo. Dùng `<Logo light/>` ở hero/sidebar (nền tối), `<Logo/>` ở trang đăng nhập.
- Theme mới (`index.css`): biến `--grad` (cam→đỏ) + `--hero` (nền gradient ấm); class `.hero/.hero-top/.hero-links/.tagline` (header học sinh), `.auth-page/.auth-box/.auth-logo` (đăng nhập GV), `.logo/.logo-wm/.logo-img/.logo-text`. **Nút primary đổi sang gradient cam→đỏ** (`--grad`).
- **Nâng cấp UI cao cấp/trẻ trung** (định vị thương hiệu): font **Plus Jakarta Sans**; hệ token mới (bo góc 16px, đổ bóng mềm `--shadow/--shadow-lg`, nền có vệt glow ấm); làm mới thẻ/nút/ô nhập (focus ring, hiệu ứng nhấn), hero có vệt sáng + bóng sâu, sidebar gradient tối, trang đăng nhập premium.
- **Logo fallback khớp nhận diện**: mark **4 cánh hoa** toả từ tâm (gradient cam→đỏ, có gân) + wordmark **2 dòng** `IELTS` / `Ms. Trà My`.
- Gắn logo: `StudentHome` (header → `.hero`), `LoginPage` (bọc `.auth-page`), `AdminLayout` (sidebar brand).
- VÌ SAO: thống nhất nhận diện IELTS Ms. Trà My toàn app. Khi đồng bộ phát hiện đợt "upload giao diện" trước đó **chưa thực sự lên main** (thiếu `Logo.tsx` + toàn bộ class theme) nên bổ sung cho nhất quán.
- ✅ Đã thêm **`public/logo.png`** (logo chính thức, PNG nền trong suốt 1000×319, chữ trắng) → app dùng logo thật; mark SVG chỉ còn là dự phòng khi thiếu file.

### Thêm — Phase F: Buổi thi (exit/mock) + Mã thi + một-lần-nộp
- **Buổi thi**: tái dùng `exam_sessions` + cột mới (`test_id`, `one_submission`, `max_violations`, `show_result`). GV tạo buổi gắn 1 đề + **mã thi** + cửa sổ thời gian; trang `/admin/sessions`.
- **Mã thi (anon)**: `rpc_session_by_code` (kiểm tra cửa sổ thời gian) → học sinh vào `/exam-room` → `/session/:id`.
- **Nộp/chấm**: `rpc_submit_session` — chặn **nộp lại** (one_submission); chấm theo kỹ năng (writing → chấm tay; trắc nghiệm → tự chấm + band); tùy chọn **hiện điểm** ngay.
- **Chống gian lận siết**: `SessionExamPage` **tự nộp** khi vi phạm ≥ ngưỡng buổi thi. VÌ SAO: high-stakes — ADR-018.

### Thêm — Phase E (phần 1): Nhập nội dung từ Excel/CSV
- Trang **Nhập từ Excel** (`/admin/import`): import hàng loạt **đề Viết** (topic + prompt) và **câu hỏi trắc nghiệm** (gắn `cefr_level`, options, correct) từ CSV (mở/lưu bằng Excel, UTF‑8). Có **tải mẫu**, xem trước, báo cáo lỗi theo dòng.
- `src/lib/csv.ts`: parser CSV gọn (hỗ trợ ô có phẩy/xuống dòng/nháy kép, bỏ BOM) — **không thêm thư viện** (ADR-017).
- VÌ SAO: giúp giáo viên nạp nội dung nhanh thay vì gõ tay từng câu; tự tạo topic/đề và gom câu theo `topic + test_title`.



### Thêm — Phase D: Placement tự chấm ra CEFR (engine "threshold")
- **Engine threshold:** đề `purpose='placement'` gồm câu hỏi gắn `cefr_level`; chấm server → CEFR = mức cao nhất đạt liên tiếp (đúng ≥ `pass_threshold`). RPC `rpc_list_placements`, `rpc_submit_placement`; hàm `etp_is_correct` (tách dùng lại). VÌ SAO: tự động xếp lớp đầu vào — ADR-016, hiện thực khớp nối engine (ADR-013).
- **Schema:** `questions.cefr_level`, `tests.pass_threshold`, `submissions.result_detail`; mở rộng skill `use_of_english`.
- **`supabase/seed_placement.sql`:** đề xếp lớp DEMO (Use of English, 12 câu A2–C1, câu hỏi gốc).
- **Học sinh:** mục "Kiểm tra xếp lớp" → làm trắc nghiệm (tái dùng render MCQ) → **kết quả CEFR + chi tiết theo mức** ngay.
- **Giáo viên:** soạn đề chọn `purpose`/ngưỡng; gắn **mức CEFR** cho từng câu hỏi; tạo chủ đề kỹ năng Use of English.



### Thêm — Phase C: Roster + đăng nhập bằng mã + chẩn đoán điểm yếu
- **Đăng nhập học viên bằng MÃ**: RPC `rpc_student_by_code` + ô nhập mã ở trang học sinh (điền sẵn tên/email). VÌ SAO: giảm ma sát, nối bài làm vào hồ sơ (ADR-015).
- **Quản lý roster** (GV): trang `Lớp & Học viên` — CRUD lớp/khóa + học viên (mã, tên, email, lớp).
- **Chẩn đoán điểm yếu** (GV): trang `Chẩn đoán` — trung bình 4 tiêu chí IELTS theo lớp & theo học viên, tô đỏ tiêu chí yếu nhất để ưu tiên ôn.
- Điều hướng admin tách "Hàng đợi chấm / Lớp & Học viên / Chẩn đoán".



### Thêm — Phase A+B: Hệ đánh giá năng lực + Writing chấm tay
- **Định hướng mới** (`docs/VISION.md`, ADR-009..014): hệ đánh giá năng lực & theo dõi tiến bộ; thang **CEFR** (map IELTS); roster học viên.
- **Schema:** bảng `levels` (CEFR↔IELTS↔lớp), `students`/`classes`; `tests.prompt`+`tests.purpose`; cột chấm tay 4 tiêu chí IELTS + `overall_band`/`cefr`/`status`/`feedback` trong `submissions`; `etp_band_to_cefr`. RPC: `rpc_list_writing_topics`, `rpc_pick_prompt`, `rpc_submit_writing`, `rpc_get_progress`. VÌ SAO: xem ADR-010..014.
- **`supabase/seed.sql`:** 11 chủ đề Writing (13 đề) trích từ app v1 `app_testwriting.xlsx`.
- **Học sinh:** chọn chủ đề → bốc đề ngẫu nhiên → viết (đếm từ) + khóa fullscreen/log → nộp (chờ GV chấm); trang `/progress` xem đường band theo email.
- **Giáo viên:** hàng đợi chấm + chấm **4 tiêu chí IELTS** (tự tính overall + CEFR) + nhận xét; lọc theo trạng thái; nhập đề bài (prompt) cho topic Writing.



### Tài liệu — Quy trình ghi/đọc log cho bàn giao
- Thêm `docs/ONBOARDING.md` (bắt đầu từ đâu), `docs/DECISIONS.md` (ADR — vì sao), `docs/PROGRESS.md` (đang ở đâu), `docs/DEVLOG.md` (diễn biến theo thời gian). VÌ SAO: để bất kỳ dev tiếp nhận nào cũng nắm rõ quy trình, ý tưởng, tiến độ từ đầu.
- Bổ sung `CONTRIBUTING.md`: vòng đời ghi log bắt buộc (Code→Build→CHANGELOG→DEVLOG→PROGRESS→DECISIONS→PR) + bảng "thay đổi nào ghi vào đâu" + cách đọc log + template.
- README: bảng "Tài liệu" trỏ tới bộ tài liệu mới.

### Thêm — Phase 1–3: Ứng dụng đầy đủ (auth + admin + thi + chấm + dashboard)
- **Đăng nhập giáo viên** (Supabase Auth) + khung quản trị (`src/lib/auth.tsx`, `pages/admin/`). VÌ SAO: GV cần đăng nhập để quản lý nội dung; RLS chỉ mở cho `authenticated`.
- **Admin CRUD** chủ đề/đề/đoạn văn·audio/câu hỏi bằng form (`TopicsPage`, `TestEditorPage`). Hỗ trợ 4 loại câu: single·multi·tfng·fill.
- **Học sinh thi**: chọn đề (`StudentHome`) → làm bài Viết hoặc trắc nghiệm (`ExamPage`) với **khóa toàn màn hình + ghi log gian lận** (`src/lib/antiCheat.ts`, port ý tưởng v1) → màn kết quả (`ResultPage`).
- **Chấm điểm ở server**: hoàn thiện `rpc_submit` (so khớp single/multi/tfng/fill, chuẩn hóa hoa-thường) + hàm `etp_band` quy đổi % → band (xấp xỉ). Thêm `rpc_list_exams` để HS (anon) thấy đề mà KHÔNG lộ câu hỏi/đáp án.
- **rpc_get_test**: thêm thông tin chủ đề (skill) + **xáo trộn** thứ tự câu hỏi & đáp án. Đáp án so theo GIÁ TRỊ nên xáo vẫn đúng.
- **Dashboard điểm** (`SubmissionsPage`): lọc theo tên/email/chủ đề, xem bài Viết + nhật ký vi phạm, **chấm tay** (điểm/band), **xuất CSV** (BOM UTF‑8 cho Excel).
- RLS: thêm policy cho GV cập nhật/xóa `submissions` (chấm tay).
- `public/_redirects`: SPA fallback cho Cloudflare Pages (client-side routing).

### Đổi — Quy ước đáp án
- `questions.correct` lưu theo **giá trị** lựa chọn (không theo chữ cái/chỉ số) để an toàn khi xáo trộn đáp án lúc thi. Cập nhật chú thích trong `supabase/schema.sql`.

### Thêm — Phase 0: Nền móng dự án
- Khởi tạo dự án v2 (tách khỏi `english-writing-test`): cấu trúc thư mục, scaffold **React + Vite + TypeScript**.
- `supabase/schema.sql`: lược đồ database (topics, tests, passages, questions, sessions, assignments, submissions) + **RLS** + **RPC `rpc_get_test`/`rpc_submit`** (giấu đáp án, chấm ở server).
- `src/lib/supabase.ts`: client Supabase đọc cấu hình từ biến môi trường.

### Tài liệu
- `docs/PLAN.md` (kiến trúc + mô hình dữ liệu + lộ trình 5 phase), `docs/SETUP.md` (việc người dùng tự làm: Supabase/R2/.env), `README.md`, `CONTRIBUTING.md`.
