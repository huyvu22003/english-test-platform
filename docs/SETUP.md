# SETUP — Những việc bạn cần tự làm (1 lần)

> AI dựng được code, nhưng các tài khoản dịch vụ phải do bạn tạo. Làm theo thứ tự.

## 1. Tạo dự án Supabase (database + auth)
1. Vào https://supabase.com → đăng nhập → **New project**.
2. Đặt tên (vd `english-test-platform`), chọn region gần (Singapore), đặt **Database password** (lưu lại).
3. Vào **SQL Editor → New query** → dán toàn bộ `supabase/schema.sql` → **Run**. (Tạo bảng + RLS + RPC.)
4. Vào **Project Settings → API** → copy:
   - **Project URL** (dạng `https://xxxx.supabase.co`)
   - **anon public key**
5. Tạo tài khoản giáo viên đầu tiên: **Authentication → Users → Add user** (email + mật khẩu). Sau đó vào **SQL Editor** chạy:
   ```sql
   insert into profiles (id, email, full_name, role)
   select id, email, 'Tên GV', 'admin' from auth.users where email = 'email-gv@example.com';
   ```

## 2. Tạo bucket R2 (chứa audio/ảnh)
1. Cloudflare → **R2 → Create bucket** (vd `etp-media`).
2. (Phase 2) Tạo **API token** R2 để app upload qua signed URL — sẽ hướng dẫn khi làm tới phần upload.

## 3. Cấu hình môi trường
Trong thư mục dự án, tạo file `.env` (copy từ `.env.example`) rồi điền:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb....
```
> `.env` đã được `.gitignore` loại — KHÔNG commit. `anon key` an toàn để ở client (RLS bảo vệ dữ liệu); đáp án vẫn nằm sau RPC server.

## 4. Chạy thử trên máy
```bash
npm install      # cài phụ thuộc (1 lần)
npm run dev      # mở http://localhost:5173
```

## 5. Deploy (khi sẵn sàng)
- Cloudflare **Pages → Connect to Git** → chọn repo dự án.
- Build command: `npm run build` · Output dir: `dist`.
- Thêm 2 biến môi trường `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` trong phần **Environment variables** của Pages.
- Push `main` → tự deploy.

---

Khi đã có **Supabase URL + anon key** (Bước 1.4), gửi cho tôi (hoặc tự điền vào `.env`) để tôi tiếp tục Phase 1.
