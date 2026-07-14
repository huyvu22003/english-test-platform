import type { Cefr, PlacementItem, PlacementSubmission, Skill } from "./types";
import { skillLabel } from "./utils";

export const PLACEMENT_SKILL_ORDER: Skill[] = ["reading", "listening", "writing", "use_of_english"];

export interface PlacementSuiteSection {
  skill: Skill;
  label: string;
  items: PlacementItem[];
}

export interface PlacementSuite {
  key: string;
  label: string;
  sections: PlacementSuiteSection[];
  itemCount: number;
  totalMinutes: number;
  totalQuestions: number;
  hasWriting: boolean;
  isComplete: boolean;
}

export interface PlacementStudentReport {
  key: string;
  studentName: string;
  studentEmail: string;
  latestAt: string;
  submissions: PlacementSubmission[];
  skills: Partial<Record<Skill, PlacementSubmission>>;
  completedSkills: number;
  recommendedLevel: string;
  statusLabel: string;
}

export function placementSuiteKey(item: Pick<PlacementItem, "version_label" | "title" | "topic_name">): string {
  const raw = item.version_label?.trim() || inferVersionFromText(item.title) || inferVersionFromText(item.topic_name ?? "");
  return raw ? raw.toUpperCase() : "default";
}

export function groupPlacementSuites(items: PlacementItem[]): PlacementSuite[] {
  const suites = new Map<string, PlacementSuite>();

  for (const item of items) {
    const key = placementSuiteKey(item);
    const label = key === "default" ? "Bộ xếp lớp mặc định" : `Bộ xếp lớp ${key}`;
    let suite = suites.get(key);
    if (!suite) {
      suite = {
        key,
        label,
        sections: [],
        itemCount: 0,
        totalMinutes: 0,
        totalQuestions: 0,
        hasWriting: false,
        isComplete: false,
      };
      suites.set(key, suite);
    }

    let section = suite.sections.find((s) => s.skill === item.skill);
    if (!section) {
      section = { skill: item.skill, label: skillLabel(item.skill), items: [] };
      suite.sections.push(section);
    }
    section.items.push(item);
    suite.itemCount += 1;
    suite.totalMinutes += item.time_limit_min || 0;
    suite.totalQuestions += item.num_q || 0;
    suite.hasWriting ||= item.skill === "writing";
  }

  return [...suites.values()]
    .map((suite) => ({
      ...suite,
      sections: suite.sections.sort((a, b) => skillOrder(a.skill) - skillOrder(b.skill)),
      isComplete: ["reading", "listening", "writing"].every((skill) =>
        suite.sections.some((section) => section.skill === skill),
      ),
    }))
    .sort((a, b) => suiteSortKey(a.key).localeCompare(suiteSortKey(b.key), "vi"));
}

export function isPlacementSubmission(s: PlacementSubmission): boolean {
  const topic = `${s.topic_name ?? ""} ${s.tests?.topics?.name ?? ""}`.toLowerCase();
  return (
    s.tests?.purpose === "placement" ||
    s.tests?.topics?.category === "placement" ||
    topic.includes("placement") ||
    topic.includes("xếp lớp") ||
    topic.includes("xep lop")
  );
}

export function skillOfPlacementSubmission(s: PlacementSubmission): Skill {
  if (s.tests?.topics?.skill) return s.tests.topics.skill;
  const topic = `${s.topic_name ?? ""} ${s.tests?.title ?? ""}`.toLowerCase();
  if (topic.includes("nghe") || topic.includes("listening")) return "listening";
  if (topic.includes("viết") || topic.includes("viet") || topic.includes("writing")) return "writing";
  if (topic.includes("use of english") || topic.includes("grammar")) return "use_of_english";
  return "reading";
}

export function placementReports(rows: PlacementSubmission[]): PlacementStudentReport[] {
  const grouped = new Map<string, PlacementSubmission[]>();
  rows.filter(isPlacementSubmission).forEach((row) => {
    const key = (row.student_email || row.student_name || row.id).trim().toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });

  return [...grouped.entries()]
    .map(([key, submissions]) => {
      const sorted = [...submissions].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
      );
      const skills: Partial<Record<Skill, PlacementSubmission>> = {};
      for (const row of sorted) {
        const skill = skillOfPlacementSubmission(row);
        if (!skills[skill]) skills[skill] = row;
      }
      const completedSkills = Object.keys(skills).length;
      const recommendedLevel = recommendPlacementLevel(skills);
      return {
        key,
        studentName: sorted[0]?.student_name || "Chưa rõ tên",
        studentEmail: sorted[0]?.student_email || "",
        latestAt: sorted[0]?.submitted_at ?? "",
        submissions: sorted,
        skills,
        completedSkills,
        recommendedLevel,
        statusLabel:
          completedSkills >= 3
            ? "Đủ dữ liệu xếp lớp"
            : completedSkills === 2
              ? "Thiếu 1 kỹ năng"
              : completedSkills === 1
                ? "Mới có 1 kỹ năng"
                : "Chưa có dữ liệu",
      };
    })
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

export function recommendPlacementLevel(skills: Partial<Record<Skill, PlacementSubmission>>): string {
  const cefrs = [skills.reading?.cefr, skills.listening?.cefr, skills.use_of_english?.cefr].filter(Boolean) as Cefr[];
  const writingBand = skills.writing?.overall_band ?? skills.writing?.band ?? null;
  const writingCefr = skills.writing?.cefr ?? (writingBand == null ? null : bandToPlacementCefr(writingBand));
  if (writingCefr) cefrs.push(writingCefr as Cefr);
  if (cefrs.length === 0) return "Cần làm thêm bài";

  const lowest = cefrs.reduce((min, cur) => (cefrRank(cur) < cefrRank(min) ? cur : min), cefrs[0]);
  if (lowest === "A1") return "Foundation / A1";
  if (lowest === "A2") return "A2";
  if (lowest === "B1") return "B1 / IELTS nền";
  if (lowest === "B2") return "B2 / IELTS 5.5-6.5";
  if (lowest === "C1") return "C1 / IELTS 7.0+";
  return "C2 / Advanced";
}

function inferVersionFromText(text?: string | null): string | null {
  if (!text) return null;
  const hit = text.match(/\b(?:bộ|bo|đề|de|version|ver)\s*([A-Z0-9]{1,3})\b/i);
  return hit?.[1] ?? null;
}

function skillOrder(skill: Skill): number {
  const idx = PLACEMENT_SKILL_ORDER.indexOf(skill);
  return idx === -1 ? 99 : idx;
}

function suiteSortKey(key: string): string {
  return key === "default" ? "ZZZ" : key.padStart(3, "0");
}

function cefrRank(cefr: Cefr): number {
  return ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(cefr);
}

function bandToPlacementCefr(band: number): Cefr {
  if (band >= 8) return "C2";
  if (band >= 7) return "C1";
  if (band >= 6) return "B2";
  if (band >= 5) return "B1";
  if (band >= 4) return "A2";
  return "A1";
}
