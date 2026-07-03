import type { Submission, TestWithTopic } from "./types";

export interface GradeReportSession {
  name: string;
  access_code: string | null;
  open_at: string | null;
  close_at: string | null;
}

export interface DownloadGradeReportArgs {
  session: GradeReportSession;
  test?: TestWithTopic;
  className?: string | null;
  submissions: Submission[];
  filename: string;
}

const BRAND = {
  name: "IELTS Ms. Trà My",
  subtitle: "English Test Platform",
  logoPath: "/logo-ielts-tra-my.jpg",
  primary: "#14532d",
  accent: "#16a34a",
  gold: "#f59e0b",
};

async function imageToDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(v: number | null | undefined): string { return v == null ? "" : String(v); }
function dateVi(v: string | null | undefined): string { return v ? new Date(v).toLocaleString("vi-VN") : ""; }
function wordCount(essay: string | null): number | string { return essay ? essay.trim().split(/\s+/).filter(Boolean).length : ""; }
function percentOf(x: Submission): string {
  if (x.score == null || !x.max_score) return "";
  return String(Math.round((Number(x.score) / Number(x.max_score)) * 1000) / 10) + "%";
}
function bandOf(x: Submission): string { return num(x.overall_band ?? x.band); }
function statusOf(x: Submission): string { return x.status === "graded" ? "Đã chấm" : "Chờ chấm"; }
function skillLabel(skill?: string): string {
  if (skill === "writing") return "Writing";
  if (skill === "reading") return "Reading";
  if (skill === "listening") return "Listening";
  if (skill === "use_of_english") return "Use of English";
  return skill || "";
}

function safeSheetText(v: string): string {
  // Excel HTML giữ tốt tiếng Việt, nhưng tránh control char lạ làm hỏng file.
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ");
}

export async function downloadGradeReportWorkbook(args: DownloadGradeReportArgs): Promise<void> {
  const { session, test, className, submissions, filename } = args;
  const logo = await imageToDataUrl(BRAND.logoPath);
  const graded = submissions.filter((x) => x.status === "graded").length;
  const waiting = submissions.length - graded;
  const avgBandValues = submissions
    .map((x) => x.overall_band ?? x.band)
    .filter((v): v is number => typeof v === "number");
  const avgBand = avgBandValues.length ? (avgBandValues.reduce((a, b) => a + Number(b), 0) / avgBandValues.length).toFixed(1) : "—";
  const avgPercentValues = submissions
    .map((x) => x.score != null && x.max_score ? Number(x.score) / Number(x.max_score) * 100 : null)
    .filter((v): v is number => typeof v === "number");
  const avgPercent = avgPercentValues.length ? (avgPercentValues.reduce((a, b) => a + b, 0) / avgPercentValues.length).toFixed(1) + "%" : "—";
  const generatedAt = new Date().toLocaleString("vi-VN");

  const rows = submissions.map((x, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td>${esc(dateVi(x.submitted_at))}</td>
      <td class="name">${esc(x.student_name)}</td>
      <td>${esc(x.student_email)}</td>
      <td>${esc(session.name)}</td>
      <td class="center code">${esc(session.access_code)}</td>
      <td>${esc(test ? (test.title ?? `Đề ${test.version_label}`) : (x.topic_name ?? ""))}</td>
      <td class="center">${esc(skillLabel(test?.skill))}</td>
      <td class="num">${esc(num(x.score))}</td>
      <td class="num">${esc(num(x.max_score))}</td>
      <td class="num">${esc(percentOf(x))}</td>
      <td class="num band">${esc(num(x.band))}</td>
      <td class="num band">${esc(num(x.overall_band))}</td>
      <td class="center">${esc(x.cefr)}</td>
      <td class="center status">${esc(statusOf(x))}</td>
      <td class="num">${esc(num(x.score_tr))}</td>
      <td class="num">${esc(num(x.score_cc))}</td>
      <td class="num">${esc(num(x.score_lr))}</td>
      <td class="num">${esc(num(x.score_gra))}</td>
      <td class="num">${esc(wordCount(x.essay))}</td>
      <td class="num">${esc(num(x.violations))}</td>
      <td>${esc(dateVi(x.started_at))}</td>
      <td class="feedback">${esc(x.feedback)}</td>
    </tr>`).join("");

  const individualCards = submissions.map((x, idx) => `
    <section class="student-card">
      <div class="student-head">
        <div>
          <div class="student-index">PHIẾU ĐIỂM CÁ NHÂN #${idx + 1}</div>
          <h2>${esc(x.student_name || "Học viên")}</h2>
          <p>${esc(x.student_email || "")}</p>
        </div>
        <div class="student-score">
          <span>Band</span>
          <strong>${esc(bandOf(x) || "—")}</strong>
        </div>
      </div>
      <table class="personal">
        <tr><th>Buổi thi</th><td>${esc(session.name)}</td><th>Mã thi</th><td>${esc(session.access_code)}</td></tr>
        <tr><th>Đề</th><td>${esc(test ? (test.title ?? `Đề ${test.version_label}`) : (x.topic_name ?? ""))}</td><th>Kỹ năng</th><td>${esc(skillLabel(test?.skill))}</td></tr>
        <tr><th>Trạng thái</th><td>${esc(statusOf(x))}</td><th>Nộp lúc</th><td>${esc(dateVi(x.submitted_at))}</td></tr>
        <tr><th>Điểm</th><td>${esc(num(x.score))} / ${esc(num(x.max_score))} (${esc(percentOf(x))})</td><th>CEFR</th><td>${esc(x.cefr || "")}</td></tr>
        <tr><th>TR</th><td>${esc(num(x.score_tr))}</td><th>CC</th><td>${esc(num(x.score_cc))}</td></tr>
        <tr><th>LR</th><td>${esc(num(x.score_lr))}</td><th>GRA</th><td>${esc(num(x.score_gra))}</td></tr>
        <tr><th>Số từ</th><td>${esc(wordCount(x.essay))}</td><th>Vi phạm</th><td>${esc(num(x.violations))}</td></tr>
        <tr><th>Nhận xét</th><td colspan="3" class="feedback-cell">${esc(x.feedback || "Chưa có nhận xét.")}</td></tr>
      </table>
    </section>`).join("");

  const html = safeSheetText(`<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Bảng điểm</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  @page { margin: 0.45in; }
  body { font-family: "Plus Jakarta Sans", Calibri, Arial, sans-serif; color: #0f172a; }
  .cover { border: 2px solid ${BRAND.primary}; border-radius: 18px; padding: 22px 24px; margin-bottom: 20px; background: #f8fafc; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand img { width: 82px; height: 82px; object-fit: contain; border-radius: 12px; }
  .brand-title { font-size: 15px; color: #64748b; text-transform: uppercase; letter-spacing: 1.8px; font-weight: 700; }
  h1 { margin: 4px 0 2px; color: ${BRAND.primary}; font-size: 28px; }
  h2 { margin: 0; color: ${BRAND.primary}; font-size: 20px; }
  .meta { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .box { border: 1px solid #dbeafe; border-left: 5px solid ${BRAND.accent}; background: #fff; padding: 10px 12px; border-radius: 10px; }
  .box b { display: block; color: ${BRAND.primary}; font-size: 18px; }
  .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .7px; }
  .section-title { margin: 22px 0 8px; color: ${BRAND.primary}; font-size: 18px; font-weight: 800; }
  table { border-collapse: collapse; width: 100%; }
  .score-table th { background: ${BRAND.primary}; color: #fff; padding: 9px 8px; border: 1px solid #0b3d22; font-weight: 700; text-align: center; vertical-align: middle; }
  .score-table td { border: 1px solid #d1d5db; padding: 8px 7px; vertical-align: top; }
  .score-table tr:nth-child(even) td { background: #f8fafc; }
  .center { text-align: center; } .num { text-align: right; } .name { font-weight: 700; color: ${BRAND.primary}; }
  .code { font-weight: 800; color: ${BRAND.gold}; } .band { font-weight: 800; color: ${BRAND.primary}; }
  .status { font-weight: 700; } .feedback { min-width: 260px; white-space: normal; }
  .student-card { page-break-before: always; border: 1px solid #bbf7d0; border-radius: 16px; padding: 18px; margin-top: 24px; }
  .student-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dcfce7; padding-bottom: 12px; margin-bottom: 12px; }
  .student-index { color: #64748b; font-size: 12px; letter-spacing: 1.4px; font-weight: 800; }
  .student-score { text-align: center; border: 2px solid ${BRAND.primary}; border-radius: 16px; padding: 10px 18px; min-width: 90px; background: #f0fdf4; }
  .student-score span { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; }
  .student-score strong { display: block; color: ${BRAND.primary}; font-size: 30px; }
  .personal th { width: 16%; background: #f0fdf4; color: ${BRAND.primary}; text-align: left; border: 1px solid #bbf7d0; padding: 8px; }
  .personal td { width: 34%; border: 1px solid #d1fae5; padding: 8px; }
  .feedback-cell { white-space: normal; min-height: 60px; }
  .footer { margin-top: 14px; color: #64748b; font-size: 12px; text-align: right; }
</style>
</head>
<body>
  <section class="cover">
    <div class="brand">
      ${logo ? `<img src="${logo}" alt="Logo" />` : ""}
      <div>
        <div class="brand-title">${BRAND.subtitle}</div>
        <h1>BẢNG ĐIỂM KIỂM TRA</h1>
        <div><b>${BRAND.name}</b> · Báo cáo xuất từ hệ thống</div>
      </div>
    </div>
    <div class="meta">
      <div class="box"><span class="label">Buổi thi</span><b>${esc(session.name)}</b></div>
      <div class="box"><span class="label">Mã thi</span><b>${esc(session.access_code || "—")}</b></div>
      <div class="box"><span class="label">Lớp</span><b>${esc(className || "Tất cả")}</b></div>
      <div class="box"><span class="label">Kỹ năng</span><b>${esc(skillLabel(test?.skill) || "—")}</b></div>
      <div class="box"><span class="label">Số bài nộp</span><b>${submissions.length}</b></div>
      <div class="box"><span class="label">Đã chấm / Chờ</span><b>${graded} / ${waiting}</b></div>
      <div class="box"><span class="label">Band TB</span><b>${avgBand}</b></div>
      <div class="box"><span class="label">Điểm TB</span><b>${avgPercent}</b></div>
    </div>
    <div class="footer">Xuất lúc ${esc(generatedAt)} · ${esc(session.open_at ? `Mở ${dateVi(session.open_at)}` : "Mở ngay")} · ${esc(session.close_at ? `Đóng ${dateVi(session.close_at)}` : "Không giới hạn đóng")}</div>
  </section>

  <div class="section-title">I. Bảng điểm tổng</div>
  <table class="score-table">
    <thead><tr>
      <th>STT</th><th>Thời gian nộp</th><th>Họ tên</th><th>Email</th><th>Buổi thi</th><th>Mã thi</th><th>Đề</th><th>Kỹ năng</th>
      <th>Điểm</th><th>Tối đa</th><th>Tỷ lệ</th><th>Band tự chấm</th><th>Overall Writing</th><th>CEFR</th><th>Trạng thái</th>
      <th>TR</th><th>CC</th><th>LR</th><th>GRA</th><th>Số từ</th><th>Vi phạm</th><th>Bắt đầu lúc</th><th>Nhận xét</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="section-title">II. Bảng điểm cá nhân</div>
  ${individualCards || "<p>Chưa có bài nộp.</p>"}
</body>
</html>`);

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
