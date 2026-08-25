export const SPEAKING_PART_OPTIONS = ["Part 1", "Part 2", "Part 3"] as const;
export const SPEAKING_PARTS = [...SPEAKING_PART_OPTIONS, "Khác"] as const;

export type SpeakingPartOption = (typeof SPEAKING_PART_OPTIONS)[number];
export type SpeakingPart = (typeof SPEAKING_PARTS)[number];

function normalizeVi(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function speakingPartOf(...parts: Array<string | null | undefined>): SpeakingPart {
  const text = normalizeVi(parts.filter(Boolean).join(" "));
  if (/\b(part|phan)\s*1\b/.test(text)) return "Part 1";
  if (/\b(part|phan)\s*2\b/.test(text)) return "Part 2";
  if (/\b(part|phan)\s*3\b/.test(text)) return "Part 3";
  return "Khác";
}

export function speakingTopicBaseName(name: string): string {
  return name.replace(/^\s*(speaking\s*)?(practice\s*)?(part|phan)\s*[123]\s*[-:–—]?\s*/i, "").trim();
}

export function formatSpeakingTopicName(part: SpeakingPartOption, name: string): string {
  const base = speakingTopicBaseName(name);
  return base ? `Speaking ${part} ${base}` : `Speaking ${part}`;
}
