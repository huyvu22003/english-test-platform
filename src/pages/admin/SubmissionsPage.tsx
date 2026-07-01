// Hàng đợi chấm: danh sách bài nộp, lọc (tên/chủ đề/trạng thái), xem bài viết +
// nhật ký vi phạm, CHẤM TAY 4 tiêu chí IELTS (tự tính overall + CEFR), xuất CSV, xóa.
import { useMemo, useRef, useState } from "react";
import { deleteSubmission, gradeWriting, listSubmissions, bandToCefr } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, Spinner } from "../../components/common";
import type { Submission, WritingCorrection, WritingScores } from "../../lib/types";

type StatusFilter = "all" | "submitted" | "graded";

export default function SubmissionsPage() {
  const subs = useAsync<Submission[]>(listSubmissions, []);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [guideOpen, setGuideOpen] = useState(false);

  const topics = useMemo(() => {
    const s = new Set<string>();
    subs.data?.forEach((x) => x.topic_name && s.add(x.topic_name));
    return [...s].sort();
  }, [subs.data]);

  const rows = useMemo(() => {
    return (subs.data ?? []).filter((s) => {
      if (topic && s.topic_name !== topic) return false;
      if (status !== "all" && s.status !== status) return false;
      if (q) {
        const hay = `${s.student_name ?? ""} ${s.student_email ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [subs.data, q, topic, status]);

  const pending = (subs.data ?? []).filter((s) => s.status === "submitted").length;

  function exportCsv() {
    const header = [
      "Thời gian nộp", "Họ tên", "Email", "Chủ đề", "Tiêu đề đề", "Số từ",
      "Overall band", "CEFR", "TR", "CC", "LR", "GRA", "Trạng thái", "Vi phạm",
      "Số lỗi sửa câu", "Nhận xét",
    ];
    const lines = rows.map((s) => [
      new Date(s.submitted_at).toLocaleString("vi-VN"),
      s.student_name ?? "", s.student_email ?? "", s.topic_name ?? "", s.tests?.title ?? "",
      wc(s.essay), num(s.overall_band), s.cefr ?? "",
      num(s.score_tr), num(s.score_cc), num(s.score_lr), num(s.score_gra),
      s.status === "graded" ? "Đã chấm" : "Chờ chấm", num(s.violations),
      s.writing_corrections?.length ?? 0, s.feedback ?? "",
    ]);
    downloadCsv([header, ...lines], `bai-nop-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="title-row">
        <h1>Hàng đợi chấm &amp; Điểm {pending > 0 && <span className="pill off">{pending} chờ chấm</span>}</h1>
        <div className="actions">
          <button className="btn" type="button" onClick={() => setGuideOpen(true)}>❔ Hướng dẫn chấm bài</button>
          <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>⬇ Xuất CSV</button>
        </div>
      </div>
      {guideOpen && <GradingGuideModal onClose={() => setGuideOpen(false)} />}

      <div className="card row-form">
        <input placeholder="Tìm tên / email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">Tất cả chủ đề</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">Mọi trạng thái</option>
          <option value="submitted">Chờ chấm</option>
          <option value="graded">Đã chấm</option>
        </select>
        <span className="muted small">{rows.length} bài</span>
      </div>

      {subs.loading && <Spinner />}
      {subs.error && <ErrorBox msg={subs.error} />}

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nộp lúc</th><th>Học sinh</th><th>Chủ đề</th><th>Band</th><th>CEFR</th><th>Trạng thái</th><th>Vi phạm</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => <Row key={s.id} s={s} onChanged={subs.reload} />)}
            {rows.length === 0 && !subs.loading && (
              <tr><td colSpan={8} className="muted">Không có bài nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function GradingGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="grading-guide-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card grading-guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-mini-head">
          <div>
            <h2>Hướng dẫn chấm bài Writing</h2>
            <p className="muted small">Quy trình khuyến nghị để giáo viên chấm đúng, đủ điểm và phản hồi rõ cho học sinh.</p>
          </div>
          <button className="btn ghost small" type="button" onClick={onClose}>Đóng ✕</button>
        </div>

        <div className="guide-steps">
          <section>
            <h3>1. Lọc và mở bài cần chấm</h3>
            <ol>
              <li>Dùng ô tìm kiếm để lọc theo tên/email học sinh.</li>
              <li>Chọn chủ đề hoặc trạng thái <strong>Chờ chấm</strong> nếu cần.</li>
              <li>Bấm <strong>Chấm</strong> ở dòng bài làm để mở chi tiết.</li>
            </ol>
          </section>

          <section>
            <h3>2. Đọc đề và bài viết</h3>
            <ol>
              <li>Đọc khung <strong>Đề bài</strong> trước để nắm yêu cầu.</li>
              <li>Đọc bài viết, chú ý số từ và nhật ký vi phạm nếu có.</li>
              <li>Nếu bài có vi phạm, mở <strong>Nhật ký vi phạm</strong> để xem chi tiết trước khi quyết định điểm.</li>
            </ol>
          </section>

          <section>
            <h3>3. Sửa câu chi tiết cho học sinh</h3>
            <ol>
              <li>Bôi chọn trực tiếp câu/đoạn sai trong bài viết.</li>
              <li>Bấm <strong>+ Sửa câu đã chọn</strong>.</li>
              <li>Nhập câu sửa đúng và ghi chú lỗi nếu cần.</li>
              <li>Bấm <strong>Thêm vào danh sách sửa</strong>. Các lỗi này sẽ được highlight ở trang tiến bộ của học sinh.</li>
            </ol>
          </section>

          <section>
            <h3>4. Nhập điểm IELTS</h3>
            <ol>
              <li>Nhập 4 tiêu chí: <strong>TR</strong>, <strong>CC</strong>, <strong>LR</strong>, <strong>GRA</strong>.</li>
              <li>Điểm phải nằm trong thang <strong>0–9</strong> và theo bước <strong>0.5</strong>.</li>
              <li>Hệ thống tự tính <strong>Overall</strong> và <strong>CEFR</strong>.</li>
            </ol>
          </section>

          <section>
            <h3>5. Viết nhận xét và lưu</h3>
            <ol>
              <li>Viết nhận xét tổng quan: điểm mạnh, điểm cần cải thiện, hướng luyện tiếp.</li>
              <li>Có thể dùng nhanh các nút <strong>+ Điểm mạnh</strong>, <strong>+ Cần cải thiện</strong>, <strong>+ Gợi ý luyện</strong>.</li>
              <li>Bấm <strong>Lưu điểm &amp; chấm xong</strong>. Bài sẽ chuyển sang trạng thái <strong>Đã chấm</strong>.</li>
              <li>Học sinh xem phản hồi trong mục <strong>Xem tiến bộ</strong> và có thể <strong>In / Tải PDF</strong>.</li>
            </ol>
          </section>
        </div>

        <div className="guide-note">
          <strong>Lưu ý:</strong> Nên luôn có ít nhất nhận xét tổng quan hoặc sửa câu chi tiết trước khi lưu để học sinh hiểu cần cải thiện gì.
        </div>
      </div>
    </div>
  );
}

const CRITERIA: { key: keyof WritingScores; label: string }[] = [
  { key: "tr", label: "Task Response" },
  { key: "cc", label: "Coherence & Cohesion" },
  { key: "lr", label: "Lexical Resource" },
  { key: "gra", label: "Grammar" },
];

function Row({ s, onChanged }: { s: Submission; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [sc, setSc] = useState<WritingScores>({
    tr: s.score_tr ?? 6, cc: s.score_cc ?? 6, lr: s.score_lr ?? 6, gra: s.score_gra ?? 6,
  });
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [corrections, setCorrections] = useState<WritingCorrection[]>(s.writing_corrections ?? []);
  const [selectedText, setSelectedText] = useState("");
  const [fixedText, setFixedText] = useState("");
  const [fixNote, setFixNote] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const essayRef = useRef<HTMLParagraphElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const overall = Math.round(((sc.tr + sc.cc + sc.lr + sc.gra) / 4) * 2) / 2;

  async function save() {
    setErr(null); setMsg(null);
    const invalid = CRITERIA.find((c) => !isValidBandScore(sc[c.key]));
    if (invalid) { setErr(`${invalid.label} phải nằm trong thang 0–9 và theo bước 0.5.`); return; }
    if (!feedback.trim() && corrections.length === 0 && !confirm("Chưa có nhận xét hoặc sửa câu chi tiết. Vẫn lưu điểm?")) return;
    setBusy(true);
    try {
      await gradeWriting(s.id, sc, feedback.trim(), corrections);
      setMsg("Đã lưu điểm và phản hồi.");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function appendFeedback(text: string) {
    setFeedback((prev) => [prev.trim(), text].filter(Boolean).join("\n"));
  }
  function captureSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!sel || !text) { setErr("Hãy bôi chọn câu/đoạn sai trong bài viết trước."); return; }
    const essayNode = essayRef.current;
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    if (!essayNode || !range || !essayNode.contains(range.commonAncestorContainer)) {
      setErr("Hãy bôi chọn trực tiếp trong phần bài viết của học viên.");
      return;
    }
    const pre = range.cloneRange();
    pre.selectNodeContents(essayNode);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const exactText = range.toString();
    setSelectedText(exactText.trim());
    setSelectedStart(start + exactText.search(/\S/));
    setSelectedEnd(start + exactText.replace(/\s+$/, "").length);
    setFixedText("");
    setFixNote("");
    setComposeOpen(true);
    setErr(null);
  }
  function addCorrection() {
    if (!selectedText.trim() || !fixedText.trim()) { setErr("Cần có câu gốc và câu sửa."); return; }
    setCorrections((prev) => [...prev, {
      id: `${Date.now()}-${prev.length + 1}`,
      original: selectedText.trim(),
      corrected: fixedText.trim(),
      note: fixNote.trim() || undefined,
      start: selectedStart ?? undefined,
      end: selectedEnd ?? undefined,
    }]);
    clearCompose(); setErr(null);
  }
  function clearCompose() {
    setSelectedText(""); setFixedText(""); setFixNote(""); setSelectedStart(null); setSelectedEnd(null); setComposeOpen(false);
  }
  function resetCompose() {
    setFixedText(""); setFixNote(""); setErr(null);
  }
  function removeCorrection(id: string) {
    setCorrections((prev) => prev.filter((c) => c.id !== id));
  }

  async function remove() {
    if (!confirm("Xóa bài nộp này?")) return;
    await deleteSubmission(s.id);
    onChanged();
  }

  return (
    <>
      <tr className={s.violations ? "has-viol" : ""}>
        <td className="small">{new Date(s.submitted_at).toLocaleString("vi-VN")}</td>
        <td>{s.student_name}<div className="muted small">{s.student_email}</div></td>
        <td>{s.topic_name}</td>
        <td>{s.overall_band ?? "—"}</td>
        <td>{s.cefr ?? "—"}</td>
        <td>{s.status === "graded" ? <span className="ok-text">Đã chấm</span> : <span className="pill off small">Chờ chấm</span>}</td>
        <td>{s.violations ? <span className="viol">{s.violations}</span> : "0"}</td>
        <td><button className="btn ghost small" onClick={() => setOpen((o) => !o)}>{open ? "Đóng" : "Chấm"}</button></td>
      </tr>
      {open && (
        <tr className="detail-row">
          <td colSpan={8}>
            {/* Đề bài (join từ tests) — nổi bật để GV vừa đọc đề vừa chấm */}
            <div className="prompt-quote">
              <strong>📝 Đề bài{s.tests?.title ? ` — ${s.tests.title}` : ""}</strong>
              {s.tests?.prompt ? (
                <p>{s.tests.prompt}</p>
              ) : (
                <p className="muted small">(đề không còn nội dung — chủ đề: {s.topic_name ?? "—"})</p>
              )}
            </div>
            {s.essay && (
              <div className="essay-box grading-essay-box">
                <div className="grading-essay-head">
                  <strong>Bài viết ({wc(s.essay)} từ):</strong>
                  <button className="btn small" type="button" onClick={captureSelection}>+ Sửa câu đã chọn</button>
                </div>
                <p ref={essayRef}>{s.essay}</p>
              </div>
            )}
            <div className="structured-corrections card sub">
              <h3>Sửa câu có cấu trúc</h3>
              <p className="muted small">Bôi chọn câu sai trong bài viết → bấm “+ Sửa câu đã chọn” → nhập câu sửa. Dữ liệu này dùng để highlight chính xác ở trang học sinh.</p>
              <div className="correction-admin-list">
                {corrections.map((c, idx) => (
                  <div className="correction-admin-item" key={c.id}>
                    <div className="correction-label">Lỗi #{idx + 1}</div>
                    <div className="correction-original">{c.original}</div>
                    {c.note && <div className="muted small">Lỗi: {c.note}</div>}
                    <div className="correction-fixed">{c.corrected}</div>
                    <button className="btn ghost small danger" type="button" onClick={() => removeCorrection(c.id)}>Xóa sửa câu</button>
                  </div>
                ))}
                {corrections.length === 0 && <div className="muted small">Chưa có câu sửa có cấu trúc.</div>}
              </div>
            </div>
            {composeOpen && (
              <div className="correction-compose-backdrop" role="dialog" aria-modal="true" onClick={clearCompose}>
                <div className="card correction-compose-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-mini-head">
                    <div>
                      <h3>Sửa câu đã chọn</h3>
                      <p className="muted small">Nhập câu sửa ngay tại đây. Có thể xóa nhập lại hoặc hủy nếu chọn nhầm.</p>
                    </div>
                    <button className="btn ghost small" type="button" onClick={clearCompose}>Hủy ✕</button>
                  </div>
                  <label className="field"><span>Câu gốc đã chọn</span><textarea rows={3} value={selectedText} onChange={(e) => setSelectedText(e.target.value)} /></label>
                  <label className="field"><span>Câu sửa đúng</span><textarea rows={3} autoFocus value={fixedText} onChange={(e) => setFixedText(e.target.value)} placeholder="Nhập câu sửa…" /></label>
                  <label className="field"><span>Ghi chú lỗi (tuỳ chọn)</span><input value={fixNote} onChange={(e) => setFixNote(e.target.value)} placeholder="VD: thiếu opinion, collocation chưa tự nhiên…" /></label>
                  <div className="actions correction-compose-actions">
                    <button className="btn small primary" type="button" onClick={addCorrection}>Thêm vào danh sách sửa</button>
                    <button className="btn small" type="button" onClick={resetCompose}>Xóa nhập lại</button>
                    <button className="btn ghost small" type="button" onClick={clearCompose}>Hủy không sửa</button>
                  </div>
                </div>
              </div>
            )}
            {s.violation_log && (
              <details className="viol-box">
                <summary>Nhật ký vi phạm ({s.violations})</summary>
                <pre>{s.violation_log}</pre>
              </details>
            )}

            <div className="grade-grid">
              {CRITERIA.map((c) => (
                <label className="field inline" key={c.key}><span>{c.label}</span>
                  <input type="number" min={0} max={9} step="0.5" value={sc[c.key]}
                    onChange={(e) => setSc((p) => ({ ...p, [c.key]: Number(e.target.value) }))} />
                </label>
              ))}
              <div className="overall-box">
                Overall: <strong>{overall}</strong> <span className="pill">{bandToCefr(overall)}</span>
              </div>
            </div>
            <label className="field"><span>Nhận xét cho học sinh</span>
              <textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="Điểm mạnh, điểm cần cải thiện theo từng tiêu chí…" />
            </label>
            <div className="quick-feedback-row">
              <button className="btn ghost small" type="button" onClick={() => appendFeedback("Điểm mạnh: bài có ý tưởng rõ và bám đề tốt.")}>+ Điểm mạnh</button>
              <button className="btn ghost small" type="button" onClick={() => appendFeedback("Cần cải thiện: phát triển luận điểm cụ thể hơn, thêm ví dụ và giải thích rõ hơn.")}>+ Cần cải thiện</button>
              <button className="btn ghost small" type="button" onClick={() => appendFeedback("Gợi ý luyện tập: viết lại các câu đã sửa và rà soát lỗi ngữ pháp/từ vựng lặp lại.")}>+ Gợi ý luyện</button>
            </div>
            {err && <ErrorBox msg={err} />}
            {msg && <span className="ok-text">{msg}</span>}
            <div className="actions">
              <button className="btn small primary" disabled={busy} onClick={save}>
                {busy ? "Đang lưu…" : s.status === "graded" ? "Cập nhật điểm" : "Lưu điểm & chấm xong"}
              </button>
              <button className="btn ghost small danger" onClick={remove}>Xóa bài</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function isValidBandScore(v: number): boolean {
  return Number.isFinite(v) && v >= 0 && v <= 9 && Math.abs(v * 2 - Math.round(v * 2)) < 0.001;
}
function num(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}
function wc(essay: string | null): number {
  return essay ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
}

// Xuất CSV có BOM để Excel đọc đúng tiếng Việt.
function downloadCsv(rows: (string | number)[][], filename: string) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
