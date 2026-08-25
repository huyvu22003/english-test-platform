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

interface SubmissionNotice {
  student_name?: string | null;
  topic_name?: string | null;
  submitted_at?: string | null;
  tests?: { title?: string | null } | null;
}

const TEACHER_TELEGRAM_CHAT_ID = "6599802862";
const ADMIN_GRADING_URL = "https://english-test-platform.pages.dev/admin/submissions";

function formatBand(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

async function notifyTeacherWritingAiDraft(
  admin: ReturnType<typeof createClient>,
  submissionId: string,
  scores: { tr: number; cc: number; lr: number; gra: number },
) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TEACHER_TELEGRAM_CHAT_ID") || TEACHER_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  const { data, error } = await admin
    .from("submissions")
    .select("student_name, topic_name, submitted_at, tests(title)")
    .eq("id", submissionId)
    .maybeSingle<SubmissionNotice>();

  if (error) {
    console.warn("Không lấy được thông tin bài để gửi Telegram:", error.message);
  }

  const studentName = data?.student_name?.trim() || "Học viên";
  const topicName = data?.topic_name?.trim() || data?.tests?.title?.trim() || "Writing";
  const submittedAt = data?.submitted_at
    ? new Date(data.submitted_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : null;

  const text = [
    "IELTS Trà My - AI đã có gợi ý chấm Writing",
    "",
    `Học viên: ${studentName}`,
    `Chủ đề: ${topicName}`,
    submittedAt ? `Nộp lúc: ${submittedAt}` : null,
    `Điểm AI: TR ${formatBand(scores.tr)} | CC ${formatBand(scores.cc)} | LR ${formatBand(scores.lr)} | GRA ${formatBand(scores.gra)}`,
    "",
    "Vào Admin -> Hàng đợi chấm để duyệt thủ công.",
    ADMIN_GRADING_URL,
  ]
    .filter(Boolean)
    .join("\n");

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!telegramResponse.ok) {
    const body = await telegramResponse.text().catch(() => "");
    console.warn(`Telegram notify failed: ${telegramResponse.status} ${body.slice(0, 300)}`);
  }
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

  if (!data?.skipped) {
    await notifyTeacherWritingAiDraft(admin, submissionId, {
      tr: scores.tr,
      cc: scores.cc,
      lr: scores.lr,
      gra: scores.gra,
    }).catch((notifyError) => {
      console.warn(
        "Không gửi được thông báo Telegram:",
        notifyError instanceof Error ? notifyError.message : notifyError,
      );
    });
  }

  return json({ ok: true, result: data });
});
