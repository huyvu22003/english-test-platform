// Bài kiểm tra xếp lớp (placement): trắc nghiệm tự chấm ra CEFR theo ngưỡng.
// Tái dùng QuestionView (render câu hỏi) từ ExamPage; chấm ở server (rpc_submit_placement).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getServerNow, getTest, submitPlacement } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useCountdownTimer } from "../../lib/useCountdownTimer";
import { loadStudentIdentity } from "../../lib/studentSession";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { isAnswered, formatError } from "../../lib/utils";
import { ErrorBox, Spinner } from "../../components/common";
import { ExamBar, ExamSubmitPanel } from "../../components/ExamLayout";
import { QuestionView } from "./ExamPage";
import type { AnswerMap, PublicTest } from "../../lib/types";

export default function PlacementExamPage() {
  const { testId = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const savedIdentity = loadStudentIdentity();
  const routeMeta = (loc.state ?? {}) as {
    name?: string;
    email?: string;
    studentCode?: string | null;
    studentMode?: string;
  };
  const meta = useMemo(
    () => ({
      name: routeMeta.name ?? savedIdentity?.name,
      email: routeMeta.email ?? savedIdentity?.email,
      studentCode: routeMeta.studentCode ?? savedIdentity?.code ?? null,
      studentMode: routeMeta.studentMode ?? savedIdentity?.mode,
    }),
    [routeMeta.name, routeMeta.email, routeMeta.studentCode, routeMeta.studentMode, savedIdentity],
  );

  const data = useAsync<PublicTest>(() => getTest(testId), [testId]);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting) return;
      if (reason === "manual" && data.data) {
        const missing = data.data.questions.filter((q) => !isAnswered(answers[q.id])).length;
        if (missing > 0 && !confirm(`Bạn còn ${missing} câu chưa trả lời. Vẫn nộp bài?`)) return;
      }
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const res = await submitPlacement({
          testId,
          name: meta.name ?? "",
          email: meta.email ?? "",
          answers,
          violations: ac.violations,
          log: ac.log,
          startedAt: startedAtRef.current,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", {
          state: {
            placement: res,
            placementPart: true,
            name: meta.name,
            topic: data.data?.topic.name,
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
    [submitting, data.data, answers, testId, meta, ac.violations, ac.log, nav],
  );

  const timer = useCountdownTimer(() => void doSubmit("timeout"));
  const secondsLeft = timer.secondsLeft;

  useEffect(() => {
    if (!meta.name || !meta.email) nav("/", { replace: true });
  }, [meta.name, meta.email, nav]);

  useEffect(() => {
    if (started && ac.violations >= MAX_ALLOWED_VIOLATIONS) void doSubmit("violations");
  }, [started, ac.violations, doSubmit]);

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
  const { test, topic, passages, questions } = data.data;
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;

  if (!started) {
    return (
      <div className="wrap exam-start-wrap">
        <div className="card exam-start-card">
          <span className="eyebrow dark">Placement test</span>
          <h1>Kiểm tra xếp lớp</h1>
          <p className="muted">{test.title ?? topic.name}</p>
          <div className="exam-start-meta">
            <span>
              <b>{questions.length}</b> câu hỏi
            </span>
            <span>
              <b>{test.time_limit_min}′</b> thời gian
            </span>
            <span>
              <b>CEFR</b> tự chấm
            </span>
          </div>
          <ul className="steps exam-start-steps">
            <li>
              Hệ thống <strong>tự chấm</strong> và xếp <strong>trình độ CEFR</strong> ngay sau khi nộp.
            </li>
            <li>
              Chế độ toàn màn hình; rời tab/sao chép bị ghi nhận. Vi phạm{" "}
              <strong>từ {MAX_ALLOWED_VIOLATIONS} lần</strong> sẽ bị dừng bài.
            </li>
            {!ac.fullscreenSupported && (
              <li>Thiết bị này không hỗ trợ toàn màn hình; bài vẫn chạy và hệ thống ghi nhận rời tab/mất focus.</li>
            )}
          </ul>
          <button
            className="btn primary big exam-start-button"
            onClick={async () => {
              await ac.enterFullscreen();
              startedAtRef.current = await getServerNow();
              timer.start(test.time_limit_min * 60);
              setStarted(true);
            }}
          >
            Bắt đầu
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
            <strong>Xếp lớp</strong> <span className="muted">— {meta.name}</span>
          </>
        }
        secondsLeft={secondsLeft}
        violations={ac.violations}
        maxViolations={MAX_ALLOWED_VIOLATIONS}
        warning={ac.warning}
        progressItems={[
          <>
            <strong>{answeredCount}</strong>/{questions.length} câu đã làm
          </>,
          <>{passages.length} tư liệu</>,
          <>
            {ac.violations}/{MAX_ALLOWED_VIOLATIONS} vi phạm
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

      {questions.map((q, i) => (
        <QuestionView
          key={q.id}
          index={i + 1}
          q={q}
          value={answers[q.id]}
          onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
        />
      ))}

      {submitErr && <ErrorBox msg={submitErr} />}
      <ExamSubmitPanel
        meta={
          <>
            Đã làm {answeredCount}/{questions.length} câu.
          </>
        }
        submitting={submitting}
        onSubmit={() => doSubmit("manual")}
        submitLabel="Nộp & xem trình độ"
        submittingLabel="Đang chấm…"
      />
    </div>
  );
}
