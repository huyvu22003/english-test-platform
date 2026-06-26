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
  const [items, setItems] = useState<ProgressItem[] | null>(null);
  const [selected, setSelected] = useState<ProgressItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup() {
    if (!/\S+@\S+\.\S+/.test(email)) { setErr("Nhập email hợp lệ."); return; }
    setErr(null); setLoading(true); setItems(null); setSelected(null);
    try {
      const next = await getProgress(email.trim());
      setItems(next);
      setSelected(next.length ? next[next.length - 1] : null);
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
          <p className="muted small sub">Nhập email để xem biểu đồ Nghe · Đọc · Viết và lịch sử bài đã làm.</p>
        </div>
        <Link className="link" to="/">← Trang chủ</Link>
      </header>

      <div className="card row-form progress-lookup">
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

      {items && items.length > 0 && (
        <>
          <SkillSummary grouped={grouped} />

          <div className="progress-chart-grid">
            {Object.entries(grouped).map(([skill, skillItems]) => (
              <BandChart key={skill} skill={skill} items={skillItems.filter(hasBand)} />
            ))}
          </div>

          <div className="progress-layout">
            <HistoryTable items={ordered} selected={selected} onSelect={setSelected} />
            <SubmissionDetail item={selected} />
          </div>
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

function SubmissionDetail({ item }: { item: ProgressItem | null }) {
  if (!item) {
    return <div className="card progress-detail muted">Chọn một bài trong lịch sử để xem chi tiết.</div>;
  }

  return (
    <div className="card progress-detail">
      <div className="detail-head">
        <div>
          <span className={`pill skill-${item.skill}`}>{skillLabel(item.skill)}</span>
          <h2>{item.topic_name ?? item.test_title ?? "Chi tiết bài làm"}</h2>
          <p className="muted small">{dateVi(item.submitted_at)} · {item.status === "graded" ? "Đã chấm" : "Chờ chấm"}</p>
        </div>
        <div className="detail-score">
          <div>{bandOf(item) ?? "—"}</div>
          <span>Band</span>
        </div>
      </div>

      <section className="detail-section">
        <h3>Đề bài</h3>
        <div className="detail-box">{item.prompt || item.test_title || item.topic_name || "Chưa có đề bài lưu trong hệ thống."}</div>
      </section>

      <section className="detail-section">
        <h3>Bài làm của học viên</h3>
        {item.essay ? (
          <div className="detail-box prewrap">{item.essay}</div>
        ) : item.score != null && item.max_score != null ? (
          <div className="detail-box">Điểm tự chấm: <b>{item.score}/{item.max_score}</b></div>
        ) : (
          <div className="detail-box muted">Chưa có nội dung bài làm hiển thị.</div>
        )}
      </section>

      <section className="detail-section">
        <h3>Sửa / nhận xét của giáo viên</h3>
        <WritingScoreGrid item={item} />
        <div className="detail-box prewrap">{item.feedback || "Chưa có nhận xét của giáo viên."}</div>
      </section>
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

function bandOf(item: ProgressItem) { return item.overall_band ?? item.band ?? null; }
function hasBand(item: ProgressItem) { return item.status === "graded" && bandOf(item) != null; }
function bySubmittedAsc(a: ProgressItem, b: ProgressItem) { return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(); }
function bySubmittedDesc(a: ProgressItem, b: ProgressItem) { return -bySubmittedAsc(a, b); }
function dateVi(value: string) { return new Date(value).toLocaleDateString("vi-VN"); }
function skillLabel(skill?: string | null) { return SKILL_LABEL[skill ?? ""] ?? "Khác"; }
function keyOf(item: ProgressItem, fallback: number) { return item.submission_id ?? `${item.submitted_at}-${item.topic_name ?? ""}-${fallback}`; }
