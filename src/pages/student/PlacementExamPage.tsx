// Bài kiểm tra xếp lớp (placement): trắc nghiệm tự chấm ra CEFR theo ngưỡng.
// Tái dùng QuestionView (render câu hỏi) từ ExamPage; chấm ở server (rpc_submit_placement).
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getTest, submitPlacement } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useAntiCheat } from "../../lib/antiCheat";
import { ErrorBox, Spinner } from "../../components/common";
import { QuestionView } from "./ExamPage";
import type { AnswerMap, PublicTest } from "../../lib/types";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

export default function PlacementExamPage() {
  const { testId = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const meta = (loc.state ?? {}) as { name?: string; email?: string };

  const data = useAsync<PublicTest>(() => getTest(testId), [testId]);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);

  useEffect(() => {
    if (!meta.name || !meta.email) nav("/", { replace: true });
  }, [meta.name, meta.email, nav]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout") => {
      if (submitting) return;
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const res = await submitPlacement({
          testId, name: meta.name ?? "", email: meta.email ?? "",
          answers, violations: ac.violations, log: ac.log, startedAt: startedAtRef.current,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", {
          state: { placement: res, name: meta.name, topic: data.data?.topic.name, auto: reason === "timeout" },
          replace: true,
        });
      } catch (e) {
        setSubmitErr(e instanceof Error ? e.message : String(e));
        setSubmitting(false);
      }
    },
    [submitting, testId, meta, answers, ac.violations, ac.log, nav, data.data]
  );

  useEffect(() => {
    if (!started || secondsLeft === null) return;
    if (secondsLeft <= 0) { void doSubmit("timeout"); return; }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [started, secondsLeft, doSubmit]);

  if (data.loading) return <div className="wrap"><Spinner /></div>;
  if (data.error) return <div className="wrap"><ErrorBox msg={data.error} /></div>;
  if (!data.data) return null;
  const { test, topic, passages, questions } = data.data;

  if (!started) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>Kiểm tra xếp lớp</h1>
          <p className="muted">{test.title ?? topic.name}</p>
          <ul className="steps">
            <li>{questions.length} câu trắc nghiệm · {test.time_limit_min} phút.</li>
            <li>Hệ thống <strong>tự chấm</strong> và xếp <strong>trình độ CEFR</strong> ngay sau khi nộp.</li>
            <li>Chế độ toàn màn hình; rời tab/sao chép bị ghi nhận.</li>
          </ul>
          <button
            className="btn primary"
            onClick={async () => {
              await ac.enterFullscreen();
              startedAtRef.current = new Date().toISOString();
              setSecondsLeft(test.time_limit_min * 60);
              setStarted(true);
            }}
          >Bắt đầu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap exam">
      <div className="exam-bar">
        <div><strong>Xếp lớp</strong> <span className="muted">— {meta.name}</span></div>
        <div className="exam-bar-right">
          {ac.violations > 0 && <span className="viol">Vi phạm: {ac.violations}</span>}
          <span className={`timer ${secondsLeft !== null && secondsLeft < 60 ? "danger" : ""}`}>
            ⏱ {secondsLeft !== null ? fmt(secondsLeft) : "--:--"}
          </span>
        </div>
      </div>

      {ac.warning && <div className="warn-banner">{ac.warning}</div>}

      {passages.map((p) => (
        <div className="card passage" key={p.id}>
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
        </div>
      ))}

      {questions.map((q, i) => (
        <QuestionView key={q.id} index={i + 1} q={q} value={answers[q.id]}
          onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
      ))}

      {submitErr && <ErrorBox msg={submitErr} />}
      <button className="btn primary big" disabled={submitting} onClick={() => doSubmit("manual")}>
        {submitting ? "Đang chấm…" : "Nộp & xem trình độ"}
      </button>
    </div>
  );
}
