# English Test Platform (v2)

Nền tảng thi tiếng Anh có **database đầy đủ** cho trung tâm **IELTS Ms. Trà My**: giáo viên tạo/upload đề ngay trong app, học sinh thi (Viết + Reading/Listening trắc nghiệm) với khóa chống gian lận, hệ thống **tự chấm** và thống kê.

> Bản dựng lại (v2) của dự án `english-writing-test` (app tĩnh + Google Sheet). Bản cũ vẫn chạy song song tới khi v2 thay thế xong. Ngày tạo: 2026-06-23.

## Công nghệ
- **Frontend:** React + Vite + TypeScript → Cloudflare Pages
- **Backend/DB:** Supabase (Postgres + Auth + RPC) — đáp án chấm ở server
- **Media:** Cloudflare R2 (audio/ảnh)

## Tài liệu (đọc theo thứ tự)
| File | Nội dung |
|---|---|
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | **Bắt đầu từ đâu** — dành cho dev mới tiếp nhận (đọc đầu tiên) |
| [`docs/VISION.md`](docs/VISION.md) | **Định hướng** — hệ đánh giá năng lực & tiến bộ (CEFR, Writing-first) |
| [`docs/PLAN.md`](docs/PLAN.md) | Kiến trúc, mô hình dữ liệu, tính năng, lộ trình |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | **Vì sao** — nhật ký quyết định kiến trúc (ADR) |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | **Đang ở đâu** — tiến độ, việc tiếp theo, nợ kỹ thuật |
| [`docs/DEVLOG.md`](docs/DEVLOG.md) | **Đổi gì** — nhật ký phát triển theo thời gian |
| [`docs/SETUP.md`](docs/SETUP.md) | Việc bạn tự làm: tạo Supabase, chạy schema, R2, `.env` |
| [`supabase/schema.sql`](supabase/schema.sql) | Lược đồ database (chạy trong Supabase) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | **Quy trình** ghi log & đọc log + quy tắc commit |
| [`CHANGELOG.md`](CHANGELOG.md) | Lịch sử thay đổi theo bản |

## Cấu trúc
```
english-test-platform/
├── src/            # React app (pages/, lib/)
├── supabase/       # schema.sql + (sau này) RPC/migrations
├── docs/           # PLAN, SETUP
├── public/         # tài nguyên tĩnh (logo...)
├── .env.example    # mẫu biến môi trường
└── README.md
```

## Bắt đầu nhanh
1. Làm theo [`docs/SETUP.md`](docs/SETUP.md) (tạo Supabase + điền `.env`).
2. `npm install && npm run dev` → http://localhost:5173

## Trạng thái
**Phase 1–3 — đã dựng** (chờ kết nối Supabase để chạy thật):
- Đăng nhập giáo viên (Supabase Auth) + khung trang quản trị.
- CRUD **chủ đề / đề / đoạn văn·audio / câu hỏi** (single·multi·tfng·fill) bằng form trong app.
- Học sinh: chọn đề → làm bài **Viết** hoặc **trắc nghiệm** với **khóa toàn màn hình + ghi log gian lận** → nộp.
- **Chấm điểm ở server** (RPC `rpc_submit`) — đáp án không xuống client — kèm quy đổi **band** (xấp xỉ).
- **Dashboard**: lọc bài nộp, xem bài Viết/nhật ký vi phạm, chấm tay, **xuất CSV**.

Còn lại (Phase 3–4): upload media R2 (hiện nhập link thủ công), buổi thi/mã thi, phân quyền nhiều GV, import Excel. Xem `docs/PLAN.md` §5.
