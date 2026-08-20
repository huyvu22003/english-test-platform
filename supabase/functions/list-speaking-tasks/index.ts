// Bot hạ tầng POLL bài Speaking chờ chấm.
// Bảo vệ bằng secret nội bộ SPEAKING_GRADER_SECRET (không phải service_role key).
// Trả về danh sách bài pending_ai kèm signed READ URL ngắn hạn cho audio private.
// KHÔNG trả public URL, KHÔNG lộ service_role key ra ngoài.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const AUDIO_URL_TTL = 600; // 10 phút — đủ để bot tải audio, không để lâu.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const graderSecret = Deno.env.get("SPEAKING_GRADER_SECRET");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase function environment." }, 500);
  }
  if (!graderSecret) {
    return json({ error: "SPEAKING_GRADER_SECRET chưa được cấu hình." }, 500);
  }

  const secret = req.headers.get("x-internal-secret") ?? "";
  if (secret !== graderSecret) {
    return json({ error: "Unauthorized." }, 401);
  }

  const payload = (await req.json().catch(() => null)) as { limit?: number } | null;
  const limit = Math.max(1, Math.min(payload?.limit ?? 20, 100));

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await admin.rpc("rpc_list_pending_speaking", { p_limit: limit });
  if (error) return json({ error: error.message }, 500);

  const tasks = (rows ?? []) as Array<{
    submission_id: string;
    audio_path: string;
    audio_mime: string | null;
    audio_duration_sec: number | null;
    topic_name: string | null;
    test_title: string | null;
    prompt: string | null;
    submitted_at: string;
    ai_attempted_at: string | null;
  }>;

  const withUrls = [];
  for (const task of tasks) {
    const { data: signed, error: signErr } = await admin.storage
      .from("speaking")
      .createSignedUrl(task.audio_path, AUDIO_URL_TTL);
    if (signErr || !signed) continue; // bỏ qua bài không tạo được URL, không làm hỏng cả batch
    withUrls.push({
      submission_id: task.submission_id,
      audio_url: signed.signedUrl,
      audio_url_expires_in: AUDIO_URL_TTL,
      audio_mime: task.audio_mime,
      audio_duration_sec: task.audio_duration_sec,
      topic_name: task.topic_name,
      test_title: task.test_title,
      prompt: task.prompt,
      submitted_at: task.submitted_at,
      ai_attempted_at: task.ai_attempted_at,
    });
  }

  return json({ tasks: withUrls, count: withUrls.length });
});
