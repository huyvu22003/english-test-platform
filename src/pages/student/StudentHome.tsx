// Màn đầu của học sinh: nhập tên + email, chọn chủ đề/đề đang mở rồi vào thi.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listExams } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { isConfigured } from "../../lib/supabase";
import { ErrorBox, SkillBadge, Spinner } from "../../components/common";
import type { ExamListItem } from "../../lib/types";

export default function StudentHome() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const exams = useAsync<ExamListItem[]>(listExams, []);

  const ready = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  function start(testId: string) {
    setTouched(true);
    if (!ready) return;
    nav(`/exam/${testId}`, { state: { name: name.trim(), email: email.trim() } });
  }

  return (
    <div className="wrap">
      <header className="topbar">
        <h1>English Test Platform</h1>
        <Link className="link" to="/admin/login">Giáo viên →</Link>
      </header>
      <p className="muted sub">Trung tâm IELTS Ms. Trà My — nhập thông tin rồi chọn bài thi.</p>

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
          <p className="warn-text">Vui lòng nhập đúng họ tên và email trước khi vào thi.</p>
        )}
      </div>

      <h2 className="section">Bài thi đang mở</h2>
      {exams.loading && <Spinner />}
      {exams.error && <ErrorBox msg={exams.error} />}
      {exams.data && exams.data.length === 0 && (
        <p className="muted">Hiện chưa có bài thi nào được mở.</p>
      )}
      <div className="exam-list">
        {exams.data?.map((t) => (
          <div className="card topic-card" key={t.topic_id}>
            <div className="topic-head">
              <strong>{t.topic_name}</strong>
              <SkillBadge skill={t.skill} />
            </div>
            <div className="test-rows">
              {t.tests.map((te) => (
                <div className="test-row" key={te.id}>
                  <div>
                    <span className="ver">Đề {te.version_label}</span>
                    {te.title && <span className="muted"> · {te.title}</span>}
                    <span className="muted"> · {te.time_limit_min}′</span>
                  </div>
                  <button className="btn" onClick={() => start(te.id)}>Vào thi</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
