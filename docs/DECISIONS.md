# 🧭 DECISIONS — Nhật ký quyết định kiến trúc (ADR)

> Ghi lại **VÌ SAO** dự án làm theo cách hiện tại. Mỗi quyết định lớn = 1 mục (ADR — Architecture Decision Record). Khi đổi hướng: KHÔNG xóa mục cũ, mà thêm mục mới và đánh dấu mục cũ là *Đã thay thế*.
>
> **Cách dùng:** trước khi sửa thứ gì có vẻ "lạ", tìm trong file này xem có lý do chưa. Khi ra quyết định mới đáng kể, thêm 1 mục theo template ở cuối.

Trạng thái: ✅ Đang áp dụng · 🔁 Đã thay thế · 💤 Tạm hoãn

---

## ADR-001 — Dùng dịch vụ managed (Supabase + Cloudflare), không tự nuôi server
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Dự án do chủ trung tâm + AI tự duy trì, ít người, không có đội vận hành.
- **Quyết định:** Database/Auth/API dùng **Supabase**; host **Cloudflare Pages**; media **Cloudflare R2**.
- **Vì sao:** Giảm tối đa việc vận hành (tự backup, tự scale, tự HTTPS). Push code là deploy.
- **Hệ quả:** Phụ thuộc nhà cung cấp, nhưng dữ liệu là Postgres chuẩn nên luôn xuất được (chống khóa cứng).

## ADR-002 — Chấm điểm Ở SERVER, đáp án không bao giờ xuống client
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Học sinh thi trên trình duyệt; nếu gửi đáp án xuống client thì xem được qua DevTools/Network.
- **Quyết định:** `questions.correct` chỉ đọc trong RPC `SECURITY DEFINER` (`rpc_get_test` loại bỏ cột này; `rpc_submit` chấm rồi mới trả điểm). RLS **không** cấp quyền đọc bảng `questions` cho `anon`.
- **Vì sao:** Đây là bất biến bảo mật cốt lõi của một nền tảng thi.
- **Hệ quả:** Mọi thao tác của học sinh phải đi qua RPC, không gọi thẳng bảng. Thêm loại câu hỏi mới ⇒ phải cập nhật logic chấm trong `rpc_submit`.

## ADR-003 — `questions.correct` lưu theo GIÁ TRỊ lựa chọn, không theo chữ cái/chỉ số
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Muốn **xáo trộn** thứ tự đáp án để chống nhìn bài.
- **Quyết định:** `correct` lưu nội dung lựa chọn (vd `"Paris"` / `["Paris","Hà Nội"]`), không lưu `"B"` hay chỉ số.
- **Vì sao:** Nếu lưu theo chữ cái/chỉ số thì xáo trộn sẽ làm sai ánh xạ đáp án. Lưu theo giá trị thì xáo kiểu gì cũng chấm đúng.
- **Hệ quả:** So khớp đáp án chuẩn hóa hoa-thường/khoảng trắng (`etp_norm`). Hai lựa chọn trùng nội dung là không hợp lệ. Chi tiết quy ước nằm trong comment `supabase/schema.sql`.

## ADR-004 — Học sinh ẩn danh (anon), không bắt đăng nhập
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Học sinh trung tâm, không nên buộc tạo tài khoản.
- **Quyết định:** Học sinh nhập tên + email rồi thi (role `anon`). Danh sách đề mở lấy qua `rpc_list_exams` (chỉ trả thông tin an toàn).
- **Vì sao:** Vì RLS chặn `anon` đọc thẳng `topics`/`tests`, cần 1 RPC riêng để liệt kê đề mà không lộ câu hỏi.
- **Hệ quả:** Danh tính học sinh chỉ là tên/email tự khai (không xác thực). Buổi thi/mã thi (Phase 4) sẽ siết thêm.

## ADR-005 — Khóa chống gian lận phía client (fullscreen + log), không chặn tuyệt đối
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Quyết định:** Vào toàn màn hình; ghi nhận + đếm khi rời tab, thoát fullscreen, copy/paste, phím tắt DevTools; gửi `violations` + `violation_log` kèm bài nộp.
- **Vì sao:** Không có cách chặn 100% trên trình duyệt; mục tiêu là **răn đe + để lại bằng chứng** cho giáo viên xem.
- **Hệ quả:** Giáo viên tự quyết xử lý dựa trên log. Một số máy/trình duyệt không cho fullscreen ⇒ vẫn ghi các vi phạm khác.

## ADR-006 — Quy đổi band là XẤP XỈ theo % đúng
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅ (cần hiệu chỉnh)
- **Quyết định:** Hàm `etp_band` map % đúng → band; bài Viết trả `NULL` (chấm tay).
- **Vì sao:** Band IELTS thật phụ thuộc bảng raw→band của từng đề; ở đây cần một con số tham khảo nhanh.
- **Hệ quả:** **Trung tâm nên chỉnh lại bảng trong `etp_band`** cho khớp thang điểm thực tế. Đừng coi đây là band chính thức.

## ADR-007 — Media (audio/ảnh) nhập bằng LINK thủ công trước, upload R2 để Phase 4
- **Ngày:** 2026-06-23 · **Trạng thái:** 💤 (tạm)
- **Quyết định:** Trường `passages.media_url` cho giáo viên dán link; chưa làm upload trực tiếp lên R2.
- **Vì sao:** Upload R2 cần API token + endpoint ký URL (server) — cần tài khoản người dùng và thêm hạ tầng; chưa chặn được tiến độ Phase 1–3.
- **Hệ quả:** Phase 4 sẽ bổ sung upload (signed URL). Hiện giáo viên tự đưa file lên R2/CDN rồi dán link.

## ADR-008 — Frontend React + Vite + TypeScript, 1 app gộp (học sinh + admin)
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Quyết định:** 1 SPA, định tuyến bằng `react-router-dom`; thêm `public/_redirects` để Cloudflare Pages trả `index.html` cho mọi route.
- **Vì sao:** Đơn giản, ít hạ tầng; TypeScript bắt lỗi sớm; gộp 1 app dễ chia sẻ code/kiểu dữ liệu.
- **Hệ quả:** Phân quyền admin/học sinh bằng route + Auth, không tách 2 dự án.

## ADR-009 — Đổi định vị: hệ đánh giá năng lực & theo dõi tiến bộ (không phải nền tảng thi)
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Mục tiêu thật của trung tâm là **xếp lớp + kiểm tra trong quá trình học**; thi đầu ra là tương lai chưa cụ thể.
- **Quyết định:** Định vị lại sản phẩm quanh 3 thời điểm (placement/progress/exit), ưu tiên *progress* trước; học viên có danh tính (low-stakes).
- **Vì sao:** Khung "nền tảng thi high-stakes" tối ưu sai chỗ (chống gian lận) thay vì *độ chính xác xếp trình độ + dữ liệu tiến bộ*.
- **Hệ quả:** Hạ ưu tiên chống gian lận xuống Phase F; nâng CEFR + roster + tiến bộ lên đầu. Xem `docs/VISION.md`.

## ADR-010 — CEFR là thang lõi, IELTS band là ánh xạ
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Quyết định:** Bảng `levels` (A1–C2 ↔ ielts_band ↔ tên lớp nội bộ). Mọi kết quả quy về CEFR.
- **Vì sao:** CEFR mô tả được *làm được gì* ở mỗi mức, chuẩn quốc tế; IELTS band để tham chiếu quen thuộc.
- **Hệ quả:** Band IELTS (gồm band Writing chấm tay) → CEFR qua `etp_band_to_cefr`. Bảng ánh xạ chỉnh được tập trung 1 chỗ.

## ADR-011 — Roster học viên (định danh theo email), không ẩn danh hoàn toàn
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Quyết định:** Bảng `students`; khi nộp bài, upsert học viên theo email và gắn `submission.student_id`.
- **Vì sao:** Cần nối các lần làm để **vẽ tiến bộ theo thời gian** — giá trị cốt lõi.
- **Hệ quả:** Đăng nhập nhẹ (email/mã học viên, chưa cần mật khẩu). Tiến bộ tra theo email tại `/progress`.

## ADR-012 — Đợt đầu = Writing Task 2, CHẤM TAY 4 tiêu chí IELTS
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Nội dung sẵn có là 11 chủ đề Writing từ app v1; trung tâm muốn giáo viên chấm.
- **Quyết định:** `scoring_method='manual'`; GV chấm 4 tiêu chí (TR/CC/LR/GRA) 0–9 → overall (trung bình, làm tròn 0.5) → CEFR.
- **Vì sao:** Chấm Writing tự động không đáng tin; 4 tiêu chí cho học sinh biết điểm yếu cụ thể (giá trị học tập).
- **Hệ quả:** Bài có vòng đời `submitted`→`graded`; dashboard có hàng đợi chấm. Engine `manual` là 1 nhánh trong khớp nối #3 (ADR-013).

## ADR-013 — Engine xếp trình độ tách rời sau một "contract" ổn định
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Quyết định:** Kết quả luôn ở dạng chuẩn (overall_band + cefr theo kỹ năng); cách tính chọn theo `scoring_method`. Nay = `manual`.
- **Vì sao:** Để tương lai cắm thêm `threshold` (placement tự chấm) → `multistage` → `IRT/CAT` mà không sửa báo cáo/tiến bộ.
- **Hệ quả:** Lưu dữ liệu "như thể sẽ lên IRT" (giữ từng bài/đáp án) ngay từ đầu. Xem VISION §4.

## ADR-014 — Bốc đề NGẪU NHIÊN trong chủ đề; KHÔNG di trú dữ liệu v1
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Quyết định:** 1 chủ đề ↔ nhiều đề (`tests`); `rpc_pick_prompt` bốc ngẫu nhiên 1 đề. DB v2 bắt đầu trắng.
- **Vì sao:** Công bằng giữa học sinh (giống v1); dữ liệu cũ trong Google Sheet không cần mang sang để khởi động sạch.
- **Hệ quả:** Giáo viên bổ sung đề cho từng chủ đề dễ dàng. v1 vẫn chạy tới khi v2 thay thế xong.

## ADR-015 — Đăng nhập học viên bằng MÃ (chưa dùng magic-link)
- **Ngày:** 2026-06-23 · **Trạng thái:** ✅
- **Bối cảnh:** Cần nối bài làm vào hồ sơ học viên với ít ma sát; magic-link cần cấu hình email provider.
- **Quyết định:** Học sinh nhập **mã học viên** (GV cấp) → `rpc_student_by_code` điền sẵn tên/email; vẫn cho nhập thủ công tên/email.
- **Vì sao:** Mã hoạt động ngay, không phụ thuộc hạ tầng email; đủ cho low-stakes. Magic-link để sau nếu cần xác thực thật.
- **Hệ quả:** Nối hồ sơ tốt nhất khi học viên có email/mã trong roster. Quản lý roster ở trang `Lớp & Học viên`.

---

## Template thêm ADR mới (sao chép phần dưới)
```
## ADR-0XX — <tên quyết định ngắn gọn>
- **Ngày:** YYYY-MM-DD · **Trạng thái:** ✅ / 🔁 / 💤
- **Bối cảnh:** vấn đề/áp lực dẫn tới quyết định.
- **Quyết định:** chọn cái gì.
- **Vì sao:** lý do, đánh đổi đã cân nhắc.
- **Hệ quả:** ảnh hưởng về sau, ràng buộc mới, việc phải nhớ.
```
