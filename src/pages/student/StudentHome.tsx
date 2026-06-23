// Màn đầu của học sinh: nhập tên + email, chọn CHỦ ĐỀ Writing đang mở → vào viết
// (hệ bốc ngẫu nhiên 1 đề trong chủ đề). Có lối vào xem tiến bộ.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listWritingTopics } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { isConfigured } from "../../lib/supabase";
import { ErrorBox, Spinner } from "../../components/common";
import type { WritingTopic } from "../../lib/types";

export default function StudentHome() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const topics = useAsync<WritingTopic[]>(listWritingTopics, []);

  const ready = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  function start(topicId: string) {
    setTouched(true);
    if (!ready) return;
    nav(`/writing/${topicId}`, { state: { name: name.trim(), email: email.trim() } });
  }

  return (
    <div className="wrap">
      <header className="topbar">
        <h1>English Test Platform</h1>
        <span className="row-form">
          <Link className="link" to="/progress">Xem tiến bộ</Link>
          <Link className="link" to="/admin/login">Giáo viên →</Link>
        </span>
      </header>
      <p className="muted sub">Trung tâm IELTS Ms. Trà My — luyện viết IELTS Writing Task 2. Nhập thông tin rồi chọn chủ đề.</p>

      {!isConfigured && (
        <ErrorBox msg="Chưa cấu hình Supabase (.env). Xem docs/SETUP.md để kết nối database." />
      )}

      <div className="card">
        <div className="grid2">
          <label className="field">
            <span>Họ và tên</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </label>
        </div>
        {touched && !ready && (
          <p className="warn-text">Vui lòng nhập đúng họ tên và email (email dùng để theo dõi tiến bộ).</p>
        )}
      </div>

      <h2 className="section">Chủ đề luyện viết</h2>
      {topics.loading && <Spinner />}
      {topics.error && <ErrorBox msg={topics.error} />}
      {topics.data && topics.data.length === 0 && (
        <p className="muted">Hiện chưa có chủ đề nào được mở.</p>
      )}
      <div className="topic-grid">
        {topics.data?.map((t) => (
          <button className="card topic-pick" key={t.topic_id} onClick={() => start(t.topic_id)}>
            <strong>{t.topic_name}</strong>
            <span className="muted small">{t.num_prompts} đề · bốc ngẫu nhiên</span>
          </button>
        ))}
      </div>
    </div>
  );
}
