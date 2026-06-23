# 🚀 ONBOARDING — Bắt đầu cho dev mới tiếp nhận

> Mục tiêu: sau **30–60 phút** đọc tài liệu này, bạn hiểu *dự án là gì, vì sao thiết kế như vậy, đang ở đâu, và làm việc theo quy trình nào*. Đọc đúng thứ tự bên dưới.

---

## 0. Dự án này là gì (1 đoạn)
Nền tảng thi tiếng Anh **có database** cho trung tâm IELTS Ms. Trà My: giáo viên tạo/sửa đề ngay trong app, học sinh thi (Viết + trắc nghiệm Reading/Listening) với khóa chống gian lận, **chấm điểm ở server** (đáp án không xuống trình duyệt), có dashboard điểm. Đây là bản **v2** (database thật) thay cho v1 (app tĩnh + Google Sheet).

## 1. Thứ tự đọc tài liệu (ĐỌC TỪ TRÊN XUỐNG)
| # | File | Trả lời câu hỏi | Thời gian |
|---|---|---|---|
| 1 | `README.md` | Tổng quan + cách chạy nhanh | 5′ |
| 2 | **`docs/ONBOARDING.md`** (file này) | Bắt đầu từ đâu | 10′ |
| 3 | `docs/PLAN.md` | Kiến trúc, mô hình dữ liệu, lộ trình 5 phase | 15′ |
| 4 | `docs/DECISIONS.md` | **VÌ SAO** chọn những cách làm này (ADR) | 10′ |
| 5 | `docs/PROGRESS.md` | **ĐANG Ở ĐÂU**, việc đã/đang/sẽ làm | 5′ |
| 6 | `docs/DEVLOG.md` | Nhật ký thay đổi theo thời gian (ai làm gì, vì sao) | lướt |
| 7 | `CHANGELOG.md` | Danh sách thay đổi đáng kể (theo bản phát hành) | lướt |
| 8 | `CONTRIBUTING.md` | **QUY TRÌNH** làm việc + ghi log bắt buộc | 10′ |
| 9 | `docs/SETUP.md` | Tự tạo Supabase/R2/.env để chạy thật | khi cần chạy |
| 10 | `supabase/schema.sql` | Lược đồ DB + RLS + RPC (đọc kèm comment) | 15′ |

> **Mẹo nắm nhanh "câu chuyện dự án":** đọc `DECISIONS.md` (vì sao) → `PROGRESS.md` (tới đâu) → `DEVLOG.md` từ dưới lên (diễn biến). Ba file này + `git log` là đủ để hiểu mọi thứ đã xảy ra.

## 2. Bản đồ thư mục
```
english-test-platform/
├── src/
│   ├── main.tsx            # điểm vào React
│   ├── App.tsx             # router (định tuyến học sinh / giáo viên)
│   ├── index.css           # toàn bộ style
│   ├── lib/                # logic dùng chung (KHÔNG phải UI)
│   │   ├── supabase.ts     # khởi tạo client từ .env
│   │   ├── auth.tsx        # bối cảnh đăng nhập GV (Supabase Auth)
│   │   ├── api.ts          # MỌI lời gọi DB/RPC gom về đây
│   │   ├── types.ts        # kiểu dữ liệu khớp schema.sql
│   │   ├── antiCheat.ts    # khóa fullscreen + ghi log gian lận
│   │   └── useAsync.ts     # hook nạp dữ liệu (loading/error/data)
│   ├── components/         # mảnh UI dùng lại (Spinner, ErrorBox, badge…)
│   └── pages/
│       ├── student/        # StudentHome · ExamPage · ResultPage
│       └── admin/          # LoginPage · AdminLayout · TopicsPage · TestEditorPage · SubmissionsPage
├── supabase/schema.sql     # lược đồ DB: bảng + RLS + RPC (chạy trong Supabase)
├── public/_redirects       # SPA fallback cho Cloudflare Pages
├── docs/                   # tài liệu (bạn đang ở đây)
└── .env.example            # mẫu biến môi trường (KHÔNG commit .env thật)
```

## 3. Luồng dữ liệu (hiểu 1 lần, dùng mãi)
**Giáo viên (đã đăng nhập):**
```
UI admin → src/lib/api.ts → Supabase REST (bảng) ── được RLS cho phép vì 'authenticated'
```
**Học sinh (ẩn danh / anon) — KHÔNG đọc trực tiếp bảng câu hỏi:**
```
Chọn đề:  StudentHome → api.listExams() → RPC rpc_list_exams()   (chỉ trả tên đề, không có câu hỏi)
Làm bài:  ExamPage    → api.getTest()   → RPC rpc_get_test()     (câu hỏi ĐÃ BỎ cột correct + xáo trộn)
Nộp bài:  ExamPage    → api.submitExam()→ RPC rpc_submit()       (CHẤM Ở SERVER, lưu submissions, trả điểm)
```
> 🔒 **Bất biến quan trọng:** đáp án (`questions.correct`) **không bao giờ** rời server. Mọi việc của học sinh đi qua 3 RPC `SECURITY DEFINER` ở trên. Đừng phá nguyên tắc này.

## 4. Chạy local trong 4 lệnh
```bash
cp .env.example .env       # rồi điền VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (xem docs/SETUP.md)
npm install
npm run dev                # http://localhost:5173  (trang học sinh)
#                            /admin/login → đăng nhập giáo viên
npm run build              # kiểm tra: tsc --noEmit + vite build phải PASS trước khi mở PR
```
> Chưa có Supabase? App vẫn chạy ở "chế độ chưa cấu hình" (báo đỏ) — đủ để xem giao diện, nhưng không đăng nhập/đọc dữ liệu được.

## 5. Từ điển thuật ngữ
| Thuật ngữ | Nghĩa |
|---|---|
| **Topic (chủ đề)** | Nhóm đề theo kỹ năng (writing/reading/listening). |
| **Test (đề)** | 1 phiên bản đề thi (A/B/C…) thuộc 1 chủ đề. |
| **Passage (tư liệu)** | Đoạn đọc hoặc file audio gắn vào đề. |
| **Question (câu hỏi)** | 1 câu, loại `single`/`multi`/`tfng`/`fill`, có `correct` (đáp án). |
| **Submission (bài nộp)** | 1 lần học sinh nộp: đáp án + điểm + band + log vi phạm + bài Viết. |
| **RPC** | Hàm Postgres gọi từ client; ở đây chạy `SECURITY DEFINER` để giấu đáp án. |
| **RLS** | Row Level Security — luật chặn đọc/ghi ở tầng DB. |
| **Band** | Điểm IELTS quy đổi (ở đây *xấp xỉ* theo % đúng — xem `etp_band`). |

## 6. Khi bắt tay vào việc → đọc tiếp `CONTRIBUTING.md`
Ở đó có **quy trình ghi log bắt buộc**: mỗi thay đổi đáng kể phải để lại dấu vết ở commit + `CHANGELOG.md` + `DEVLOG.md` (và `DECISIONS.md` nếu là quyết định kiến trúc). Nhờ vậy người sau bạn cũng onboard nhanh như bạn bây giờ.
