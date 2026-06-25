-- =====================================================================
-- English Test Platform — Supabase Storage cho media (audio/ảnh)
-- Chạy trong Supabase: SQL Editor → dán file này → Run. (1 lần, trên DB mới.)
-- Tạo bucket 'media' (public-read) + cho giáo viên (authenticated) upload/sửa/xóa.
-- VÌ SAO: để GV tải MP3/ảnh ngay trong app (nút "Tải MP3"); học sinh đọc công khai.
-- =====================================================================

-- Bucket 'media' (đọc công khai). Chạy lại an toàn nhờ on conflict.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Ai cũng ĐỌC được file trong 'media' (học sinh nghe audio / xem ảnh).
create policy "media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Giáo viên đã đăng nhập: TẢI LÊN / CẬP NHẬT / XÓA file trong 'media'.
create policy "media teacher insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

create policy "media teacher update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

create policy "media teacher delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');
