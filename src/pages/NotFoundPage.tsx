import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-code">404</div>
      <h1>Không tìm thấy trang</h1>
      <p className="muted">Trang bạn tìm không tồn tại hoặc đã bị xóa.</p>
      <Link className="btn primary" to="/">
        ← Về trang chủ
      </Link>
    </div>
  );
}
