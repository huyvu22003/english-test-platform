// Màn kết quả sau khi nộp. Dữ liệu lấy từ state điều hướng (rpc_submit trả về),
// không đọc lại bảng submissions (RLS chặn anon) — tránh lộ dữ liệu.
import { Link, Navigate, useLocation } from "react-router-dom";
import type { Skill, SubmitResult } from "../../lib/types";

interface ResultState {
  result?: SubmitResult;
  name?: string;
  topic?: string;
  skill?: Skill;
  auto?: boolean;
}

export default function ResultPage() {
  const loc = useLocation();
  const st = (loc.state ?? {}) as ResultState;
  if (!st.result) return <Navigate to="/" replace />;

  const { result } = st;
  const isWriting = st.skill === "writing";

  return (
    <div className="wrap">
      <div className="card result">
        <h1>Đã nộp bài ✅</h1>
        {st.auto && <p className="warn-text">Bài được tự nộp do hết giờ.</p>}
        <p className="muted">
          {st.name}{st.topic ? ` · ${st.topic}` : ""}
        </p>

        {isWriting ? (
          <p className="big-note">
            Bài Viết đã được lưu. Giáo viên sẽ chấm và phản hồi sau.
          </p>
        ) : (
          <div className="score-box">
            <div className="score-main">
              {result.score}
              <span className="muted"> / {result.max_score}</span>
            </div>
            {result.percent !== null && (
              <div className="muted">Đúng {result.percent}%</div>
            )}
            {result.band !== null && (
              <div className="band">Band ước tính: <strong>{result.band}</strong></div>
            )}
          </div>
        )}

        <Link className="btn" to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
