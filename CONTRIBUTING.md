# QUY TẮC ĐÓNG GÓP & GHI LOG (v2)

> Kế thừa kỷ luật từ bản v1: mọi thay đổi đáng kể để lại dấu vết ở **commit**, **CHANGELOG.md**, và **tài liệu** khi cần. Mục tiêu: AI/dev đời sau đọc lịch sử là hiểu *cái gì đổi, vì sao, ảnh hưởng gì*.

## Nguyên tắc
1. Mỗi thay đổi đáng kể → 1 mục `CHANGELOG.md`. Ghi **VÌ SAO**, không chỉ cái gì.
2. 1 nhánh / 1 PR = 1 mục đích. Nhánh đặt: `feat/…`, `fix/…`, `docs/…`, `refactor/…`.
3. Commit: `<loại>: <tóm tắt mệnh lệnh, tiếng Việt có dấu>` + thân nêu vì sao/đánh đổi.
   `<loại>` ∈ feat | fix | docs | refactor | style | chore.
4. Đụng cơ chế/luồng/schema → cập nhật `docs/PLAN.md` và/hoặc `supabase/schema.sql`.

## Code
- React + Vite + TypeScript. Giữ component nhỏ, rõ; tránh phụ thuộc thừa (dễ bảo trì).
- **Đáp án không bao giờ xuống client.** Mọi chấm điểm/đề có đáp án đi qua RPC server.
- Secret để trong `.env` (không commit). Khóa dữ liệu bằng RLS.
- Comment tiếng Việt giải thích **VÌ SAO** ở chỗ có "bẫy".

## Kiểm thử tối thiểu trước khi mở PR
1. `npm run build` không lỗi (TypeScript pass).
2. Smoke: đăng nhập GV → tạo 1 đề → HS làm thử → nộp → thấy điểm/được lưu.
3. Đụng phần nào test phần đó (auth / chấm điểm / upload / khóa fullscreen).

## Cập nhật tài liệu kèm theo
| Thay đổi | Cập nhật |
|---|---|
| Tính năng/sửa lỗi đáng kể | `CHANGELOG.md` |
| Kiến trúc/luồng/tính năng | `docs/PLAN.md` |
| Bảng/RPC database | `supabase/schema.sql` |
| Cách setup/deploy/biến môi trường | `docs/SETUP.md`, `README.md` |
