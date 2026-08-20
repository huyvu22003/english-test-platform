// Hàng đợi chấm: danh sách bài nộp, lọc (tên/chủ đề/trạng thái), xem bài viết +
// nhật ký vi phạm, CHẤM TAY 4 tiêu chí IELTS (tự tính overall + CEFR), xuất Excel đẹp, xóa.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteSubmission,
  gradeWriting,
  listClassTeachers,
  listProfiles,
  listStudents,
  listSubmissions,
  bandToCefr,
  updateSubmission,
} from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useAuth } from "../../lib/auth";
import type { ClassTeacher, Profile, Student, Submission, WritingCorrection, WritingScores } from "../../lib/types";
import {
  OPEN_GRADING_KEY,
  average,
  clearGradingDraft,
  downloadGradingExcel,
  getStoredOpenSubmissionId,
  isValidBandScore,
  readGradingDraft,
  removeStorage,
  wc,
  workflowMessage,
  writeGradingDraft,
  writeStorage,
} from "./gradingUtils";

type StatusFilter = "all" | "submitted" | "assigned" | "in_review" | "graded" | "pending_ai";

export default function SubmissionsPage() {
  const { profile, isAdmin } = useAuth();
  const subs = useAsync<Submission[]>(listSubmissions, []);
  const profiles = useAsync<Profile[]>(listProfiles, []);
  const students = useAsync<Student[]>(listStudents, []);
  const classTeachers = useAsync<ClassTeacher[]>(listClassTeachers, []);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [teacherId, setTeacherId] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [openSubmissionId, setOpenSubmissionId] = useState(() => getStoredOpenSubmissionId());

  useEffect(() => {
    if (openSubmissionId) writeStorage(OPEN_GRADING_KEY, openSubmissionId);
    else removeStorage(OPEN_GRADING_KEY);
  }, [openSubmissionId]);

  const topics = useMemo(() => {
    const s = new Set<string>();
    subs.data?.forEach((x) => x.topic_name && s.add(x.topic_name));
    return [...s].sort();
  }, [subs.data]);

  const allowedClassIds = useMemo(
    () => new Set((classTeachers.data ?? []).filter((x) => x.teacher_id === profile?.id).map((x) => x.class_id)),
    [classTeachers.data, profile?.id],
  );
  const studentClassByKey = useMemo(() => {
    const m = new Map<string, string | null>();
    students.data?.forEach((s) => {
      m.set(s.id, s.class_id);
      if (s.email) m.set(s.email.toLowerCase(), s.class_id);
    });
    return m;
  }, [students.data]);
  const teacherOptions = useMemo(
    () =>
      (profiles.data ?? []).filter(
        (p) => p.active !== false && ["owner", "admin", "teacher", "grader"].includes(p.role),
      ),
    [profiles.data],
  );

  const rows = useMemo(() => {
    return (subs.data ?? []).filter((s) => {
      if (!isAdmin) {
        const classId =
          (s.student_id && studentClassByKey.get(s.student_id)) ||
          (s.student_email && studentClassByKey.get(s.student_email.toLowerCase())) ||
          null;
        if (s.assigned_to !== profile?.id && (!classId || !allowedClassIds.has(classId))) return false;
      }
      if (topic && s.topic_name !== topic) return false;
      if (status !== "all" && s.status !== status) return false;
      if (teacherId && s.assigned_to !== teacherId) return false;
      if (q) {
        const hay = `${s.student_name ?? ""} ${s.student_email ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [subs.data, isAdmin, studentClassByKey, profile?.id, allowedClassIds, topic, status, teacherId, q]);

  const allRows = subs.data ?? [];
  const pending = allRows.filter(
    (s) => s.status === "submitted" || s.status === "assigned" || s.status === "in_review",
  ).length;
  const graded = allRows.filter((s) => s.status === "graded").length;
  const violationCount = allRows.filter((s) => (s.violations ?? 0) > 0).length;
  const avgBand = average(allRows.map((s) => s.overall_band ?? s.band));

  function exportExcel() {
    downloadGradingExcel(rows, {
      topic: topic || "Tất cả chủ đề",
      status:
        status === "all"
          ? "Mọi trạng thái"
          : status === "submitted"
            ? "Chờ chấm"
            : status === "assigned"
              ? "Đã giao"
              : status === "in_review"
                ? "Cần review"
                : "Đã chấm",
      query: q.trim() || "Không lọc",
      total: rows.length,
      pending,
    });
  }

  async function assignSubmission(id: string, assignedTo: string) {
    await updateSubmission(id, { assigned_to: assignedTo || null, status: assignedTo ? "assigned" : "submitted" });
    subs.reload();
  }

  function teacherName(id?: string | null): string {
    const hit = teacherOptions.find((p) => p.id === id);
    return hit?.full_name || hit?.email || "Chưa giao";
  }

  return (
    <div className="admin-page grading-page">
      <AdminPageHeader
        eyebrow="Writing grading"
        title="Hàng đợi chấm & Điểm"
        subtitle="Lọc bài nộp, chấm 4 tiêu chí IELTS, sửa câu chi tiết và xuất báo cáo điểm."
        actions={
          <div className="actions grading-head-actions">
            <button className="btn" type="button" onClick={() => setGuideOpen(true)}>
              ❔ Hướng dẫn
            </button>
            <button className="btn primary" onClick={exportExcel} disabled={rows.length === 0}>
              ⬇ Xuất Excel
            </button>
          </div>
        }
        statsAriaLabel="Tổng quan bài chấm"
        stats={[
          { label: "Tổng bài", value: allRows.length },
          { label: "Chờ chấm", value: pending, urgent: true },
          { label: "Đã chấm", value: graded },
          { label: "Band TB", value: avgBand == null ? "—" : avgBand.toFixed(1) },
        ]}
      />
      {guideOpen && <GradingGuideModal onClose={() => setGuideOpen(false)} />}

      <div className="card admin-form-card grading-filter-card">
        <div className="card-title-row compact">
          <div>
            <h3>Bộ lọc bài nộp</h3>
            <p className="muted small">
              Đang hiển thị {rows.length}/{allRows.length} bài.{" "}
              {violationCount > 0 ? `${violationCount} bài có vi phạm.` : "Chưa có bài vi phạm."}
            </p>
          </div>
          {pending > 0 && <span className="pill off">{pending} chờ chấm</span>}
        </div>
        <div className="grading-filter-grid">
          <label className="field inline">
            <span>Tìm học sinh</span>
            <input placeholder="Tên / email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="field inline">
            <span>Chủ đề</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field inline">
            <span>Trạng thái</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="all">Mọi trạng thái</option>
              <option value="submitted">Chờ chấm</option>
              <option value="assigned">Đã giao</option>
              <option value="in_review">Cần review</option>
              <option value="graded">Đã chấm</option>
              <option value="pending_ai">Chờ AI chấm</option>
            </select>
          </label>
          {isAdmin && (
            <label className="field inline">
              <span>Giáo viên</span>
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">Tất cả giáo viên</option>
                {teacherOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {(subs.loading || profiles.loading || students.loading || classTeachers.loading) && <Spinner />}
      {[subs.error, profiles.error, students.error, classTeachers.error].filter(Boolean).map((e) => (
        <ErrorBox key={e} msg={e as string} />
      ))}

      {rows.length === 0 && !subs.loading ? (
        <EmptyState
          title={allRows.length === 0 ? "Chưa có bài nộp nào" : "Không có bài khớp bộ lọc"}
          body={
            allRows.length === 0
              ? "Khi học sinh nộp bài, bài sẽ xuất hiện tại đây để giáo viên chấm."
              : "Thử đổi tên học sinh, chủ đề hoặc trạng thái để mở rộng danh sách."
          }
        />
      ) : (
        <div className="card table-wrap grading-table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Nộp lúc</th>
                <th>Học sinh</th>
                <th>Chủ đề</th>
                <th>Phụ trách</th>
                <th>Band</th>
                <th>CEFR</th>
                <th>Trạng thái</th>
                <th>Vi phạm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <Row
                  key={s.id}
                  s={s}
                  isAdmin={isAdmin}
                  graderId={profile?.id}
                  teacherOptions={teacherOptions}
                  teacherName={teacherName}
                  onAssign={assignSubmission}
                  onChanged={subs.reload}
                  open={openSubmissionId === s.id}
                  onToggle={() => setOpenSubmissionId((current) => (current === s.id ? null : s.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GradingGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="grading-guide-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card grading-guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-mini-head">
          <div>
            <h2>Hướng dẫn chấm bài Writing</h2>
            <p className="muted small">
              Quy trình khuyến nghị để giáo viên chấm đúng, đủ điểm và phản hồi rõ cho học sinh.
            </p>
          </div>
          <button className="btn ghost small" type="button" onClick={onClose}>
            Đóng ✕
          </button>
        </div>

        <div className="guide-steps">
          <section>
            <h3>1. Lọc và mở bài cần chấm</h3>
            <ol>
              <li>Dùng ô tìm kiếm để lọc theo tên/email học sinh.</li>
              <li>
                Chọn chủ đề hoặc trạng thái <strong>Chờ chấm</strong> nếu cần.
              </li>
              <li>
                Bấm <strong>Chấm</strong> ở dòng bài làm để mở chi tiết.
              </li>
            </ol>
          </section>

          <section>
            <h3>2. Đọc đề và bài viết</h3>
            <ol>
              <li>
                Đọc khung <strong>Đề bài</strong> trước để nắm yêu cầu.
              </li>
              <li>Đọc bài viết, chú ý số từ và nhật ký vi phạm nếu có.</li>
              <li>
                Nếu bài có vi phạm, mở <strong>Nhật ký vi phạm</strong> để xem chi tiết trước khi quyết định điểm.
              </li>
            </ol>
          </section>

          <section>
            <h3>3. Sửa câu chi tiết cho học sinh</h3>
            <ol>
              <li>Bôi chọn trực tiếp câu/đoạn sai trong bài viết.</li>
              <li>
                Bấm <strong>+ Sửa câu đã chọn</strong>.
              </li>
              <li>Nhập câu sửa đúng và ghi chú lỗi nếu cần.</li>
              <li>
                Bấm <strong>Thêm vào danh sách sửa</strong>. Các lỗi này sẽ được highlight ở trang tiến bộ của học sinh.
              </li>
            </ol>
          </section>

          <section>
            <h3>4. Nhập điểm IELTS</h3>
            <ol>
              <li>
                Nhập 4 tiêu chí: <strong>TR</strong>, <strong>CC</strong>, <strong>LR</strong>, <strong>GRA</strong>.
              </li>
              <li>
                Điểm phải nằm trong thang <strong>0–9</strong> và theo bước <strong>0.5</strong>.
              </li>
              <li>
                Hệ thống tự tính <strong>Overall</strong> và <strong>CEFR</strong>.
              </li>
            </ol>
          </section>

          <section>
            <h3>5. Viết nhận xét và lưu</h3>
            <ol>
              <li>Viết nhận xét tổng quan: điểm mạnh, điểm cần cải thiện, hướng luyện tiếp.</li>
              <li>
                Có thể dùng nhanh các nút <strong>+ Điểm mạnh</strong>, <strong>+ Cần cải thiện</strong>,{" "}
                <strong>+ Gợi ý luyện</strong>.
              </li>
              <li>
                Bấm <strong>Lưu điểm &amp; chấm xong</strong>. Bài sẽ chuyển sang trạng thái <strong>Đã chấm</strong>.
              </li>
              <li>
                Học sinh xem phản hồi trong mục <strong>Xem tiến bộ</strong> và có thể <strong>In / Tải PDF</strong>.
              </li>
            </ol>
          </section>
        </div>

        <div className="guide-note">
          <strong>Lưu ý:</strong> Nên luôn có ít nhất nhận xét tổng quan hoặc sửa câu chi tiết trước khi lưu để học sinh
          hiểu cần cải thiện gì.
        </div>
      </div>
    </div>
  );
}

const CRITERIA: { key: keyof WritingScores; label: string }[] = [
  { key: "tr", label: "Task Response" },
  { key: "cc", label: "Coherence & Cohesion" },
  { key: "lr", label: "Lexical Resource" },
  { key: "gra", label: "Grammar" },
];

function Row({
  s,
  isAdmin,
  graderId,
  teacherOptions,
  teacherName,
  onAssign,
  onChanged,
  open,
  onToggle,
}: {
  s: Submission;
  isAdmin: boolean;
  graderId: string | undefined;
  teacherOptions: Profile[];
  teacherName: (id?: string | null) => string;
  onAssign: (id: string, assignedTo: string) => Promise<void>;
  onChanged: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const initialDraft = useMemo(() => readGradingDraft(s.id), [s.id]);
  const [sc, setSc] = useState<WritingScores>(
    () =>
      initialDraft?.scores ?? {
        tr: s.score_tr ?? 6,
        cc: s.score_cc ?? 6,
        lr: s.score_lr ?? 6,
        gra: s.score_gra ?? 6,
      },
  );
  const [feedback, setFeedback] = useState(() => initialDraft?.feedback ?? s.feedback ?? "");
  const [corrections, setCorrections] = useState<WritingCorrection[]>(
    () => initialDraft?.corrections ?? s.writing_corrections ?? [],
  );
  const [selectedText, setSelectedText] = useState("");
  const [fixedText, setFixedText] = useState("");
  const [fixNote, setFixNote] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const essayRef = useRef<HTMLParagraphElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const overall = Math.round(((sc.tr + sc.cc + sc.lr + sc.gra) / 4) * 2) / 2;

  useEffect(() => {
    if (!open) return;
    writeGradingDraft(s.id, { scores: sc, feedback, corrections, updatedAt: new Date().toISOString() });
  }, [s.id, open, sc, feedback, corrections]);

  async function save() {
    setErr(null);
    setMsg(null);
    const invalid = CRITERIA.find((c) => !isValidBandScore(sc[c.key]));
    if (invalid) {
      setErr(`${invalid.label} phải nằm trong thang 0–9 và theo bước 0.5.`);
      return;
    }
    if (
      !feedback.trim() &&
      corrections.length === 0 &&
      !confirm("Chưa có nhận xét hoặc sửa câu chi tiết. Vẫn lưu điểm?")
    )
      return;
    setBusy(true);
    try {
      await gradeWriting(s.id, sc, feedback.trim(), corrections, graderId);
      clearGradingDraft(s.id);
      setMsg("Đã lưu điểm và phản hồi.");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function updateWorkflow(next: Submission["status"]) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const patch: Partial<Submission> = { status: next };
      if (!s.assigned_to && graderId && next !== "submitted") patch.assigned_to = graderId;
      await updateSubmission(s.id, patch);
      setMsg(workflowMessage(next));
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function appendFeedback(text: string) {
    setFeedback((prev) => [prev.trim(), text].filter(Boolean).join("\n"));
  }
  function captureSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!sel || !text) {
      setErr("Hãy bôi chọn câu/đoạn sai trong bài viết trước.");
      return;
    }
    const essayNode = essayRef.current;
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    if (!essayNode || !range || !essayNode.contains(range.commonAncestorContainer)) {
      setErr("Hãy bôi chọn trực tiếp trong phần bài viết của học viên.");
      return;
    }
    const pre = range.cloneRange();
    pre.selectNodeContents(essayNode);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const exactText = range.toString();
    setSelectedText(exactText.trim());
    setSelectedStart(start + exactText.search(/\S/));
    setSelectedEnd(start + exactText.replace(/\s+$/, "").length);
    setFixedText("");
    setFixNote("");
    setComposeOpen(true);
    setErr(null);
  }
  function addCorrection() {
    if (!selectedText.trim() || !fixedText.trim()) {
      setErr("Cần có câu gốc và câu sửa.");
      return;
    }
    setCorrections((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length + 1}`,
        original: selectedText.trim(),
        corrected: fixedText.trim(),
        note: fixNote.trim() || undefined,
        start: selectedStart ?? undefined,
        end: selectedEnd ?? undefined,
      },
    ]);
    clearCompose();
    setErr(null);
  }
  function clearCompose() {
    setSelectedText("");
    setFixedText("");
    setFixNote("");
    setSelectedStart(null);
    setSelectedEnd(null);
    setComposeOpen(false);
  }
  function resetCompose() {
    setFixedText("");
    setFixNote("");
    setErr(null);
  }
  function removeCorrection(id: string) {
    setCorrections((prev) => prev.filter((c) => c.id !== id));
  }

  async function remove() {
    if (!confirm("Xóa bài nộp này?")) return;
    await deleteSubmission(s.id);
    clearGradingDraft(s.id);
    removeStorage(OPEN_GRADING_KEY);
    onChanged();
  }

  function statusLabel(): string {
    if (s.status === "graded") return "Đã chấm";
    if (s.status === "assigned") return "Đã giao";
    if (s.status === "in_review") return "Cần review";
    if (s.status === "pending_ai") return "Chờ AI chấm";
    return "Chờ chấm";
  }

  return (
    <>
      <tr className={s.violations ? "has-viol" : ""}>
        <td className="small" data-label="Nộp lúc">
          {new Date(s.submitted_at).toLocaleString("vi-VN")}
        </td>
        <td data-label="Học sinh">
          {s.student_name}
          <div className="muted small">{s.student_email}</div>
        </td>
        <td data-label="Chủ đề">{s.topic_name}</td>
        <td data-label="Phụ trách">
          {isAdmin ? (
            <select
              className="compact-select"
              value={s.assigned_to ?? ""}
              onChange={(e) => onAssign(s.id, e.target.value)}
            >
              <option value="">Chưa giao</option>
              {teacherOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
          ) : (
            <span className="small">{teacherName(s.assigned_to)}</span>
          )}
        </td>
        <td data-label="Band">{s.overall_band ?? "—"}</td>
        <td data-label="CEFR">{s.cefr ?? "—"}</td>
        <td data-label="Trạng thái">
          {s.status === "graded" ? (
            <span className="ok-text">{statusLabel()}</span>
          ) : (
            <span className="pill off small">{statusLabel()}</span>
          )}
        </td>
        <td data-label="Vi phạm">{s.violations ? <span className="viol">{s.violations}</span> : "0"}</td>
        <td className="grading-row-action">
          <button className="btn ghost small" onClick={onToggle}>
            {open ? "Đóng" : "Chấm"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="detail-row grading-detail-row">
          <td colSpan={9}>
            <div className="grading-workspace">
              <div className="grading-main-column">
                {/* Đề bài (join từ tests) — nổi bật để GV vừa đọc đề vừa chấm */}
                <div className="prompt-quote">
                  <strong>Đề bài{s.tests?.title ? ` — ${s.tests.title}` : ""}</strong>
                  {s.tests?.prompt ? (
                    <p>{s.tests.prompt}</p>
                  ) : (
                    <p className="muted small">(đề không còn nội dung — chủ đề: {s.topic_name ?? "—"})</p>
                  )}
                </div>
                {s.essay ? (
                  <div className="essay-box grading-essay-box">
                    <div className="grading-essay-head">
                      <div>
                        <strong>Bài viết của học viên</strong>
                        <p className="muted small">{wc(s.essay)} từ · bôi chọn đoạn sai rồi bấm sửa câu</p>
                      </div>
                      <button className="btn small" type="button" onClick={captureSelection}>
                        + Sửa câu đã chọn
                      </button>
                    </div>
                    <p ref={essayRef}>{s.essay}</p>
                  </div>
                ) : (
                  <EmptyState
                    title="Bài nộp này chưa có nội dung viết"
                    body="Có thể đây là bài trắc nghiệm hoặc dữ liệu cũ không lưu essay."
                  />
                )}
                <div className="structured-corrections card sub">
                  <div className="card-title-row compact">
                    <div>
                      <h3>Sửa câu chi tiết</h3>
                      <p className="muted small">Các lỗi này sẽ được highlight ở trang tiến bộ của học sinh.</p>
                    </div>
                    <span className="pill">{corrections.length} lỗi</span>
                  </div>
                  <div className="correction-admin-list">
                    {corrections.map((c, idx) => (
                      <div className="correction-admin-item" key={c.id}>
                        <div className="correction-label">Lỗi #{idx + 1}</div>
                        <div className="correction-original">{c.original}</div>
                        {c.note && <div className="muted small">Lỗi: {c.note}</div>}
                        <div className="correction-arrow">Sửa thành</div>
                        <div className="correction-fixed">{c.corrected}</div>
                        <button className="btn ghost small danger" type="button" onClick={() => removeCorrection(c.id)}>
                          Xóa sửa câu
                        </button>
                      </div>
                    ))}
                    {corrections.length === 0 && (
                      <EmptyState
                        title="Chưa có câu sửa"
                        body="Bôi chọn trực tiếp trong bài viết để thêm lỗi/câu sửa cho học sinh."
                      />
                    )}
                  </div>
                </div>
              </div>

              <aside className="grading-score-panel">
                <div className="grading-score-card">
                  <div className="grading-score-head">
                    <div>
                      <span className="eyebrow dark">Band</span>
                      <strong>{overall}</strong>
                    </div>
                    <span className="pill">{bandToCefr(overall)}</span>
                  </div>
                  <div className="grade-grid">
                    {CRITERIA.map((c) => (
                      <label className="field inline" key={c.key}>
                        <span>{c.label}</span>
                        <input
                          type="number"
                          min={0}
                          max={9}
                          step="0.5"
                          value={sc[c.key]}
                          onChange={(e) => setSc((p) => ({ ...p, [c.key]: Number(e.target.value) }))}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="field">
                    <span>Nhận xét cho học sinh</span>
                    <textarea
                      rows={7}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Điểm mạnh, điểm cần cải thiện theo từng tiêu chí…"
                    />
                  </label>
                  <div className="quick-feedback-row">
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => appendFeedback("Điểm mạnh: bài có ý tưởng rõ và bám đề tốt.")}
                    >
                      + Điểm mạnh
                    </button>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() =>
                        appendFeedback(
                          "Cần cải thiện: phát triển luận điểm cụ thể hơn, thêm ví dụ và giải thích rõ hơn.",
                        )
                      }
                    >
                      + Cần cải thiện
                    </button>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() =>
                        appendFeedback(
                          "Gợi ý luyện tập: viết lại các câu đã sửa và rà soát lỗi ngữ pháp/từ vựng lặp lại.",
                        )
                      }
                    >
                      + Gợi ý luyện
                    </button>
                  </div>
                  {s.violation_log && (
                    <details className="viol-box">
                      <summary>Nhật ký vi phạm ({s.violations})</summary>
                      <pre>{s.violation_log}</pre>
                    </details>
                  )}
                  {err && <ErrorBox msg={err} />}
                  {msg && <span className="ok-text">{msg}</span>}
                  {initialDraft && !msg && (
                    <span className="muted small">Đã khôi phục nháp chấm chưa lưu trên máy này.</span>
                  )}
                  {s.status !== "graded" && (
                    <div className="grading-workflow-box">
                      <div>
                        <strong>Quy trình xử lý</strong>
                        <p className="muted small">
                          {s.status === "submitted"
                            ? "Bài mới nộp, chưa giao hoặc chưa nhận chấm."
                            : s.status === "assigned"
                              ? "Bài đã có người phụ trách, đang trong bước chấm."
                              : "Bài đang ở bước review trước khi lưu điểm cuối."}
                        </p>
                      </div>
                      <div className="actions grading-workflow-actions">
                        {s.status === "submitted" && (
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={busy}
                            onClick={() => updateWorkflow("assigned")}
                          >
                            Nhận chấm
                          </button>
                        )}
                        {s.status !== "in_review" && (
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={busy}
                            onClick={() => updateWorkflow("in_review")}
                          >
                            Gửi review
                          </button>
                        )}
                        {s.status === "in_review" && (
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={busy}
                            onClick={() => updateWorkflow("assigned")}
                          >
                            Đưa về đang chấm
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="actions grading-save-actions">
                    <button className="btn small primary" disabled={busy} onClick={save}>
                      {busy ? "Đang lưu…" : s.status === "graded" ? "Cập nhật điểm" : "Lưu điểm & chấm xong"}
                    </button>
                    <button className="btn ghost small danger" onClick={remove}>
                      Xóa bài
                    </button>
                  </div>
                </div>
              </aside>
            </div>
            {composeOpen && (
              <div className="correction-compose-backdrop" role="dialog" aria-modal="true" onClick={clearCompose}>
                <div className="card correction-compose-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-mini-head">
                    <div>
                      <h3>Sửa câu đã chọn</h3>
                      <p className="muted small">
                        Nhập câu sửa ngay tại đây. Có thể xóa nhập lại hoặc hủy nếu chọn nhầm.
                      </p>
                    </div>
                    <button className="btn ghost small" type="button" onClick={clearCompose}>
                      Hủy ✕
                    </button>
                  </div>
                  <label className="field">
                    <span>Câu gốc đã chọn</span>
                    <textarea rows={3} value={selectedText} onChange={(e) => setSelectedText(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Câu sửa đúng</span>
                    <textarea
                      rows={3}
                      autoFocus
                      value={fixedText}
                      onChange={(e) => setFixedText(e.target.value)}
                      placeholder="Nhập câu sửa…"
                    />
                  </label>
                  <label className="field">
                    <span>Ghi chú lỗi (tuỳ chọn)</span>
                    <input
                      value={fixNote}
                      onChange={(e) => setFixNote(e.target.value)}
                      placeholder="VD: thiếu opinion, collocation chưa tự nhiên…"
                    />
                  </label>
                  <div className="actions correction-compose-actions">
                    <button className="btn small primary" type="button" onClick={addCorrection}>
                      Thêm vào danh sách sửa
                    </button>
                    <button className="btn small" type="button" onClick={resetCompose}>
                      Xóa nhập lại
                    </button>
                    <button className="btn ghost small" type="button" onClick={clearCompose}>
                      Hủy không sửa
                    </button>
                  </div>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
