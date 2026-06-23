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
| [`docs/PLAN.md`](docs/PLAN.md) | Kiến trúc, mô hình dữ liệu, tính năng, lộ trình (đọc đầu tiên) |
| [`docs/SETUP.md`](docs/SETUP.md) | Việc bạn tự làm: tạo Supabase, chạy schema, R2, `.env` |
| [`supabase/schema.sql`](supabase/schema.sql) | Lược đồ database (chạy trong Supabase) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Quy tắc commit + ghi CHANGELOG |
| [`CHANGELOG.md`](CHANGELOG.md) | Lịch sử thay đổi |

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
**Phase 0 — Nền móng** (đang làm): cấu trúc + schema + tài liệu + scaffold. Xem lộ trình trong `docs/PLAN.md` §5.
