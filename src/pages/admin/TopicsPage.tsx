// Quản lý CHỦ ĐỀ và ĐỀ THI: tạo/sửa/xóa chủ đề; trong mỗi chủ đề tạo/xóa đề,
// mở trình soạn đề (TestEditor) để nhập đoạn văn/audio + câu hỏi.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteTopic, listTopics, saveTopic, listTests, saveTest, deleteTest,
} from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, SkillBadge, Spinner } from "../../components/common";
import type { Skill, Test, Topic } from "../../lib/types";

const SKILLS: Skill[] = ["writing", "reading", "listening"];

export default function TopicsPage() {
  const topics = useAsync<Topic[]>(listTopics, []);
  const [name, setName] = useState("");
  const [skill, setSkill] = useState<Skill>("reading");
  const [err, setErr] = useState<string | null>(null);

  async function addTopic() {
    setErr(null);
    if (name.trim().length < 2) return;
    try {
      await saveTopic({ name: name.trim(), skill, active: true });
      setName("");
      topics.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <h1>Chủ đề &amp; Đề thi</h1>
      <div className="card row-form">
        <input placeholder="Tên chủ đề mới…" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
          <option value="reading">Đọc</option>
          <option value="listening">Nghe</option>
          <option value="writing">Viết</option>
        </select>
        <button className="btn primary" onClick={addTopic}>+ Thêm chủ đề</button>
      </div>
      {err && <ErrorBox msg={err} />}

      {topics.loading && <Spinner />}
      {topics.error && <ErrorBox msg={topics.error} />}
      {topics.data?.map((t) => (
        <TopicCard key={t.id} topic={t} skills={SKILLS} onChanged={topics.reload} />
      ))}
      {topics.data && topics.data.length === 0 && <p className="muted">Chưa có chủ đề nào.</p>}
    </div>
  );
}

function TopicCard({ topic, onChanged }: { topic: Topic; skills: Skill[]; onChanged: () => void }) {
  const nav = useNavigate();
  const tests = useAsync<Test[]>(() => listTests(topic.id), [topic.id]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);

  async function toggleActive() {
    await saveTopic({ ...topic, active: !topic.active });
    onChanged();
  }
  async function rename() {
    await saveTopic({ ...topic, name: name.trim() });
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

  return (
    <div className="card topic-admin">
      <div className="topic-head">
        {editing ? (
          <span className="row-form">
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn small" onClick={rename}>Lưu</button>
            <button className="btn ghost small" onClick={() => setEditing(false)}>Hủy</button>
          </span>
        ) : (
          <strong>{topic.name}</strong>
        )}
        <SkillBadge skill={topic.skill} />
        {!topic.active && <span className="pill off">Đang khóa</span>}
        <span className="spacer" />
        {!editing && <button className="btn ghost small" onClick={() => setEditing(true)}>Đổi tên</button>}
        <button className="btn ghost small" onClick={toggleActive}>{topic.active ? "Khóa" : "Mở"}</button>
        <button className="btn ghost small danger" onClick={removeTopic}>Xóa</button>
      </div>

      <div className="test-rows">
        {tests.loading && <span className="muted small">Đang tải đề…</span>}
        {tests.data?.map((te) => (
          <div className="test-row" key={te.id}>
            <div>
              <span className="ver">Đề {te.version_label}</span>
              {te.title && <span className="muted"> · {te.title}</span>}
              <span className="muted"> · {te.time_limit_min}′</span>
              {!te.active && <span className="pill off small"> khóa</span>}
            </div>
            <span>
              <button className="btn small" onClick={() => nav(`/admin/tests/${te.id}`)}>Soạn</button>
              <button className="btn ghost small danger" onClick={() => removeTest(te.id)}>Xóa</button>
            </span>
          </div>
        ))}
        {tests.data && tests.data.length === 0 && <span className="muted small">Chưa có đề.</span>}
      </div>
      <button className="btn small" onClick={addTest}>+ Thêm đề</button>
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
