// Vào PHÒNG THI bằng MÃ THI: nhập mã + tên + email → kiểm tra buổi thi mở →
// chuyển sang trang làm bài của buổi thi.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sessionByCode, studentByCode } from "../../lib/api";
import {
  guestIdentity,
  identityFromStudentCode,
  isReadyIdentity,
  loadStudentIdentity,
  saveStudentIdentity,
  type StudentIdentity,
} from "../../lib/studentSession";
import { ErrorBox } from "../../components/common";

export default function SessionEntryPage() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadStudentIdentity();
    if (!saved) return;
    setIdentity(saved);
    setName(saved.name);
    setEmail(saved.email);
    if (saved.code) setStudentCode(saved.code);
  }, []);

  const ready = code.trim() && isReadyIdentity({ name, email });

  function setManualName(nextName: string) {
    setName(nextName);
    setIdentity((cur) => cur ? { ...cur, name: nextName } : null);
  }

  function setManualEmail(nextEmail: string) {
    setEmail(nextEmail);
    setIdentity((cur) => cur ? { ...cur, email: nextEmail } : null);
  }

  async function loginStudentCode() {
    if (!studentCode.trim()) return;
    setCodeBusy(true); setErr(null); setCodeMsg(null);
    try {
      const s = await studentByCode(studentCode.trim());
      if (!s) { setCodeMsg("Không tìm thấy mã học viên này."); return; }
      const next = identityFromStudentCode(s, studentCode);
      saveStudentIdentity(next);
      setIdentity(next);
      setName(next.name);
      if (next.email) setEmail(next.email);
      setCodeMsg(next.email
        ? `Đã nhận diện ${next.name}${next.className ? ` · ${next.className}` : ""}.`
        : `Đã nhận diện ${next.name}, nhưng hồ sơ chưa có email. Vui lòng nhập email để vào thi.`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCodeBusy(false);
    }
  }

  function saveGuestIfNeeded() {
    if (identity && identity.name === name.trim() && identity.email === email.trim().toLowerCase()) return identity;
    const next = saveStudentIdentity(guestIdentity(name, email));
    setIdentity(next);
    return next;
  }

  async function enter() {
    setErr(null);
    if (!ready) { setErr("Nhập mã thi, họ tên và email hợp lệ."); return; }
    setBusy(true);
    try {
      const current = saveGuestIfNeeded();
      const s = await sessionByCode(code.trim(), email.trim());
      if (!s) { setErr("Mã thi không đúng."); return; }
      if (s.status === "no_test") { setErr("Buổi thi chưa gắn đề."); return; }
      if (s.status === "not_open") { setErr(`Buổi thi chưa mở (mở lúc ${s.open_at ? new Date(s.open_at).toLocaleString("vi-VN") : "?"}).`); return; }
      if (s.status === "closed") { setErr(`Buổi thi đã đóng (${s.close_at ? new Date(s.close_at).toLocaleString("vi-VN") : ""}).`); return; }
      if (s.status === "class_mismatch") { setErr(`Email này không thuộc lớp được phép vào buổi thi${s.class_name ? ` (${s.class_name})` : ""}. Vui lòng kiểm tra email hoặc liên hệ giáo viên.`); return; }
      nav(`/session/${s.session_id}`, {
        state: {
          name: name.trim(), email: email.trim(), testId: s.test_id, skill: s.skill,
          studentCode: current.code ?? null, studentMode: current.mode,
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
    <div className="wrap narrow session-entry-wrap">
      <header className="session-entry-head">
        <div>
          <span className="eyebrow dark">Exam room</span>
          <h1>Vào phòng thi</h1>
          <p className="muted small">Nhập đúng mã thi và email đã đăng ký trong lớp để bắt đầu bài.</p>
        </div>
        <Link className="link" to="/">← Trang chủ</Link>
      </header>
      <div className="card session-entry-card">
        <label className="field session-code-field"><span>Mã thi</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VD: AB12CD" autoFocus />
        </label>
        <div className="row-form code-login">
          <input
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && loginStudentCode()}
            placeholder="Mã học viên, nếu có"
          />
          <button className="btn small" type="button" disabled={codeBusy} onClick={loginStudentCode}>
            {codeBusy ? "…" : "Nhận diện"}
          </button>
        </div>
        {codeMsg && <p className="muted small code-msg">{codeMsg}</p>}
        <div className="grid2">
          <label className="field"><span>Họ và tên</span>
            <input value={name} onChange={(e) => setManualName(e.target.value)} placeholder="Nhập họ tên học viên" />
          </label>
          <label className="field"><span>Email</span>
            <input value={email} onChange={(e) => setManualEmail(e.target.value)} type="email" placeholder="email đã đăng ký lớp" />
          </label>
        </div>
        <div className="session-entry-note">
          <strong>Lưu ý:</strong> nếu buổi thi giới hạn theo lớp, email phải trùng hồ sơ học viên giáo viên đã tạo.
        </div>
        {err && <ErrorBox msg={err} />}
        <button className="btn primary big" disabled={busy} onClick={enter}>{busy ? "Đang vào…" : "Vào thi"}</button>
      </div>
    </div>
  );
}
