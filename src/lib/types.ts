// Kiểu dữ liệu dùng chung — phản ánh các bảng trong supabase/schema.sql.
// Giữ tối giản, chỉ những trường app dùng.

export type Skill = "writing" | "reading" | "listening" | "use_of_english";
export type QType = "single" | "multi" | "tfng" | "fill";
export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Topic {
  id: string;
  name: string;
  skill: Skill;
  category?: "regular" | "intensive_2026" | null;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Test {
  id: string;
  topic_id: string;
  version_label: string;
  title: string | null;
  prompt: string | null;          // đề bài Task 2 (writing)
  purpose: "placement" | "progress" | "exit";
  pass_threshold: number;         // ngưỡng đạt mỗi mức (placement)
  time_limit_min: number;
  min_words: number;
  active: boolean;
  created_at?: string;
}

export interface Passage {
  id: string;
  test_id: string;
  kind: "reading" | "audio";
  body: string | null;
  media_url: string | null;
  sort_order: number;
}

// Câu hỏi phía ADMIN (có đáp án `correct`).
export interface Question {
  id: string;
  test_id: string;
  passage_id: string | null;
  sort_order: number;
  qtype: QType;
  prompt: string;
  options: string[];
  correct: string | string[]; // theo GIÁ TRỊ lựa chọn (xem schema)
  points: number;
  cefr_level: Cefr | null;     // gắn mức cho placement
}

// Câu hỏi phía HỌC SINH (KHÔNG có `correct` — do rpc_get_test loại bỏ).
export interface PublicQuestion {
  id: string;
  passage_id: string | null;
  qtype: QType;
  prompt: string;
  options: string[];
  points: number;
}

export interface PublicTest {
  test: Test;
  topic: { name: string; skill: Skill };
  passages: Passage[];
  questions: PublicQuestion[];
}

export interface ExamListItem {
  topic_id: string;
  topic_name: string;
  topic_category?: "regular" | "intensive_2026" | null;
  skill: Skill;
  tests: {
    id: string;
    version_label: string;
    title: string | null;
    time_limit_min: number;
    min_words: number;
  }[];
}

export interface SubmitResult {
  submission_id: string;
  score: number;
  max_score: number;
  percent: number | null;
  band: number | null;
}

export interface WritingCorrection {
  id: string;
  original: string;
  corrected: string;
  note?: string;
  start?: number;
  end?: number;
}

export interface Submission {
  id: string;
  test_id: string | null;
  topic_name: string | null;
  student_name: string | null;
  student_email: string | null;
  answers: Record<string, unknown> | null;
  score: number | null;
  max_score: number | null;
  band: number | null;
  violations: number | null;
  violation_log: string | null;
  essay: string | null;
  started_at: string | null;
  submitted_at: string;
  // Phase A+B — chấm tay Writing
  status: "submitted" | "graded";
  student_id: string | null;
  score_tr: number | null;
  score_cc: number | null;
  score_lr: number | null;
  score_gra: number | null;
  overall_band: number | null;
  cefr: string | null;
  feedback: string | null;
  writing_corrections?: WritingCorrection[] | null;
  graded_at: string | null;
  // Đề bài (join từ bảng tests) — hiện khi GV chấm. Có thể null nếu đề đã xóa.
  tests?: { prompt: string | null; title: string | null } | null;
}

// Đáp án học sinh: { [question_id]: chuỗi | mảng chuỗi }
export type AnswerMap = Record<string, string | string[]>;

// ---------- Phase A+B — đánh giá năng lực / Writing ----------
export interface WritingTopic {
  topic_id: string;
  topic_name: string;
  topic_category?: "regular" | "intensive_2026" | null;
  num_prompts: number;
}

export interface PickedPrompt {
  test_id: string;
  prompt: string | null;
  title: string | null;
  time_limit_min: number;
  min_words: number;
  topic_name: string;
}

export interface ProgressItem {
  submission_id?: string;
  submitted_at: string;
  skill: Skill;
  student_name?: string | null;
  student_code?: string | null;
  class_name?: string | null;
  topic_name: string | null;
  test_title?: string | null;
  prompt?: string | null;
  essay?: string | null;
  feedback?: string | null;
  writing_corrections?: WritingCorrection[] | null;
  score?: number | null;
  max_score?: number | null;
  band?: number | null;
  overall_band: number | null;
  cefr: string | null;
  status: "submitted" | "graded";
  score_tr?: number | null;
  score_cc?: number | null;
  score_lr?: number | null;
  score_gra?: number | null;
}

// 4 tiêu chí IELTS Writing
export interface WritingScores {
  tr: number;   // Task Response
  cc: number;   // Coherence & Cohesion
  lr: number;   // Lexical Resource
  gra: number;  // Grammatical Range & Accuracy
}

export interface Level {
  cefr: string;
  ielts_band: number | null;
  internal_name: string | null;
  sort_order: number;
}

// ---------- Phase C — Roster & chẩn đoán ----------
export interface ClassRow {
  id: string;
  name: string;
  created_at?: string;
}

export interface Student {
  id: string;
  code: string | null;
  full_name: string;
  email: string | null;
  class_id: string | null;
  created_at?: string;
}

export interface StudentByCode {
  id: string;
  full_name: string;
  email: string | null;
  class_name: string | null;
}

// ---------- Phase D — Placement tự chấm ----------
export interface PlacementItem {
  test_id: string;
  title: string;
  skill: Skill;
  time_limit_min: number;
  num_q: number;
}

export interface PlacementLevelStat {
  cefr: Cefr;
  total: number;
  correct: number;
  passed: boolean;
}

export interface PlacementResult {
  submission_id: string;
  cefr: Cefr | null;        // null = chưa đạt A1
  detail: PlacementLevelStat[];
}

// ---------- Phase F — Buổi thi / mã thi ----------
export interface ExamSession {
  id: string;
  name: string;
  test_id: string | null;
  access_code: string | null;
  open_at: string | null;
  close_at: string | null;
  one_submission: boolean;
  max_violations: number;
  show_result: boolean;
  created_at?: string;
}

// Đề (kèm tên chủ đề + kỹ năng) để GV chọn khi tạo buổi thi.
export interface TestWithTopic {
  id: string;
  title: string | null;
  version_label: string;
  purpose: string;
  topic_name: string;
  skill: Skill;
}

export interface SessionByCode {
  status: "open" | "not_open" | "closed" | "no_test";
  session_id?: string;
  name?: string;
  test_id?: string;
  skill?: Skill;
  one_submission?: boolean;
  max_violations?: number;
  open_at?: string;
  close_at?: string;
  server_now?: string;
}

export interface SessionSubmitResult {
  submission_id: string;
  skill: Skill;
  status: "submitted" | "graded";
  show_result: boolean;
  score?: number | null;
  max_score?: number | null;
  band?: number | null;
}
