# KIẾN TRÚC & KẾ HOẠCH — English Test Platform (v2)

> Nền tảng thi tiếng Anh **đầy đủ, có database** cho trung tâm IELTS Ms. Trà My: tạo/upload đề ngay trong app, nhiều giáo viên, tự chấm, thống kê. Kế thừa kinh nghiệm từ bản v1 (app tĩnh + Google Sheet) nhưng **dựng lại** trên DB thật.
>
> Ngày khởi tạo: 2026-06-23. Bản v1 (`english-writing-test`) vẫn chạy song song tới khi v2 thay thế xong.

## 1. Mục tiêu & nguyên tắc

**Mục tiêu:** đăng nhập giáo viên → **tạo/sửa chủ đề & đề, upload audio/ảnh, nhập câu hỏi** trong app → học sinh thi (Viết + Reading/Listening trắc nghiệm) với khóa chống gian lận → **tự chấm + dashboard điểm**.

**Nguyên tắc (vì chủ yếu do AI + chủ sở hữu tự duy trì):**
1. Dùng **dịch vụ managed** tối đa (không tự nuôi server, DB tự backup).
2. **Ít code backend nhất** — dùng Supabase (API tự sinh + RLS) + RPC `SECURITY DEFINER` cho phần bảo mật.
3. **Tự động hóa**: push code → Cloudflare Pages tự deploy.
4. **Không khóa cứng**: dữ liệu Postgres chuẩn, luôn xuất được.
5. **Bảo mật then chốt**: đáp án (`questions.correct`) **không bao giờ** ra trình duyệt học sinh — chấm ở server.

## 2. Công nghệ

| Lớp | Công nghệ | Lý do |
|---|---|---|
| Giao diện | **React + Vite + TypeScript**, host **Cloudflare Pages** | Đơn giản, push là deploy; 1 app gồm phần Học sinh + Admin |
| DB + Auth + API | **Supabase** (Postgres + Auth + REST/RPC tự sinh + RLS) | Ít code backend nhất, có sẵn đăng nhập + backup |
| Media (audio/ảnh) | **Cloudflare R2** (đã có 10GB) | Rẻ, không phí egress; upload qua signed URL |
| Bảo mật chấm/phát đề | **RPC SECURITY DEFINER** trong Postgres | Giữ đáp án ở server, không cần dịch vụ riêng |

## 3. Mô hình dữ liệu

Xem `supabase/schema.sql` (đã viết). Tóm tắt bảng:
`profiles` (GV) · `topics` · `tests` (phiên bản đề) · `passages` (đoạn văn/audio) · `questions` (kèm `correct` — bảo vệ) · `exam_sessions` · `assignments` (xoay vòng) · `submissions` (bài nộp + điểm).

**Luồng học sinh (giấu đáp án):**
- `rpc_get_test()` trả đề **không kèm `correct`**.
- `rpc_submit()` **chấm ở server** rồi lưu `submissions`.
- RLS chặn anon đọc trực tiếp bảng `questions`.

## 4. Tính năng theo vai trò

**Admin / Giáo viên:** đăng nhập · CRUD chủ đề/đề/câu hỏi bằng form · **upload audio/ảnh lên R2** · import Excel/CSV · ngân hàng câu hỏi · cấu hình đề (thời gian, dạng câu, hiện điểm/đáp án, số lần làm) · buổi thi/mã thi · **dashboard điểm + xuất Excel**.

**Học sinh:** nhập tên/email (hoặc mã thi) → nhận phiên bản đề (xoay vòng + xáo trộn) → làm bài (Viết / trắc nghiệm, nghe audio) với **khóa fullscreen + ghi log gian lận** (port từ v1) → nộp → tự chấm → hiện điểm theo cấu hình.

## 5. Lộ trình (phase — mỗi phase chạy được ngay)

| Phase | Nội dung | Trạng thái |
|---|---|---|
| **0. Nền móng** | Cấu trúc dự án + schema + tài liệu + scaffold React chạy được + kết nối Supabase | 🔄 đang làm |
| **1. Auth + Admin Viết** | Đăng nhập GV; CRUD chủ đề/đề Viết; HS thi Viết (port khóa fullscreen từ v1); lưu submission | |
| **2. Reading/Listening** | Nhập câu hỏi + **upload audio R2**; phát đề xoay vòng + xáo trộn; **chấm server (rpc_submit)** + quy đổi band; màn kết quả | |
| **3. Dashboard** | Thống kê điểm theo HS/lớp/đề; buổi thi/mã thi; xuất Excel/PDF; ngân hàng câu hỏi | |
| **4. Hoàn thiện** | Nhiều GV/phân quyền, mobile/fallback fullscreen, tối ưu UX, tài liệu vận hành | |

**Di trú từ v1:** script đọc Google Sheet hiện tại → đổ vào `topics/tests/questions` (làm ở Phase 1–2). Bản v1 không tắt cho tới khi v2 thay thế xong.

## 6. Bền vững

- **Chi phí (quy mô trung tâm):** ~miễn phí → ~$25/tháng (Supabase Pro nếu vượt free) + vài $ R2. Cloudflare Pages miễn phí.
- **Backup:** Supabase backup hằng ngày + lịch export Postgres định kỳ ra file.
- **Bảo mật:** đáp án ở server; bật 2FA cho Supabase/Cloudflare/GitHub; secret để trong biến môi trường (không commit).
- **Bảo trì thấp:** ít phụ thuộc, managed services, tài liệu rõ để AI tiếp quản. Mỗi thay đổi ghi `CHANGELOG` (xem `CONTRIBUTING.md`).

## 7. Việc người dùng phải tự làm (xem `docs/SETUP.md`)
Tạo dự án Supabase + chạy `schema.sql` + tạo bucket R2 + điền `.env` — vì cần tài khoản cá nhân, AI không tự làm thay được.
