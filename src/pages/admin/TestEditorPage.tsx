// Trình soạn ĐỀ: sửa thông tin đề + quản lý ĐOẠN VĂN/AUDIO + CÂU HỎI (kèm đáp án).
// Đáp án lưu theo GIÁ TRỊ lựa chọn (xem schema) để an toàn khi xáo trộn lúc thi.
import { useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  deletePassage, deleteQuestion, getTestAdmin, getTopic, listPassages,
  listQuestions, savePassage, saveQuestion, saveTest,
} from "../../lib/api";
import { uploadMedia } from "../../lib/storage";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, SkillBadge, Spinner, skillLabel } from "../../components/common";
import type { Passage, Question, QType, Skill, Test, Topic } from "../../lib/types";

export default function TestEditorPage() {
  const { testId = "" } = useParams();
  const test = useAsync<Test>(() => getTestAdmin(testId), [testId]);

  if (test.loading) return <Spinner />;
  if (test.error) return <ErrorBox msg={test.error} />;
  if (!test.data) return null;
  return <Editor test={test.data} reloadTest={test.reload} />;
}

function Editor({ test, reloadTest }: { test: Test; reloadTest: () => void }) {
  const topic = useAsync<Topic>(() => getTopic(test.topic_id), [test.topic_id]);
  const passages = useAsync<Passage[]>(() => listPassages(test.id), [test.id]);
  const questions = useAsync<Question[]>(() => listQuestions(test.id), [test.id]);
  const skill: Skill | undefined = topic.data?.skill;

  const backTo = skill && ["writing", "reading", "listening"].includes(skill) ? `/admin/topics/${skill}` : "/admin/topics";
  const backLabel = skill === "writing" ? "Đề Viết" : skill === "reading" ? "Đề Đọc" : skill === "listening" ? "Đề Nghe" : "Ngân hàng đề";

  return (
    <div>
      <Link className="link" to={backTo}>← {backLabel}</Link>
      <div className="title-row">
        <h1>Soạn đề {test.version_label}</h1>
        {skill && <SkillBadge skill={skill} />}
      </div>

      <MetaForm test={test} onSaved={reloadTest} isWriting={skill === "writing"} />

      <h2 className="section">Tư liệu (đoạn đọc / audio)</h2>
      {passages.loading && <Spinner />}
      {passages.error && <ErrorBox msg={passages.error} />}
      {passages.data?.map((p) => (
        <PassageRow key={p.id} passage={p} onChanged={passages.reload} />
      ))}
      <NewPassage testId={test.id} onAdded={passages.reload} defaultKind={skill === "listening" ? "audio" : "reading"} />

      {skill === "writing" ? (
        <p className="muted section">Đề Viết: học sinh nhập bài luận, không cần câu hỏi trắc nghiệm.</p>
      ) : (
        <>
          <h2 className="section">Câu hỏi {skill ? `(${skillLabel(skill)})` : ""}</h2>
          {questions.loading && <Spinner />}
          {questions.error && <ErrorBox msg={questions.error} />}
          {questions.data?.map((q, i) => (
            <QuestionRow key={q.id} index={i + 1} q={q} passages={passages.data ?? []} onChanged={questions.reload} />
          ))}
          <NewQuestion
            testId={test.id}
            passages={passages.data ?? []}
            nextOrder={(questions.data?.length ?? 0) + 1}
            onAdded={questions.reload}
          />
        </>
      )}
    </div>
  );
}

// ---------- Thông tin đề ----------
function MetaForm({ test, onSaved, isWriting }: { test: Test; onSaved: () => void; isWriting: boolean }) {
  const [title, setTitle] = useState(test.title ?? "");
  const [prompt, setPrompt] = useState(test.prompt ?? "");
  const [version, setVersion] = useState(test.version_label);
  const [time, setTime] = useState(test.time_limit_min);
  const [minWords, setMinWords] = useState(test.min_words);
  const [purpose, setPurpose] = useState<Test["purpose"]>(test.purpose);
  const [threshold, setThreshold] = useState(test.pass_threshold ?? 0.6);
  const [active, setActive] = useState(test.active);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isPlacement = purpose === "placement";

  async function save() {
    setErr(null); setMsg(null);
    try {
      await saveTest({
        id: test.id, topic_id: test.topic_id,
        title: title.trim() || null, prompt: prompt.trim() || null,
        version_label: version.trim() || "A", purpose,
        pass_threshold: Number(threshold) || 0.6,
        time_limit_min: Number(time) || 0, min_words: Number(minWords) || 0, active,
      });
      setMsg("Đã lưu.");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card">
      {isWriting && (
        <label className="field"><span>Đề bài (prompt) — học sinh sẽ thấy</span>
          <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="vd: Some people think that… Discuss both views and give your opinion." />
        </label>
      )}
      <div className="grid2">
        <label className="field"><span>Tiêu đề đề</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="vd: The History of Tea" />
        </label>
        <label className="field"><span>Phiên bản</span>
          <input value={version} onChange={(e) => setVersion(e.target.value)} />
        </label>
        <label className="field"><span>Thời gian (phút)</span>
          <input type="number" value={time} onChange={(e) => setTime(Number(e.target.value))} />
        </label>
        <label className="field"><span>Mục đích</span>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value as Test["purpose"])}>
            <option value="progress">Luyện tập (progress)</option>
            <option value="placement">Xếp lớp (placement — tự chấm CEFR)</option>
            <option value="exit">Đầu ra (exit)</option>
          </select>
        </label>
        {isWriting && (
          <label className="field"><span>Số từ tối thiểu</span>
            <input type="number" value={minWords} onChange={(e) => setMinWords(Number(e.target.value))} />
          </label>
        )}
        {isPlacement && (
          <label className="field"><span>Ngưỡng đạt mỗi mức (0–1)</span>
            <input type="number" min={0} max={1} step="0.05" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </label>
        )}
      </div>
      {isPlacement && (
        <p className="muted small">Đề xếp lớp: gắn <strong>mức CEFR</strong> cho từng câu hỏi bên dưới. Kết quả = mức cao nhất đạt liên tiếp (đúng ≥ ngưỡng).</p>
      )}
      <label className="check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Mở cho học sinh (active)</span>
      </label>
      <div className="actions">
        <button className="btn primary" onClick={save}>Lưu đề</button>
        {msg && <span className="ok-text">{msg}</span>}
      </div>
      {err && <ErrorBox msg={err} />}
    </div>
  );
}

// ---------- Đoạn văn / Audio ----------
function PassageRow({ passage, onChanged }: { passage: Passage; onChanged: () => void }) {
  const [body, setBody] = useState(passage.body ?? "");
  const [media, setMedia] = useState(passage.media_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isAudio = passage.kind === "audio";

  async function save() {
    await savePassage({ ...passage, body: body || null, media_url: media || null });
    onChanged();
  }
  async function remove() {
    if (!confirm("Xóa tư liệu này?")) return;
    await deletePassage(passage.id);
    onChanged();
  }
  // Tải MP3/ảnh lên Supabase Storage rồi lưu link luôn vào đoạn này (khỏi bấm Lưu lại).
  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setUploading(true);
    try {
      const url = await uploadMedia(file);
      setMedia(url);
      await savePassage({ ...passage, body: body || null, media_url: url });
      onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setUploading(false);
      e.target.value = ""; // cho chọn lại cùng file nếu cần
    }
  }

  return (
    <div className="card sub">
      <div className="muted small">{isAudio ? "🎧 Audio" : "📄 Đoạn đọc"}</div>
      {passage.kind === "reading" ? (
        <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nội dung đoạn đọc…" />
      ) : null}

      <label className="field">
        <span>{isAudio ? "Tải MP3 lên" : "Tải ảnh lên"} (Supabase Storage)</span>
        <input type="file" accept={isAudio ? "audio/*" : "image/*"} disabled={uploading} onChange={onUpload} />
      </label>
      {uploading && <p className="muted small">Đang tải lên…</p>}
      {err && <ErrorBox msg={err} />}

      <label className="field"><span>Hoặc dán link media (R2/URL{passage.kind === "reading" ? " ảnh — tùy chọn" : " audio"})</span>
        <input value={media} onChange={(e) => setMedia(e.target.value)} placeholder="https://media.tenmien.com/..." />
      </label>

      {media && (isAudio ? (
        <audio controls src={media} style={{ width: "100%", marginTop: 6 }} />
      ) : (
        <img src={media} alt="tư liệu" style={{ maxWidth: "100%", marginTop: 6, borderRadius: 8 }} />
      ))}

      <div className="actions">
        <button className="btn small" onClick={save}>Lưu</button>
        <button className="btn ghost small danger" onClick={remove}>Xóa</button>
      </div>
    </div>
  );
}

function NewPassage({ testId, onAdded, defaultKind }: { testId: string; onAdded: () => void; defaultKind: "reading" | "audio" }) {
  const [kind, setKind] = useState<"reading" | "audio">(defaultKind);
  async function add() {
    await savePassage({ test_id: testId, kind, sort_order: 0, body: null, media_url: null });
    onAdded();
  }
  return (
    <div className="row-form">
      <select value={kind} onChange={(e) => setKind(e.target.value as "reading" | "audio")}>
        <option value="reading">Đoạn đọc</option>
        <option value="audio">Audio</option>
      </select>
      <button className="btn small" onClick={add}>+ Thêm tư liệu</button>
    </div>
  );
}

// ---------- Câu hỏi ----------
function QuestionRow({ index, q, passages, onChanged }: { index: number; q: Question; passages: Passage[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  async function remove() {
    if (!confirm("Xóa câu hỏi này?")) return;
    await deleteQuestion(q.id);
    onChanged();
  }
  return (
    <div className="card sub">
      <div className="q-row-head">
        <div><span className="q-no">{index}.</span> {q.prompt || <em className="muted">(chưa có nội dung)</em>} <span className="pill small">{q.qtype}</span></div>
        <span>
          <button className="btn ghost small" onClick={() => setOpen((o) => !o)}>{open ? "Đóng" : "Sửa"}</button>
          <button className="btn ghost small danger" onClick={remove}>Xóa</button>
        </span>
      </div>
      {open && (
        <QuestionForm
          testId={q.test_id}
          passages={passages}
          initial={q}
          onSaved={() => { setOpen(false); onChanged(); }}
        />
      )}
    </div>
  );
}

function NewQuestion({ testId, passages, nextOrder, onAdded }: { testId: string; passages: Passage[]; nextOrder: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Thêm câu hỏi</button>;
  return (
    <div className="card sub new-q">
      <QuestionForm
        testId={testId}
        passages={passages}
        sortOrder={nextOrder}
        onSaved={() => { setOpen(false); onAdded(); }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

// Form thêm/sửa 1 câu hỏi. Quản lý options + lựa chọn đáp án theo qtype.
function QuestionForm({
  testId, passages, initial, sortOrder, onSaved, onCancel,
}: {
  testId: string;
  passages: Passage[];
  initial?: Question;
  sortOrder?: number;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [qtype, setQtype] = useState<QType>(initial?.qtype ?? "single");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [cefr, setCefr] = useState<string>(initial?.cefr_level ?? "");
  const [passageId, setPassageId] = useState<string>(initial?.passage_id ?? "");
  const [options, setOptions] = useState<string[]>(
    initial?.options && initial.options.length ? initial.options : ["", ""]
  );
  // Tập đáp án đúng (theo GIÁ TRỊ option) cho single/multi.
  const [correctVals, setCorrectVals] = useState<string[]>(
    Array.isArray(initial?.correct) ? (initial?.correct as string[]) : initial?.correct ? [initial.correct as string] : []
  );
  const [tfng, setTfng] = useState<string>(
    initial?.qtype === "tfng" ? String(initial.correct) : "true"
  );
  const [fillAns, setFillAns] = useState<string>(
    initial?.qtype === "fill"
      ? (Array.isArray(initial.correct) ? initial.correct.join("\n") : String(initial.correct))
      : ""
  );
  const [err, setErr] = useState<string | null>(null);

  function setOption(i: number, v: string) {
    setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));
  }
  function toggleCorrect(val: string) {
    if (qtype === "single") setCorrectVals([val]);
    else setCorrectVals((c) => (c.includes(val) ? c.filter((x) => x !== val) : [...c, val]));
  }

  async function save() {
    setErr(null);
    if (!prompt.trim()) { setErr("Chưa nhập nội dung câu hỏi."); return; }

    let correct: string | string[];
    let opts: string[] = [];
    if (qtype === "single" || qtype === "multi") {
      opts = options.map((o) => o.trim()).filter(Boolean);
      const chosen = correctVals.filter((v) => opts.includes(v));
      if (opts.length < 2) { setErr("Cần ít nhất 2 lựa chọn."); return; }
      if (chosen.length === 0) { setErr("Chưa chọn đáp án đúng."); return; }
      correct = qtype === "single" ? chosen[0] : chosen;
    } else if (qtype === "tfng") {
      correct = tfng;
    } else {
      const arr = fillAns.split("\n").map((s) => s.trim()).filter(Boolean);
      if (arr.length === 0) { setErr("Nhập ít nhất 1 đáp án chấp nhận."); return; }
      correct = arr;
    }

    try {
      await saveQuestion({
        ...(initial?.id ? { id: initial.id } : {}),
        test_id: testId,
        passage_id: passageId || null,
        sort_order: initial?.sort_order ?? sortOrder ?? 0,
        qtype, prompt: prompt.trim(),
        options: opts,
        correct,
        points: Number(points) || 1,
        cefr_level: (cefr || null) as Question["cefr_level"],
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const isChoice = qtype === "single" || qtype === "multi";

  return (
    <div className="q-form">
      <div className="grid2">
        <label className="field"><span>Loại câu</span>
          <select value={qtype} onChange={(e) => setQtype(e.target.value as QType)}>
            <option value="single">Trắc nghiệm 1 đáp án</option>
            <option value="multi">Trắc nghiệm nhiều đáp án</option>
            <option value="tfng">True / False / Not Given</option>
            <option value="fill">Điền từ</option>
          </select>
        </label>
        <label className="field"><span>Điểm</span>
          <input type="number" step="0.5" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </label>
        <label className="field"><span>Mức CEFR (cho đề xếp lớp)</span>
          <select value={cefr} onChange={(e) => setCefr(e.target.value)}>
            <option value="">— Không gắn —</option>
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>

      {passages.length > 0 && (
        <label className="field"><span>Gắn với tư liệu (tùy chọn)</span>
          <select value={passageId} onChange={(e) => setPassageId(e.target.value)}>
            <option value="">— Không —</option>
            {passages.map((p, i) => (
              <option key={p.id} value={p.id}>{p.kind === "audio" ? "🎧" : "📄"} Tư liệu {i + 1}</option>
            ))}
          </select>
        </label>
      )}

      <label className="field"><span>Nội dung câu hỏi</span>
        <textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </label>

      {isChoice && (
        <div className="opts-edit">
          <div className="muted small">Tích vào ô bên trái để đánh dấu đáp án đúng:</div>
          {options.map((o, i) => (
            <div className="opt-edit" key={i}>
              <input
                type={qtype === "single" ? "radio" : "checkbox"}
                name="correct"
                checked={correctVals.includes(o) && o.trim() !== ""}
                onChange={() => toggleCorrect(o)}
              />
              <input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Lựa chọn ${i + 1}`} />
              <button className="btn ghost small danger" onClick={() => setOptions((arr) => arr.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
          <button className="btn ghost small" onClick={() => setOptions((o) => [...o, ""])}>+ Lựa chọn</button>
        </div>
      )}

      {qtype === "tfng" && (
        <label className="field"><span>Đáp án đúng</span>
          <select value={tfng} onChange={(e) => setTfng(e.target.value)}>
            <option value="true">TRUE / YES</option>
            <option value="false">FALSE / NO</option>
            <option value="notgiven">NOT GIVEN</option>
          </select>
        </label>
      )}

      {qtype === "fill" && (
        <label className="field"><span>Đáp án chấp nhận (mỗi dòng 1 cách viết)</span>
          <textarea rows={3} value={fillAns} onChange={(e) => setFillAns(e.target.value)} placeholder={"library\nthe library"} />
        </label>
      )}

      {err && <ErrorBox msg={err} />}
      <div className="actions">
        <button className="btn primary" onClick={save}>Lưu câu hỏi</button>
        {onCancel && <button className="btn ghost" onClick={onCancel}>Hủy</button>}
      </div>
    </div>
  );
}
