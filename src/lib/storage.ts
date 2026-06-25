import { supabase } from "./supabase";

// Tải file (audio MP3 / ảnh) lên Supabase Storage bucket 'media' rồi trả public URL.
// VÌ SAO: cho GV upload media ngay trong app thay vì phải tự host & dán link
// (R2 vẫn dùng được qua ô "dán link"). Bucket 'media' để public-read (xem supabase/storage.sql).
export async function uploadMedia(file: File): Promise<string> {
  if (!supabase) throw new Error("Chưa cấu hình Supabase (.env). Xem docs/SETUP.md.");

  // Đường dẫn ngẫu nhiên theo ngày: tránh trùng tên + dễ rà soát/dọn theo ngày.
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rand = Math.random().toString(36).slice(2, 10);
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${day}/${rand}-${safeName}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
