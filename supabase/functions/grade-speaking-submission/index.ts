// Callback ingest: bot hạ tầng gửi KẾT QUẢ chấm Speaking về đây.
// Bảo vệ bằng secret nội bộ SPEAKING_GRADER_SECRET.
// - action mặc định "result": ghi transcript + 4 tiêu chí IELTS + feedback -> graded.
// - action "error": ghi ai_error, giữ nguyên pending_ai để retry.
// Repo KHÔNG chứa AI key/model/bot token — mọi việc transcribe/chấm nằm ở bot.
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

function isValidBand(n: unknown): n is number {
  return typeof n === "number" && n >= 0 && n <= 9 && n * 2 === Math.floor(n * 2);
}

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

  const payload = (await req.json().catch(() => null)) as {
    submission_id?: string;
    action?: "result" | "error";
    transcript?: string;
    score_fc?: number;
    score_lr?: number;
    score_gra?: number;
    score_pronunciation?: number;
    feedback?: string;
    force?: boolean;
    error?: string;
  } | null;

  const submissionId = payload?.submission_id;
  if (!submissionId) return json({ error: "Thiếu submission_id." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Nhánh báo lỗi chấm — giữ pending_ai để retry, không làm mất bài.
  if (payload?.action === "error") {
    const { data, error } = await admin.rpc("rpc_mark_speaking_ai_error", {
      p_submission_id: submissionId,
      p_error: payload.error ?? "Chấm AI thất bại (không rõ nguyên nhân).",
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, result: data });
  }

  // Nhánh ghi kết quả — validate điểm trước khi gọi RPC.
  const scores = {
    fc: payload?.score_fc,
    lr: payload?.score_lr,
    gra: payload?.score_gra,
    pron: payload?.score_pronunciation,
  };
  if (!isValidBand(scores.fc) || !isValidBand(scores.lr) || !isValidBand(scores.gra) || !isValidBand(scores.pron)) {
    return json({ error: "Điểm phải nằm trong thang 0–9 theo bước 0.5 cho cả 4 tiêu chí." }, 400);
  }

  const { data, error } = await admin.rpc("rpc_bot_grade_speaking", {
    p_submission_id: submissionId,
    p_transcript: payload?.transcript ?? null,
    p_score_fc: scores.fc,
    p_score_lr: scores.lr,
    p_score_gra: scores.gra,
    p_score_pronunciation: scores.pron,
    p_feedback: payload?.feedback ?? null,
    p_force: payload?.force ?? false,
  });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true, result: data });
});
