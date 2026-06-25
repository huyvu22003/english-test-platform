// Khung trang quản trị: thanh điều hướng + nội dung con (Outlet).
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import Logo from "../../components/Logo";

export default function AdminLayout() {
  const { session, signOut } = useAuth();
  const nav = useNavigate();

  async function logout() {
    await signOut();
    nav("/admin/login", { replace: true });
  }

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand"><Logo light /></div>
        <nav>
          <NavLink to="/admin/topics" className={({ isActive }) => (isActive ? "active" : "")}>
            Chủ đề &amp; Đề thi
          </NavLink>
          <NavLink to="/admin/submissions" className={({ isActive }) => (isActive ? "active" : "")}>
            Hàng đợi chấm
          </NavLink>
          <NavLink to="/admin/roster" className={({ isActive }) => (isActive ? "active" : "")}>
            Lớp &amp; Học viên
          </NavLink>
          <NavLink to="/admin/diagnostics" className={({ isActive }) => (isActive ? "active" : "")}>
            Chẩn đoán
          </NavLink>
          <NavLink to="/admin/import" className={({ isActive }) => (isActive ? "active" : "")}>
            Nhập từ Excel
          </NavLink>
          <NavLink to="/admin/sessions" className={({ isActive }) => (isActive ? "active" : "")}>
            Buổi thi &amp; Mã thi
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{session?.user.email}</div>
          <button className="btn ghost small" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
