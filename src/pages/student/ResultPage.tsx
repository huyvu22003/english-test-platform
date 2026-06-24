// Màn sau khi nộp. Writing: chấm tay → "chờ chấm". Placement: tự chấm → CEFR + chi tiết.
import { Link, Navigate, useLocation } from "react-router-dom";
import type { PlacementResult, SessionSubmitResult, SubmitResult } from "../../lib/types";

interface ResultState {
  writing?: boolean;
  result?: SubmitResult;
  placement?: PlacementResult;
  session?: SessionSubmitResult;
  name?: string;
  topic?: string;
  auto?: boolean;
}

export default function ResultPage() {
  const loc = useLocation();
  const st = (loc.state ?? {}) as ResultState;
  if (!st.writing && !st.result && !st.placement && !st.session) return <Navigate to="/" replace />;

  return (
    <div className="wrap">
      <div className="card result">
        <h1>{st.placement ? "Kết quả xếp lớp 🎯" : "Đã nộp bài ✅"}</h1>
        {st.auto && <p className="warn-text">Bài được tự nộp (hết giờ hoặc vượt ngưỡng vi phạm).</p>}
        <p className="muted">{st.name}{st.topic ? ` · ${st.topic}` : ""}</p>

        {st.session ? (
          <SessionView res={st.session} />
        ) : st.placement ? (
          <PlacementView res={st.placement} />
        ) : st.writing ? (
          <p className="big-note">
            Bài viết đã được lưu. <strong>Giáo viên sẽ chấm tay</strong> (4 tiêu chí IELTS) và phản hồi sau.<br />
            Xem điểm &amp; tiến bộ ở mục <Link className="link" to="/progress">Xem tiến bộ</Link>.
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

function SessionView({ res }: { res: SessionSubmitResult }) {
  if (res.skill === "writing") {
    return <p className="big-note">Bài thi đã được lưu. <strong>Giáo viên sẽ chấm tay</strong> và phản hồi sau.</p>;
  }
  if (res.show_result && res.score != null) {
    return (
      <div className="score-box">
        <div className="score-main">{res.score}<span className="muted"> / {res.max_score}</span></div>
        {res.band != null && <div className="band">Band: <strong>{res.band}</strong></div>}
      </div>
    );
  }
  return <p className="big-note">Đã ghi nhận bài thi của bạn. Điểm sẽ được công bố theo quy định của buổi thi.</p>;
}

function PlacementView({ res }: { res: PlacementResult }) {
  return (
    <div>
      <div className="score-box">
        <div className="muted">Trình độ ước lượng</div>
        <div className="score-main">{res.cefr ?? "< A1"}</div>
        {!res.cefr && <p className="muted">Chưa đạt ngưỡng mức A1 — nên bắt đầu từ lớp nền tảng.</p>}
      </div>
      {res.detail.length > 0 && (
        <table className="table level-detail">
          <thead><tr><th>Mức</th><th>Đúng</th><th>Kết quả</th></tr></thead>
          <tbody>
            {res.detail.map((d) => (
              <tr key={d.cefr}>
                <td><strong>{d.cefr}</strong></td>
                <td>{d.correct}/{d.total}</td>
                <td>{d.passed ? <span className="ok-text">Đạt</span> : <span className="muted">Chưa đạt</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
