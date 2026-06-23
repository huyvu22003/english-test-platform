// Dashboard điểm: danh sách bài nộp, lọc, xem bài Viết, chấm tay (điểm/band),
// xuất CSV (mở được bằng Excel), xóa bài.
import { useMemo, useState } from "react";
import { deleteSubmission, listSubmissions, updateSubmission } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, Spinner } from "../../components/common";
import type { Submission } from "../../lib/types";

export default function SubmissionsPage() {
  const subs = useAsync<Submission[]>(listSubmissions, []);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");

  const topics = useMemo(() => {
    const s = new Set<string>();
    subs.data?.forEach((x) => x.topic_name && s.add(x.topic_name));
    return [...s].sort();
  }, [subs.data]);

  const rows = useMemo(() => {
    return (subs.data ?? []).filter((s) => {
      if (topic && s.topic_name !== topic) return false;
      if (q) {
        const hay = `${s.student_name ?? ""} ${s.student_email ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [subs.data, q, topic]);

  function exportCsv() {
    const header = [
      "Thời gian nộp", "Họ tên", "Email", "Chủ đề", "Điểm", "Tổng", "%", "Band", "Vi phạm",
    ];
    const lines = rows.map((s) => [
      new Date(s.submitted_at).toLocaleString("vi-VN"),
      s.student_name ?? "", s.student_email ?? "", s.topic_name ?? "",
      num(s.score), num(s.max_score),
      s.score != null && s.max_score ? Math.round((s.score / s.max_score) * 1000) / 10 : "",
      num(s.band), num(s.violations),
    ]);
    downloadCsv([header, ...lines], `bai-nop-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="title-row">
        <h1>Bài nộp &amp; Điểm</h1>
        <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>⬇ Xuất CSV</button>
      </div>

      <div className="card row-form">
        <input placeholder="Tìm tên / email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">Tất cả chủ đề</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="muted small">{rows.length} bài</span>
      </div>

      {subs.loading && <Spinner />}
      {subs.error && <ErrorBox msg={subs.error} />}

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nộp lúc</th><th>Học sinh</th><th>Chủ đề</th><th>Điểm</th><th>Band</th><th>Vi phạm</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <Row key={s.id} s={s} onChanged={subs.reload} />
            ))}
            {rows.length === 0 && !subs.loading && (
              <tr><td colSpan={7} className="muted">Chưa có bài nộp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ s, onChanged }: { s: Submission; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(s.score ?? 0);
  const [band, setBand] = useState(s.band ?? 0);

  async function saveGrade() {
    await updateSubmission(s.id, { score: Number(score), band: Number(band) });
    onChanged();
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
        <td>{s.score != null ? `${s.score}/${s.max_score}` : "—"}</td>
        <td>{s.band ?? "—"}</td>
        <td>{s.violations ? <span className="viol">{s.violations}</span> : "0"}</td>
        <td><button className="btn ghost small" onClick={() => setOpen((o) => !o)}>{open ? "Đóng" : "Chi tiết"}</button></td>
      </tr>
      {open && (
        <tr className="detail-row">
          <td colSpan={7}>
            {s.essay && (
              <div className="essay-box">
                <strong>Bài viết:</strong>
                <p>{s.essay}</p>
              </div>
            )}
            {s.violation_log && (
              <div className="viol-box">
                <strong>Nhật ký vi phạm:</strong>
                <pre>{s.violation_log}</pre>
              </div>
            )}
            <div className="row-form">
              <label className="field inline"><span>Điểm</span>
                <input type="number" step="0.5" value={score} onChange={(e) => setScore(Number(e.target.value))} />
              </label>
              <label className="field inline"><span>Band</span>
                <input type="number" step="0.5" value={band} onChange={(e) => setBand(Number(e.target.value))} />
              </label>
              <button className="btn small primary" onClick={saveGrade}>Lưu điểm</button>
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
