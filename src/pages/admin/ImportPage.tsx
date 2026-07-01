// Nhập nội dung hàng loạt từ Excel/CSV: tải template Excel chuẩn, điền nội dung, lưu CSV UTF-8 để import.
// 2 loại: ĐỀ VIẾT (topic + prompt) và TRẮC NGHIỆM (câu hỏi gắn cefr_level...).
// Quy trình: tải mẫu → upload CSV → xem trước → Nhập (tạo topic/đề/câu hỏi).
import { useState } from "react";
import { listTopics, saveQuestion, saveTest, saveTopic } from "../../lib/api";
import { parseCsv } from "../../lib/csv";
import { ErrorBox } from "../../components/common";
import type { QType, Skill, Topic } from "../../lib/types";

type Mode = "writing" | "mcq";

const WRITING_COLS = ["topic", "prompt", "time_limit_min", "min_words"];
const MCQ_COLS = ["topic", "skill", "purpose", "pass_threshold", "test_title", "qtype",
  "prompt", "option1", "option2", "option3", "option4", "correct", "cefr_level", "points"];

export default function ImportPage() {
  const [mode, setMode] = useState<Mode>("writing");
  return (
    <div>
      <h1>Nhập nội dung từ Excel</h1>
      <div className="row-form" style={{ marginBottom: 14 }}>
        <button className={`btn ${mode === "writing" ? "primary" : ""}`} onClick={() => setMode("writing")}>Đề Viết</button>
        <button className={`btn ${mode === "mcq" ? "primary" : ""}`} onClick={() => setMode("mcq")}>Câu hỏi trắc nghiệm</button>
      </div>
      <div className="card sub import-guide">
        <strong>Quy trình chuẩn</strong>
        <ol>
          <li>Bấm <strong>Tải template Excel</strong> để lấy file mẫu có sẵn cột và ví dụ.</li>
          <li>Mở file trong Excel/Google Sheets, điền dữ liệu theo đúng cột.</li>
          <li>Khi nhập vào hệ thống, lưu/xuất lại thành <strong>CSV UTF-8</strong> rồi tải file CSV lên.</li>
        </ol>
        <p className="muted small">Lý do: template Excel giúp giáo viên nhập dễ đọc; CSV UTF-8 giúp hệ thống import ổn định, không lỗi font tiếng Việt.</p>
      </div>
      {mode === "writing" ? <WritingImport /> : <McqImport />}
    </div>
  );
}

// Tìm hoặc tạo topic theo tên (dùng chung khi import). Trả map tên(thường)->id.
async function topicResolver(): Promise<(name: string, skill: Skill) => Promise<string>> {
  const existing = await listTopics();
  const byName = new Map<string, Topic>();
  existing.forEach((t) => byName.set(t.name.trim().toLowerCase(), t));
  return async (name, skill) => {
    const key = name.trim().toLowerCase();
    const hit = byName.get(key);
    if (hit) return hit.id;
    const created = await saveTopic({ name: name.trim(), skill, active: true });
    byName.set(key, created);
    return created.id;
  };
}

function letter(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : `V${i + 1}`;
}

interface RunState {
  rows: Record<string, string>[] | null;
  error: string | null;
  result: string | null;
  busy: boolean;
}

function useImporter() {
  const [st, setSt] = useState<RunState>({ rows: null, error: null, result: null, busy: false });
  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { rows } = parseCsv(String(reader.result));
        setSt({ rows, error: null, result: null, busy: false });
      } catch (e) {
        setSt({ rows: null, error: e instanceof Error ? e.message : String(e), result: null, busy: false });
      }
    };
    reader.readAsText(file);
  }
  return { st, setSt, onFile };
}

function FilePick({ onFile }: { onFile: (f: File) => void }) {
  return (
    <input type="file" accept=".csv,text/csv" onChange={(e) => {
      const f = e.target.files?.[0];
      if (f) onFile(f);
    }} />
  );
}

function Preview({ rows, cols }: { rows: Record<string, string>[]; cols: string[] }) {
  return (
    <div className="card table-wrap">
      <table className="table">
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 15).map((r, i) => (
            <tr key={i}>{cols.map((c) => <td key={c} className="small">{(r[c] ?? "").slice(0, 60)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {rows.length > 15 && <div className="muted small" style={{ padding: 8 }}>… và {rows.length - 15} dòng nữa</div>}
    </div>
  );
}


interface TemplateExcelArgs {
  filename: string;
  title: string;
  cols: string[];
  rows: string[][];
  notes: string[];
}

function downloadTemplateExcel({ filename, title, cols, rows, notes }: TemplateExcelArgs) {
  const colHeader = cols.map((c) => `<th>${escExcel(c)}</th>`).join("");
  const exampleRows = rows.map((r) => `<tr>${cols.map((_, idx) => `<td>${escExcel(r[idx] ?? "")}</td>`).join("")}</tr>`).join("");
  const noteRows = notes.map((n, idx) => `<tr><td class="center">${idx + 1}</td><td colspan="${Math.max(1, cols.length - 1)}">${escExcel(n)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #221b26; }
      .title { font-size: 22px; font-weight: 800; color: #7a2b8f; }
      .subtitle { color: #6c6880; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #7a2b8f; color: #fff; border: 1px solid #5b1b6f; padding: 8px; text-align: center; }
      td { border: 1px solid #e5e7eb; padding: 7px; vertical-align: top; }
      .notes td { background: #fffbeb; }
      .data tr:nth-child(even) td { background: #fafafe; }
      .center { text-align: center; }
      .hint { color: #9a3412; font-weight: 700; }
    </style>
  </head><body>
    <table><tr><td class="title" colspan="${cols.length}">${escExcel(title)} — IELTS MS. TRÀ MY</td></tr>
    <tr><td class="subtitle" colspan="${cols.length}">File template Excel chuẩn để giáo viên nhập nội dung. Sau khi điền xong, lưu/xuất thành CSV UTF-8 rồi upload vào hệ thống.</td></tr></table>
    <br />
    <table class="notes"><tr><th style="width:60px">STT</th><th colspan="${Math.max(1, cols.length - 1)}">Hướng dẫn sử dụng</th></tr>${noteRows}</table>
    <br />
    <p class="hint">Nhập dữ liệu từ dòng bên dưới. Giữ nguyên tên cột.</p>
    <table class="data"><thead><tr>${colHeader}</tr></thead><tbody>${exampleRows}</tbody></table>
  </body></html>`;
  const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escExcel(v: unknown): string {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

// ---------- Import ĐỀ VIẾT ----------
function WritingImport() {
  const { st, setSt, onFile } = useImporter();

  function template() {
    downloadTemplateExcel({
      filename: "template-de-viet-ielts.xls",
      title: "TEMPLATE NHẬP ĐỀ WRITING",
      cols: WRITING_COLS,
      rows: [
        ["Education", "Some people think teachers should teach values. Discuss both views and give your opinion.", "40", "250"],
        ["Technology", "Technology makes people less sociable. To what extent do you agree?", "40", "250"],
      ],
      notes: [
        "Mỗi dòng = 1 đề Writing.",
        "Các dòng cùng topic sẽ được gom vào cùng một chủ đề.",
        "Sau khi điền xong: File → Save As/Download → CSV UTF-8, rồi upload CSV vào hệ thống.",
      ],
    });
  }

  async function run() {
    if (!st.rows) return;
    setSt({ ...st, busy: true, error: null, result: null });
    try {
      const resolve = await topicResolver();
      const perTopic = new Map<string, number>();
      let ok = 0; const errs: string[] = [];
      for (const [i, r] of st.rows.entries()) {
        const topic = (r.topic ?? "").trim();
        const prompt = (r.prompt ?? "").trim();
        if (!topic || !prompt) { errs.push(`Dòng ${i + 2}: thiếu topic hoặc prompt`); continue; }
        try {
          const topicId = await resolve(topic, "writing");
          const n = perTopic.get(topicId) ?? 0;
          perTopic.set(topicId, n + 1);
          await saveTest({
            topic_id: topicId, version_label: letter(n), prompt, title: null,
            purpose: "progress", time_limit_min: Number(r.time_limit_min) || 40,
            min_words: Number(r.min_words) || 250, active: true,
          });
          ok++;
        } catch (e) { errs.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : String(e)}`); }
      }
      setSt({ ...st, busy: false, result: `Đã nhập ${ok} đề Viết.` + (errs.length ? ` ${errs.length} lỗi:\n` + errs.slice(0, 8).join("\n") : "") });
    } catch (e) {
      setSt({ ...st, busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div>
      <div className="card">
        <div className="row-form">
          <button className="btn small" onClick={template}>⬇ Tải template Excel</button>
          <FilePick onFile={onFile} />
        </div>
        <p className="muted small">Upload file <strong>CSV UTF-8</strong> sau khi điền template. Cột bắt buộc: <code>{WRITING_COLS.join(", ")}</code>.</p>
      </div>
      {st.error && <ErrorBox msg={st.error} />}
      {st.rows && (
        <>
          <Preview rows={st.rows} cols={WRITING_COLS} />
          <button className="btn primary" disabled={st.busy} onClick={run}>
            {st.busy ? "Đang nhập…" : `Nhập ${st.rows.length} dòng`}
          </button>
        </>
      )}
      {st.result && <pre className="import-result">{st.result}</pre>}
    </div>
  );
}

// ---------- Import TRẮC NGHIỆM ----------
const QTYPES: QType[] = ["single", "multi", "tfng", "fill"];

function McqImport() {
  const { st, setSt, onFile } = useImporter();

  function template() {
    downloadTemplateExcel({
      filename: "template-trac-nghiem-ielts.xls",
      title: "TEMPLATE NHẬP CÂU HỎI TRẮC NGHIỆM",
      cols: MCQ_COLS,
      rows: [
        ["Placement UoE", "use_of_english", "placement", "0.6", "Use of English A", "single",
          "She ___ to school every day.", "go", "goes", "going", "gone", "goes", "A2", "1"],
        ["Placement UoE", "use_of_english", "placement", "0.6", "Use of English A", "fill",
          "The opposite of 'big' is ___.", "", "", "", "", "small", "A1", "1"],
      ],
      notes: [
        "Cùng topic + test_title sẽ được gom vào một đề.",
        "qtype hợp lệ: single, multi, tfng, fill.",
        "correct phải là giá trị đáp án; multi/fill nhiều đáp án ngăn bằng dấu |; tfng dùng true/false/notgiven.",
        "Sau khi điền xong: File → Save As/Download → CSV UTF-8, rồi upload CSV vào hệ thống.",
      ],
    });
  }

  async function run() {
    if (!st.rows) return;
    setSt({ ...st, busy: true, error: null, result: null });
    try {
      const resolve = await topicResolver();
      const testCache = new Map<string, string>(); // key topic||test_title -> test_id
      const perTopicCount = new Map<string, number>();
      const orderByTest = new Map<string, number>();
      let ok = 0; const errs: string[] = [];

      for (const [i, r] of st.rows.entries()) {
        const ln = i + 2;
        const topic = (r.topic ?? "").trim();
        const qtype = (r.qtype ?? "").trim().toLowerCase() as QType;
        const prompt = (r.prompt ?? "").trim();
        const correctRaw = (r.correct ?? "").trim();
        if (!topic || !prompt) { errs.push(`Dòng ${ln}: thiếu topic/prompt`); continue; }
        if (!QTYPES.includes(qtype)) { errs.push(`Dòng ${ln}: qtype không hợp lệ (${qtype})`); continue; }
        if (!correctRaw) { errs.push(`Dòng ${ln}: thiếu correct`); continue; }
        const skill = ((r.skill ?? "use_of_english").trim() || "use_of_english") as Skill;
        const purpose = ((r.purpose ?? "placement").trim() || "placement") as "placement" | "progress" | "exit";
        const testTitle = (r.test_title ?? "").trim() || topic;

        try {
          const topicId = await resolve(topic, skill);
          const tkey = `${topicId}||${testTitle.toLowerCase()}`;
          let testId = testCache.get(tkey);
          if (!testId) {
            const n = perTopicCount.get(topicId) ?? 0; perTopicCount.set(topicId, n + 1);
            const test = await saveTest({
              topic_id: topicId, version_label: letter(n), title: testTitle, purpose,
              pass_threshold: Number(r.pass_threshold) || 0.6,
              time_limit_min: 20, min_words: 0, active: true,
            });
            testId = test.id; testCache.set(tkey, testId);
          }
          const options = [r.option1, r.option2, r.option3, r.option4].map((o) => (o ?? "").trim()).filter(Boolean);
          const correct = qtype === "multi" || qtype === "fill" ? correctRaw.split("|").map((x) => x.trim()).filter(Boolean) : correctRaw;
          const ord = (orderByTest.get(testId) ?? 0) + 1; orderByTest.set(testId, ord);
          await saveQuestion({
            test_id: testId, passage_id: null, sort_order: ord, qtype, prompt,
            options: qtype === "tfng" || qtype === "fill" ? [] : options,
            correct, points: Number(r.points) || 1,
            cefr_level: ((r.cefr_level ?? "").trim() || null) as never,
          });
          ok++;
        } catch (e) { errs.push(`Dòng ${ln}: ${e instanceof Error ? e.message : String(e)}`); }
      }
      setSt({ ...st, busy: false, result: `Đã nhập ${ok} câu hỏi.` + (errs.length ? ` ${errs.length} lỗi:\n` + errs.slice(0, 8).join("\n") : "") });
    } catch (e) {
      setSt({ ...st, busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div>
      <div className="card">
        <div className="row-form">
          <button className="btn small" onClick={template}>⬇ Tải template Excel</button>
          <FilePick onFile={onFile} />
        </div>
        <p className="muted small">
          Upload file <strong>CSV UTF-8</strong> sau khi điền template. Cột chính: <code>topic, skill, purpose, test_title, qtype, prompt, option1..4, correct, cefr_level, points</code>.
          Cùng <code>topic + test_title</code> gom vào 1 đề. <code>correct</code> = giá trị đáp án;
          với <em>multi/fill</em> nhiều đáp án ngăn bằng <code>|</code>. <em>tfng</em>: correct = <code>true/false/notgiven</code>.
        </p>
      </div>
      {st.error && <ErrorBox msg={st.error} />}
      {st.rows && (
        <>
          <Preview rows={st.rows} cols={MCQ_COLS} />
          <button className="btn primary" disabled={st.busy} onClick={run}>
            {st.busy ? "Đang nhập…" : `Nhập ${st.rows.length} dòng`}
          </button>
        </>
      )}
      {st.result && <pre className="import-result">{st.result}</pre>}
    </div>
  );
}
