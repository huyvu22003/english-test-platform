// Phân tích & xuất CSV tối giản (không thêm thư viện). Hỗ trợ ô có dấu phẩy,
// xuống dòng, dấu nháy kép (escape "") và bỏ BOM của Excel.

// Tách CSV thành mảng các dòng (mỗi dòng là mảng ô).
function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, ""); // bỏ BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") { /* bỏ qua */ }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  // ô/dòng cuối
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

// Phân tích CSV có dòng tiêu đề -> danh sách object theo tên cột (chuẩn hóa: trim + thường).
export function parseCsv(text: string): ParsedCsv {
  const cells = tokenize(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (cells.length === 0) return { headers: [], rows: [] };
  const headers = cells[0].map((h) => h.trim().toLowerCase());
  const rows = cells.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
    return o;
  });
  return { headers, rows };
}

// Tạo nội dung CSV (BOM UTF-8 để Excel đọc đúng tiếng Việt) và tải về.
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
