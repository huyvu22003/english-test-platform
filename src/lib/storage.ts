import { supabase } from "./supabase";

// Tải file (audio MP3 / ảnh) lên Supabase Storage bucket 'media' rồi trả public URL.
// VÌ SAO: cho GV upload media ngay trong app thay vì phải tự host & dán link
// (R2 vẫn dùng được qua ô "dán link"). Bucket 'media' để public-read (xem supabase/storage.sql).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "audio/mpeg", "audio/mp3", "audio/wav"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function uploadMedia(file: File): Promise<string> {
  if (!supabase) throw new Error("Chưa cấu hình Supabase (.env). Xem docs/SETUP.md.");
  if (file.size > MAX_FILE_SIZE) throw new Error(`File quá lớn (tối đa ${MAX_FILE_SIZE / 1024 / 1024} MB).`);
  if (file.type && !ALLOWED_TYPES.includes(file.type))
    throw new Error(`Loại file không hỗ trợ: ${file.type}. Chỉ chấp nhận ảnh (JPEG/PNG/GIF/WebP) và audio (MP3/WAV).`);

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

export async function uploadSpeakingAudio(
  blob: Blob,
  signedUrl: string,
  token: string,
): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": blob.type || "audio/webm",
      ...(token ? { "x-upsert": "false" } : {}),
    },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload thất bại (${res.status}): ${text}`);
  }
}
