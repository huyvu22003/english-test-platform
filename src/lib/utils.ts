import type { Skill } from "./types";

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

export function isAnswered(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

export function formatError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const SKILL_LABELS: Record<Skill, string> = {
  writing: "Viết",
  reading: "Đọc",
  listening: "Nghe",
  use_of_english: "Use of English",
  speaking: "Nói",
};

export function skillLabel(skill: Skill | string): string {
  return SKILL_LABELS[skill as Skill] ?? skill;
}

export function skillLabelEn(skill: string | undefined): string {
  if (skill === "writing") return "Writing";
  if (skill === "reading") return "Reading";
  if (skill === "listening") return "Listening";
  if (skill === "use_of_english") return "Use of English";
  if (skill === "speaking") return "Speaking";
  return skill ?? "";
}
