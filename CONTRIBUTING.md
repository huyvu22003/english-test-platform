# QUY TẮC ĐÓNG GÓP & GHI LOG (v2)

> Kế thừa kỷ luật từ bản v1: mọi thay đổi đáng kể để lại dấu vết ở **commit**, **CHANGELOG.md**, **DEVLOG.md** và tài liệu khi cần. Mục tiêu: AI/dev đời sau đọc lịch sử là hiểu *cái gì đổi, vì sao, ảnh hưởng gì, đang ở đâu*.
>
> 👉 Mới vào dự án? Đọc `docs/ONBOARDING.md` trước.

## Nguyên tắc
1. Mỗi thay đổi đáng kể → 1 mục `CHANGELOG.md`. Ghi **VÌ SAO**, không chỉ cái gì.
2. 1 nhánh / 1 PR = 1 mục đích. Nhánh đặt: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `chore/…`.
3. Commit: `<loại>: <tóm tắt mệnh lệnh, tiếng Việt có dấu>` + thân nêu vì sao/đánh đổi.
   `<loại>` ∈ feat | fix | docs | refactor | style | chore.
4. Đụng cơ chế/luồng/schema → cập nhật `docs/PLAN.md` và/hoặc `supabase/schema.sql`.

---

## 🔁 Quy trình ghi log của MỘT thay đổi (bắt buộc)

Vòng đời chuẩn, làm theo thứ tự:

1. **Tạo nhánh** đúng loại: `git checkout -b feat/<việc-ngắn>`.
2. **Code** + comment tiếng Việt giải thích *vì sao* ở chỗ có "bẫy".
3. **Build/kiểm thử** (xem mục dưới). Phải PASS mới đi tiếp.
4. **Ghi log** — đây là phần KHÔNG được bỏ qua:
   - `CHANGELOG.md`: thêm mục dưới `[Chưa phát hành]`, phân loại **Thêm/Đổi/Sửa/Bỏ/Bảo mật/Tài liệu**, nêu **VÌ SAO**.
   - `docs/DEVLOG.md`: thêm 1 mục lên đầu (mục tiêu → đã làm → quyết định → kết quả → bước tiếp).
   - `docs/PROGRESS.md`: tick hạng mục đã xong / đổi trạng thái / cập nhật "việc tiếp theo".
   - `docs/DECISIONS.md`: **chỉ khi** là quyết định kiến trúc (chọn công nghệ, đổi luồng, ràng buộc mới) → thêm 1 ADR.
   - Tài liệu liên quan khác (bảng bên dưới).
5. **Commit** (mỗi commit 1 ý; subject mệnh lệnh, thân nêu vì sao).
6. **Mở PR** vào `main`, mô tả: làm gì, vì sao, đã test thế nào, còn lại gì.

> Nhớ nhanh: **Code → Build → CHANGELOG → DEVLOG → PROGRESS → (DECISIONS nếu cần) → PR.**

## 📖 Cách ĐỌC log để nắm dự án (cho người tiếp nhận)
| Muốn biết… | Đọc |
|---|---|
| Bắt đầu từ đâu, chạy thế nào | `docs/ONBOARDING.md` |
| **Vì sao** thiết kế như vậy | `docs/DECISIONS.md` |
| **Đang ở đâu**, việc tiếp theo | `docs/PROGRESS.md` |
| **Diễn biến** theo thời gian | `docs/DEVLOG.md` (đọc từ dưới lên) |
| Danh sách thay đổi theo bản | `CHANGELOG.md` |
| Chi tiết từng commit | `git log --oneline` rồi `git show <hash>` |

## 🗂️ Thay đổi nào → cập nhật ở đâu
| Thay đổi | Cập nhật |
|---|---|
| Bất kỳ thay đổi đáng kể nào | `CHANGELOG.md` + `docs/DEVLOG.md` |
| Hoàn thành/đổi trạng thái hạng mục | `docs/PROGRESS.md` |
| Quyết định kiến trúc (công nghệ/luồng/ràng buộc) | `docs/DECISIONS.md` (thêm ADR) |
| Kiến trúc/luồng/tính năng tổng thể | `docs/PLAN.md` |
| Bảng/RPC/RLS database | `supabase/schema.sql` (comment đầy đủ) |
| Cách setup/deploy/biến môi trường | `docs/SETUP.md`, `README.md` |

## Code
- React + Vite + TypeScript. Giữ component nhỏ, rõ; tránh phụ thuộc thừa (dễ bảo trì).
- **Đáp án không bao giờ xuống client.** Mọi chấm điểm/đề có đáp án đi qua RPC server (xem ADR-002).
- Mọi lời gọi DB/RPC gom trong `src/lib/api.ts` — đừng gọi Supabase rải rác trong component.
- Secret để trong `.env` (không commit). Khóa dữ liệu bằng RLS.
- Comment tiếng Việt giải thích **VÌ SAO** ở chỗ có "bẫy".

## Kiểm thử tối thiểu trước khi mở PR
1. `npm run build` không lỗi (TypeScript pass).
2. Smoke: đăng nhập GV → tạo 1 đề → HS làm thử → nộp → thấy điểm/được lưu.
3. Đụng phần nào test phần đó (auth / chấm điểm / upload / khóa fullscreen).

---

## Template

**Commit**
```
<loại>: <tóm tắt mệnh lệnh, tiếng Việt có dấu>

VÌ SAO: <lý do/đánh đổi>
<các điểm chính nếu cần>
```

**Mục CHANGELOG** (dưới `[Chưa phát hành]`)
```
### <Thêm|Đổi|Sửa|Bỏ|Bảo mật|Tài liệu> — <chủ đề>
- <thay đổi>. VÌ SAO: <lý do>.
```

> Template cho **DEVLOG** và **ADR** nằm ở cuối `docs/DEVLOG.md` và `docs/DECISIONS.md`.
