import type { Submission, WritingCorrection, WritingScores } from "../../lib/types";
import { countWords } from "../../lib/utils";

export type GradingDraft = {
  scores: WritingScores;
  feedback: string;
  corrections: WritingCorrection[];
  updatedAt: string;
};

export const OPEN_GRADING_KEY = "etp:admin:open-grading-submission";
const GRADING_DRAFT_PREFIX = "etp:admin:grading-draft:";

export function isValidBandScore(v: number): boolean {
  return Number.isFinite(v) && v >= 0 && v <= 9 && Math.abs(v * 2 - Math.round(v * 2)) < 0.001;
}

export function workflowMessage(status: Submission["status"]): string {
  if (status === "assigned") return "Đã chuyển bài sang bước đang chấm.";
  if (status === "in_review") return "Đã chuyển bài sang bước cần review.";
  if (status === "graded") return "Bài đã hoàn tất chấm.";
  return "Đã đưa bài về trạng thái chờ xử lý.";
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorage(key: string): string | null {
  try {
    return canUseStorage() ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    if (canUseStorage()) window.localStorage.setItem(key, value);
  } catch {
    /* Storage can be blocked in private modes */
  }
}

export function removeStorage(key: string) {
  try {
    if (canUseStorage()) window.localStorage.removeItem(key);
  } catch {
    /* Ignore storage cleanup failures */
  }
}

export function getStoredOpenSubmissionId(): string | null {
  const queryOpenId = new URLSearchParams(window.location.search).get("open");
  if (queryOpenId?.trim()) return queryOpenId.trim();
  const value = readStorage(OPEN_GRADING_KEY);
  return value?.trim() || null;
}

function gradingDraftKey(submissionId: string): string {
  return `${GRADING_DRAFT_PREFIX}${submissionId}`;
}

export function readGradingDraft(submissionId: string): GradingDraft | null {
  const raw = readStorage(gradingDraftKey(submissionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GradingDraft>;
    if (!parsed.scores || !Array.isArray(parsed.corrections)) return null;
    const scores = parsed.scores as Partial<WritingScores>;
    if (!["tr", "cc", "lr", "gra"].every((key) => typeof scores[key as keyof WritingScores] === "number")) return null;
    return {
      scores: {
        tr: scores.tr as number,
        cc: scores.cc as number,
        lr: scores.lr as number,
        gra: scores.gra as number,
      },
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      corrections: parsed.corrections,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function writeGradingDraft(submissionId: string, draft: GradingDraft) {
  writeStorage(gradingDraftKey(submissionId), JSON.stringify(draft));
}

export function clearGradingDraft(submissionId: string) {
  removeStorage(gradingDraftKey(submissionId));
}

export function num(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

export function wc(essay: string | null): number {
  return essay ? countWords(essay) : 0;
}

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function escExcel(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export interface GradingExportMeta {
  topic: string;
  status: string;
  query: string;
  total: number;
  pending: number;
}

export function downloadGradingExcel(rows: Submission[], meta: GradingExportMeta) {
  const today = new Date();
  const graded = rows.filter((s) => s.status === "graded").length;
  const pendingRows = rows.filter(
    (s) => s.status === "submitted" || s.status === "assigned" || s.status === "in_review",
  ).length;
  const violationRows = rows.filter((s) => (s.violations ?? 0) > 0).length;
  const avgBand = average(rows.map((s) => s.overall_band ?? s.band));
  const bodyRows = rows
    .map((s, idx) => {
      const statusText =
        s.status === "graded"
          ? "Đã chấm"
          : s.status === "assigned"
            ? "Đã giao"
            : s.status === "in_review"
              ? "Cần review"
              : "Chờ chấm";
      const statusClass = s.status === "graded" ? "ok" : "pending";
      const viol = s.violations ?? 0;
      return `<tr>
      <td class="center">${idx + 1}</td>
      <td>${escExcel(new Date(s.submitted_at).toLocaleString("vi-VN"))}</td>
      <td>${escExcel(s.student_name ?? "")}</td>
      <td>${escExcel(s.student_email ?? "")}</td>
      <td>${escExcel(s.topic_name ?? "")}</td>
      <td>${escExcel(s.tests?.title ?? "")}</td>
      <td class="center">${wc(s.essay)}</td>
      <td class="center band">${num(s.overall_band ?? s.band)}</td>
      <td class="center">${escExcel(s.cefr ?? "")}</td>
      <td class="center">${num(s.score_tr)}</td>
      <td class="center">${num(s.score_cc)}</td>
      <td class="center">${num(s.score_lr)}</td>
      <td class="center">${num(s.score_gra)}</td>
      <td class="${statusClass}">${statusText}</td>
      <td class="center ${viol ? "danger" : ""}">${viol}</td>
      <td class="center">${s.writing_corrections?.length ?? 0}</td>
      <td class="wrap">${escExcel(s.feedback ?? "")}</td>
    </tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #221b26; }
      .title { font-size: 22px; font-weight: 800; color: #7a2b8f; }
      .subtitle { color: #6c6880; font-size: 12px; }
      .summary td { border: 1px solid #ececf1; padding: 8px 10px; }
      .summary .label { background: #fff7ed; color: #9a3412; font-weight: 700; }
      table.report { border-collapse: collapse; width: 100%; }
      .report th { background: #7a2b8f; color: #fff; font-weight: 700; border: 1px solid #5b1b6f; padding: 8px; text-align: center; }
      .report td { border: 1px solid #e5e7eb; padding: 7px; vertical-align: top; }
      .report tr:nth-child(even) td { background: #fafafe; }
      .center { text-align: center; }
      .band { font-size: 16px; font-weight: 800; color: #ec3a2b; }
      .ok { background: #ecfdf5; color: #166534; font-weight: 700; text-align: center; }
      .pending { background: #fff1f2; color: #be123c; font-weight: 700; text-align: center; }
      .danger { color: #be123c; font-weight: 800; background: #fff1f2; }
      .wrap { white-space: normal; width: 360px; }
      .hint { color: #6c6880; font-size: 12px; }
    </style>
  </head><body>
    <table><tr><td class="title" colspan="17">BÁO CÁO CHẤM WRITING — IELTS MS. TRÀ MY</td></tr>
    <tr><td class="subtitle" colspan="17">Xuất lúc ${escExcel(today.toLocaleString("vi-VN"))}. File dùng để lưu hồ sơ, lọc điểm, theo dõi bài chờ chấm và gửi báo cáo nội bộ.</td></tr></table>
    <br />
    <table class="summary">
      <tr><td class="label">Bộ lọc chủ đề</td><td>${escExcel(meta.topic)}</td><td class="label">Trạng thái</td><td>${escExcel(meta.status)}</td><td class="label">Tìm kiếm</td><td>${escExcel(meta.query)}</td></tr>
      <tr><td class="label">Tổng bài trong file</td><td>${meta.total}</td><td class="label">Đã chấm</td><td>${graded}</td><td class="label">Chờ chấm</td><td>${pendingRows}</td></tr>
      <tr><td class="label">Bài có vi phạm</td><td>${violationRows}</td><td class="label">Band trung bình</td><td>${avgBand == null ? "—" : avgBand.toFixed(1)}</td><td class="label">Tổng chờ chấm hệ thống</td><td>${meta.pending}</td></tr>
    </table>
    <p class="hint">Mẹo: mở bằng Excel/Google Sheets rồi bật Filter để lọc theo học sinh, chủ đề, trạng thái, vi phạm hoặc band.</p>
    <table class="report">
      <thead><tr>
        <th>STT</th><th>Thời gian nộp</th><th>Họ tên</th><th>Email</th><th>Chủ đề</th><th>Tiêu đề đề</th><th>Số từ</th>
        <th>Overall</th><th>CEFR</th><th>TR</th><th>CC</th><th>LR</th><th>GRA</th><th>Trạng thái</th><th>Vi phạm</th><th>Số lỗi sửa câu</th><th>Nhận xét</th>
      </tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bao-cao-cham-writing-${today.toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
