// Hàng đợi chấm: danh sách bài nộp, lọc (tên/chủ đề/trạng thái), xem bài viết +
// nhật ký vi phạm, CHẤM TAY 4 tiêu chí IELTS (tự tính overall + CEFR), xuất CSV, xóa.
import { useMemo, useState } from "react";
import { deleteSubmission, gradeWriting, listSubmissions, bandToCefr } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, Spinner } from "../../components/common";
import type { Submission, WritingScores } from "../../lib/types";

type StatusFilter = "all" | "submitted" | "graded";

export default function SubmissionsPage() {
  const subs = useAsync<Submission[]>(listSubmissions, []);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

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
    const header = ["Thời gian nộp", "Họ tên", "Email", "Chủ đề", "Số từ", "Overall band", "CEFR", "Trạng thái", "Vi phạm"];
    const lines = rows.map((s) => [
      new Date(s.submitted_at).toLocaleString("vi-VN"),
      s.student_name ?? "", s.student_email ?? "", s.topic_name ?? "",
      wc(s.essay), num(s.overall_band), s.cefr ?? "",
      s.status === "graded" ? "Đã chấm" : "Chờ chấm", num(s.violations),
    ]);
    downloadCsv([header, ...lines], `bai-nop-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="title-row">
        <h1>Hàng đợi chấm &amp; Điểm {pending > 0 && <span className="pill off">{pending} chờ chấm</span>}</h1>
        <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>⬇ Xuất CSV</button>
      </div>

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const overall = Math.round(((sc.tr + sc.cc + sc.lr + sc.gra) / 4) * 2) / 2;

  async function save() {
    setBusy(true); setErr(null);
    try {
      await gradeWriting(s.id, sc, feedback.trim());
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
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
              <div className="essay-box">
                <strong>Bài viết ({wc(s.essay)} từ):</strong>
                <p>{s.essay}</p>
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
              <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="Điểm mạnh, điểm cần cải thiện theo từng tiêu chí…" />
            </label>
            {err && <ErrorBox msg={err} />}
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
