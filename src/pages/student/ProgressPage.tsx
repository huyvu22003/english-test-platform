// Tra cứu tiến bộ theo email: bảng các bài đã chấm + đường band theo thời gian.
import { useState } from "react";
import { Link } from "react-router-dom";
import { getProgress } from "../../lib/api";
import { ErrorBox, Spinner } from "../../components/common";
import type { ProgressItem } from "../../lib/types";

export default function ProgressPage() {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<ProgressItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup() {
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Nhập email hợp lệ."); return; }
    setErr(null); setLoading(true); setItems(null);
    try {
      setItems(await getProgress(email.trim()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const graded = (items ?? []).filter((i) => i.status === "graded" && i.overall_band != null);

  return (
    <div className="wrap narrow">
      <header className="topbar">
        <h1>Tiến bộ của bạn</h1>
        <Link className="link" to="/">← Trang chủ</Link>
      </header>

      <div className="card row-form">
        <input
          placeholder="Email đã dùng khi thi…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <button className="btn primary" onClick={lookup}>Xem</button>
      </div>

      {loading && <Spinner />}
      {err && <ErrorBox msg={err} />}

      {graded.length > 1 && <BandChart items={graded} />}

      {items && (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Ngày</th><th>Chủ đề</th><th>Band</th><th>CEFR</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  <td className="small">{new Date(i.submitted_at).toLocaleDateString("vi-VN")}</td>
                  <td>{i.topic_name}</td>
                  <td>{i.overall_band ?? "—"}</td>
                  <td>{i.cefr ?? "—"}</td>
                  <td>{i.status === "graded" ? "Đã chấm" : <span className="muted">Chờ chấm</span>}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="muted">Chưa có bài nộp nào với email này.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Đường band đơn giản bằng SVG (không thêm thư viện biểu đồ).
function BandChart({ items }: { items: ProgressItem[] }) {
  const W = 380, H = 120, pad = 24;
  const bands = items.map((i) => i.overall_band as number);
  const min = Math.min(...bands, 4), max = Math.max(...bands, 9);
  const x = (idx: number) => pad + (idx * (W - 2 * pad)) / Math.max(1, items.length - 1);
  const y = (b: number) => H - pad - ((b - min) / Math.max(0.5, max - min)) * (H - 2 * pad);
  const pts = bands.map((b, idx) => `${x(idx)},${y(b)}`).join(" ");
  return (
    <div className="card">
      <div className="muted small">Đường band theo thời gian</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="chart">
        <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2" />
        {bands.map((b, idx) => (
          <g key={idx}>
            <circle cx={x(idx)} cy={y(b)} r="4" fill="var(--brand2)" />
            <text x={x(idx)} y={y(b) - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{b}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
