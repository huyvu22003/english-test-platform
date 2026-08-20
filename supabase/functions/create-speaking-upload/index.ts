import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ALLOWED_MIME = ["audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg"];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase function environment." }, 500);
  }

  const payload = (await req.json().catch(() => null)) as {
    mime?: string;
    size?: number;
  } | null;

  const mime = payload?.mime ?? "";
  const baseMime = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  const size = payload?.size ?? 0;

  if (!ALLOWED_MIME.includes(baseMime)) {
    return json({ error: `Loại file không hỗ trợ: ${mime}` }, 400);
  }
  if (size <= 0 || size > MAX_SIZE) {
    return json({ error: `Kích thước file không hợp lệ (tối đa ${MAX_SIZE / 1024 / 1024} MB).` }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ext = baseMime === "audio/mpeg" ? "mp3" : baseMime.split("/")[1] ?? "webm";
  const day = new Date().toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${day}/${rand}.${ext}`;

  const { data, error } = await adminClient.storage
    .from("speaking")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return json({ error: error?.message ?? "Không tạo được URL upload." }, 500);
  }

  return json({ path, signed_url: data.signedUrl, token: data.token });
});
