// Lớp truy cập dữ liệu: gói gọn mọi lời gọi Supabase (bảng + RPC) vào một chỗ
// để component không phải biết chi tiết. Đáp án học sinh luôn đi qua RPC.
import { supabase } from "./supabase";
import type {
  AnswerMap, ExamListItem, Passage, PublicTest, Question,
  Submission, SubmitResult, Test, Topic,
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

// ---------- Giáo viên (đăng nhập) ----------
export async function listTopics(): Promise<Topic[]> {
  return unwrap(await db().from("topics").select("*").order("sort_order").order("name"));
}

export async function saveTopic(t: Partial<Topic>): Promise<Topic> {
  const row = unwrap(await db().from("topics").upsert(t).select().single());
  return row as Topic;
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
  return unwrap(
    await db().from("submissions").select("*").order("submitted_at", { ascending: false })
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
