import type { ReactNode } from "react";
import { fmtTime } from "../lib/utils";

interface ExamBarProps {
  title: ReactNode;
  secondsLeft: number | null;
  violations: number;
  maxViolations: number;
  warning: string | null;
  progressItems: ReactNode[];
}

interface ExamSubmitPanelProps {
  meta: ReactNode;
  submitting: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  submittingLabel?: string;
}

interface ExamStartCardProps {
  eyebrow: string;
  title: string;
  metaItems: Array<{ value: ReactNode; label: string }>;
  rules: ReactNode[];
  buttonLabel: string;
  onStart: () => void;
}

export function ExamBar({ title, secondsLeft, violations, maxViolations, warning, progressItems }: ExamBarProps) {
  return (
    <>
      <div className="exam-bar">
        <div>{title}</div>
        <div className="exam-bar-right">
          {violations > 0 && (
            <span className="viol">
              Vi phạm: {violations}/{maxViolations}
            </span>
          )}
          <span className={`timer ${secondsLeft !== null && secondsLeft < 60 ? "danger" : ""}`}>
            ⏱ {secondsLeft !== null ? fmtTime(secondsLeft) : "--:--"}
          </span>
        </div>
      </div>
      {warning && <div className="warn-banner">{warning}</div>}
      <div className="exam-progress-strip">
        {progressItems.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </>
  );
}

export function ExamSubmitPanel({
  meta,
  submitting,
  onSubmit,
  submitLabel = "Nộp bài",
  submittingLabel = "Đang nộp…",
}: ExamSubmitPanelProps) {
  return (
    <div className="exam-submit-panel">
      <span className="muted small">{meta}</span>
      <button className="btn primary big" disabled={submitting} onClick={onSubmit}>
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}

export function ExamStartCard({ eyebrow, title, metaItems, rules, buttonLabel, onStart }: ExamStartCardProps) {
  return (
    <div className="wrap exam-start-wrap">
      <div className="card exam-start-card">
        <span className="eyebrow dark">{eyebrow}</span>
        <h1>{title}</h1>
        <div className="exam-start-meta">
          {metaItems.map((m, i) => (
            <span key={i}>
              <b>{m.value}</b> {m.label}
            </span>
          ))}
        </div>
        <ul className="steps exam-start-steps">
          {rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <button className="btn primary big exam-start-button" onClick={onStart}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
