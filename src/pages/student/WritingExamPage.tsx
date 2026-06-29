// Trang viết bài: bốc ngẫu nhiên 1 đề trong chủ đề, hiển thị đề bài, đếm giờ +
// khóa chống gian lận, học sinh viết essay rồi nộp (rpc_submit_writing → chờ GV chấm).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { pickPrompt, submitWriting } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { ErrorBox, Spinner } from "../../components/common";
import type { PickedPrompt } from "../../lib/types";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

export default function WritingExamPage() {
  const { topicId = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const meta = (loc.state ?? {}) as { name?: string; email?: string };

  const data = useAsync<PickedPrompt>(() => pickPrompt(topicId), [topicId]);
  const [started, setStarted] = useState(false);
  const [essay, setEssay] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");
  const ac = useAntiCheat(started);

  useEffect(() => {
    if (!meta.name || !meta.email) nav("/", { replace: true });
  }, [meta.name, meta.email, nav]);

  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting || !data.data) return;
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
          state: { writing: true, name: meta.name, topic: data.data.topic_name, auto: reason !== "manual", stoppedForViolations: reason === "violations" },
          replace: true,
        });
      } catch (e) {
        setSubmitErr(e instanceof Error ? e.message : String(e));
        setSubmitting(false);
      }
    },
    [submitting, data.data, meta, essay, ac.violations, ac.log, nav]
  );

  useEffect(() => {
    if (!started || secondsLeft === null) return;
    if (secondsLeft <= 0) { void doSubmit("timeout"); return; }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [started, secondsLeft, doSubmit]);

  useEffect(() => {
    if (started && ac.violations >= MAX_ALLOWED_VIOLATIONS) void doSubmit("violations");
  }, [started, ac.violations, doSubmit]);

  if (data.loading) return <div className="wrap"><Spinner label="Đang bốc đề…" /></div>;
  if (data.error) return <div className="wrap"><ErrorBox msg={data.error} /></div>;
  if (!data.data) return null;
  const p = data.data;

  if (!started) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>{p.topic_name}</h1>
          <ul className="steps">
            <li>Thời gian: <strong>{p.time_limit_min} phút</strong> · tối thiểu <strong>{p.min_words} từ</strong></li>
            <li>Bài chạy ở chế độ <strong>toàn màn hình</strong>; rời tab/sao chép/dán đều bị <strong>ghi nhận</strong>.</li>
            <li>Nếu vi phạm <strong>từ {MAX_ALLOWED_VIOLATIONS} lần</strong>, hệ thống sẽ <strong>dừng bài ngay</strong>.</li>
            <li>Hết giờ hệ thống <strong>tự nộp</strong>. Bài sẽ do <strong>giáo viên chấm tay</strong>.</li>
          </ul>
          <button
            className="btn primary"
            onClick={async () => {
              await ac.enterFullscreen();
              startedAtRef.current = new Date().toISOString();
              setSecondsLeft(p.time_limit_min * 60);
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
      <div className="exam-bar">
        <div><strong>{p.topic_name}</strong> <span className="muted">— {meta.name}</span></div>
        <div className="exam-bar-right">
          {ac.violations > 0 && <span className="viol">Vi phạm: {ac.violations}/{MAX_ALLOWED_VIOLATIONS}</span>}
          <span className={`timer ${secondsLeft !== null && secondsLeft < 60 ? "danger" : ""}`}>
            ⏱ {secondsLeft !== null ? fmt(secondsLeft) : "--:--"}
          </span>
        </div>
      </div>

      {ac.warning && <div className="warn-banner">{ac.warning}</div>}

      <div className="card passage">
        <div className="muted small">ĐỀ BÀI</div>
        <div className="passage-body">{p.prompt}</div>
      </div>

      <div className="card">
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
      <button className="btn primary big" disabled={submitting} onClick={() => doSubmit("manual")}>
        {submitting ? "Đang nộp…" : "Nộp bài"}
      </button>
    </div>
  );
}
