// Đăng nhập giáo viên (Supabase Auth).
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { isConfigured } from "../../lib/supabase";
import { ErrorBox } from "../../components/common";
import Logo from "../../components/Logo";

export default function LoginPage() {
  const { session, signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/admin" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      nav("/admin", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <Logo height={54} light />
      </div>
      <div className="auth-box auth-box-premium">
        <span className="eyebrow dark">Teacher admin</span>
        <h1>Đăng nhập giáo viên</h1>
        <p className="muted small auth-subtitle">
          Vào khu quản trị IELTS Ms. Trà My để soạn đề, chấm bài và theo dõi lớp.
        </p>
        {!isConfigured && <ErrorBox msg="Chưa cấu hình Supabase (.env). Xem docs/SETUP.md." />}
        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {err && <ErrorBox msg={err} />}
          <button className="btn primary big auth-submit" disabled={busy || !isConfigured} type="submit">
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <div className="auth-footer-link">
          <Link className="link" to="/">
            ← Về trang học sinh
          </Link>
        </div>
      </div>
    </div>
  );
}
