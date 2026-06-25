// Làm bài trong BUỔI THI (exit/mock). Hỗ trợ cả trắc nghiệm và viết.
// Chống gian lận siết: TỰ NỘP khi số vi phạm ≥ ngưỡng buổi thi (nếu đặt).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getTest, submitSession } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useAntiCheat } from "../../lib/antiCheat";
import { ErrorBox, Spinner } from "../../components/common";
import { QuestionView } from "./ExamPage";
import type { AnswerMap, PublicTest, Skill } from "../../lib/types";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

interface St {
  name?: string; email?: string; testId?: string; skill?: Skill;
  sessionName?: string; maxViolations?: number;
}

export default function SessionExamPage() {
  const { sessionId = "" } = useParams();
  const nav = useNavigate();
  const meta = (useLocation().state ?? {}) as St;

  const data = useAsync<PublicTest>(() => getTest(meta.testId ?? ""), [meta.testId]);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [essay, setEssay] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);
  const isWriting = meta.skill === "writing";
  const maxViol = meta.maxViolations ?? 0;

  useEffect(() => {
    if (!meta.name || !meta.email || !meta.testId) nav("/exam-room", { replace: true });
  }, [meta.name, meta.email, meta.testId, nav]);

  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting) return;
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const res = await submitSession({
          sessionId, name: meta.name ?? "", email: meta.email ?? "",
          answers: isWriting ? {} : answers, essay: isWriting ? essay : null,
          violations: ac.violations, log: ac.log, startedAt: startedAtRef.current,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", { state: { session: res, name: meta.name, topic: meta.sessionName, auto: reason !== "manual" }, replace: true });
      } catch (e) {
        setSubmitErr(e instanceof Error ? e.message : String(e));
        setSubmitting(false);
      }
    },
    [submitting, sessionId, meta, answers, essay, isWriting, ac.violations, ac.log, nav]
  );

  // đồng hồ
  useEffect(() => {
    if (!started || secondsLeft === null) return;
    if (secondsLeft <= 0) { void doSubmit("timeout"); return; }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [started, secondsLeft, doSubmit]);

  // chống gian lận siết: tự nộp khi vượt ngưỡng vi phạm
  useEffect(() => {
    if (started && maxViol > 0 && ac.violations >= maxViol) void doSubmit("violations");
  }, [started, maxViol, ac.violations, doSubmit]);

  if (!meta.testId) return null;
  if (data.loading) return <div className="wrap"><Spinner /></div>;
  if (data.error) return <div className="wrap"><ErrorBox msg={data.error} /></div>;
  if (!data.data) return null;
  const { test, passages, questions } = data.data;

  if (!started) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>{meta.sessionName}</h1>
          <ul className="steps">
            <li>Thời gian: <strong>{test.time_limit_min} phút</strong>.</li>
            <li>Chế độ <strong>toàn màn hình</strong>, ghi nhật ký vi phạm. {maxViol > 0 && <strong>Tự nộp khi vi phạm ≥ {maxViol}.</strong>}</li>
            <li>Chỉ được nộp theo quy định của buổi thi.</li>
          </ul>
          <button className="btn primary" onClick={async () => {
            await ac.enterFullscreen();
            startedAtRef.current = new Date().toISOString();
            setSecondsLeft(test.time_limit_min * 60);
            setStarted(true);
          }}>Bắt đầu thi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap exam">
      <div className="exam-bar">
        <div><strong>{meta.sessionName}</strong> <span className="muted">— {meta.name}</span></div>
        <div className="exam-bar-right">
          {ac.violations > 0 && <span className="viol">Vi phạm: {ac.violations}{maxViol ? `/${maxViol}` : ""}</span>}
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

      {isWriting ? (
        <div className="card">
          {test.prompt && <div className="passage-body" style={{ marginBottom: 12 }}><strong>Đề bài: </strong>{test.prompt}</div>}
          <textarea className="essay" rows={18} value={essay} onChange={(e) => setEssay(e.target.value)} placeholder="Viết bài của bạn…" />
          <div className="muted wc">Số từ: <strong>{wordCount}</strong>{test.min_words ? ` / tối thiểu ${test.min_words}` : ""}</div>
        </div>
      ) : (
        questions.map((q, i) => (
          <QuestionView key={q.id} index={i + 1} q={q} value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))
      )}

      {submitErr && <ErrorBox msg={submitErr} />}
      <button className="btn primary big" disabled={submitting} onClick={() => doSubmit("manual")}>
        {submitting ? "Đang nộp…" : "Nộp bài"}
      </button>
    </div>
  );
}
