// Trang viết bài: bốc ngẫu nhiên 1 đề trong chủ đề hoặc nhận đề đã chọn (?test=)
// cho luồng Học tăng cường, hiển thị đề bài, đếm giờ + khóa chống gian lận.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { pickPrompt, submitWriting } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useCountdownTimer } from "../../lib/useCountdownTimer";
import { loadStudentIdentity } from "../../lib/studentSession";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { formatError } from "../../lib/utils";
import { ErrorBox, Spinner } from "../../components/common";
import { ExamBar, ExamSubmitPanel } from "../../components/ExamLayout";
import type { PickedPrompt } from "../../lib/types";

export default function WritingExamPage() {
  const { topicId = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const savedIdentity = loadStudentIdentity();
  const routeMeta = (loc.state ?? {}) as {
    name?: string;
    email?: string;
    studentCode?: string | null;
    studentMode?: string;
  };
  const meta = {
    name: routeMeta.name ?? savedIdentity?.name,
    email: routeMeta.email ?? savedIdentity?.email,
    studentCode: routeMeta.studentCode ?? savedIdentity?.code ?? null,
    studentMode: routeMeta.studentMode ?? savedIdentity?.mode,
  };
  const selectedTestId = new URLSearchParams(loc.search).get("test");

  const data = useAsync<PickedPrompt>(() => pickPrompt(topicId, selectedTestId), [topicId, selectedTestId]);
  const [started, setStarted] = useState(false);
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);

  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting || !data.data) return;
      if (
        reason === "manual" &&
        data.data.min_words > 0 &&
        wordCount < data.data.min_words &&
        !confirm(`Bài chưa đủ ${data.data.min_words} từ. Vẫn nộp bài?`)
      )
        return;
      setSubmitting(true);
      setSubmitErr(null);
      try {
        await submitWriting({
          testId: data.data.test_id,
          name: meta.name ?? "",
          email: meta.email ?? "",
          essay,
          violations: ac.violations,
          log: ac.log,
          startedAt: startedAtRef.current,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", {
          state: {
            writing: true,
            name: meta.name,
            topic: data.data.topic_name,
            auto: reason !== "manual",
            stoppedForViolations: reason === "violations",
          },
          replace: true,
        });
      } catch (e) {
        setSubmitErr(formatError(e));
        setSubmitting(false);
      }
    },
    [submitting, data.data, wordCount, meta, essay, ac.violations, ac.log, nav],
  );

  const timer = useCountdownTimer(() => void doSubmit("timeout"));
  const secondsLeft = timer.secondsLeft;

  useEffect(() => {
    if (!meta.name || !meta.email || meta.studentMode !== "student" || !meta.studentCode) nav("/", { replace: true });
  }, [meta.name, meta.email, meta.studentCode, meta.studentMode, nav]);

  useEffect(() => {
    if (started && ac.violations >= MAX_ALLOWED_VIOLATIONS) void doSubmit("violations");
  }, [started, ac.violations, doSubmit]);

  if (data.loading)
    return (
      <div className="wrap">
        <Spinner label={selectedTestId ? "Đang mở đề đã chọn…" : "Đang bốc đề…"} />
      </div>
    );
  if (data.error)
    return (
      <div className="wrap">
        <ErrorBox msg={data.error} />
      </div>
    );
  if (!data.data) return null;
  const p = data.data;

  if (!started) {
    return (
      <div className="wrap exam-start-wrap">
        <div className="card exam-start-card">
          <span className="eyebrow dark">Writing task</span>
          <h1>{p.topic_name}</h1>
          <div className="exam-start-meta">
            <span>
              <b>{p.time_limit_min}′</b> thời gian
            </span>
            <span>
              <b>{p.min_words}</b> từ tối thiểu
            </span>
            <span>
              <b>{MAX_ALLOWED_VIOLATIONS}</b> lần vi phạm tối đa
            </span>
          </div>
          <ul className="steps exam-start-steps">
            <li>
              Bài chạy ở chế độ <strong>toàn màn hình</strong>; rời tab/sao chép/dán đều bị <strong>ghi nhận</strong>.
            </li>
            <li>
              Nếu vi phạm <strong>từ {MAX_ALLOWED_VIOLATIONS} lần</strong>, hệ thống sẽ <strong>dừng bài ngay</strong>.
            </li>
            <li>
              Hết giờ hệ thống <strong>tự nộp</strong>. Bài sẽ do <strong>giáo viên chấm tay</strong>.
            </li>
          </ul>
          <button
            className="btn primary big exam-start-button"
            onClick={async () => {
              await ac.enterFullscreen();
              startedAtRef.current = new Date().toISOString();
              timer.start(p.time_limit_min * 60);
              setStarted(true);
            }}
          >
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap exam">
      <ExamBar
        title={
          <>
            <strong>{p.topic_name}</strong> <span className="muted">— {meta.name}</span>
          </>
        }
        secondsLeft={secondsLeft}
        violations={ac.violations}
        maxViolations={MAX_ALLOWED_VIOLATIONS}
        warning={ac.warning}
        progressItems={[
          <>
            <strong>{wordCount}</strong>/{p.min_words} từ
          </>,
          <>
            {ac.violations}/{MAX_ALLOWED_VIOLATIONS} vi phạm
          </>,
        ]}
      />

      <div className="card passage exam-material-card">
        <div className="muted small">ĐỀ BÀI</div>
        <div className="passage-body">{p.prompt}</div>
      </div>

      <div className="card exam-workspace-card">
        <textarea
          className="essay"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="Viết bài của bạn ở đây…"
          rows={18}
        />
        <div className={`muted wc ${wordCount < p.min_words ? "" : "ok-text"}`}>
          Số từ: <strong>{wordCount}</strong> / tối thiểu {p.min_words}
        </div>
      </div>

      {submitErr && <ErrorBox msg={submitErr} />}
      {wordCount < p.min_words && (
        <p className="warn-text">Bài chưa đạt tối thiểu {p.min_words} từ — vẫn có thể nộp nhưng nên viết thêm.</p>
      )}
      <ExamSubmitPanel
        meta={
          <>
            Số từ hiện tại: {wordCount}/{p.min_words}.
          </>
        }
        submitting={submitting}
        onSubmit={() => doSubmit("manual")}
      />
    </div>
  );
}
