// Màn đầu của học sinh: nhập tên + email, chọn CHỦ ĐỀ Writing đang mở → vào viết
// (hệ bốc ngẫu nhiên 1 đề trong chủ đề). Có lối vào xem tiến bộ.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listPlacements, listWritingTopics, studentByCode } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { isConfigured } from "../../lib/supabase";
import { ErrorBox, SkillBadge, Spinner } from "../../components/common";
import type { PlacementItem, WritingTopic } from "../../lib/types";

export default function StudentHome() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const topics = useAsync<WritingTopic[]>(listWritingTopics, []);
  const placements = useAsync<PlacementItem[]>(listPlacements, []);

  const ready = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  function startPlacement(testId: string) {
    setTouched(true);
    if (!ready) return;
    nav(`/placement/${testId}`, { state: { name: name.trim(), email: email.trim() } });
  }

  async function loginByCode() {
    if (!code.trim()) return;
    setCodeBusy(true); setCodeMsg(null);
    try {
      const s = await studentByCode(code.trim());
      if (!s) { setCodeMsg("Không tìm thấy mã học viên này."); return; }
      setName(s.full_name);
      if (s.email) setEmail(s.email);
      setCodeMsg(`Xin chào ${s.full_name}${s.class_name ? ` · ${s.class_name}` : ""}!`);
    } catch (e) {
      setCodeMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setCodeBusy(false);
    }
  }

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
        <div className="row-form code-login">
          <input placeholder="Có mã học viên? Nhập tại đây…" value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loginByCode()} />
          <button className="btn small" disabled={codeBusy} onClick={loginByCode}>
            {codeBusy ? "…" : "Nhận diện"}
          </button>
          {codeMsg && <span className="muted small">{codeMsg}</span>}
        </div>
        <div className="or-line"><span>hoặc nhập thủ công</span></div>
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

      {placements.data && placements.data.length > 0 && (
        <>
          <h2 className="section">Kiểm tra xếp lớp (tự chấm → CEFR)</h2>
          <div className="exam-list">
            {placements.data.map((p) => (
              <div className="card test-row" key={p.test_id}>
                <div>
                  <strong>{p.title}</strong> <SkillBadge skill={p.skill} />
                  <span className="muted"> · {p.num_q} câu · {p.time_limit_min}′</span>
                </div>
                <button className="btn primary" onClick={() => startPlacement(p.test_id)}>Làm bài</button>
              </div>
            ))}
          </div>
        </>
      )}

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
