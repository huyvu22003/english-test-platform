import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cấu hình đọc từ biến môi trường (xem .env.example). anon key an toàn để ở client:
// dữ liệu được bảo vệ bằng RLS, còn đáp án nằm sau RPC chạy quyền server.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && anonKey);

// Khi chưa cấu hình .env, client = null để app vẫn chạy (Phase 0 / chế độ demo).
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url as string, anonKey as string)
  : null;
