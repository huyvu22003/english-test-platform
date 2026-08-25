// Màn đầu của học sinh: nhập tên + email, chọn Placement / Đọc-Nghe / Writing.
// Đọc-Nghe dùng lại rpc_list_exams + ExamPage để chấm trắc nghiệm ở server, không lộ đáp án.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listExams, listPlacements, listWritingTopics, studentByCode } from "../../lib/api";
import {
  clearStudentIdentity,
  guestIdentity,
  identityFromStudentCode,
  isReadyIdentity,
  loadStudentIdentity,
  saveStudentIdentity,
  type StudentIdentity,
} from "../../lib/studentSession";
import { useAsync } from "../../lib/useAsync";
import { isConfigured } from "../../lib/supabase";
import { groupPlacementSuites } from "../../lib/placement";
import { ErrorBox, SkillBadge, Spinner, skillLabel } from "../../components/common";
import Logo from "../../components/Logo";
import HelpAssistant from "../../components/HelpAssistant";
import { STUDENT_GUIDE } from "../../lib/helpContent";
import type { ExamListItem, PlacementItem, Skill, WritingTopic } from "../../lib/types";

const INTENSIVE_TOPIC_NAME = "HỌC TĂNG CƯỜNG 2026";
const SPEAKING_PARTS = ["Part 1", "Part 2", "Part 3", "Khác"] as const;
type SpeakingPart = (typeof SPEAKING_PARTS)[number];

function normalizeVi(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLegacyIntensiveName(name: string) {
  const n = normalizeVi(name);
  return n === normalizeVi(INTENSIVE_TOPIC_NAME) || (n.includes("hoc tang cuong") && n.includes("2026"));
}

function isIntensiveTopic(topic: { topic_name: string; topic_category?: string | null }) {
  return topic.topic_category === "intensive_2026" || isLegacyIntensiveName(topic.topic_name);
}

function isPlacementTopic(topic: { topic_name: string; topic_category?: string | null }) {
  const n = normalizeVi(topic.topic_name);
  return topic.topic_category === "placement" || n.includes("placement") || n.includes("xep lop");
}

function speakingPartOf(...parts: Array<string | null | undefined>): SpeakingPart {
  const text = normalizeVi(parts.filter(Boolean).join(" "));
  if (/\b(part|phan)\s*1\b/.test(text)) return "Part 1";
  if (/\b(part|phan)\s*2\b/.test(text)) return "Part 2";
  if (/\b(part|phan)\s*3\b/.test(text)) return "Part 3";
  return "Khác";
}

export default function StudentHome() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const [accessToast, setAccessToast] = useState<{ id: number; message: string } | null>(null);
  const [selectedIntensiveTopicId, setSelectedIntensiveTopicId] = useState("");
  const [selectedIntensiveTestId, setSelectedIntensiveTestId] = useState("");
  const [intensiveTouched, setIntensiveTouched] = useState(false);
  const topics = useAsync<WritingTopic[]>(listWritingTopics, []);
  const placements = useAsync<PlacementItem[]>(listPlacements, []);
  const exams = useAsync<ExamListItem[]>(listExams, []);

  const writingTopics = useMemo(() => topics.data ?? [], [topics.data]);
  const normalWritingTopics = useMemo(
    () => writingTopics.filter((t) => !isIntensiveTopic(t) && !isPlacementTopic(t)),
    [writingTopics],
  );
  const intensiveTopics = useMemo(() => writingTopics.filter((t) => isIntensiveTopic(t)), [writingTopics]);
  const practiceExams = useMemo(
    () => (exams.data ?? []).filter((e) => (e.skill === "reading" || e.skill === "listening") && !isPlacementTopic(e)),
    [exams.data],
  );
  const intensiveExamTopics = useMemo(
    () => (exams.data ?? []).filter((e) => e.skill === "writing" && isIntensiveTopic(e)),
    [exams.data],
  );
  const selectedIntensiveExamTopic =
    intensiveExamTopics.find((t) => t.topic_id === selectedIntensiveTopicId) ?? intensiveExamTopics[0];
  const totalIntensiveTests = intensiveExamTopics.reduce((sum, topic) => sum + topic.tests.length, 0);
  const totalPracticeTests = practiceExams.reduce((sum, topic) => sum + topic.tests.length, 0);
  const totalWritingPrompts = normalWritingTopics.reduce((sum, topic) => sum + topic.num_prompts, 0);
  const speakingExamTopics = useMemo(
    () => (exams.data ?? []).filter((e) => e.skill === "speaking" && !isPlacementTopic(e)),
    [exams.data],
  );
  const speakingChoices = useMemo(
    () =>
      speakingExamTopics.flatMap((topic) =>
        topic.tests.map((test) => ({
          topicId: topic.topic_id,
          topicName: topic.topic_name,
          test,
          part: speakingPartOf(topic.topic_name, test.title, test.version_label),
        })),
      ),
    [speakingExamTopics],
  );
  const speakingGroups = useMemo(
    () =>
      SPEAKING_PARTS.map((part) => ({
        part,
        choices: speakingChoices.filter((choice) => choice.part === part),
      })).filter((group) => group.choices.length > 0),
    [speakingChoices],
  );
  const totalSpeakingPrompts = speakingChoices.length;
  const placementSuites = useMemo(() => groupPlacementSuites(placements.data ?? []), [placements.data]);

  useEffect(() => {
    const saved = loadStudentIdentity();
    if (!saved) return;
    setIdentity(saved);
    setName(saved.name);
    setEmail(saved.email);
    if (saved.code) setCode(saved.code);
    setCodeMsg(
      saved.mode === "student"
        ? `Đang dùng hồ sơ ${saved.name}${saved.className ? ` · ${saved.className}` : ""}.`
        : `Đang dùng chế độ khách: ${saved.name}.`,
    );
  }, []);

  const ready = isReadyIdentity({ name, email });
  const isStudent = identity?.mode === "student" && Boolean(identity.code);

  useEffect(() => {
    if (!accessToast) return;
    const timer = window.setTimeout(() => setAccessToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [accessToast]);

  function showAccessDenied(message: string) {
    setAccessMsg(message);
    setAccessToast({ id: Date.now(), message });
  }

  function setManualName(nextName: string) {
    setName(nextName);
    setIdentity((cur) => (cur ? { ...cur, name: nextName } : null));
  }

  function setManualEmail(nextEmail: string) {
    setEmail(nextEmail);
    setIdentity((cur) => (cur ? { ...cur, email: nextEmail } : null));
  }

  function routeState() {
    return {
      name: name.trim(),
      email: email.trim(),
      studentCode: identity?.code ?? null,
      studentMode: identity?.mode ?? "guest",
    };
  }

  function startPlacement(item: PlacementItem) {
    setTouched(true);
    setAccessMsg(null);
    if (!ready) return;
    if (item.skill === "writing" && !isStudent) {
      showAccessDenied("Bài Writing xếp lớp cần mã học viên để giáo viên chấm và gắn kết quả vào hồ sơ.");
      return;
    }
    saveStudentIdentity(identity ?? guestIdentity(name, email));
    if (item.skill === "writing") {
      nav(`/writing/${item.topic_id}?test=${item.test_id}`, {
        state: {
          ...routeState(),
          placement: true,
        },
      });
      return;
    }
    nav(`/placement/${item.test_id}`, {
      state: {
        ...routeState(),
        placement: true,
      },
    });
  }

  async function loginByCode() {
    if (!code.trim()) return;
    setCodeBusy(true);
    setCodeMsg(null);
    try {
      const s = await studentByCode(code.trim());
      if (!s) {
        setCodeMsg("Không tìm thấy mã học viên này.");
        return;
      }
      const nextIdentity = identityFromStudentCode(s, code);
      saveStudentIdentity(nextIdentity);
      setIdentity(nextIdentity);
      setName(s.full_name);
      if (s.email) setEmail(s.email);
      setCodeMsg(
        s.email
          ? `Xin chào ${s.full_name}${s.class_name ? ` · ${s.class_name}` : ""}!`
          : `Đã nhận diện ${s.full_name}, nhưng hồ sơ chưa có email. Vui lòng nhập email để làm bài.`,
      );
    } catch (e) {
      setCodeMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setCodeBusy(false);
    }
  }

  function start(topicId: string) {
    setTouched(true);
    setAccessMsg(null);
    if (!ready) return;
    if (!isStudent) {
      showAccessDenied("Chế độ khách chỉ được làm bài xếp lớp. Vui lòng đăng nhập bằng mã học viên để vào Writing.");
      return;
    }
    saveStudentIdentity(identity ?? guestIdentity(name, email));
    nav(`/writing/${topicId}`, { state: routeState() });
  }

  function startIntensive() {
    setTouched(true);
    setIntensiveTouched(true);
    setAccessMsg(null);
    if (!ready) return;
    if (!isStudent) {
      showAccessDenied(
        "Chế độ khách chỉ được làm bài xếp lớp. Vui lòng đăng nhập bằng mã học viên để vào Học tăng cường.",
      );
      return;
    }
    if (!selectedIntensiveExamTopic || !selectedIntensiveTestId) return;
    saveStudentIdentity(identity ?? guestIdentity(name, email));
    nav(`/writing/${selectedIntensiveExamTopic.topic_id}?test=${selectedIntensiveTestId}`, {
      state: routeState(),
    });
  }

  function startPractice(testId: string) {
    setTouched(true);
    setAccessMsg(null);
    if (!ready) return;
    if (!isStudent) {
      showAccessDenied("Chế độ khách chỉ được làm bài xếp lớp. Vui lòng đăng nhập bằng mã học viên để luyện Đọc/Nghe.");
      return;
    }
    saveStudentIdentity(identity ?? guestIdentity(name, email));
    nav(`/exam/${testId}`, { state: routeState() });
  }

  function startSpeaking(topicId: string, testId: string) {
    setTouched(true);
    setAccessMsg(null);
    if (!ready) return;
    if (!isStudent) {
      showAccessDenied("Chế độ khách chỉ được làm bài xếp lớp. Vui lòng đăng nhập bằng mã học viên để vào Speaking.");
      return;
    }
    saveStudentIdentity(identity ?? guestIdentity(name, email));
    nav(`/speaking/${topicId}?test=${testId}`, { state: routeState() });
  }

  function continueAsGuest() {
    setTouched(true);
    if (!ready) return;
    const nextIdentity = saveStudentIdentity(guestIdentity(name, email));
    setIdentity(nextIdentity);
    setCode("");
    setAccessMsg(null);
    setCodeMsg(`Đang dùng chế độ khách: ${nextIdentity.name}.`);
  }

  function logoutStudent() {
    clearStudentIdentity();
    setIdentity(null);
    setName("");
    setEmail("");
    setCode("");
    setCodeMsg(null);
  }

  return (
    <main id="main" className="wrap student-shell" tabIndex={-1}>
      {accessToast && (
        <div className="access-toast" role="status" aria-live="polite" key={accessToast.id}>
          <span className="access-toast-icon">!</span>
          <span>{accessToast.message}</span>
        </div>
      )}
      <header className="hero student-hero">
        <div className="hero-top">
          <Logo height={52} light />
          <span className="hero-links">
            <Link className="link" to="/exam-room">
              Vào phòng thi
            </Link>
            <Link className="link" to="/progress">
              Xem tiến bộ
            </Link>
            <Link className="link" to="/admin/login">
              Giáo viên →
            </Link>
          </span>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Assessment Platform · CEFR / IELTS</span>
            <h1>
              <span>IELTS Ms. TRÀ MY</span>
              <span>HỆ THỐNG ĐÁNH GIÁ NĂNG LỰC TIẾNG ANH VÀ THEO DÕI TIẾN BỘ</span>
            </h1>
            <p className="tagline">
              Làm bài xếp lớp, luyện Đọc/Nghe, viết IELTS và xem hành trình tiến bộ — tất cả trong một nền tảng dành cho
              học viên IELTS Ms. Trà My.
            </p>
            <div className="hero-cta">
              {placementSuites.length > 0 && (
                <a className="btn primary hero-btn" href="#placement-tests">
                  🎯 Chọn đề xếp lớp
                </a>
              )}
              <Link className="btn hero-btn ghost-light" to="/exam-room">
                🔐 Vào phòng thi
              </Link>
            </div>
          </div>
          <div className="hero-stats" aria-label="Tổng quan nền tảng">
            <div className="mini-stat">
              <strong>{placements.data?.length ?? 0}</strong>
              <span>bài xếp lớp</span>
            </div>
            <div className="mini-stat">
              <strong>{totalPracticeTests}</strong>
              <span>đề Đọc/Nghe</span>
            </div>
            <div className="mini-stat">
              <strong>{totalWritingPrompts}</strong>
              <span>đề Writing</span>
            </div>
            {totalSpeakingPrompts > 0 && (
              <div className="mini-stat">
                <strong>{totalSpeakingPrompts}</strong>
                <span>đề Speaking</span>
              </div>
            )}
            <div className="mini-stat">
              <strong>{totalIntensiveTests}</strong>
              <span>đề tăng cường</span>
            </div>
          </div>
        </div>
      </header>

      {!isConfigured && <ErrorBox msg="Chưa cấu hình Supabase (.env). Xem docs/SETUP.md để kết nối database." />}

      <section className="identity-card">
        <div className="identity-copy">
          <span className="eyebrow dark">Bước 1</span>
          <h2>Nhận diện học viên</h2>
          <p className="muted">
            Nhập mã học viên hoặc điền tên/email để hệ thống lưu kết quả và vẽ tiến bộ theo thời gian.
          </p>
        </div>
        <div className="identity-form">
          {identity && (
            <div className="student-session-card">
              <div>
                <strong>{identity.name}</strong>
                <p className="muted small">
                  {identity.mode === "student" ? `Mã HV ${identity.code ?? "—"}` : "Khách"}
                  {identity.className ? ` · ${identity.className}` : ""} · {identity.email}
                </p>
              </div>
              <button className="btn ghost small" type="button" onClick={logoutStudent}>
                Đổi người
              </button>
            </div>
          )}
          <div className="row-form code-login premium-code">
            <input
              placeholder="Có mã học viên? Nhập tại đây…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loginByCode()}
            />
            <button className="btn small" disabled={codeBusy} onClick={loginByCode}>
              {codeBusy ? "…" : "Nhận diện"}
            </button>
          </div>
          {codeMsg && <p className="muted small code-msg">{codeMsg}</p>}
          <div className="or-line">
            <span>hoặc nhập thủ công</span>
          </div>
          <div className="grid2">
            <label className="field">
              <span>Họ và tên</span>
              <input value={name} onChange={(e) => setManualName(e.target.value)} placeholder="Nguyễn Văn A" />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setManualEmail(e.target.value)} placeholder="email@example.com" />
            </label>
          </div>
          <button className="btn ghost" type="button" onClick={continueAsGuest}>
            Tiếp tục dạng khách
          </button>
          {touched && !ready && (
            <p className="warn-text">Vui lòng nhập đúng họ tên và email (email dùng để theo dõi tiến bộ).</p>
          )}
          {accessMsg && <p className="warn-text">{accessMsg}</p>}
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

      {placementSuites.length > 0 && (
        <section className="learning-block placement-block" id="placement-tests">
          <div className="skill-card skill-card-placement">
            <div className="skill-icon">🎯</div>
            <div>
              <span className="eyebrow">Placement</span>
              <h3>Kiểm tra xếp lớp đa kỹ năng</h3>
              <p>Làm lần lượt Reading, Listening và Writing trong cùng một bộ để giáo viên có đủ dữ liệu xếp lớp.</p>
            </div>
          </div>
          <div className="learning-list placement-suite-list">
            {placementSuites.map((suite) => (
              <div className="placement-suite-choice" key={suite.key}>
                <div className="placement-suite-head">
                  <div>
                    <strong>{suite.label}</strong>
                    <span className="meta-line">
                      {suite.itemCount} phần · {suite.totalMinutes} phút · {suite.totalQuestions} câu tự chấm
                    </span>
                  </div>
                  <span className={suite.isComplete ? "pill ok small" : "pill off small"}>
                    {suite.isComplete ? "Đủ 3 kỹ năng" : "Chưa đủ bộ"}
                  </span>
                </div>
                <div className="placement-suite-sections">
                  {suite.sections.map((section) => (
                    <div className="placement-skill-column" key={section.skill}>
                      <div className="placement-skill-title">
                        <SkillBadge skill={section.skill} />
                        <span className="muted small">{placementSkillHint(section.skill)}</span>
                      </div>
                      {section.items.map((p) => (
                        <div className="premium-test-row compact placement-test-row" key={p.test_id}>
                          <div>
                            <strong>{p.title}</strong>
                            <span className="meta-line">
                              {p.skill === "writing" ? "Bài viết chấm tay" : `${p.num_q} câu tự chấm`} ·{" "}
                              {p.time_limit_min} phút
                            </span>
                          </div>
                          <button className="btn primary" onClick={() => startPlacement(p)}>
                            Làm phần này
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                  {(["reading", "listening", "writing"] as Skill[])
                    .filter((skill) => !suite.sections.some((section) => section.skill === skill))
                    .map((skill) => (
                      <div className="placement-skill-column missing" key={skill}>
                        <div className="placement-skill-title">
                          <SkillBadge skill={skill} />
                          <span className="muted small">Chưa có đề trong bộ này</span>
                        </div>
                      </div>
                    ))}
                </div>
                {!suite.isComplete && (
                  <div className="placement-suite-warning">
                    Admin cần bổ sung đủ Reading, Listening và Writing để bộ đề đánh giá trọn vẹn.
                  </div>
                )}
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
                  <span>
                    <SkillBadge skill={topic.skill} /> <span className="muted small">{skillLabel(topic.skill)}</span>
                  </span>
                </div>
                {topic.tests.map((test) => (
                  <div className="premium-test-row compact" key={test.id}>
                    <div>
                      <strong>{test.title || `Đề ${test.version_label}`}</strong>
                      <span className="meta-line">
                        Bản {test.version_label} · {test.time_limit_min} phút
                      </span>
                    </div>
                    <button className="btn primary" onClick={() => startPractice(test.id)}>
                      Làm bài
                    </button>
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
                    <option key={topic.topic_id} value={topic.topic_id}>
                      {topic.topic_name}
                    </option>
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
                  <select value={selectedIntensiveTestId} onChange={(e) => setSelectedIntensiveTestId(e.target.value)}>
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
                <button className="btn primary" onClick={startIntensive}>
                  Làm đề đã chọn
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {speakingChoices.length > 0 && (
        <section className="learning-block speaking-block">
          <div className="skill-card skill-card-speaking">
            <div className="skill-icon">🎙</div>
            <div>
              <span className="eyebrow">Speaking</span>
              <h3>Chủ đề luyện nói</h3>
              <p>Học sinh chọn đề theo Part 1, Part 2 hoặc Part 3, ghi âm trả lời và nộp bài.</p>
            </div>
          </div>
          <div className="learning-list">
            {exams.loading && <Spinner label="Đang tải đề Speaking…" />}
            {exams.error && <ErrorBox msg={exams.error} />}
            {speakingGroups.map((group) => (
              <div className="practice-topic speaking-part-group" key={group.part}>
                <div className="practice-topic-head">
                  <strong>{group.part}</strong>
                  <span className="muted small">{group.choices.length} đề để chọn</span>
                </div>
                {group.choices.map((choice) => (
                  <div className="premium-test-row compact" key={choice.test.id}>
                    <div>
                      <strong>{choice.test.title || choice.topicName || `Đề ${choice.test.version_label}`}</strong>
                      <span className="meta-line">
                        {choice.topicName} · {choice.test.time_limit_min} phút
                      </span>
                    </div>
                    <button className="btn primary" onClick={() => startSpeaking(choice.topicId, choice.test.id)}>
                      Chọn đề
                    </button>
                  </div>
                ))}
              </div>
            ))}
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
      <HelpAssistant guide={STUDENT_GUIDE} />
    </main>
  );
}

function placementSkillHint(skill: Skill): string {
  if (skill === "writing") return "giáo viên chấm";
  if (skill === "listening") return "nghe hiểu";
  if (skill === "reading") return "đọc hiểu";
  return skillLabel(skill);
}
