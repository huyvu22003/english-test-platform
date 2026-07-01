// Trang làm bài: đếm giờ + khóa chống gian lận; render bài Viết (essay) hoặc
// trắc nghiệm (single/multi/tfng/fill); nộp qua rpc_submit (chấm ở server).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getTest, submitExam } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { ErrorBox, Spinner } from "../../components/common";
import type { AnswerMap, PublicQuestion, PublicTest } from "../../lib/types";

const TFNG_OPTIONS: { value: string; label: string }[] = [
  { value: "true", label: "TRUE / YES" },
  { value: "false", label: "FALSE / NO" },
  { value: "notgiven", label: "NOT GIVEN" },
];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isAnswered(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

export default function ExamPage() {
  const { testId = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const meta = (loc.state ?? {}) as { name?: string; email?: string };

  const data = useAsync<PublicTest>(() => getTest(testId), [testId]);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [essay, setEssay] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef<string>("");

  const ac = useAntiCheat(started);
  const isWriting = data.data?.topic.skill === "writing";
  const wordCount = useMemo(
    () => essay.trim().split(/\s+/).filter(Boolean).length,
    [essay]
  );

  // Không có thông tin học sinh -> quay lại màn nhập.
  useEffect(() => {
    if (!meta.name || !meta.email) nav("/", { replace: true });
  }, [meta.name, meta.email, nav]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting) return;
      if (reason === "manual" && data.data) {
        const missing = isWriting ? 0 : data.data.questions.filter((q) => !isAnswered(answers[q.id])).length;
        if (missing > 0 && !confirm(`Bạn còn ${missing} câu chưa trả lời. Vẫn nộp bài?`)) return;
        if (isWriting && data.data.test.min_words > 0 && wordCount < data.data.test.min_words && !confirm(`Bài chưa đủ ${data.data.test.min_words} từ. Vẫn nộp bài?`)) return;
      }
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const res = await submitExam({
          testId,
          name: meta.name ?? "",
          email: meta.email ?? "",
          answers,
          violations: ac.violations,
          log: ac.log,
          startedAt: startedAtRef.current,
          essay: isWriting ? essay : null,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", {
          state: {
            result: res,
            name: meta.name,
            topic: data.data?.topic.name,
            skill: data.data?.topic.skill,
            auto: reason !== "manual",
            stoppedForViolations: reason === "violations",
          },
          replace: true,
        });
      } catch (e) {
        setSubmitErr(e instanceof Error ? e.message : String(e));
        setSubmitting(false);
      }
    },
    [submitting, data.data, isWriting, answers, wordCount, testId, meta, ac.violations, ac.log, essay, nav]
  );

  // Đồng hồ đếm ngược — hết giờ tự nộp.
  useEffect(() => {
    if (!started || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void doSubmit("timeout");
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [started, secondsLeft, doSubmit]);

  useEffect(() => {
    if (started && ac.violations >= MAX_ALLOWED_VIOLATIONS) void doSubmit("violations");
  }, [started, ac.violations, doSubmit]);

  if (data.loading) return <div className="wrap"><Spinner /></div>;
  if (data.error) return <div className="wrap"><ErrorBox msg={data.error} /></div>;
  if (!data.data) return null;

  const { test, topic, passages, questions } = data.data;

  // Màn hướng dẫn + bắt đầu (cần cử chỉ người dùng để vào fullscreen).
  if (!started) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>{topic.name} — Đề {test.version_label}</h1>
          {test.title && <p className="muted">{test.title}</p>}
          <ul className="steps">
            <li>Thời gian: <strong>{test.time_limit_min} phút</strong>{isWriting && test.min_words ? ` · tối thiểu ${test.min_words} từ` : ""}</li>
            <li>Bài thi chạy ở chế độ <strong>toàn màn hình</strong>. Rời tab, thoát fullscreen, sao chép/dán… đều bị <strong>ghi nhận vi phạm</strong>.</li>
            <li>Nếu vi phạm <strong>từ {MAX_ALLOWED_VIOLATIONS} lần</strong>, hệ thống sẽ <strong>dừng bài ngay</strong>.</li>
            <li>Hết giờ hệ thống <strong>tự nộp</strong>.</li>
          </ul>
          <button
            className="btn primary"
            onClick={async () => {
              await ac.enterFullscreen();
              startedAtRef.current = new Date().toISOString();
              setSecondsLeft(test.time_limit_min * 60);
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
        <div>
          <strong>{topic.name}</strong> · Đề {test.version_label}
          <span className="muted"> — {meta.name}</span>
        </div>
        <div className="exam-bar-right">
          {ac.violations > 0 && <span className="viol">Vi phạm: {ac.violations}/{MAX_ALLOWED_VIOLATIONS}</span>}
          <span className={`timer ${secondsLeft !== null && secondsLeft < 60 ? "danger" : ""}`}>
            ⏱ {secondsLeft !== null ? fmt(secondsLeft) : "--:--"}
          </span>
        </div>
      </div>

      {ac.warning && <div className="warn-banner">{ac.warning}</div>}

      {/* Tư liệu: đoạn đọc / audio */}
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
          {p.kind === "reading" && p.body && (
            <div className="passage-body">{p.body}</div>
          )}
          {p.media_url && p.kind === "reading" && (
            <img src={p.media_url} alt="" style={{ maxWidth: "100%" }} />
          )}
        </div>
      ))}

      {/* Bài Viết */}
      {isWriting && (
        <div className="card">
          <h3>Bài viết</h3>
          <textarea
            className="essay"
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="Viết bài của bạn ở đây…"
            rows={16}
          />
          <div className="muted wc">
            Số từ: <strong>{wordCount}</strong>
            {test.min_words ? ` / tối thiểu ${test.min_words}` : ""}
          </div>
        </div>
      )}

      {/* Trắc nghiệm */}
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
      {isWriting && test.min_words > 0 && wordCount < test.min_words && (
        <p className="warn-text">Bài chưa đạt tối thiểu {test.min_words} từ — vẫn có thể nộp nhưng nên viết thêm.</p>
      )}
      <button className="btn primary big" disabled={submitting} onClick={() => doSubmit("manual")}>
        {submitting ? "Đang nộp…" : "Nộp bài"}
      </button>
    </div>
  );
}

export function QuestionView({
  index, q, value, onChange,
}: {
  index: number;
  q: PublicQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  return (
    <div className="card question">
      <div className="q-prompt"><span className="q-no">{index}.</span> {q.prompt}</div>

      {q.qtype === "single" && (
        <div className="options">
          {q.options.map((o) => (
            <label className="opt" key={o}>
              <input type="radio" name={q.id} checked={value === o} onChange={() => onChange(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}

      {q.qtype === "multi" && (
        <div className="options">
          {q.options.map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(o);
            return (
              <label className="opt" key={o}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? arr.filter((x) => x !== o) : [...arr, o])
                  }
                />
                <span>{o}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.qtype === "tfng" && (
        <div className="options">
          {TFNG_OPTIONS.map((o) => (
            <label className="opt" key={o.value}>
              <input type="radio" name={q.id} checked={value === o.value} onChange={() => onChange(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}

      {q.qtype === "fill" && (
        <input
          className="fill"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập câu trả lời…"
        />
      )}
    </div>
  );
}
