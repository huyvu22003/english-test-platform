// Màn đầu của học sinh: nhập tên + email, chọn Placement / Đọc-Nghe / Writing.
// Đọc-Nghe dùng lại rpc_list_exams + ExamPage để chấm trắc nghiệm ở server, không lộ đáp án.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listExams, listPlacements, listWritingTopics, studentByCode } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { isConfigured } from "../../lib/supabase";
import { ErrorBox, SkillBadge, Spinner, skillLabel } from "../../components/common";
import Logo from "../../components/Logo";
import type { ExamListItem, PlacementItem, WritingTopic } from "../../lib/types";

const INTENSIVE_TOPIC_NAME = "HỌC TĂNG CƯỜNG 2026";

function normalizeVi(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isLegacyIntensiveName(name: string) {
  const n = normalizeVi(name);
  return n === normalizeVi(INTENSIVE_TOPIC_NAME) || (n.includes("hoc tang cuong") && n.includes("2026"));
}

function isIntensiveTopic(topic: { topic_name: string; topic_category?: string | null }) {
  return topic.topic_category === "intensive_2026" || isLegacyIntensiveName(topic.topic_name);
}

export default function StudentHome() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [selectedIntensiveTopicId, setSelectedIntensiveTopicId] = useState("");
  const [selectedIntensiveTestId, setSelectedIntensiveTestId] = useState("");
  const [intensiveTouched, setIntensiveTouched] = useState(false);
  const topics = useAsync<WritingTopic[]>(listWritingTopics, []);
  const placements = useAsync<PlacementItem[]>(listPlacements, []);
  const exams = useAsync<ExamListItem[]>(listExams, []);

  const writingTopics = useMemo(() => topics.data ?? [], [topics.data]);
  const normalWritingTopics = useMemo(
    () => writingTopics.filter((t) => !isIntensiveTopic(t)),
    [writingTopics]
  );
  const intensiveTopics = useMemo(
    () => writingTopics.filter((t) => isIntensiveTopic(t)),
    [writingTopics]
  );
  const practiceExams = useMemo(
    () => (exams.data ?? []).filter((e) => e.skill === "reading" || e.skill === "listening"),
    [exams.data]
  );
  const intensiveExamTopics = useMemo(
    () => (exams.data ?? []).filter((e) => e.skill === "writing" && isIntensiveTopic(e)),
    [exams.data]
  );
  const selectedIntensiveExamTopic = intensiveExamTopics.find((t) => t.topic_id === selectedIntensiveTopicId) ?? intensiveExamTopics[0];
  const totalIntensiveTests = intensiveExamTopics.reduce((sum, topic) => sum + topic.tests.length, 0);
  const totalPracticeTests = practiceExams.reduce((sum, topic) => sum + topic.tests.length, 0);
  const totalWritingPrompts = normalWritingTopics.reduce((sum, topic) => sum + topic.num_prompts, 0);
  const firstPlacement = placements.data?.[0];

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

  function startIntensive() {
    setTouched(true);
    setIntensiveTouched(true);
    if (!ready || !selectedIntensiveExamTopic || !selectedIntensiveTestId) return;
    nav(`/writing/${selectedIntensiveExamTopic.topic_id}?test=${selectedIntensiveTestId}`, {
      state: { name: name.trim(), email: email.trim() },
    });
  }

  function startPractice(testId: string) {
    setTouched(true);
    if (!ready) return;
    nav(`/exam/${testId}`, { state: { name: name.trim(), email: email.trim() } });
  }

  return (
    <div className="wrap student-shell">
      <header className="hero student-hero">
        <div className="hero-top">
          <Logo height={52} light />
          <span className="hero-links">
            <Link className="link" to="/exam-room">Vào phòng thi</Link>
            <Link className="link" to="/progress">Xem tiến bộ</Link>
            <Link className="link" to="/admin/login">Giáo viên →</Link>
          </span>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Assessment Platform · CEFR / IELTS</span>
            <h1>Đánh giá năng lực tiếng Anh rõ ràng, hiện đại và theo dõi được tiến bộ.</h1>
            <p className="tagline">
              Làm bài xếp lớp, luyện Đọc/Nghe, viết IELTS và xem hành trình tiến bộ — tất cả trong một nền tảng dành cho học viên IELTS Ms. Trà My.
            </p>
            <div className="hero-cta">
              {firstPlacement && (
                <button className="btn primary hero-btn" onClick={() => startPlacement(firstPlacement.test_id)}>
                  🎯 Làm bài xếp lớp
                </button>
              )}
              <Link className="btn hero-btn ghost-light" to="/exam-room">🔐 Vào phòng thi</Link>
            </div>
          </div>
          <div className="hero-stats" aria-label="Tổng quan nền tảng">
            <div className="mini-stat"><strong>{placements.data?.length ?? 0}</strong><span>bài xếp lớp</span></div>
            <div className="mini-stat"><strong>{totalPracticeTests}</strong><span>đề Đọc/Nghe</span></div>
            <div className="mini-stat"><strong>{totalWritingPrompts}</strong><span>đề Writing</span></div>
            <div className="mini-stat"><strong>{totalIntensiveTests}</strong><span>đề tăng cường</span></div>
          </div>
        </div>
      </header>

      {!isConfigured && (
        <ErrorBox msg="Chưa cấu hình Supabase (.env). Xem docs/SETUP.md để kết nối database." />
      )}

      <section className="identity-card">
        <div className="identity-copy">
          <span className="eyebrow dark">Bước 1</span>
          <h2>Nhận diện học viên</h2>
          <p className="muted">Nhập mã học viên hoặc điền tên/email để hệ thống lưu kết quả và vẽ tiến bộ theo thời gian.</p>
        </div>
        <div className="identity-form">
          <div className="row-form code-login premium-code">
            <input placeholder="Có mã học viên? Nhập tại đây…" value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loginByCode()} />
            <button className="btn small" disabled={codeBusy} onClick={loginByCode}>
              {codeBusy ? "…" : "Nhận diện"}
            </button>
          </div>
          {codeMsg && <p className="muted small code-msg">{codeMsg}</p>}
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
      </section>

      <section className="quick-guide-grid" aria-label="Hướng dẫn sử dụng nhanh">
        <article className="guide-card guide-student">
          <div className="guide-icon">🎓</div>
          <div>
            <span className="eyebrow dark">Dành cho học sinh</span>
            <h3>Làm đúng bài cần làm</h3>
            <ol>
              <li>Nhập mã học viên hoặc tên/email.</li>
              <li>Chọn xếp lớp, Đọc/Nghe hoặc Writing.</li>
              <li>Nộp bài và xem kết quả/tiến bộ khi được mở.</li>
            </ol>
          </div>
        </article>
        <article className="guide-card guide-teacher">
          <div className="guide-icon">👩‍🏫</div>
          <div>
            <span className="eyebrow dark">Dành cho giáo viên</span>
            <h3>Quản lý từ khu vực riêng</h3>
            <ol>
              <li>Đăng nhập để tạo chủ đề, đề thi và media.</li>
              <li>Dùng mã thi cho buổi kiểm tra chính thức.</li>
              <li>Chấm Writing và theo dõi điểm yếu của lớp.</li>
            </ol>
          </div>
        </article>
      </section>

      <div className="section-head">
        <div>
          <span className="eyebrow dark">Bước 2</span>
          <h2>Chọn hành trình học tập</h2>
        </div>
        <span className="muted small">Xếp lớp · luyện tập · theo dõi tiến bộ</span>
      </div>

      {placements.data && placements.data.length > 0 && (
        <section className="learning-block placement-block">
          <div className="skill-card skill-card-placement">
            <div className="skill-icon">🎯</div>
            <div>
              <span className="eyebrow">Placement</span>
              <h3>Kiểm tra xếp lớp</h3>
              <p>Tự chấm ra CEFR, giúp giáo viên định hướng lớp phù hợp.</p>
            </div>
          </div>
          <div className="learning-list">
            {placements.data.map((p) => (
              <div className="premium-test-row" key={p.test_id}>
                <div>
                  <strong>{p.title}</strong> <SkillBadge skill={p.skill} />
                  <span className="meta-line">{p.num_q} câu · {p.time_limit_min} phút</span>
                </div>
                <button className="btn primary" onClick={() => startPlacement(p.test_id)}>Làm bài</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {exams.loading && <Spinner label="Đang tải đề Đọc/Nghe…" />}
      {exams.error && <ErrorBox msg={exams.error} />}
      {practiceExams.length > 0 && (
        <section className="learning-block">
          <div className="skill-card skill-card-listening">
            <div className="skill-icon">🎧</div>
            <div>
              <span className="eyebrow">Practice</span>
              <h3>Luyện Đọc &amp; Nghe</h3>
              <p>Làm đề trắc nghiệm, hệ thống chấm điểm ở server và trả band tham khảo.</p>
            </div>
          </div>
          <div className="learning-list">
            {practiceExams.map((topic) => (
              <div className="practice-topic" key={topic.topic_id}>
                <div className="practice-topic-head">
                  <strong>{topic.topic_name}</strong>
                  <span><SkillBadge skill={topic.skill} /> <span className="muted small">{skillLabel(topic.skill)}</span></span>
                </div>
                {topic.tests.map((test) => (
                  <div className="premium-test-row compact" key={test.id}>
                    <div>
                      <strong>{test.title || `Đề ${test.version_label}`}</strong>
                      <span className="meta-line">Bản {test.version_label} · {test.time_limit_min} phút</span>
                    </div>
                    <button className="btn primary" onClick={() => startPractice(test.id)}>Làm bài</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {(intensiveTopics.length > 0 || intensiveExamTopics.length > 0) && (
        <section className="learning-block intensive-block">
          <div className="skill-card skill-card-intensive">
            <div className="skill-icon">🚀</div>
            <div>
              <span className="eyebrow">2026</span>
              <h3>Học tăng cường 2026</h3>
              <p>Học sinh được chọn đúng đề cần làm. Mục chọn đề là bắt buộc, không bốc ngẫu nhiên.</p>
            </div>
          </div>
          <div className="learning-list">
            {exams.loading && <Spinner label="Đang tải đề tăng cường…" />}
            {exams.error && <ErrorBox msg={exams.error} />}
            {intensiveExamTopics.length > 1 && (
              <label className="field">
                <span>Chọn topic tăng cường</span>
                <select
                  value={selectedIntensiveTopicId || intensiveExamTopics[0]?.topic_id || ""}
                  onChange={(e) => {
                    setSelectedIntensiveTopicId(e.target.value);
                    setSelectedIntensiveTestId("");
                    setIntensiveTouched(false);
                  }}
                >
                  {intensiveExamTopics.map((topic) => (
                    <option key={topic.topic_id} value={topic.topic_id}>{topic.topic_name}</option>
                  ))}
                </select>
              </label>
            )}
            {selectedIntensiveExamTopic && (
              <div className="practice-topic intensive-picker">
                <div className="practice-topic-head">
                  <strong>{selectedIntensiveExamTopic.topic_name}</strong>
                  <span className="muted small">{selectedIntensiveExamTopic.tests.length} đề · bắt buộc chọn</span>
                </div>
                <label className="field">
                  <span>Chọn đề</span>
                  <select
                    value={selectedIntensiveTestId}
                    onChange={(e) => setSelectedIntensiveTestId(e.target.value)}
                  >
                    <option value="">— Chọn đề tăng cường —</option>
                    {selectedIntensiveExamTopic.tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.title || `Đề ${test.version_label}`} · {test.time_limit_min} phút
                      </option>
                    ))}
                  </select>
                </label>
                {intensiveTouched && !selectedIntensiveTestId && (
                  <p className="warn-text">Vui lòng chọn đề trước khi bắt đầu Học tăng cường 2026.</p>
                )}
                <button className="btn primary" onClick={startIntensive}>Làm đề đã chọn</button>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="learning-block writing-block">
        <div className="skill-card skill-card-writing">
          <div className="skill-icon">✍️</div>
          <div>
            <span className="eyebrow">Writing</span>
            <h3>Chủ đề luyện viết</h3>
            <p>Bốc đề ngẫu nhiên theo chủ đề, giáo viên chấm tay theo 4 tiêu chí IELTS.</p>
          </div>
        </div>
        <div className="learning-list">
          {topics.loading && <Spinner />}
          {topics.error && <ErrorBox msg={topics.error} />}
          {topics.data && normalWritingTopics.length === 0 && (
            <div className="empty-state">Hiện chưa có chủ đề Writing nào được mở.</div>
          )}
          <div className="topic-grid premium-topic-grid">
            {normalWritingTopics.map((t) => (
              <button className="topic-pick premium-topic-card" key={t.topic_id} onClick={() => start(t.topic_id)}>
                <span className="topic-spark">✦</span>
                <strong>{t.topic_name}</strong>
                <span className="muted small">{t.num_prompts} đề · bốc ngẫu nhiên</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
