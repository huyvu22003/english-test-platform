// Kiểu dữ liệu dùng chung — phản ánh các bảng trong supabase/schema.sql.
// Giữ tối giản, chỉ những trường app dùng.

export type Skill = "writing" | "reading" | "listening";
export type QType = "single" | "multi" | "tfng" | "fill";

export interface Topic {
  id: string;
  name: string;
  skill: Skill;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Test {
  id: string;
  topic_id: string;
  version_label: string;
  title: string | null;
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
}

// Đáp án học sinh: { [question_id]: chuỗi | mảng chuỗi }
export type AnswerMap = Record<string, string | string[]>;
