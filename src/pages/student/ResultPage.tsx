// Màn sau khi nộp. Writing: chấm tay nên chỉ báo "đã nộp, chờ giáo viên chấm".
// (Trắc nghiệm tự chấm dùng SubmitResult — giữ cho tương lai.)
import { Link, Navigate, useLocation } from "react-router-dom";
import type { SubmitResult } from "../../lib/types";

interface ResultState {
  writing?: boolean;
  result?: SubmitResult;
  name?: string;
  topic?: string;
  auto?: boolean;
}

export default function ResultPage() {
  const loc = useLocation();
  const st = (loc.state ?? {}) as ResultState;
  if (!st.writing && !st.result) return <Navigate to="/" replace />;

  return (
    <div className="wrap">
      <div className="card result">
        <h1>Đã nộp bài ✅</h1>
        {st.auto && <p className="warn-text">Bài được tự nộp do hết giờ.</p>}
        <p className="muted">{st.name}{st.topic ? ` · ${st.topic}` : ""}</p>

        {st.writing ? (
          <p className="big-note">
            Bài viết đã được lưu. <strong>Giáo viên sẽ chấm tay</strong> (4 tiêu chí IELTS) và phản hồi sau.<br />
            Bạn có thể xem điểm &amp; tiến bộ ở mục <Link className="link" to="/progress">Xem tiến bộ</Link>.
          </p>
        ) : st.result ? (
          <div className="score-box">
            <div className="score-main">{st.result.score}<span className="muted"> / {st.result.max_score}</span></div>
            {st.result.band !== null && <div className="band">Band: <strong>{st.result.band}</strong></div>}
          </div>
        ) : null}

        <Link className="btn" to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
