// Khung trang quản trị: thanh điều hướng + nội dung con (Outlet).
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import Logo from "../../components/Logo";

export default function AdminLayout() {
  const { session, profile, isAdmin, canManageContent, canGrade, signOut } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await signOut();
    nav("/admin/login", { replace: true });
  }

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="admin-mobile-head">
          <div className="brand"><Logo height={30} light /></div>
          <button className="btn small admin-menu-toggle" type="button" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? "Đóng ✕" : "☰ Menu"}
          </button>
        </div>
        <nav className={menuOpen ? "open" : ""} onClick={() => setMenuOpen(false)}>
          <div className="nav-group-label">Vận hành</div>
          <NavLink to="/admin/operations" className={({ isActive }) => (isActive ? "active" : "")}>Tổng quan</NavLink>
          {isAdmin && <NavLink to="/admin/staff" className={({ isActive }) => (isActive ? "active" : "")}>Giáo viên</NavLink>}

          {canManageContent && (
            <>
              <div className="nav-group-label">Soạn đề</div>
              <NavLink to="/admin/topics/writing" className={({ isActive }) => (isActive ? "active" : "")}>Đề Viết</NavLink>
              <NavLink to="/admin/topics/reading" className={({ isActive }) => (isActive ? "active" : "")}>Đề Đọc</NavLink>
              <NavLink to="/admin/topics/listening" className={({ isActive }) => (isActive ? "active" : "")}>Đề Nghe</NavLink>
              <NavLink to="/admin/topics/intensive" className={({ isActive }) => (isActive ? "active" : "")}>Học tăng cường 2026</NavLink>
              <NavLink to="/admin/topics" end className={({ isActive }) => (isActive ? "active" : "")}>Ngân hàng đề</NavLink>
              <NavLink to="/admin/import" className={({ isActive }) => (isActive ? "active" : "")}>Nhập từ Excel</NavLink>
            </>
          )}

          {(canGrade || isAdmin) && <NavLink to="/admin/submissions" className={({ isActive }) => (isActive ? "active" : "")}>Hàng đợi chấm</NavLink>}
          {(canGrade || isAdmin) && <NavLink to="/admin/diagnostics" className={({ isActive }) => (isActive ? "active" : "")}>Chẩn đoán</NavLink>}
          {isAdmin && <NavLink to="/admin/roster" className={({ isActive }) => (isActive ? "active" : "")}>Lớp &amp; Học viên</NavLink>}
          {isAdmin && <NavLink to="/admin/sessions" className={({ isActive }) => (isActive ? "active" : "")}>Buổi thi &amp; Mã thi</NavLink>}
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{profile?.full_name || session?.user.email}</div>
          <div className="muted small">{profile?.role ?? "teacher"}</div>
          <button className="btn ghost small" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
