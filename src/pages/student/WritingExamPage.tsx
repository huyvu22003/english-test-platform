// Trang viết bài: bốc ngẫu nhiên 1 đề trong chủ đề hoặc nhận đề đã chọn (?test=)
// cho luồng Học tăng cường, hiển thị đề bài, đếm giờ + khóa chống gian lận.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getServerNow, pickPrompt, submitWriting } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useCountdownTimer } from "../../lib/useCountdownTimer";
import { loadStudentIdentity } from "../../lib/studentSession";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { formatError, countWords } from "../../lib/utils";
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
    placement?: boolean;
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
  const selectedTestId = new URLSearchParams(loc.search).get("test");

  const data = useAsync<PickedPrompt>(() => pickPrompt(topicId, selectedTestId), [topicId, selectedTestId]);
  const [started, setStarted] = useState(false);
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);

  const wordCount = useMemo(() => countWords(essay), [essay]);

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
            placementWriting: routeMeta.placement === true,
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
    [submitting, data.data, wordCount, meta, essay, ac.violations, ac.log, nav, routeMeta.placement],
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
            {!ac.fullscreenSupported && (
              <li>Thiết bị này không hỗ trợ toàn màn hình; bài vẫn chạy và hệ thống ghi nhận rời tab/mất focus.</li>
            )}
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
              startedAtRef.current = await getServerNow();
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
    <div className="wrap exam writing-exam">
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
          <>{p.passages.length} tư liệu</>,
          <>
            {ac.violations}/{MAX_ALLOWED_VIOLATIONS} vi phạm
          </>,
        ]}
      />

      <div className="writing-split-workspace">
        <section className="writing-material-pane" aria-label="Đề bài và tư liệu">
          <div className="card passage exam-material-card">
            <div className="muted small">ĐỀ BÀI</div>
            {p.prompt && <div className="passage-body">{p.prompt}</div>}
          </div>

          {p.passages.map((passage) => (
            <div className="card passage exam-material-card" key={passage.id}>
              {passage.kind === "audio" && passage.media_url && (
                <audio
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  src={passage.media_url}
                  style={{ width: "100%" }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
              {passage.kind === "reading" && passage.body && <div className="passage-body">{passage.body}</div>}
              {passage.kind === "reading" && passage.media_url && (
                <img src={passage.media_url} alt="Tư liệu đề bài" style={{ maxWidth: "100%", borderRadius: 8 }} />
              )}
            </div>
          ))}
        </section>

        <section className="writing-answer-pane" aria-label="Bài làm">
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
        </section>
      </div>
    </div>
  );
}
