# ROADMAP MỞ RỘNG CHO TRUNG TÂM NHIỀU CHI NHÁNH

> Mục tiêu: phát triển English Test Platform từ app thi/đánh giá thành nền tảng vận hành đánh giá năng lực cho trung tâm tiếng Anh tư nhân có **3 chi nhánh** và có thể mở rộng thêm.

## 1. Định vị sản phẩm

English Test Platform nên được định vị là **Assessment & Progress Platform** cho trung tâm, không chỉ là app làm bài.

Giá trị chính:

- Chuẩn hóa kiểm tra đầu vào, kiểm tra tiến bộ, mock/exit test giữa các chi nhánh.
- Theo dõi năng lực học viên theo CEFR/IELTS band/kỹ năng.
- Hỗ trợ chủ trung tâm xem chất lượng lớp, giáo viên, chi nhánh bằng dữ liệu.
- Giảm nhập liệu/chấm điểm thủ công cho giáo viên và admin.
- Tạo nền tảng mở rộng sang báo cáo phụ huynh, CRM, automation sau này.

## 2. Mô hình tổ chức mục tiêu

### Thực thể vận hành

- **Branch** — chi nhánh: mặc định 3 chi nhánh, mở rộng thêm được.
- **Class/Course** — lớp/khóa học.
- **Student** — học viên, có mã học viên và lịch sử bài làm.
- **Teacher** — giáo viên phụ trách lớp/kỹ năng.
- **Exam session** — buổi thi/mã thi.
- **Assessment** — bài kiểm tra: placement/progress/exit/mock.
- **Question bank** — ngân hàng câu hỏi theo kỹ năng, CEFR, tag.

### Vai trò đề xuất

| Vai trò | Quyền chính |
|---|---|
| Owner | Xem toàn hệ thống, cấu hình, báo cáo mọi chi nhánh |
| Branch manager | Xem/quản lý dữ liệu chi nhánh mình |
| Teacher | Quản lý lớp được giao, xem/chấm bài học viên của mình |
| Assistant/Admin nhập liệu | Nhập đề, roster, hỗ trợ vận hành |
| Student | Làm bài, xem kết quả/tiến bộ được cho phép |
| Parent (sau này) | Xem báo cáo học viên, nếu trung tâm cần |

## 3. Roadmap phát triển theo phase

### Phase G0 — Khảo sát & chốt phạm vi MVP

- Gửi phiếu khảo sát cho chủ trung tâm/manager: `public/forms/Phieu-khao-sat-nang-cap-English-Test-Platform.html`.
- Phân loại yêu cầu thành Must/Should/Could/Later.
- Chốt dữ liệu chi nhánh/lớp/học viên hiện có.
- Chốt loại test ưu tiên: placement, progress, mock/exit.

### Phase G1 — Chuẩn hóa vận hành thật

- Thêm/chuẩn hóa mô hình chi nhánh nếu khảo sát xác nhận cần multi-branch ngay.
- Tạo buổi thi mẫu và luồng smoke test end-to-end.
- Export bảng điểm buổi thi theo lớp/chi nhánh.
- Cập nhật tài liệu vận hành cho giáo viên/admin.

### Phase G2 — Nội dung Reading/Listening/Use of English

- Hoàn thiện ngân hàng câu hỏi theo skill/CEFR/tag.
- Import nội dung thật từ CSV/Excel.
- Upload audio/ảnh lên R2 hoặc tiếp tục dán link tùy ưu tiên.
- Placement đa kỹ năng: Reading + Listening + Use of English.

### Phase G3 — Dashboard chủ trung tâm

- Dashboard toàn hệ thống: chi nhánh, lớp, giáo viên, học viên.
- Báo cáo tiến bộ học viên.
- Chẩn đoán điểm yếu theo tag/kỹ năng con.
- Export Excel/PDF cho quản lý/phụ huynh.

### Phase G4 — Phân quyền nhiều chi nhánh

- Owner / branch manager / teacher / assistant.
- Row-level access theo branch/class.
- Audit log thao tác quan trọng.
- Quy trình backup/export dữ liệu.

### Phase G5 — Tự động hóa & mở rộng doanh nghiệp

- Gửi kết quả qua email/Zalo/Telegram/CRM.
- Portal học viên/phụ huynh.
- Gợi ý lớp/lộ trình học tự động sau placement.
- Tích hợp CRM/marketing automation/học phí nếu trung tâm muốn mở rộng sang LMS-lite.

## 4. Nguyên tắc ưu tiên

1. **Không build lan man trước khi có phiếu khảo sát.** Mỗi tính năng phải gắn với nhu cầu thật của chủ trung tâm.
2. **Giữ bảo mật đáp án:** đáp án không xuống client; học sinh đi qua RPC server.
3. **Mở rộng dần:** 3 chi nhánh là baseline, nhưng schema/permission không khóa cứng.
4. **Dữ liệu xuất được:** ưu tiên CSV/Excel/PDF để trung tâm vận hành thật.
5. **MVP chạy thật trước, automation sau:** tránh làm CRM/phụ huynh/học phí trước khi assessment core ổn định.

## 5. Các việc nên làm ngay sau khi nhận phiếu đã điền

- Lập bảng yêu cầu Must/Should/Could/Later.
- Chốt Phase G1 trong 2–4 tuần.
- Tạo issues/PR theo từng tính năng nhỏ.
- Smoke test production sau mỗi phase.
