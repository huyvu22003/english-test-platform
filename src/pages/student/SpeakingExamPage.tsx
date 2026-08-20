import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getServerNow, getSpeakingUploadUrl, pickSpeakingPrompt, submitSpeaking } from "../../lib/api";
import { uploadSpeakingAudio } from "../../lib/storage";
import { useAsync } from "../../lib/useAsync";
import { useCountdownTimer } from "../../lib/useCountdownTimer";
import { loadStudentIdentity } from "../../lib/studentSession";
import { MAX_ALLOWED_VIOLATIONS, useAntiCheat } from "../../lib/antiCheat";
import { formatError, fmtTime } from "../../lib/utils";
import { ErrorBox, Spinner } from "../../components/common";
import { ExamBar } from "../../components/ExamLayout";
import type { PickedPrompt } from "../../lib/types";

type RecState = "idle" | "recording" | "paused" | "done";

export default function SpeakingExamPage() {
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
  const meta = useMemo(
    () => ({
      name: routeMeta.name ?? savedIdentity?.name,
      email: routeMeta.email ?? savedIdentity?.email,
      studentCode: routeMeta.studentCode ?? savedIdentity?.code ?? null,
      studentMode: routeMeta.studentMode ?? savedIdentity?.mode,
    }),
    [routeMeta.name, routeMeta.email, routeMeta.studentCode, routeMeta.studentMode, savedIdentity],
  );

  const data = useAsync<PickedPrompt>(() => pickSpeakingPrompt(topicId), [topicId]);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const startedAtRef = useRef("");
  const ac = useAntiCheat(started);

  const [recState, setRecState] = useState<RecState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recDuration, setRecDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const recTimerRef = useRef<number | undefined>(undefined);
  const questionAudioRef = useRef<HTMLAudioElement>(null);
  const [questionPlaying, setQuestionPlaying] = useState(false);

  useEffect(() => {
    if (!meta.name || !meta.email || meta.studentMode !== "student" || !meta.studentCode) nav("/", { replace: true });
  }, [meta.name, meta.email, meta.studentCode, meta.studentMode, nav]);

  const doSubmit = useCallback(
    async (reason: "manual" | "timeout" | "violations") => {
      if (submitting || !data.data) return;
      if (!audioBlob) {
        if (reason === "manual") {
          setSubmitErr("Chưa có bản ghi âm. Hãy thu âm trước khi nộp bài.");
          return;
        }
        return;
      }
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const mime = audioBlob.type || "audio/webm";
        const { path, token } = await getSpeakingUploadUrl(mime, audioBlob.size);
        await uploadSpeakingAudio(audioBlob, path, token);
        await submitSpeaking({
          testId: data.data.test_id,
          name: meta.name ?? "",
          email: meta.email ?? "",
          audioPath: path,
          audioMime: mime,
          audioDurationSec: recDuration,
          violations: ac.violations,
          log: ac.log,
          startedAt: startedAtRef.current,
        });
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        nav("/result", {
          state: {
            speaking: true,
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
    [submitting, data.data, audioBlob, meta, recDuration, ac.violations, ac.log, nav],
  );

  const timer = useCountdownTimer(() => void doSubmit("timeout"));
  const secondsLeft = timer.secondsLeft;

  useEffect(() => {
    if (started && ac.violations >= MAX_ALLOWED_VIOLATIONS) void doSubmit("violations");
  }, [started, ac.violations, doSubmit]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/wav"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        setRecState("done");
        window.clearInterval(recTimerRef.current);
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      recStartRef.current = Date.now();
      setRecDuration(0);
      setRecState("recording");
      recTimerRef.current = window.setInterval(() => {
        setRecDuration(Math.floor((Date.now() - recStartRef.current) / 1000));
      }, 500);
    } catch {
      setMicError("Không thể truy cập microphone. Hãy cho phép trình duyệt sử dụng mic.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    window.clearInterval(recTimerRef.current);
    setRecDuration(Math.floor((Date.now() - recStartRef.current) / 1000));
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecDuration(0);
    setRecState("idle");
  }

  if (data.loading)
    return (
      <div className="wrap">
        <Spinner label="Đang bốc đề Speaking…" />
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
          <span className="eyebrow dark">Speaking task</span>
          <h1>{p.topic_name}</h1>
          <div className="exam-start-meta">
            <span>
              <b>{p.time_limit_min}′</b> thời gian
            </span>
            <span>
              <b>{MAX_ALLOWED_VIOLATIONS}</b> lần vi phạm tối đa
            </span>
          </div>
          <ul className="steps exam-start-steps">
            <li>Đọc đề bài, bấm ghi âm và trả lời bằng giọng nói.</li>
            <li>
              Bài chạy ở chế độ <strong>toàn màn hình</strong>; rời tab đều bị <strong>ghi nhận</strong>.
            </li>
            {!ac.fullscreenSupported && (
              <li>Thiết bị này không hỗ trợ toàn màn hình; hệ thống vẫn ghi nhận rời tab/mất focus.</li>
            )}
            <li>
              Nếu vi phạm <strong>từ {MAX_ALLOWED_VIOLATIONS} lần</strong>, hệ thống sẽ <strong>dừng bài ngay</strong>.
            </li>
            <li>
              Hết giờ hệ thống <strong>tự nộp</strong>. Bài sẽ do <strong>AI chấm tự động</strong>.
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

  const questionAudio = p.passages.find((ps) => ps.kind === "audio" && ps.media_url)?.media_url ?? null;
  const questionText = (p.prompt ?? p.title ?? "").replace(/<[^>]+>/g, "").trim();

  function toggleQuestionAudio() {
    const el = questionAudioRef.current;
    if (!el) return;
    if (el.paused) {
      el.currentTime = 0;
      void el.play();
    } else {
      el.pause();
    }
  }

  return (
    <div className="exam-shell speaking-exam">
      <ExamBar
        title={<>{p.topic_name} · Speaking</>}
        secondsLeft={secondsLeft}
        violations={ac.violations}
        maxViolations={MAX_ALLOWED_VIOLATIONS}
        warning={ac.warning}
        progressItems={[
          <span key="rec" className={`speaking-rec-status ${recState}`}>
            {recState === "recording"
              ? `Đang ghi âm… ${fmtTime(recDuration)}`
              : recState === "done"
                ? `Đã thu ${fmtTime(recDuration)}`
                : "Chưa ghi âm"}
          </span>,
        ]}
      />

      <div className="speaking-stage">
        <div className="speaking-card">
          <div className="speaking-question">
            <button
              type="button"
              className={`speaking-audio-btn ${questionPlaying ? "playing" : ""}`}
              onClick={toggleQuestionAudio}
              disabled={!questionAudio}
              aria-label={questionAudio ? "Nghe câu hỏi" : "Câu hỏi này không có audio"}
              title={questionAudio ? "Nghe câu hỏi" : "Câu hỏi này không có audio"}
            >
              <SpeakerIcon />
            </button>
            <p className="speaking-question-text">{questionText || "(Chưa có nội dung câu hỏi)"}</p>
          </div>
          {questionAudio && (
            <audio
              ref={questionAudioRef}
              src={questionAudio}
              preload="auto"
              hidden
              onPlay={() => setQuestionPlaying(true)}
              onPause={() => setQuestionPlaying(false)}
              onEnded={() => setQuestionPlaying(false)}
            />
          )}

          <div className="speaking-recorder-zone">
            {micError && <p className="warn-text">{micError}</p>}

            {recState === "idle" && (
              <button className="btn primary big speaking-rec-btn" onClick={startRecording}>
                <MicIcon /> Bắt đầu ghi âm
              </button>
            )}

            {recState === "recording" && (
              <div className="speaking-rec-live">
                <div className="recording-indicator">
                  <span className="rec-dot" />
                  <span>Đang ghi âm… {fmtTime(recDuration)}</span>
                </div>
                <button className="btn danger big speaking-rec-btn" onClick={stopRecording}>
                  ⏹ Dừng ghi âm
                </button>
              </div>
            )}

            {recState === "done" && (
              <div className="speaking-rec-done">
                {audioUrl && <audio controls src={audioUrl} className="audio-player speaking-playback" />}
                <p className="muted small">Thời lượng bài nói: {fmtTime(recDuration)}</p>
                <div className="speaking-done-actions">
                  <button className="btn ghost" onClick={resetRecording} disabled={submitting}>
                    Thu lại
                  </button>
                  <button className="btn primary big" onClick={() => void doSubmit("manual")} disabled={submitting}>
                    {submitting ? "Đang tải lên & nộp…" : "Nộp bài nói"}
                  </button>
                </div>
              </div>
            )}

            {submitErr && <ErrorBox msg={submitErr} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
