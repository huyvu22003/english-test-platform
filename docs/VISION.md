# 🎯 VISION — Hệ đánh giá năng lực & theo dõi tiến bộ

> Đặc tả định hướng (đã chốt với chủ dự án). Đọc cùng `PLAN.md` (kiến trúc) và `DECISIONS.md` (vì sao). Cập nhật: 2026-06-23.

## 1. Đổi khung tư duy (quan trọng)
Đây **không phải** "nền tảng thi" high-stakes lo gian lận. Đây là **hệ đánh giá năng lực + theo dõi tiến bộ** cho học viên *đã biết danh tính* của trung tâm. Mục tiêu: **xếp lớp đúng · theo dõi tiến bộ · chẩn đoán điểm yếu để dạy tốt hơn**. Vì low-stakes nên **không** ưu tiên chống gian lận nặng.

## 2. Ba thời điểm đánh giá
| Thời điểm | Mục đích | Trạng thái |
|---|---|---|
| **Placement** (đầu vào) | Xếp lớp/trình độ khi mới vào | Tương lai (cần nội dung tự chấm) |
| **Progress** (trong quá trình) | Kiểm tra định kỳ, chẩn đoán, đo tiến bộ | **Làm trước** |
| **Exit/Mock** (đầu ra) | Xác nhận đạt chuẩn cuối khóa | Tương lai |

## 3. Quyết định nền tảng (đã chốt)
- **Thang lõi = CEFR (A1–C2)**, map sang **IELTS band** + tên lớp nội bộ (bảng `levels`).
- **Roster học viên**: mỗi bài làm gắn hồ sơ học viên (theo email) để vẽ tiến bộ theo thời gian.
- **Phạm vi đợt đầu = Writing Task 2**, **11 chủ đề** lấy từ app v1 (`app_testwriting.xlsx`).
- **Chấm tay bởi giáo viên** theo **4 tiêu chí IELTS Writing** → overall band → map CEFR.
- Học sinh chọn chủ đề → hệ **bốc ngẫu nhiên 1 đề** trong chủ đề.
- **DB làm mới**, không di trú dữ liệu cũ.

## 4. Kiến trúc mở rộng — 4 "khớp nối" giữ ổn định
Triết lý: *giao diện (contract) ổn định, cách tính bên trong thay được* → tương lai chỉ **thêm vào**, không **sửa lõi**.

| # | Khớp nối | Hiện tại | Mở rộng sau (không sửa lõi) |
|---|---|---|---|
| 1 | Bài = dữ liệu | `tests.purpose` (placement/progress/exit) | Thêm loại bài = thêm dữ liệu |
| 2 | Câu hỏi/đề giàu metadata | topic↔nhiều đề; (sau) `cefr_level`, `tag` | Tính độ khó (IRT) khi đủ dữ liệu |
| 3 | Engine xếp trình độ tách rời | `manual` (chấm tay) | Cắm `threshold` → `multistage` → `IRT/CAT` |
| 4 | Kết quả chuẩn hóa | `submissions.overall_band` + `cefr` | Mọi báo cáo đọc 1 định dạng |

→ Lưu **từng bài/đáp án** (essay, sau này `responses`) để tích lũy cho chẩn đoán & hiệu chỉnh.

## 5. Chấm tay 4 tiêu chí (đợt đầu)
- 4 tiêu chí IELTS Writing, mỗi tiêu chí 0–9: **Task Response · Coherence & Cohesion · Lexical Resource · Grammatical Range & Accuracy**.
- **Overall = trung bình 4 tiêu chí, làm tròn 0.5** → map CEFR (`etp_band_to_cefr`).
- Giáo viên ghi **nhận xét bằng chữ**. Bài có trạng thái `submitted` → `graded`.
- Dashboard có **hàng đợi chấm** (lọc "chờ chấm"); học sinh xem band + nhận xét + đường tiến bộ ở `/progress`.

## 6. Lộ trình
| Phase | Nội dung | Trạng thái |
|---|---|---|
| **A. Nền đánh giá** | `levels` (CEFR↔IELTS↔lớp), roster `students`/`classes`, `tests.prompt/purpose` | ✅ (PR này) |
| **B. Writing chấm tay** | 11 topic, bốc đề ngẫu nhiên, viết + khóa, chấm 4 tiêu chí, tiến bộ | ✅ (PR này) |
| **C. Chẩn đoán + Roster** | Lớp/học viên, đăng nhập bằng mã, bản đồ điểm yếu 4 tiêu chí theo lớp/học viên | ✅ |
| **D. Placement tự chấm** | Đề `placement` câu hỏi gắn CEFR + engine `threshold` ra CEFR (seed Use of English) | ✅ |
| **E. Ngân hàng câu hỏi** | **Import Excel/CSV ✅**; (sau) tách `items` khỏi đề để tái sử dụng | 🔄 |
| **F. Exit/Mock (high-stakes)** | buổi thi + mã thi + một-lần-nộp + tự nộp khi vi phạm | ✅ |

## 7. Việc người dùng tự làm
Xem `docs/SETUP.md`: tạo Supabase → chạy `schema.sql` → chạy `seed.sql` (nạp 11 topic) → tạo tài khoản giáo viên → điền `.env`.
