// Các mảnh giao diện dùng lại: spinner, hộp lỗi, badge kỹ năng.
import type { Skill } from "../lib/types";

export function Spinner({ label = "Đang tải…" }: { label?: string }) {
  return <div className="muted" style={{ padding: 24 }}>{label}</div>;
}

export function ErrorBox({ msg }: { msg: string }) {
  return <div className="errbox">⚠️ {msg}</div>;
}

const SKILL_LABEL: Record<Skill, string> = {
  writing: "Viết",
  reading: "Đọc",
  listening: "Nghe",
};

export function SkillBadge({ skill }: { skill: Skill }) {
  return <span className={`pill skill-${skill}`}>{SKILL_LABEL[skill]}</span>;
}

export function skillLabel(skill: Skill): string {
  return SKILL_LABEL[skill];
}
