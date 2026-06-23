# 📜 CHANGELOG — English Test Platform (v2)

Mọi thay đổi đáng kể, **mới nhất ở trên cùng**. Quy tắc: xem `CONTRIBUTING.md`.
Phân loại: **Thêm · Đổi · Sửa · Bỏ · Bảo mật · Tài liệu**.

---

## [Chưa phát hành]

### Thêm — Phase 0: Nền móng dự án
- Khởi tạo dự án v2 (tách khỏi `english-writing-test`): cấu trúc thư mục, scaffold **React + Vite + TypeScript**.
- `supabase/schema.sql`: lược đồ database (topics, tests, passages, questions, sessions, assignments, submissions) + **RLS** + **RPC `rpc_get_test`/`rpc_submit`** (giấu đáp án, chấm ở server).
- `src/lib/supabase.ts`: client Supabase đọc cấu hình từ biến môi trường.

### Tài liệu
- `docs/PLAN.md` (kiến trúc + mô hình dữ liệu + lộ trình 5 phase), `docs/SETUP.md` (việc người dùng tự làm: Supabase/R2/.env), `README.md`, `CONTRIBUTING.md`.
