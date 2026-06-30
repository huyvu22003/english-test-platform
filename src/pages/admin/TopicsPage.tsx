// Quản lý CHỦ ĐỀ và ĐỀ THI: có thể xem theo từng kỹ năng để giáo viên không bị rối khi soạn đề.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteTopic, listTopics, saveTopic, listTests, saveTest, deleteTest,
} from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, SkillBadge, Spinner } from "../../components/common";
import type { Skill, Test, Topic } from "../../lib/types";

const AUTHORING_SKILLS: Skill[] = ["writing", "reading", "listening"];
const INTENSIVE_TOPIC_NAME = "HỌC TĂNG CƯỜNG 2026";

function normalizeVi(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isLegacyIntensiveName(name: string) {
  const n = normalizeVi(name);
  return n === normalizeVi(INTENSIVE_TOPIC_NAME) || (n.includes("hoc tang cuong") && n.includes("2026"));
}

function isIntensiveTopic(topic: Pick<Topic, "name"> & { category?: string | null }) {
  return topic.category === "intensive_2026" || isLegacyIntensiveName(topic.name);
}

const SKILL_META: Record<Skill, { label: string; title: string; desc: string; cta: string }> = {
  writing: {
    label: "Viết",
    title: "Đề Viết",
    desc: "Quản lý chủ đề Writing, prompt bài luận, thời gian và số từ tối thiểu.",
    cta: "+ Thêm chủ đề Viết",
  },
  reading: {
    label: "Đọc",
    title: "Đề Đọc",
    desc: "Quản lý passage, câu hỏi Reading và đáp án.",
    cta: "+ Thêm chủ đề Đọc",
  },
  listening: {
    label: "Nghe",
    title: "Đề Nghe",
    desc: "Quản lý audio/link nghe, câu hỏi Listening và đáp án.",
    cta: "+ Thêm chủ đề Nghe",
  },
  use_of_english: {
    label: "Use of English",
    title: "Use of English",
    desc: "Quản lý câu hỏi ngữ pháp/từ vựng.",
    cta: "+ Thêm chủ đề",
  },
};

export default function TopicsPage() {
  const { skill: skillParam } = useParams();
  const isIntensive = skillParam === "intensive";
  const fixedSkill = AUTHORING_SKILLS.includes(skillParam as Skill) ? (skillParam as Skill) : null;
  const isBank = !fixedSkill && !isIntensive;
  const topics = useAsync<Topic[]>(listTopics, []);
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>(fixedSkill ?? "reading");
  const [err, setErr] = useState<string | null>(null);

  const visibleTopics = useMemo(() => {
    const rows = topics.data ?? [];
    if (isIntensive) return rows.filter((t) => t.skill === "writing" && isIntensiveTopic(t));
    if (fixedSkill === "writing") return rows.filter((t) => t.skill === fixedSkill && !isIntensiveTopic(t));
    return fixedSkill ? rows.filter((t) => t.skill === fixedSkill) : rows;
  }, [topics.data, fixedSkill, isIntensive]);

  const page = isIntensive ? {
    title: "Học tăng cường 2026",
    desc: "Quản lý đề Writing tăng cường. Học sinh phải chọn đề cụ thể, không bốc ngẫu nhiên.",
    cta: "+ Thêm topic tăng cường",
  } : fixedSkill ? SKILL_META[fixedSkill] : {
    title: "Ngân hàng đề",
    desc: "Xem tổng quan tất cả chủ đề/đề thi. Nên vào Đề Viết, Đề Đọc hoặc Đề Nghe để soạn cho đúng loại.",
    cta: "+ Thêm chủ đề",
  };

  async function addTopic() {
    setErr(null);
    const topicName = isIntensive && !name.trim() ? INTENSIVE_TOPIC_NAME : name.trim();
    if (topicName.length < 2) {
      setErr("Tên chủ đề phải có ít nhất 2 ký tự.");
      return;
    }
    try {
      await saveTopic({
        name: topicName,
        skill: isIntensive ? "writing" : fixedSkill ?? skill,
        category: isIntensive ? "intensive_2026" : "regular",
        active: true,
      });
      setName("");
      topics.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <div className="title-row">
        <div>
          <h1>{page.title}</h1>
          <p className="muted small sub">{page.desc}</p>
        </div>
        {isBank && <Link className="link" to="/admin/topics/reading">Vào khu soạn đề →</Link>}
      </div>

      {!isBank && (
        <div className="authoring-tabs card sub">
          <Link to="/admin/topics/writing" className={fixedSkill === "writing" ? "active" : ""}>Đề Viết</Link>
          <Link to="/admin/topics/reading" className={fixedSkill === "reading" ? "active" : ""}>Đề Đọc</Link>
          <Link to="/admin/topics/listening" className={fixedSkill === "listening" ? "active" : ""}>Đề Nghe</Link>
          <Link to="/admin/topics/intensive" className={isIntensive ? "active" : ""}>Học tăng cường 2026</Link>
          <Link to="/admin/topics">Ngân hàng đề</Link>
        </div>
      )}

      <div className="card topic-create-bar">
        <input placeholder={isIntensive ? INTENSIVE_TOPIC_NAME : "Tên chủ đề mới…"} value={name} onChange={(e) => setName(e.target.value)} />
        {isBank ? (
          <select value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
            <option value="reading">Đọc</option>
            <option value="listening">Nghe</option>
            <option value="use_of_english">Use of English</option>
            <option value="writing">Viết</option>
          </select>
        ) : isIntensive ? (
          <span className="pill skill-writing">Tăng cường</span>
        ) : (
          <span className={`pill skill-${fixedSkill}`}>{fixedSkill ? SKILL_META[fixedSkill].label : "Chủ đề"}</span>
        )}
        <button className="btn primary" onClick={addTopic}>{page.cta}</button>
      </div>
      {err && <ErrorBox msg={err} />}

      {topics.loading && <Spinner />}
      {topics.error && <ErrorBox msg={topics.error} />}
      {visibleTopics.map((t) => (
        <TopicCard key={t.id} topic={t} onChanged={topics.reload} />
      ))}
      {topics.data && visibleTopics.length === 0 && <p className="muted">Chưa có chủ đề nào trong mục này.</p>}
    </div>
  );
}

function TopicCard({ topic, onChanged }: { topic: Topic; onChanged: () => void }) {
  const nav = useNavigate();
  const tests = useAsync<Test[]>(() => listTests(topic.id), [topic.id]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);
  const [err, setErr] = useState<string | null>(null);

  async function toggleActive() {
    await saveTopic({ ...topic, active: !topic.active });
    onChanged();
  }
  async function rename() {
    setErr(null);
    const nextName = name.trim();
    if (nextName.length < 2) {
      setErr("Tên chủ đề phải có ít nhất 2 ký tự.");
      setName(topic.name);
      return;
    }
    const saved = await saveTopic({
      ...topic,
      name: nextName,
      category: isIntensiveTopic(topic) ? "intensive_2026" : topic.category ?? "regular",
    });
    setName(saved.name);
    setEditing(false);
    onChanged();
  }
  async function removeTopic() {
    if (!confirm(`Xóa chủ đề "${topic.name}" và toàn bộ đề/câu hỏi bên trong?`)) return;
    await deleteTopic(topic.id);
    onChanged();
  }
  async function addTest() {
    const t = await saveTest({
      topic_id: topic.id,
      version_label: nextVersion(tests.data ?? []),
      time_limit_min: topic.skill === "writing" ? 40 : 20,
      min_words: topic.skill === "writing" ? 250 : 0,
      active: true,
    });
    nav(`/admin/tests/${t.id}`);
  }
  async function removeTest(id: string) {
    if (!confirm("Xóa đề này và toàn bộ câu hỏi?")) return;
    await deleteTest(id);
    tests.reload();
  }

  const testCount = tests.data?.length ?? 0;

  return (
    <div className="card topic-admin compact-topic">
      <div className="topic-head compact-topic-head">
        <div className="topic-title-block">
          {editing ? (
            <span className="row-form topic-rename-form">
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn small" onClick={rename}>Lưu</button>
              <button className="btn ghost small" onClick={() => { setName(topic.name); setErr(null); setEditing(false); }}>Hủy</button>
            </span>
          ) : (
            <strong>{topic.name}</strong>
          )}
          {err && <span className="warn-text small">{err}</span>}
          <span className="topic-meta-line">
            <SkillBadge skill={topic.skill} />
            <span className="muted small">{testCount} đề</span>
            {!topic.active && <span className="pill off small">Đang khóa</span>}
          </span>
        </div>
        <div className="topic-actions">
          <button className="btn small primary" onClick={addTest}>+ Thêm đề</button>
          {!editing && <button className="btn ghost small" onClick={() => setEditing(true)}>Đổi tên</button>}
          <button className="btn ghost small" onClick={toggleActive}>{topic.active ? "Khóa" : "Mở"}</button>
          <button className="btn ghost small danger" onClick={removeTopic}>Xóa</button>
        </div>
      </div>

      <div className="test-rows compact-test-rows">
        {tests.loading && <span className="muted small">Đang tải đề…</span>}
        {tests.data?.map((te) => (
          <div className="test-row compact-test-row" key={te.id}>
            <div className="test-title-line">
              <span className="ver">Đề {te.version_label}</span>
              {te.title && <span className="test-name">{te.title}</span>}
              <span className="muted small">{te.time_limit_min}′</span>
              {!te.active && <span className="pill off small">khóa</span>}
            </div>
            <div className="test-actions">
              <button className="btn small" onClick={() => nav(`/admin/tests/${te.id}`)}>Soạn</button>
              <button className="btn ghost small danger" onClick={() => removeTest(te.id)}>Xóa</button>
            </div>
          </div>
        ))}
        {tests.data && tests.data.length === 0 && <span className="muted small empty-tests">Chưa có đề. Bấm “+ Thêm đề” để tạo đề đầu tiên.</span>}
      </div>
    </div>
  );
}

// Sinh nhãn phiên bản tiếp theo: A, B, C…
function nextVersion(tests: Test[]): string {
  const used = new Set(tests.map((t) => t.version_label));
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(65 + i);
    if (!used.has(c)) return c;
  }
  return `V${tests.length + 1}`;
}
