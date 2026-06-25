# PHIẾU KHẢO SÁT NÂNG CẤP

File HTML gửi cho chủ trung tâm/manager:

- `public/forms/Phieu-khao-sat-nang-cap-English-Test-Platform.html`

Sau khi deploy Cloudflare Pages, đường dẫn dự kiến:

```text
/forms/Phieu-khao-sat-nang-cap-English-Test-Platform.html
```

## Mục đích

Phiếu dùng để thu thập nhu cầu trước khi nâng cấp app cho trung tâm tiếng Anh tư nhân nhiều chi nhánh.

Nhóm câu hỏi chính:

1. Bối cảnh trung tâm và quy mô vận hành.
2. Mục tiêu kinh doanh khi nâng cấp app.
3. Luồng kiểm tra cần hỗ trợ: placement/progress/exit/mock.
4. CEFR, IELTS band, level nội bộ, đề xuất lớp.
5. Quản lý chi nhánh, lớp, giáo viên, học viên.
6. Ngân hàng câu hỏi và nội dung đề.
7. Reading/Listening/Use of English.
8. Writing/Speaking/chấm tay.
9. Chống gian lận và kiểm soát bài thi.
10. Báo cáo, dashboard, xuất dữ liệu.
11. Tự động hóa và tích hợp.
12. Ưu tiên Must/Should/Could.
13. Ngân sách, dữ liệu, bảo mật.

## Cách xử lý file kết quả

Người điền có thể tải:

- `.txt`: dễ đọc, gửi qua chat/email.
- `.json`: dùng để phân tích tự động hoặc nhập vào backlog sau này.

Quy trình sau khi nhận kết quả:

1. Đọc phần Must Have trước.
2. Chuyển yêu cầu thành backlog theo phase trong `docs/CENTER_GROWTH_ROADMAP.md`.
3. Nếu có yêu cầu ảnh hưởng schema/permission, thêm ADR vào `docs/DECISIONS.md`.
4. Nếu bắt đầu code, tạo branch riêng và cập nhật `CHANGELOG.md`, `docs/DEVLOG.md`, `docs/PROGRESS.md`.
