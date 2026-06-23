import { isConfigured } from "./lib/supabase";

// Phase 0: màn hình nền móng — xác nhận app chạy + trạng thái kết nối Supabase.
// Các Phase sau sẽ thay bằng router (đăng nhập GV / trang admin / app thi).
export default function App() {
  return (
    <div className="card">
      <span className="badge">Phase 0 · Nền móng</span>
      <h1>English Test Platform</h1>
      <p className="sub">
        Nền tảng thi tiếng Anh có database — IELTS Ms. Trà My. Bản v2 đang dựng theo lộ trình trong{" "}
        <code>docs/PLAN.md</code>.
      </p>

      <div className="status">
        <span className={`dot ${isConfigured ? "ok" : "off"}`} />
        {isConfigured
          ? "Đã cấu hình Supabase (.env) — sẵn sàng cho Phase 1."
          : "Chưa cấu hình Supabase — điền .env theo docs/SETUP.md."}
      </div>

      <ul className="steps">
        <li>Tạo dự án Supabase + chạy <code>supabase/schema.sql</code></li>
        <li>Tạo bucket R2 cho audio/ảnh</li>
        <li>Điền <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code> vào <code>.env</code></li>
        <li>Tiếp theo (Phase 1): đăng nhập giáo viên + quản trị đề Viết</li>
      </ul>
    </div>
  );
}
