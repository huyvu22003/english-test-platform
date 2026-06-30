// Lớp truy cập dữ liệu: gói gọn mọi lời gọi Supabase (bảng + RPC) vào một chỗ
// để component không phải biết chi tiết. Đáp án học sinh luôn đi qua RPC.
import { supabase } from "./supabase";
import type {
  AnswerMap, ClassRow, ExamListItem, ExamSession, Level, Passage, PickedPrompt,
  PlacementItem, PlacementResult, ProgressItem, PublicTest, Question, SessionByCode,
  SessionSubmitResult, Skill, Student, StudentByCode, Submission, SubmitResult, Test,
  TestWithTopic, Topic, WritingCorrection, WritingScores, WritingTopic,
} from "./types";

// Trả client hoặc báo lỗi rõ ràng khi chưa cấu hình .env (tránh crash khó hiểu).
function db() {
  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase — điền .env theo docs/SETUP.md.");
  }
  return supabase;
}

// Lấy data hoặc ném lỗi. `data` để `unknown` để TypeScript không suy luận T sai
// từ kiểu phản hồi Supabase (client không gắn Database generic).
function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- Học sinh (anon, qua RPC — không lộ đáp án) ----------
export async function listExams(): Promise<ExamListItem[]> {
  const res = await db().rpc("rpc_list_exams");
  return (unwrap(res) ?? []) as ExamListItem[];
}

export async function getTest(testId: string): Promise<PublicTest> {
  const res = await db().rpc("rpc_get_test", { p_test_id: testId });
  const data = unwrap(res) as PublicTest;
  if (!data || !data.test) throw new Error("Không tìm thấy đề (hoặc đề đã bị khóa).");
  return data;
}

export async function submitExam(args: {
  testId: string; name: string; email: string; answers: AnswerMap;
  violations: number; log: string; startedAt: string; essay?: string | null;
}): Promise<SubmitResult> {
  const res = await db().rpc("rpc_submit", {
    p_test_id: args.testId,
    p_name: args.name,
    p_email: args.email,
    p_answers: args.answers,
    p_violations: args.violations,
    p_log: args.log,
    p_started_at: args.startedAt,
    p_essay: args.essay ?? null,
  });
  return unwrap(res) as SubmitResult;
}

// ---------- Phase A+B: Writing (học sinh, anon) ----------
export async function listWritingTopics(): Promise<WritingTopic[]> {
  const res = await db().rpc("rpc_list_writing_topics");
  return (unwrap(res) ?? []) as WritingTopic[];
}

export async function pickPrompt(topicId: string, testId?: string | null): Promise<PickedPrompt> {
  if (testId) {
    const picked = await getTest(testId);
    if (picked.topic.skill !== "writing") throw new Error("Đề đã chọn không phải đề Writing.");
    if (picked.test.topic_id !== topicId) throw new Error("Đề đã chọn không thuộc chủ đề này.");
    return {
      test_id: picked.test.id,
      prompt: picked.test.prompt,
      title: picked.test.title,
      time_limit_min: picked.test.time_limit_min,
      min_words: picked.test.min_words,
      topic_name: picked.topic.name,
    };
  }

  const res = await db().rpc("rpc_pick_prompt", { p_topic_id: topicId });
  const data = unwrap(res) as PickedPrompt | null;
  if (!data) throw new Error("Chủ đề này chưa có đề nào đang mở.");
  return data;
}

export async function submitWriting(args: {
  testId: string; name: string; email: string; essay: string;
  violations: number; log: string; startedAt: string;
}): Promise<{ submission_id: string }> {
  const res = await db().rpc("rpc_submit_writing", {
    p_test_id: args.testId, p_name: args.name, p_email: args.email,
    p_essay: args.essay, p_violations: args.violations, p_log: args.log,
    p_started_at: args.startedAt,
  });
  return unwrap(res) as { submission_id: string };
}

export async function getProgress(args: { email?: string; name?: string; code?: string }): Promise<ProgressItem[]> {
  const res = await db().rpc("rpc_get_progress", {
    p_email: args.email?.trim() || null,
    p_name: args.name?.trim() || null,
    p_code: args.code?.trim() || null,
  });
  return (unwrap(res) ?? []) as ProgressItem[];
}

export async function listLevels(): Promise<Level[]> {
  return unwrap(await db().from("levels").select("*").order("sort_order"));
}

// Quy đổi band -> CEFR (khớp hàm etp_band_to_cefr trong schema).
export function bandToCefr(band: number): string {
  if (band >= 8.0) return "C2";
  if (band >= 7.0) return "C1";
  if (band >= 6.0) return "B2";
  if (band >= 5.0) return "B1";
  if (band >= 4.0) return "A2";
  return "A1";
}

// Chấm tay bài Viết: 4 tiêu chí -> overall (trung bình, làm tròn 0.5) + CEFR.
export async function gradeWriting(id: string, s: WritingScores, feedback: string, corrections: WritingCorrection[] = []): Promise<void> {
  const overall = Math.round(((s.tr + s.cc + s.lr + s.gra) / 4) * 2) / 2;
  const { error } = await db().from("submissions").update({
    score_tr: s.tr, score_cc: s.cc, score_lr: s.lr, score_gra: s.gra,
    overall_band: overall, cefr: bandToCefr(overall), feedback,
    writing_corrections: corrections,
    status: "graded", graded_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Phase D: Placement tự chấm (anon) ----------
export async function listPlacements(): Promise<PlacementItem[]> {
  const res = await db().rpc("rpc_list_placements");
  return (unwrap(res) ?? []) as PlacementItem[];
}

export async function submitPlacement(args: {
  testId: string; name: string; email: string; answers: AnswerMap;
  violations: number; log: string; startedAt: string;
}): Promise<PlacementResult> {
  const res = await db().rpc("rpc_submit_placement", {
    p_test_id: args.testId, p_name: args.name, p_email: args.email,
    p_answers: args.answers, p_violations: args.violations, p_log: args.log,
    p_started_at: args.startedAt,
  });
  return unwrap(res) as PlacementResult;
}

// ---------- Phase F: buổi thi / mã thi ----------
export async function sessionByCode(code: string): Promise<SessionByCode | null> {
  const res = await db().rpc("rpc_session_by_code", { p_code: code });
  return (unwrap(res) ?? null) as SessionByCode | null;
}

export async function submitSession(args: {
  sessionId: string; name: string; email: string;
  answers: AnswerMap; essay: string | null;
  violations: number; log: string; startedAt: string;
}): Promise<SessionSubmitResult> {
  const res = await db().rpc("rpc_submit_session", {
    p_session_id: args.sessionId, p_name: args.name, p_email: args.email,
    p_answers: args.answers, p_essay: args.essay, p_violations: args.violations,
    p_log: args.log, p_started_at: args.startedAt,
  });
  return unwrap(res) as SessionSubmitResult;
}

// Giáo viên: danh sách đề (kèm tên chủ đề + kỹ năng) để chọn khi tạo buổi thi.
export async function listAllTests(): Promise<TestWithTopic[]> {
  const rows = unwrap<{
    id: string; title: string | null; version_label: string; purpose: string;
    topics: { name: string; skill: Skill } | null;
  }[]>(await db().from("tests").select("id,title,version_label,purpose,topics(name,skill)").order("created_at"));
  return rows.map((r) => ({
    id: r.id, title: r.title, version_label: r.version_label, purpose: r.purpose,
    topic_name: r.topics?.name ?? "?", skill: (r.topics?.skill ?? "reading") as Skill,
  }));
}

export async function listSessions(): Promise<ExamSession[]> {
  return unwrap(await db().from("exam_sessions").select("*").order("created_at", { ascending: false }));
}
export async function saveSession(s: Partial<ExamSession>): Promise<ExamSession> {
  return unwrap(await db().from("exam_sessions").upsert(s).select().single()) as ExamSession;
}
export async function deleteSession(id: string): Promise<void> {
  const { error } = await db().from("exam_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Phase C: tra mã học viên (anon) ----------
export async function studentByCode(code: string): Promise<StudentByCode | null> {
  const res = await db().rpc("rpc_student_by_code", { p_code: code });
  return (unwrap(res) ?? null) as StudentByCode | null;
}

// ---------- Phase C: Roster (giáo viên) ----------
export async function listClasses(): Promise<ClassRow[]> {
  return unwrap(await db().from("classes").select("*").order("name"));
}
export async function saveClass(c: Partial<ClassRow>): Promise<ClassRow> {
  return unwrap(await db().from("classes").upsert(c).select().single()) as ClassRow;
}
export async function deleteClass(id: string): Promise<void> {
  const { error } = await db().from("classes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listStudents(): Promise<Student[]> {
  return unwrap(await db().from("students").select("*").order("full_name"));
}
export async function saveStudent(s: Partial<Student>): Promise<Student> {
  return unwrap(await db().from("students").upsert(s).select().single()) as Student;
}
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await db().from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Giáo viên (đăng nhập) ----------
export async function listTopics(): Promise<Topic[]> {
  return unwrap(await db().from("topics").select("*").order("sort_order").order("name"));
}

export async function saveTopic(t: Partial<Topic>): Promise<Topic> {
  if (t.id) {
    const { id, ...patch } = t;
    return unwrap(await db().from("topics").update(patch).eq("id", id).select().single()) as Topic;
  }

  return unwrap(await db().from("topics").insert(t).select().single()) as Topic;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await db().from("topics").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listTests(topicId: string): Promise<Test[]> {
  return unwrap(
    await db().from("tests").select("*").eq("topic_id", topicId).order("version_label")
  );
}

export async function getTopic(id: string): Promise<Topic> {
  return unwrap(await db().from("topics").select("*").eq("id", id).single()) as Topic;
}

export async function getTestAdmin(id: string): Promise<Test> {
  return unwrap(await db().from("tests").select("*").eq("id", id).single()) as Test;
}

export async function saveTest(t: Partial<Test>): Promise<Test> {
  return unwrap(await db().from("tests").upsert(t).select().single()) as Test;
}

export async function deleteTest(id: string): Promise<void> {
  const { error } = await db().from("tests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listPassages(testId: string): Promise<Passage[]> {
  return unwrap(
    await db().from("passages").select("*").eq("test_id", testId).order("sort_order")
  );
}

export async function savePassage(p: Partial<Passage>): Promise<Passage> {
  return unwrap(await db().from("passages").upsert(p).select().single()) as Passage;
}

export async function deletePassage(id: string): Promise<void> {
  const { error } = await db().from("passages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listQuestions(testId: string): Promise<Question[]> {
  return unwrap(
    await db().from("questions").select("*").eq("test_id", testId).order("sort_order")
  );
}

export async function saveQuestion(q: Partial<Question>): Promise<Question> {
  return unwrap(await db().from("questions").upsert(q).select().single()) as Question;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await db().from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Dashboard ----------
export async function listSubmissions(): Promise<Submission[]> {
  // Kèm đề bài (join tests) để GV thấy ĐỀ ngay khi chấm — khỏi mở đề riêng.
  return unwrap(
    await db().from("submissions").select("*, tests(prompt, title)").order("submitted_at", { ascending: false })
  );
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<void> {
  const { error } = await db().from("submissions").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSubmission(id: string): Promise<void> {
  const { error } = await db().from("submissions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
