// Vào PHÒNG THI bằng MÃ THI: nhập mã + tên + email → kiểm tra buổi thi mở →
// chuyển sang trang làm bài của buổi thi.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sessionByCode } from "../../lib/api";
import { ErrorBox } from "../../components/common";

export default function SessionEntryPage() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = code.trim() && name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  async function enter() {
    setErr(null);
    if (!ready) { setErr("Nhập mã thi, họ tên và email hợp lệ."); return; }
    setBusy(true);
    try {
      const s = await sessionByCode(code.trim());
      if (!s) { setErr("Mã thi không đúng."); return; }
      if (s.status === "no_test") { setErr("Buổi thi chưa gắn đề."); return; }
      if (s.status === "not_open") { setErr(`Buổi thi chưa mở (mở lúc ${s.open_at ? new Date(s.open_at).toLocaleString("vi-VN") : "?"}).`); return; }
      if (s.status === "closed") { setErr(`Buổi thi đã đóng (${s.close_at ? new Date(s.close_at).toLocaleString("vi-VN") : ""}).`); return; }
      nav(`/session/${s.session_id}`, {
        state: {
          name: name.trim(), email: email.trim(), testId: s.test_id, skill: s.skill,
          sessionName: s.name, maxViolations: s.max_violations ?? 0,
          closeAt: s.close_at, serverNow: s.server_now,
        },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap narrow">
      <header className="topbar">
        <h1>Vào phòng thi</h1>
        <Link className="link" to="/">← Trang chủ</Link>
      </header>
      <div className="card">
        <label className="field"><span>Mã thi</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VD: AB12CD" />
        </label>
        <div className="grid2">
          <label className="field"><span>Họ và tên</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field"><span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        {err && <ErrorBox msg={err} />}
        <button className="btn primary" disabled={busy} onClick={enter}>{busy ? "Đang vào…" : "Vào thi"}</button>
      </div>
    </div>
  );
}
