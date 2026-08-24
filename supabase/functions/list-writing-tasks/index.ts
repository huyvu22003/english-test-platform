// Bot OpenClaw POLL bài Writing cần AI gợi ý.
// Bảo vệ bằng secret nội bộ WRITING_GRADER_SECRET (không phải service_role key).
// Trả prompt + essay để bot chấm. RPC đồng thời đặt bài sang 'pending' (khóa mềm).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const graderSecret = Deno.env.get("WRITING_GRADER_SECRET");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase function environment." }, 500);
  }
  if (!graderSecret) {
    return json({ error: "WRITING_GRADER_SECRET chưa được cấu hình." }, 500);
  }
  if ((req.headers.get("x-internal-secret") ?? "") !== graderSecret) {
    return json({ error: "Unauthorized." }, 401);
  }

  const payload = (await req.json().catch(() => null)) as { limit?: number } | null;
  const limit = Math.max(1, Math.min(payload?.limit ?? 5, 20));

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("rpc_list_writing_tasks", { p_limit: limit });
  if (error) return json({ error: error.message }, 500);

  const tasks = (data ?? []) as unknown[];
  return json({ tasks, count: tasks.length });
});
