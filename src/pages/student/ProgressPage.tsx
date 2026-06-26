// Tra cứu tiến bộ theo email: biểu đồ theo kỹ năng + lịch sử bài + chi tiết bài đã chọn.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProgress } from "../../lib/api";
import { ErrorBox, Spinner } from "../../components/common";
import type { ProgressItem, Skill } from "../../lib/types";

const SKILL_ORDER: Skill[] = ["listening", "reading", "writing"];
const SKILL_LABEL: Record<string, string> = {
  listening: "Nghe",
  reading: "Đọc",
  writing: "Viết",
  use_of_english: "Use of English",
};

export default function ProgressPage() {
  const [email, setEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [items, setItems] = useState<ProgressItem[] | null>(null);
  const [selected, setSelected] = useState<ProgressItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup() {
    const cleanEmail = email.trim();
    const cleanName = studentName.trim();
    const cleanCode = studentCode.trim();
    if (!cleanEmail && !cleanName && !cleanCode) { setErr("Nhập ít nhất email, họ tên hoặc mã học sinh."); return; }
    if (cleanEmail && !/\S+@\S+\.\S+/.test(cleanEmail)) { setErr("Email chưa hợp lệ."); return; }
    setErr(null); setLoading(true); setItems(null); setSelected(null);
    try {
      const next = await getProgress({ email: cleanEmail, name: cleanName, code: cleanCode });
      setItems(next);
      setSelected(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const ordered = useMemo(() => [...(items ?? [])].sort(bySubmittedDesc), [items]);
  const grouped = useMemo(() => groupBySkill(items ?? []), [items]);

  return (
    <div className="wrap progress-wrap">
      <header className="topbar">
        <div>
          <h1>Tiến bộ của bạn</h1>
          <p className="muted small sub">Nhập email, họ tên hoặc mã học sinh để xem biểu đồ Nghe · Đọc · Viết và lịch sử bài đã làm.</p>
        </div>
        <Link className="link" to="/">← Trang chủ</Link>
      </header>

      <div className="card progress-lookup">
        <div className="progress-lookup-grid">
          <input
            placeholder="Email đã dùng khi thi…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <input
            placeholder="Họ tên học sinh…"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <input
            placeholder="Mã học sinh…"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <button className="btn primary" onClick={lookup}>Xem</button>
        </div>
        <div className="muted small progress-lookup-hint">Có thể nhập 1 ô. Nếu nhập nhiều ô, hệ thống sẽ lọc chặt hơn để tránh nhầm học viên.</div>
      </div>

      {loading && <Spinner />}
      {err && <ErrorBox msg={err} />}

      {items && items.length > 0 && (
        <>
          <SkillSummary grouped={grouped} />

          <div className="progress-chart-grid">
            {Object.entries(grouped).map(([skill, skillItems]) => (
              <BandChart key={skill} skill={skill} items={skillItems.filter(hasBand)} />
            ))}
          </div>

          <div className="progress-layout single">
            <HistoryTable items={ordered} selected={selected} onSelect={setSelected} />
          </div>

          {selected && <SubmissionDetail item={selected} onClose={() => setSelected(null)} />}
        </>
      )}

      {items && items.length === 0 && (
        <div className="card muted">Chưa có bài nộp nào với email này.</div>
      )}
    </div>
  );
}

function SkillSummary({ grouped }: { grouped: Record<string, ProgressItem[]> }) {
  return (
    <div className="progress-summary-grid">
      {Object.entries(grouped).map(([skill, rows]) => {
        const graded = rows.filter(hasBand);
        const latest = [...graded].sort(bySubmittedDesc)[0];
        const first = [...graded].sort(bySubmittedAsc)[0];
        const delta = latest && first && latest !== first ? (bandOf(latest)! - bandOf(first)!) : null;
        return (
          <div className="card progress-skill-card" key={skill}>
            <span className={`pill skill-${skill}`}>{skillLabel(skill)}</span>
            <div className="progress-big">{latest ? bandOf(latest) : "—"}</div>
            <div className="muted small">Band gần nhất · {rows.length} bài</div>
            {delta !== null && <div className={delta >= 0 ? "ok-text" : "warn-text"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)} so với bài đầu</div>}
          </div>
        );
      })}
    </div>
  );
}

function HistoryTable({ items, selected, onSelect }: {
  items: ProgressItem[];
  selected: ProgressItem | null;
  onSelect: (item: ProgressItem) => void;
}) {
  return (
    <div className="card table-wrap progress-history">
      <table className="table">
        <thead><tr><th>Ngày</th><th>Kỹ năng</th><th>Chủ đề</th><th>Band</th><th>CEFR</th><th>Trạng thái</th></tr></thead>
        <tbody>
          {items.map((i, idx) => {
            const active = selected && keyOf(selected, -1) === keyOf(i, idx);
            return (
              <tr key={keyOf(i, idx)} className={active ? "selected-row" : "clickable-row"} onClick={() => onSelect(i)}>
                <td className="small">{dateVi(i.submitted_at)}</td>
                <td><span className={`pill small skill-${i.skill}`}>{skillLabel(i.skill)}</span></td>
                <td>{i.topic_name ?? i.test_title ?? "—"}</td>
                <td>{bandOf(i) ?? "—"}</td>
                <td>{i.cefr ?? "—"}</td>
                <td>{i.status === "graded" ? "Đã chấm" : <span className="muted">Chờ chấm</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionDetail({ item, onClose }: { item: ProgressItem; onClose: () => void }) {
  const [activeCorrection, setActiveCorrection] = useState<string | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const corrections = normalizedCorrections(item);
  return (
    <div className="progress-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card progress-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head modal-head">
          <div>
            <span className={`pill skill-${item.skill}`}>{skillLabel(item.skill)}</span>
            <h2>{item.topic_name ?? item.test_title ?? "Chi tiết bài làm"}</h2>
            <p className="muted small">{dateVi(item.submitted_at)} · {item.student_name ?? "Học viên"}{item.student_code ? ` · Mã ${item.student_code}` : ""}{item.class_name ? ` · Lớp ${item.class_name}` : ""} · {item.status === "graded" ? "Đã chấm" : "Chờ chấm"}</p>
          </div>
          <div className="modal-head-actions">
            <div className="detail-score">
              <div>{bandOf(item) ?? "—"}</div>
              <span>Band</span>
            </div>
            <button className="btn small" onClick={() => printProgressPdf(item, corrections)}>Tải PDF</button>
            <button className="btn ghost small" onClick={onClose}>Đóng ✕</button>
          </div>
        </div>

        <div className="progress-detail-grid">
          <div className="detail-column">
            <section className="detail-section first">
              <h3>Đề bài</h3>
              <div className="detail-box prewrap prompt-box">{item.prompt || item.test_title || item.topic_name || "Chưa có đề bài lưu trong hệ thống."}</div>
            </section>

            <section className="detail-section">
              <h3>Bài làm của học viên</h3>
              {item.essay ? (
                <div className="detail-box prewrap essay-detail-box"><HighlightedEssay essay={item.essay} corrections={corrections} activeId={activeCorrection} openNoteId={openNoteId} onToggleNote={setOpenNoteId} /></div>
              ) : item.score != null && item.max_score != null ? (
                <div className="detail-box">Điểm tự chấm: <b>{item.score}/{item.max_score}</b></div>
              ) : (
                <div className="detail-box muted">Chưa có nội dung bài làm hiển thị.</div>
              )}
            </section>
          </div>

          <div className="detail-column teacher-column">
            <section className="detail-section first">
              <h3>Điểm</h3>
              <WritingScoreGrid item={item} />
              {item.score != null && item.max_score != null && <div className="detail-box">Điểm tự chấm: <b>{item.score}/{item.max_score}</b></div>}
              {item.cefr && <div className="detail-box small">CEFR: <b>{item.cefr}</b></div>}
            </section>

            <section className="detail-section">
              <h3>Nhận xét tổng quan của giáo viên</h3>
              <div className="detail-box prewrap feedback-box">{item.feedback || "Chưa có nhận xét tổng quan."}</div>
              <h3>Sửa câu chi tiết</h3>
              {corrections.length > 0 ? <StructuredCorrectionList corrections={corrections} activeId={activeCorrection} onFocus={setActiveCorrection} onOpenNote={setOpenNoteId} /> : <p className="muted small">Chưa có dữ liệu sửa câu có cấu trúc.</p>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CorrectionPair { id: string; original: string; corrected: string; note?: string; start?: number; end?: number; index: number; }

function HighlightedEssay({ essay, corrections, activeId, openNoteId, onToggleNote }: {
  essay: string;
  corrections: CorrectionPair[];
  activeId: string | null;
  openNoteId: string | null;
  onToggleNote: (id: string | null) => void;
}) {
  const parts = highlightEssayParts(essay, corrections);
  return <>{parts.map((p, idx) => {
    if (!p.hit) return <span key={idx}>{p.text}</span>;
    const open = openNoteId === p.hit.id;
    return (
      <span className="essay-mark-wrap" key={idx}>
        <button
          id={`essay-hit-${p.hit.id}`}
          type="button"
          className={`essay-error-mark${activeId === p.hit.id || open ? " active" : ""}`}
          onClick={() => onToggleNote(open ? null : p.hit!.id)}
          title="Bấm để xem câu sửa của giáo viên"
        >{p.text}</button>
        {open && <CorrectionStickNote correction={p.hit} onClose={() => onToggleNote(null)} />}
      </span>
    );
  })}</>;
}

function CorrectionStickNote({ correction, onClose }: { correction: CorrectionPair; onClose: () => void }) {
  return (
    <span className="correction-sticknote">
      <button className="sticknote-close" type="button" onClick={onClose}>×</button>
      <b>Lỗi #{correction.index}</b>
      {correction.note && <span className="sticknote-note">{correction.note}</span>}
      <span className="sticknote-label">Sửa thành</span>
      <span className="sticknote-fixed">{correction.corrected}</span>
    </span>
  );
}

function StructuredCorrectionList({ corrections, activeId, onFocus, onOpenNote }: {
  corrections: CorrectionPair[];
  activeId: string | null;
  onFocus: (id: string | null) => void;
  onOpenNote: (id: string | null) => void;
}) {
  return (
    <div className="correction-list">
      {corrections.map((c) => (
        <button
          className={`correction-card as-button${activeId === c.id ? " active" : ""}`}
          key={c.id}
          type="button"
          onMouseEnter={() => onFocus(c.id)}
          onMouseLeave={() => onFocus(null)}
          onClick={() => onOpenNote(c.id)}
        >
          <div className="correction-label">Lỗi #{c.index}</div>
          <div className="correction-original">{c.original}</div>
          {c.note && <div className="muted small">Lỗi: {c.note}</div>}
          <div className="correction-arrow">↓ sửa thành</div>
          <div className="correction-fixed">{c.corrected}</div>
        </button>
      ))}
    </div>
  );
}

function WritingScoreGrid({ item }: { item: ProgressItem }) {
  const scores = [
    ["TR", item.score_tr], ["CC", item.score_cc], ["LR", item.score_lr], ["GRA", item.score_gra],
  ] as const;
  if (scores.every(([, value]) => value == null)) return null;
  return (
    <div className="crit-cards compact">
      {scores.map(([label, value]) => (
        <div className="crit-card" key={label}>
          <div className="crit-val">{value ?? "—"}</div>
          <div className="crit-lbl">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Đường band đơn giản bằng SVG (không thêm thư viện biểu đồ).
function BandChart({ skill, items }: { skill: string; items: ProgressItem[] }) {
  const W = 420, H = 150, pad = 28;
  const bands = items.map((i) => bandOf(i) as number);
  const min = Math.min(...bands, 4), max = Math.max(...bands, 9);
  const x = (idx: number) => pad + (idx * (W - 2 * pad)) / Math.max(1, items.length - 1);
  const y = (b: number) => H - pad - ((b - min) / Math.max(0.5, max - min)) * (H - 2 * pad);
  const pts = bands.map((b, idx) => `${x(idx)},${y(b)}`).join(" ");
  return (
    <div className="card progress-chart-card">
      <div className="chart-title">
        <b>{skillLabel(skill)}</b>
        <span className="muted small">{items.length ? `${items.length} bài đã chấm` : "Chưa có điểm"}</span>
      </div>
      {items.length ? (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="chart">
          <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--line)" />
          <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
          {bands.map((b, idx) => (
            <g key={idx}>
              <circle cx={x(idx)} cy={y(b)} r="4.5" fill="var(--brand2)" />
              <text x={x(idx)} y={y(b) - 9} textAnchor="middle" fontSize="11" fill="var(--muted)">{b}</text>
            </g>
          ))}
        </svg>
      ) : <div className="empty-chart muted">Chưa có dữ liệu để vẽ biểu đồ.</div>}
    </div>
  );
}

function groupBySkill(items: ProgressItem[]) {
  const out: Record<string, ProgressItem[]> = {};
  const skills = [...SKILL_ORDER, ...items.map((i) => i.skill).filter((s): s is Skill => Boolean(s) && !SKILL_ORDER.includes(s))];
  for (const skill of skills) out[skill] = [];
  for (const item of items) (out[item.skill ?? "writing"] ??= []).push(item);
  return Object.fromEntries(Object.entries(out).filter(([, rows]) => rows.length > 0));
}

function normalizedCorrections(item: ProgressItem): CorrectionPair[] {
  if (item.writing_corrections?.length) {
    return item.writing_corrections.map((c, idx) => ({ ...c, id: c.id || `c-${idx}`, index: idx + 1 }));
  }
  return parseCorrections(item.feedback ?? "");
}

function parseCorrections(feedback: string): CorrectionPair[] {
  const lines = feedback.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out: CorrectionPair[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/câu gốc|original/i.test(stripMarks(lines[i]))) continue;
    const original = collectValue(lines, i);
    const fixIndex = lines.findIndex((line, idx) => idx > i && /sửa|correct|correction/i.test(stripMarks(line)));
    if (fixIndex === -1) continue;
    const corrected = collectValue(lines, fixIndex);
    if (original && corrected) out.push({ id: `parsed-${out.length + 1}`, original, corrected, index: out.length + 1 });
  }
  return out.slice(0, 20);
}

function collectValue(lines: string[], start: number) {
  const first = stripLabel(lines[start]);
  if (first) return first;
  for (let i = start + 1; i < Math.min(lines.length, start + 4); i++) {
    const line = stripMarks(lines[i]);
    if (/^(câu gốc|original|sửa|correct|correction|tương tự|###|---)/i.test(line)) break;
    if (line.length > 2) return line;
  }
  return "";
}

function stripLabel(line: string) {
  return stripMarks(line).replace(/^(câu gốc|original|sửa|correct(?:ion)?)[\s.:：-]*/i, "").trim();
}
function stripMarks(line: string) { return line.replace(/^[✅❌✔✘\-–—*#\s]+/, "").trim(); }

function highlightEssayParts(essay: string, corrections: CorrectionPair[]) {
  const ranges: { start: number; end: number; hit: CorrectionPair }[] = [];
  const used = new Set<number>();
  corrections.forEach((c) => {
    const offsetRange = validOffsetRange(essay, c);
    if (offsetRange && !rangeUsed(offsetRange.start, offsetRange.end - offsetRange.start, used)) {
      for (let i = offsetRange.start; i < offsetRange.end; i++) used.add(i);
      ranges.push({ ...offsetRange, hit: c });
      return;
    }
    const original = c.original.trim();
    if (!isHighlightableOriginal(original)) return;
    const start = findExactInsensitive(essay, original, used);
    if (start >= 0) {
      for (let i = start; i < start + original.length; i++) used.add(i);
      ranges.push({ start, end: start + original.length, hit: c });
    }
  });
  ranges.sort((a, b) => a.start - b.start);
  const parts: { text: string; hit?: CorrectionPair }[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue;
    if (r.start > pos) parts.push({ text: essay.slice(pos, r.start) });
    parts.push({ text: essay.slice(r.start, r.end), hit: r.hit });
    pos = r.end;
  }
  if (pos < essay.length) parts.push({ text: essay.slice(pos) });
  return parts.length ? parts : [{ text: essay }];
}

function validOffsetRange(essay: string, c: CorrectionPair) {
  if (typeof c.start !== "number" || typeof c.end !== "number") return null;
  const start = Math.max(0, Math.min(c.start, essay.length));
  const end = Math.max(start, Math.min(c.end, essay.length));
  if (end <= start) return null;
  return { start, end };
}
function isHighlightableOriginal(original: string) {
  if (original.length < 12) return false;
  if (/\.\.\.|…/.test(original)) return false;
  return true;
}
function findExactInsensitive(text: string, needle: string, used: Set<number>) {
  const haystack = text.toLowerCase();
  const target = needle.toLowerCase();
  let from = 0;
  while (from < haystack.length) {
    const idx = haystack.indexOf(target, from);
    if (idx === -1) return -1;
    if (!rangeUsed(idx, needle.length, used)) return idx;
    from = idx + target.length;
  }
  return -1;
}
function rangeUsed(start: number, len: number, used: Set<number>) { for (let i = start; i < start + len; i++) if (used.has(i)) return true; return false; }

function printProgressPdf(item: ProgressItem, corrections: CorrectionPair[]) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=980,height=900");
  if (!w) return;
  const html = buildPdfHtml(item, corrections);
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function buildPdfHtml(item: ProgressItem, corrections: CorrectionPair[]) {
  const essayHtml = item.essay ? highlightEssayParts(item.essay, corrections).map((p) => p.hit ? `<mark>${esc(p.text)}</mark>` : esc(p.text)).join("") : "Chưa có nội dung bài làm.";
  const highlightedCount = item.essay ? highlightEssayParts(item.essay, corrections).filter((p) => p.hit).length : 0;
  const correctionHtml = corrections.length ? corrections.map((c) => `<div class="fix"><b>Lỗi #${c.index}</b><p class="bad">${esc(c.original)}</p>${c.note ? `<p class="muted">${esc(c.note)}</p>` : ""}<p class="good">${esc(c.corrected)}</p></div>`).join("") : "<p class=\"muted\">Chưa có dữ liệu sửa câu có cấu trúc.</p>";
  const scores = [["TR", item.score_tr], ["CC", item.score_cc], ["LR", item.score_lr], ["GRA", item.score_gra]].map(([k, v]) => `<div class="score"><b>${v ?? "—"}</b><span>${k}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(item.topic_name ?? "Bài kiểm tra")}</title><style>
    @page{size:A4;margin:14mm} body{font-family:Arial,sans-serif;color:#221b26;margin:0;line-height:1.55}.brand{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #ec3a2b;padding-bottom:14px;margin-bottom:18px}.brand img{height:54px}.brand-title{text-align:right}.brand-title h1{margin:0;font-size:24px}.muted{color:#6c6880}.pill{display:inline-block;background:#e7f0ff;color:#1d4ed8;border-radius:99px;padding:3px 10px;font-weight:700;font-size:12px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.meta div,.box{border:1px solid #ececf1;border-radius:12px;padding:10px;background:#fafafe}.scores{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.score{text-align:center;border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;padding:10px}.score b{display:block;color:#ee5a24;font-size:24px}.score span{font-size:12px;color:#6c6880}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:start}.section{margin-top:16px}.section h2{font-size:17px;margin:0 0 8px}.essay{white-space:pre-wrap}.feedback{white-space:pre-wrap}.fix{border-left:4px solid #ec3a2b;background:#fff7f7;padding:8px 10px;margin:8px 0;border-radius:8px}.bad{background:#fff1f2;margin:6px 0;padding:7px;border-radius:6px}.good{background:#ecfdf5;margin:6px 0;padding:7px;border-radius:6px}mark{background:#ffe4e6;color:#9f1239;border-bottom:2px solid #fb7185;padding:0 2px;border-radius:3px}.footer{margin-top:20px;border-top:1px solid #ececf1;padding-top:8px;font-size:12px;color:#6c6880}@media print{button{display:none}.box,.score,.fix{break-inside:avoid}}
  </style></head><body>
    <div class="brand"><img src="/logo.png"/><div class="brand-title"><span class="pill">${esc(skillLabel(item.skill))}</span><h1>${esc(item.topic_name ?? item.test_title ?? "Bài kiểm tra")}</h1><div class="muted">${dateVi(item.submitted_at)}</div></div></div>
    <div class="meta"><div><b>Học viên</b><br>${esc(item.student_name ?? "—")}</div><div><b>Mã HV</b><br>${esc(item.student_code ?? "—")}</div><div><b>Lớp</b><br>${esc(item.class_name ?? "—")}</div><div><b>Trạng thái</b><br>${item.status === "graded" ? "Đã chấm" : "Chờ chấm"}</div></div>
    <div class="section"><h2>Điểm</h2><div class="scores"><div class="score"><b>${bandOf(item) ?? "—"}</b><span>Band</span></div>${scores}</div><p class="muted">CEFR: <b>${esc(item.cefr ?? "—")}</b></p></div>
    <div class="section"><h2>Đề bài</h2><div class="box">${esc(item.prompt || item.test_title || item.topic_name || "Chưa có đề bài lưu trong hệ thống.")}</div></div>
    <div class="grid"><div class="section"><h2>Bài làm của học viên</h2><p class="muted">${highlightedCount ? `${highlightedCount} đoạn được highlight theo dữ liệu sửa câu.` : "Không có đoạn nào được highlight tự động."}</p><div class="box essay">${essayHtml}</div></div><div class="section"><h2>Nhận xét tổng quan</h2><div class="box feedback">${esc(item.feedback || "Chưa có nhận xét tổng quan.")}</div><h2>Sửa câu chi tiết</h2>${correctionHtml}</div></div>
    <div class="footer">IELTS Ms. Trà My · Phiếu kết quả được tạo tự động từ English Test Platform</div>
  </body></html>`;
}
function esc(v: unknown) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)); }

function bandOf(item: ProgressItem) { return item.overall_band ?? item.band ?? null; }
function hasBand(item: ProgressItem) { return item.status === "graded" && bandOf(item) != null; }
function bySubmittedAsc(a: ProgressItem, b: ProgressItem) { return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(); }
function bySubmittedDesc(a: ProgressItem, b: ProgressItem) { return -bySubmittedAsc(a, b); }
function dateVi(value: string) { return new Date(value).toLocaleDateString("vi-VN"); }
function skillLabel(skill?: string | null) { return SKILL_LABEL[skill ?? ""] ?? "Khác"; }
function keyOf(item: ProgressItem, fallback: number) { return item.submission_id ?? `${item.submitted_at}-${item.topic_name ?? ""}-${fallback}`; }
