# 📜 CHANGELOG — English Test Platform (v2)

Mọi thay đổi đáng kể, **mới nhất ở trên cùng**. Quy tắc: xem `CONTRIBUTING.md`.
Phân loại: **Thêm · Đổi · Sửa · Bỏ · Bảo mật · Tài liệu**.

---

## [Chưa phát hành]

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
