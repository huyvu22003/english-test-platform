import type * as ExcelJSType from "exceljs";
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
  primary: "14532D",
  light: "F0FDF4",
  border: "BBF7D0",
  text: "0F172A",
  muted: "64748B",
  gold: "F59E0B",
};

const THIN = { style: "thin", color: { argb: "FFD1D5DB" } } as const;

async function imageToBase64(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = typeof reader.result === "string" ? reader.result : "";
        resolve(s.includes(",") ? s.split(",")[1] : s || null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function num(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}
function dateVi(v: string | null | undefined): string {
  return v ? new Date(v).toLocaleString("vi-VN") : "";
}
function wordCount(essay: string | null): number | string {
  return essay ? essay.trim().split(/\s+/).filter(Boolean).length : "";
}
function percentOf(x: Submission): string {
  if (x.score == null || !x.max_score) return "";
  return String(Math.round((Number(x.score) / Number(x.max_score)) * 1000) / 10) + "%";
}
function bandOf(x: Submission): string {
  return num(x.overall_band ?? x.band);
}
function statusOf(x: Submission): string {
  return x.status === "graded" ? "Đã chấm" : "Chờ chấm";
}
function skillLabel(skill?: string): string {
  if (skill === "writing") return "Writing";
  if (skill === "reading") return "Reading";
  if (skill === "listening") return "Listening";
  if (skill === "use_of_english") return "Use of English";
  return skill || "";
}
function testName(test: TestWithTopic | undefined, fallback: string | null): string {
  return test ? (test.title ?? `Đề ${test.version_label}`) : (fallback ?? "");
}

function _safeName(v: string): string {
  return v.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
}

function styleMergedTitle(ws: ExcelJSType.Worksheet, range: string, value: string, size = 18) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(":")[0]);
  cell.value = value;
  cell.font = { bold: true, size, color: { argb: `FF${BRAND.primary}` } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function styleInfoCell(cell: ExcelJSType.Cell, muted = false) {
  cell.font = { bold: !muted, color: { argb: muted ? `FF${BRAND.muted}` : `FF${BRAND.text}` } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: muted ? "FFF8FAFC" : "FFFFFFFF" } };
}

function styleHeader(row: ExcelJSType.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.primary}` } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  });
}

function styleBodyRow(row: ExcelJSType.Row, index: number) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: "top", wrapText: true };
    cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
    if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  });
}

function addLogo(ws: ExcelJSType.Worksheet, workbook: ExcelJSType.Workbook, logoBase64: string | null, startRow = 1) {
  ws.mergeCells(`A${startRow}:C${startRow + 2}`);
  for (let i = startRow; i <= startRow + 2; i++) ws.getRow(i).height = 22;
  if (!logoBase64) {
    const c = ws.getCell(`A${startRow}`);
    c.value = "IELTS\nMS. TRÀ MY";
    c.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF772B8F" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    return;
  }
  const imageId = workbook.addImage({ base64: logoBase64, extension: "jpeg" });
  ws.addImage(imageId, { tl: { col: 0, row: startRow - 1 }, ext: { width: 225, height: 72 } });
}

export async function downloadGradeReportWorkbook(args: DownloadGradeReportArgs): Promise<void> {
  const { session, test, className, submissions, filename } = args;
  const [{ default: ExcelJS }, logoBase64] = await Promise.all([import("exceljs"), imageToBase64(BRAND.logoPath)]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND.name;
  workbook.created = new Date();

  const graded = submissions.filter((x) => x.status === "graded").length;
  const waiting = submissions.length - graded;
  const avgBandValues = submissions
    .map((x) => x.overall_band ?? x.band)
    .filter((v): v is number => typeof v === "number");
  const avgBand = avgBandValues.length
    ? (avgBandValues.reduce((a, b) => a + Number(b), 0) / avgBandValues.length).toFixed(1)
    : "—";
  const avgPercentValues = submissions
    .map((x) => (x.score != null && x.max_score ? (Number(x.score) / Number(x.max_score)) * 100 : null))
    .filter((v): v is number => typeof v === "number");
  const avgPercent = avgPercentValues.length
    ? (avgPercentValues.reduce((a, b) => a + b, 0) / avgPercentValues.length).toFixed(1) + "%"
    : "—";

  const ws = workbook.addWorksheet("Bảng điểm", { views: [{ state: "frozen", ySplit: 11 }] });
  ws.properties.defaultRowHeight = 20;
  ws.columns = [
    { width: 6 },
    { width: 19 },
    { width: 24 },
    { width: 32 },
    { width: 31 },
    { width: 15 },
    { width: 28 },
    { width: 13 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 13 },
    { width: 15 },
    { width: 10 },
    { width: 14 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 9 },
    { width: 10 },
    { width: 19 },
    { width: 42 },
  ];
  addLogo(ws, workbook, logoBase64);
  styleMergedTitle(ws, "D1:W2", "BẢNG ĐIỂM KIỂM TRA", 21);
  styleMergedTitle(ws, "D3:W3", `${BRAND.name} · ${BRAND.subtitle}`, 12);
  ws.getCell("D3").font = { bold: true, size: 12, color: { argb: `FF${BRAND.muted}` } };

  const info = [
    ["Buổi thi", session.name, "Mã thi", session.access_code || "—", "Lớp", className || "Tất cả"],
    [
      "Kỹ năng",
      skillLabel(test?.skill) || "—",
      "Số bài nộp",
      submissions.length,
      "Đã chấm / Chờ",
      `${graded} / ${waiting}`,
    ],
    ["Band TB", avgBand, "Điểm TB", avgPercent, "Xuất lúc", new Date().toLocaleString("vi-VN")],
    [
      "Mở lúc",
      dateVi(session.open_at) || "Ngay",
      "Đóng lúc",
      dateVi(session.close_at) || "Không giới hạn",
      "Đề",
      testName(test, submissions[0]?.topic_name),
    ],
  ];
  info.forEach((r, i) => {
    const row = ws.getRow(5 + i);
    row.values = r;
    row.eachCell((cell, col) => styleInfoCell(cell, col % 2 === 1));
  });

  ws.getCell("A10").value = "I. Bảng điểm tổng";
  ws.getCell("A10").font = { bold: true, size: 14, color: { argb: `FF${BRAND.primary}` } };

  const headers = [
    "STT",
    "Thời gian nộp",
    "Họ tên",
    "Email",
    "Buổi thi",
    "Mã thi",
    "Đề",
    "Kỹ năng",
    "Điểm",
    "Tối đa",
    "Tỷ lệ",
    "Band tự chấm",
    "Overall Writing",
    "CEFR",
    "Trạng thái",
    "TR",
    "CC",
    "LR",
    "GRA",
    "Số từ",
    "Vi phạm",
    "Bắt đầu lúc",
    "Nhận xét",
  ];
  ws.getRow(11).values = headers;
  styleHeader(ws.getRow(11));

  submissions.forEach((x, idx) => {
    const row = ws.getRow(12 + idx);
    row.values = [
      idx + 1,
      dateVi(x.submitted_at),
      x.student_name ?? "",
      x.student_email ?? "",
      session.name,
      session.access_code ?? "",
      testName(test, x.topic_name),
      skillLabel(test?.skill),
      num(x.score),
      num(x.max_score),
      percentOf(x),
      num(x.band),
      num(x.overall_band),
      x.cefr ?? "",
      statusOf(x),
      num(x.score_tr),
      num(x.score_cc),
      num(x.score_lr),
      num(x.score_gra),
      wordCount(x.essay),
      num(x.violations),
      dateVi(x.started_at),
      x.feedback ?? "",
    ];
    styleBodyRow(row, idx);
    row.getCell(3).font = { bold: true, color: { argb: `FF${BRAND.primary}` } };
  });
  ws.autoFilter = { from: "A11", to: `W${Math.max(11, 11 + submissions.length)}` };

  const personal = workbook.addWorksheet("Phiếu cá nhân");
  personal.columns = [{ width: 18 }, { width: 34 }, { width: 18 }, { width: 34 }];
  let r = 1;
  submissions.forEach((x, idx) => {
    if (idx > 0) {
      personal.getRow(r).addPageBreak();
    }
    addLogo(personal, workbook, logoBase64, r);
    r += 4;
    personal.mergeCells(`A${r}:D${r}`);
    const title = personal.getCell(`A${r}`);
    title.value = `PHIẾU ĐIỂM CÁ NHÂN #${idx + 1}`;
    title.font = { bold: true, size: 16, color: { argb: `FF${BRAND.primary}` } };
    title.alignment = { horizontal: "center" };
    r += 1;
    personal.mergeCells(`A${r}:D${r}`);
    const name = personal.getCell(`A${r}`);
    name.value = x.student_name || "Học viên";
    name.font = { bold: true, size: 18, color: { argb: `FF${BRAND.primary}` } };
    name.alignment = { horizontal: "center" };
    r += 1;
    personal.mergeCells(`A${r}:D${r}`);
    personal.getCell(`A${r}`).value = x.student_email || "";
    personal.getCell(`A${r}`).alignment = { horizontal: "center" };
    r += 2;

    const data = [
      ["Buổi thi", session.name, "Mã thi", session.access_code || ""],
      ["Đề", testName(test, x.topic_name), "Kỹ năng", skillLabel(test?.skill)],
      ["Trạng thái", statusOf(x), "Nộp lúc", dateVi(x.submitted_at)],
      ["Điểm", `${num(x.score)} / ${num(x.max_score)} (${percentOf(x)})`, "Band", bandOf(x) || "—"],
      ["TR", num(x.score_tr), "CC", num(x.score_cc)],
      ["LR", num(x.score_lr), "GRA", num(x.score_gra)],
      ["CEFR", x.cefr || "", "Số từ", wordCount(x.essay)],
      ["Vi phạm", num(x.violations), "Bắt đầu lúc", dateVi(x.started_at)],
      ["Nhận xét", x.feedback || "Chưa có nhận xét.", "", ""],
    ];
    data.forEach((line) => {
      const row = personal.getRow(r++);
      row.values = line;
      row.eachCell((cell, col) => {
        cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
        cell.alignment = { vertical: "top", wrapText: true };
        if (col === 1 || col === 3) {
          cell.font = { bold: true, color: { argb: `FF${BRAND.primary}` } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.light}` } };
        }
      });
      if (line[0] === "Nhận xét") {
        personal.mergeCells(`B${r - 1}:D${r - 1}`);
        row.height = 54;
      }
    });
    r += 3;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.xls$/i, ".xlsx").replace(/\.csv$/i, ".xlsx");
  if (!/\.xlsx$/i.test(a.download)) a.download = `${a.download}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
