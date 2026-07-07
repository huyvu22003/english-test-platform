// Các mảnh giao diện dùng lại: spinner, hộp lỗi, badge kỹ năng.
import type { ReactNode } from "react";
import type { Skill } from "../lib/types";

export function Spinner({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  return <div className="errbox">⚠️ {msg}</div>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state rich">
      <div>
        <strong>{title}</strong>
        {body && <p>{body}</p>}
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

const SKILL_LABEL: Record<Skill, string> = {
  writing: "Viết",
  reading: "Đọc",
  listening: "Nghe",
  use_of_english: "Use of English",
};

export function SkillBadge({ skill }: { skill: Skill }) {
  return <span className={`pill skill-${skill}`}>{SKILL_LABEL[skill]}</span>;
}

export function skillLabel(skill: Skill): string {
  return SKILL_LABEL[skill];
}
