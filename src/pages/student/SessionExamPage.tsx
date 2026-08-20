// Làm bài trong BUỔI THI (exit/mock). Hỗ trợ cả trắc nghiệm và viết.
// Chống gian lận siết: TỰ NỘP khi số vi phạm ≥ ngưỡng buổi thi (nếu đặt).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getTest, submitSession } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useCountdownTimer } from "../../lib/useCountdownTimer";
import { loadStudentIdentity } from "../../lib/studentSession";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { isAnswered, formatError, countWords } from "../../lib/utils";
import { ErrorBox, Spinner } from "../../components/common";
import { ExamBar, ExamSubmitPanel } from "../../components/ExamLayout";
import { QuestionView } from "./ExamPage";
import type { AnswerMap, PublicTest, Skill } from "../../lib/types";

interface St {
  name?: string;
  email?: string;
  testId?: string;
  skill?: Skill;
  studentCode?: string | null;
  studentMode?: string;
  sessionName?: string;
  maxViolations?: number;
  closeAt?: string | null;
  serverNow?: string | null;
}

export default function SessionExamPage() {
  const { sessionId = "" } = useParams();
  const nav = useNavigate();
  const savedIdentity = loadStudentIdentity();
  const locState = useLocation().state;
  const meta: St = useMemo(() => {
    const rm = (locState ?? {}) as St;
    return {
      ...rm,
      name: rm.name ?? savedIdentity?.name,
      email: rm.email ?? savedIdentity?.email,
      studentCode: rm.studentCode ?? savedIdentity?.code ?? null,
      studentMode: rm.studentMode ?? savedIdentity?.mode,
    };
  }, [locState, savedIdentity]);

  const data = useAsync<PublicTest>(() => getTest(meta.testId ?? ""), [meta.testId]);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);
  const isWriting = meta.skill === "writing";
  const maxViol = meta.maxViolations ?? 0;
  const stopAtViolations = maxViol > 0 ? maxViol : MAX_ALLOWED_VIOLATIONS;
  const serverOffsetMs = useMemo(() => {
    if (!meta.serverNow) return 0;
    const serverNowMs = new Date(meta.serverNow).getTime();
    return Number.isFinite(serverNowMs) ? serverNowMs - Date.now() : 0;
  }, [meta.serverNow]);

  const wordCount = useMemo(() => countWords(essay), [essay]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting) return;
      if (reason === "manual" && data.data) {
        const missing = isWriting ? 0 : data.data.questions.filter((q) => !isAnswered(answers[q.id])).length;
        if (missing > 0 && !confirm(`Bạn còn ${missing} câu chưa trả lời. Vẫn nộp bài?`)) return;
        if (
          isWriting &&
          data.data.test.min_words > 0 &&
          wordCount < data.data.test.min_words &&
          !confirm(`Bài chưa đủ ${data.data.test.min_words} từ. Vẫn nộp bài?`)
        )
          return;
      }
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const res = await submitSession({
          sessionId,
          name: meta.name ?? "",
          email: meta.email ?? "",
          answers: isWriting ? {} : answers,
          essay: isWriting ? essay : null,
          violations: ac.violations,
          log: ac.log,
          startedAt: startedAtRef.current,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", {
          state: {
            session: res,
            name: meta.name,
            topic: meta.sessionName,
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
    [submitting, data.data, isWriting, answers, wordCount, sessionId, meta, essay, ac.violations, ac.log, nav],
  );

  const timer = useCountdownTimer(() => void doSubmit("timeout"));
  const secondsLeft = timer.secondsLeft;

  useEffect(() => {
    if (!meta.name || !meta.email || !meta.testId || meta.studentMode !== "student" || !meta.studentCode)
      nav("/exam-room", { replace: true });
  }, [meta.name, meta.email, meta.studentCode, meta.studentMode, meta.testId, nav]);

  useEffect(() => {
    if (started && ac.violations >= stopAtViolations) void doSubmit("violations");
  }, [started, stopAtViolations, ac.violations, doSubmit]);

  if (!meta.testId) return null;
  if (data.loading)
    return (
      <div className="wrap">
        <Spinner />
      </div>
    );
  if (data.error)
    return (
      <div className="wrap">
        <ErrorBox msg={data.error} />
      </div>
    );
  if (!data.data) return null;
  const { test, passages, questions } = data.data;
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;

  if (!started) {
    return (
      <div className="wrap exam-start-wrap">
        <div className="card exam-start-card">
          <span className="eyebrow dark">Exam room</span>
          <h1>{meta.sessionName}</h1>
          <div className="exam-start-meta">
            <span>
              <b>{test.time_limit_min}′</b> thời gian
            </span>
            <span>
              <b>{isWriting ? test.min_words || 0 : questions.length}</b> {isWriting ? "từ tối thiểu" : "câu hỏi"}
            </span>
            <span>
              <b>{stopAtViolations}</b> lần vi phạm tối đa
            </span>
          </div>
          <ul className="steps exam-start-steps">
            <li>
              Chế độ <strong>toàn màn hình</strong>, ghi nhật ký vi phạm.{" "}
              <strong>Tự dừng khi vi phạm ≥ {stopAtViolations} lần.</strong>
            </li>
            {!ac.fullscreenSupported && (
              <li>Thiết bị này không hỗ trợ toàn màn hình; bài vẫn chạy và hệ thống ghi nhận rời tab/mất focus.</li>
            )}
            <li>Chỉ được nộp theo quy định của buổi thi.</li>
          </ul>
          <button
            className="btn primary big exam-start-button"
            onClick={async () => {
              await ac.enterFullscreen();
              const serverNowMs = Date.now() + serverOffsetMs;
              startedAtRef.current = new Date(serverNowMs).toISOString();
              const durationDeadlineMs = serverNowMs + test.time_limit_min * 60_000;
              const closeMs = meta.closeAt ? new Date(meta.closeAt).getTime() : Number.POSITIVE_INFINITY;
              const nextDeadlineMs = Math.min(
                durationDeadlineMs,
                Number.isFinite(closeMs) ? closeMs : Number.POSITIVE_INFINITY,
              );
              timer.startDeadline(nextDeadlineMs, serverOffsetMs);
              setStarted(true);
            }}
          >
            Bắt đầu thi
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
            <strong>{meta.sessionName}</strong> <span className="muted">— {meta.name}</span>
          </>
        }
        secondsLeft={secondsLeft}
        violations={ac.violations}
        maxViolations={stopAtViolations}
        warning={ac.warning}
        progressItems={[
          isWriting ? (
            <>
              <strong>{wordCount}</strong>
              {test.min_words ? `/${test.min_words}` : ""} từ
            </>
          ) : (
            <>
              <strong>{answeredCount}</strong>/{questions.length} câu đã làm
            </>
          ),
          <>{passages.length} tư liệu</>,
          <>
            {ac.violations}/{stopAtViolations} vi phạm
          </>,
        ]}
      />

      {passages.map((p) => (
        <div className="card passage exam-material-card" key={p.id}>
          {p.kind === "audio" && p.media_url && (
            <audio
              controls
              controlsList="nodownload"
              preload="metadata"
              src={p.media_url}
              style={{ width: "100%" }}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
          {p.kind === "reading" && p.body && <div className="passage-body">{p.body}</div>}
          {p.media_url && p.kind === "reading" && <img src={p.media_url} alt="" style={{ maxWidth: "100%" }} />}
        </div>
      ))}

      {isWriting ? (
        <div className="card exam-workspace-card">
          {test.prompt && (
            <div className="passage-body" style={{ marginBottom: 12 }}>
              <strong>Đề bài: </strong>
              {test.prompt}
            </div>
          )}
          <textarea
            className="essay"
            rows={18}
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="Viết bài của bạn…"
          />
          <div className="muted wc">
            Số từ: <strong>{wordCount}</strong>
            {test.min_words ? ` / tối thiểu ${test.min_words}` : ""}
          </div>
        </div>
      ) : (
        questions.map((q, i) => (
          <QuestionView
            key={q.id}
            index={i + 1}
            q={q}
            value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))
      )}

      {submitErr && <ErrorBox msg={submitErr} />}
      {isWriting && test.min_words > 0 && wordCount < test.min_words && (
        <p className="warn-text">Bài chưa đạt tối thiểu {test.min_words} từ — vẫn có thể nộp nhưng nên viết thêm.</p>
      )}
      <ExamSubmitPanel
        meta={
          isWriting ? (
            <>
              Số từ hiện tại: {wordCount}
              {test.min_words ? `/${test.min_words}` : ""}.
            </>
          ) : (
            <>
              Đã làm {answeredCount}/{questions.length} câu.
            </>
          )
        }
        submitting={submitting}
        onSubmit={() => doSubmit("manual")}
      />
    </div>
  );
}
