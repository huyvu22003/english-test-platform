// Đăng nhập giáo viên (Supabase Auth).
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { isConfigured } from "../../lib/supabase";
import { ErrorBox } from "../../components/common";
import Logo from "../../components/Logo";

export default function LoginPage() {
  const { session, signIn } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") === "/academy" ? "/academy" : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={nextPath} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      nav(nextPath, { replace: true });
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
        <span className="eyebrow dark">IELTS Ms. Trà My</span>
        <h1>Đăng nhập nhân sự</h1>
        <p className="muted small auth-subtitle">
          Dùng chung một tài khoản để học trong Internal Academy hoặc truy cập công cụ nghiệp vụ được phân quyền.
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
