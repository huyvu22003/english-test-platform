// Callback ingest: bot OpenClaw gửi BẢN NHÁP chấm Writing về đây.
// Bảo vệ bằng secret nội bộ WRITING_GRADER_SECRET.
// - action "draft": lưu 4 tiêu chí + feedback + corrections -> ai_status='suggested'
//   (KHÔNG graded — giáo viên duyệt mới thành graded trong app).
// - action "error": ghi ai_error, giữ bài để GV chấm tay / retry.
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

interface Correction {
  original?: string;
  corrected?: string;
  note?: string;
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

  const payload = (await req.json().catch(() => null)) as {
    submission_id?: string;
    action?: "draft" | "error";
    score_tr?: number;
    score_cc?: number;
    score_lr?: number;
    score_gra?: number;
    feedback?: string;
    corrections?: Correction[];
    error?: string;
  } | null;

  const submissionId = payload?.submission_id;
  if (!submissionId) return json({ error: "Thiếu submission_id." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (payload?.action === "error") {
    const { data, error } = await admin.rpc("rpc_mark_writing_ai_error", {
      p_submission_id: submissionId,
      p_error: payload.error ?? "Chấm AI thất bại (không rõ nguyên nhân).",
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, result: data });
  }

  const scores = {
    tr: payload?.score_tr,
    cc: payload?.score_cc,
    lr: payload?.score_lr,
    gra: payload?.score_gra,
  };
  if (!isValidBand(scores.tr) || !isValidBand(scores.cc) || !isValidBand(scores.lr) || !isValidBand(scores.gra)) {
    return json({ error: "Điểm phải nằm trong thang 0–9 theo bước 0.5 cho cả 4 tiêu chí." }, 400);
  }

  // Chuẩn hóa corrections về đúng shape app dùng.
  const corrections = Array.isArray(payload?.corrections)
    ? payload!.corrections
        .filter((c) => c && (c.original || c.corrected))
        .map((c) => ({
          original: String(c.original ?? ""),
          corrected: String(c.corrected ?? ""),
          note: c.note ? String(c.note) : undefined,
        }))
    : [];

  const { data, error } = await admin.rpc("rpc_save_writing_ai_draft", {
    p_submission_id: submissionId,
    p_score_tr: scores.tr,
    p_score_cc: scores.cc,
    p_score_lr: scores.lr,
    p_score_gra: scores.gra,
    p_feedback: payload?.feedback ?? null,
    p_corrections: corrections,
  });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true, result: data });
});
