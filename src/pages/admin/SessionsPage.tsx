// Quản lý BUỔI THI (exit/mock): tạo buổi gắn 1 đề + MÃ THI + cửa sổ thời gian +
// một-lần-nộp + ngưỡng tự nộp khi vi phạm + có/không hiện điểm cho HS.
import { useMemo, useState } from "react";
import { deleteSession, listAllTests, listSessions, saveSession } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, Spinner } from "../../components/common";
import type { ExamSession, TestWithTopic } from "../../lib/types";

function genCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
// datetime-local -> ISO; "" -> null
function toIso(v: string): string | null { return v ? new Date(v).toISOString() : null; }
// ISO -> datetime-local value
function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function SessionsPage() {
  const sessions = useAsync<ExamSession[]>(listSessions, []);
  const tests = useAsync<TestWithTopic[]>(listAllTests, []);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <h1>Buổi thi &amp; Mã thi</h1>
      <p className="muted small">Tạo buổi thi gắn 1 đề; học sinh vào bằng <strong>mã thi</strong> tại trang chủ → "Vào phòng thi".</p>
      {err && <ErrorBox msg={err} />}

      <NewSession tests={tests.data ?? []} onAdded={sessions.reload} onErr={setErr} />

      <h2 className="section">Danh sách buổi thi</h2>
      {sessions.loading && <Spinner />}
      {sessions.error && <ErrorBox msg={sessions.error} />}
      {sessions.data?.map((s) => (
        <SessionRow key={s.id} s={s} tests={tests.data ?? []} onChanged={sessions.reload} onErr={setErr} />
      ))}
      {sessions.data && sessions.data.length === 0 && <p className="muted">Chưa có buổi thi nào.</p>}
    </div>
  );
}

function testLabel(t: TestWithTopic): string {
  return `${t.topic_name} · ${t.title ?? "Đề " + t.version_label} (${t.skill})`;
}

function NewSession({ tests, onAdded, onErr }: { tests: TestWithTopic[]; onAdded: () => void; onErr: (m: string) => void }) {
  const [f, setF] = useState({
    name: "", test_id: "", access_code: genCode(),
    open_at: "", close_at: "", one_submission: true, max_violations: 0, show_result: false,
  });
  async function add() {
    if (f.name.trim().length < 2) { onErr("Nhập tên buổi thi."); return; }
    if (!f.test_id) { onErr("Chọn đề cho buổi thi."); return; }
    try {
      await saveSession({
        name: f.name.trim(), test_id: f.test_id, access_code: f.access_code.trim().toUpperCase(),
        open_at: toIso(f.open_at), close_at: toIso(f.close_at),
        one_submission: f.one_submission, max_violations: Number(f.max_violations) || 0,
        show_result: f.show_result,
      });
      setF({ name: "", test_id: "", access_code: genCode(), open_at: "", close_at: "", one_submission: true, max_violations: 0, show_result: false });
      onAdded();
    } catch (e) { onErr(e instanceof Error ? e.message : String(e)); }
  }
  return (
    <div className="card">
      <h3>Tạo buổi thi</h3>
      <div className="grid2">
        <label className="field"><span>Tên buổi thi</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="vd: Thi cuối khóa IELTS 6.0 - T6" />
        </label>
        <label className="field"><span>Đề thi</span>
          <select value={f.test_id} onChange={(e) => setF({ ...f, test_id: e.target.value })}>
            <option value="">— Chọn đề —</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{testLabel(t)}</option>)}
          </select>
        </label>
        <label className="field"><span>Mã thi</span>
          <div className="row-form">
            <input value={f.access_code} onChange={(e) => setF({ ...f, access_code: e.target.value })} />
            <button className="btn small" type="button" onClick={() => setF({ ...f, access_code: genCode() })}>Đổi mã</button>
          </div>
        </label>
        <label className="field"><span>Tự nộp khi vi phạm ≥ (0 = tắt)</span>
          <input type="number" min={0} value={f.max_violations} onChange={(e) => setF({ ...f, max_violations: Number(e.target.value) })} />
        </label>
        <label className="field"><span>Mở lúc (tùy chọn)</span>
          <input type="datetime-local" value={f.open_at} onChange={(e) => setF({ ...f, open_at: e.target.value })} />
        </label>
        <label className="field"><span>Đóng lúc (tùy chọn)</span>
          <input type="datetime-local" value={f.close_at} onChange={(e) => setF({ ...f, close_at: e.target.value })} />
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={f.one_submission} onChange={(e) => setF({ ...f, one_submission: e.target.checked })} /> <span>Chỉ cho nộp 1 lần / học sinh</span></label>
      <label className="check"><input type="checkbox" checked={f.show_result} onChange={(e) => setF({ ...f, show_result: e.target.checked })} /> <span>Hiện điểm cho học sinh ngay sau nộp (trắc nghiệm)</span></label>
      <button className="btn primary" onClick={add}>+ Tạo buổi thi</button>
    </div>
  );
}

function SessionRow({ s, tests, onChanged, onErr }: { s: ExamSession; tests: TestWithTopic[]; onChanged: () => void; onErr: (m: string) => void }) {
  const test = useMemo(() => tests.find((t) => t.id === s.test_id), [tests, s.test_id]);
  async function remove() {
    if (!confirm(`Xóa buổi thi "${s.name}"?`)) return;
    try { await deleteSession(s.id); onChanged(); }
    catch (e) { onErr(e instanceof Error ? e.message : String(e)); }
  }
  const now = Date.now();
  const open = (!s.open_at || now >= new Date(s.open_at).getTime()) && (!s.close_at || now <= new Date(s.close_at).getTime());
  return (
    <div className="card sub">
      <div className="q-row-head">
        <div>
          <strong>{s.name}</strong>{" "}
          <span className="pill">{s.access_code}</span>{" "}
          {open ? <span className="ok-text small">đang mở</span> : <span className="pill off small">đóng/chưa mở</span>}
          <div className="muted small">{test ? testLabel(test) : "(đề đã xóa?)"}</div>
          <div className="muted small">
            {s.open_at ? `Mở: ${new Date(s.open_at).toLocaleString("vi-VN")}` : "Mở: ngay"} ·{" "}
            {s.close_at ? `Đóng: ${new Date(s.close_at).toLocaleString("vi-VN")}` : "Đóng: không giới hạn"}
            {s.one_submission ? " · 1 lần/HS" : ""}{s.max_violations ? ` · tự nộp khi vi phạm ≥ ${s.max_violations}` : ""}
            {s.show_result ? " · hiện điểm" : ""}
          </div>
        </div>
        <button className="btn ghost small danger" onClick={remove}>Xóa</button>
      </div>
    </div>
  );
}
