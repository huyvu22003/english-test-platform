import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import {
  deleteAcademyCourse,
  deleteAcademyLesson,
  deleteAcademyLevel,
  deleteAcademyUnit,
  getAcademyData,
  saveAcademyCourse,
  saveAcademyLesson,
  saveAcademyLevel,
  saveAcademyUnit,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AcademyCourse, AcademyLesson, AcademyLevel, AcademyObjectives, AcademyUnit } from "../../lib/types";
import { useAsync } from "../../lib/useAsync";

const EMPTY_COURSE = {
  title: "",
  description: "",
  department: "academic",
  cover_url: "",
  active: false,
  sort_order: 0,
};
const EMPTY_LEVEL = {
  title: "",
  code: "",
  description: "",
  outcome: "",
  session_count: 0,
  active: false,
  sort_order: 0,
};
const EMPTY_UNIT = { title: "", code: "", description: "", active: false, sort_order: 0 };
const EMPTY_OBJECTIVES: AcademyObjectives = { outcome: "", lesson: "", language: "", skills: "", pronunciation: "" };
const EMPTY_LESSON = {
  title: "",
  summary: "",
  content: "",
  video_url: "",
  resource_url: "",
  slide_url: "",
  game_url: "",
  worksheet_url: "",
  references_text: "",
  homework: "",
  teacher_notes: "",
  objectives: { ...EMPTY_OBJECTIVES },
  lesson_type: "lesson" as AcademyLesson["lesson_type"],
  session_no: null as number | null,
  duration_min: 120,
  version_label: "1.0",
  active: false,
  sort_order: 0,
};
type CourseForm = typeof EMPTY_COURSE & { id?: string };
type LevelForm = typeof EMPTY_LEVEL & { id?: string };
type UnitForm = typeof EMPTY_UNIT & { id?: string };
type LessonForm = typeof EMPTY_LESSON & { id?: string };

function status(active: boolean) {
  return active ? "Đã xuất bản" : "Bản nháp";
}

export default function AcademyPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const academy = useAsync(() => getAcademyData(userId), [userId]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>({ ...EMPTY_COURSE });
  const [levelForm, setLevelForm] = useState<LevelForm>({ ...EMPTY_LEVEL });
  const [unitForm, setUnitForm] = useState<UnitForm>({ ...EMPTY_UNIT });
  const [lessonForm, setLessonForm] = useState<LessonForm>({ ...EMPTY_LESSON });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const courses = useMemo(() => academy.data?.courses ?? [], [academy.data]);
  const levels = useMemo(() => academy.data?.levels ?? [], [academy.data]);
  const units = useMemo(() => academy.data?.units ?? [], [academy.data]);
  const lessons = useMemo(() => academy.data?.lessons ?? [], [academy.data]);
  const selectedCourse = courses.find((x) => x.id === courseId) ?? null;
  const courseLevels = levels.filter((x) => x.course_id === courseId);
  const selectedLevel = levels.find((x) => x.id === levelId) ?? null;
  const levelUnits = units.filter((x) => x.level_id === levelId);
  const selectedUnit = units.find((x) => x.id === unitId) ?? null;
  const visibleLessons = lessons.filter((x) =>
    unitId
      ? x.unit_id === unitId
      : levelId
        ? x.level_id === levelId && !x.unit_id
        : x.course_id === courseId && !x.level_id,
  );

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courseId, courses]);
  useEffect(() => {
    if (levelId && !courseLevels.some((x) => x.id === levelId)) setLevelId(null);
  }, [courseLevels, levelId]);
  useEffect(() => {
    if (unitId && !levelUnits.some((x) => x.id === unitId)) setUnitId(null);
  }, [levelUnits, unitId]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitCourse(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const saved = await saveAcademyCourse(courseForm, userId);
      setCourseId(saved.id);
      setLevelId(null);
      setUnitId(null);
      setCourseForm({ ...EMPTY_COURSE });
    });
  }
  async function submitLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    await run(async () => {
      const saved = await saveAcademyLevel({ ...levelForm, course_id: courseId }, userId);
      setLevelId(saved.id);
      setUnitId(null);
      setLevelForm({ ...EMPTY_LEVEL });
    });
  }
  async function submitUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!levelId) return;
    await run(async () => {
      const saved = await saveAcademyUnit({ ...unitForm, level_id: levelId }, userId);
      setUnitId(saved.id);
      setUnitForm({ ...EMPTY_UNIT });
    });
  }
  async function submitLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    await run(async () => {
      await saveAcademyLesson({ ...lessonForm, course_id: courseId, level_id: levelId, unit_id: unitId }, userId);
      setLessonForm({ ...EMPTY_LESSON, objectives: { ...EMPTY_OBJECTIVES } });
    });
  }

  function editCourse(x: AcademyCourse) {
    setCourseId(x.id);
    setLevelId(null);
    setUnitId(null);
    setCourseForm({
      id: x.id,
      title: x.title,
      description: x.description,
      department: x.department,
      cover_url: x.cover_url ?? "",
      active: x.active,
      sort_order: x.sort_order,
    });
  }
  function editLevel(x: AcademyLevel) {
    setLevelId(x.id);
    setUnitId(null);
    setLevelForm({
      id: x.id,
      title: x.title,
      code: x.code,
      description: x.description,
      outcome: x.outcome,
      session_count: x.session_count,
      active: x.active,
      sort_order: x.sort_order,
    });
  }
  function editUnit(x: AcademyUnit) {
    setUnitId(x.id);
    setUnitForm({
      id: x.id,
      title: x.title,
      code: x.code,
      description: x.description,
      active: x.active,
      sort_order: x.sort_order,
    });
  }
  function editLesson(x: AcademyLesson) {
    setCourseId(x.course_id);
    setLevelId(x.level_id);
    setUnitId(x.unit_id);
    setLessonForm({
      id: x.id,
      title: x.title,
      summary: x.summary,
      content: x.content,
      video_url: x.video_url ?? "",
      resource_url: x.resource_url ?? "",
      slide_url: x.slide_url ?? "",
      game_url: x.game_url ?? "",
      worksheet_url: x.worksheet_url ?? "",
      references_text: x.references_text,
      homework: x.homework,
      teacher_notes: x.teacher_notes,
      objectives: { ...EMPTY_OBJECTIVES, ...x.objectives },
      lesson_type: x.lesson_type,
      session_no: x.session_no,
      duration_min: x.duration_min,
      version_label: x.version_label,
      active: x.active,
      sort_order: x.sort_order,
    });
  }
  async function remove(kind: "course" | "level" | "unit" | "lesson", id: string, title: string) {
    if (!window.confirm(`Xóa “${title}”? Nội dung con liên quan cũng có thể bị xóa.`)) return;
    await run(async () => {
      if (kind === "course") await deleteAcademyCourse(id);
      if (kind === "level") await deleteAcademyLevel(id);
      if (kind === "unit") await deleteAcademyUnit(id);
      if (kind === "lesson") await deleteAcademyLesson(id);
      if (kind === "course") {
        setCourseId(null);
        setLevelId(null);
        setUnitId(null);
      }
      if (kind === "level") {
        setLevelId(null);
        setUnitId(null);
      }
      if (kind === "unit") setUnitId(null);
    });
  }

  function objective(key: keyof AcademyObjectives, label: string) {
    return (
      <label className="field">
        <span>{label}</span>
        <textarea
          rows={2}
          value={lessonForm.objectives[key] ?? ""}
          onChange={(e) =>
            setLessonForm({ ...lessonForm, objectives: { ...lessonForm.objectives, [key]: e.target.value } })
          }
        />
      </label>
    );
  }

  return (
    <div className="admin-page academy-page">
      <AdminPageHeader
        eyebrow="Internal Academy"
        title="Syllabus & Lesson Plan"
        subtitle="Quản lý chương trình, level, unit và giáo án chi tiết cho đội ngũ."
        stats={[
          { label: "Chương trình", value: courses.length },
          { label: "Level", value: levels.length },
          { label: "Buổi học", value: lessons.length },
        ]}
      />
      <div className="academy-toolbar card">
        <div>
          <strong>Khu vực biên soạn</strong>
          <div className="muted small">Soạn nháp, xem trước rồi xuất bản sang trang học.</div>
        </div>
        <Link className="btn primary" to="/academy">
          Xem trang học →
        </Link>
      </div>
      {(academy.error || actionError) && <ErrorBox msg={academy.error || actionError || "Có lỗi xảy ra."} />}
      {academy.loading ? (
        <Spinner label="Đang tải Academy…" />
      ) : (
        <>
          <div className="academy-authoring-grid">
            <section className="card academy-authoring-panel">
              <div className="card-title-row">
                <div>
                  <span className="academy-kicker">Cấp 1</span>
                  <h3>Chương trình / Syllabus</h3>
                </div>
                {courseForm.id && (
                  <button className="btn small" onClick={() => setCourseForm({ ...EMPTY_COURSE })}>
                    Tạo mới
                  </button>
                )}
              </div>
              <form onSubmit={submitCourse}>
                <label className="field">
                  <span>Tên chương trình</span>
                  <input
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="Academy Stars Second Edition"
                  />
                </label>
                <label className="field">
                  <span>Mô tả</span>
                  <textarea
                    rows={3}
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  />
                </label>
                <div className="grid2">
                  <label className="field">
                    <span>Bộ phận</span>
                    <input
                      value={courseForm.department}
                      onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Thứ tự</span>
                    <input
                      type="number"
                      value={courseForm.sort_order}
                      onChange={(e) => setCourseForm({ ...courseForm, sort_order: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={courseForm.active}
                    onChange={(e) => setCourseForm({ ...courseForm, active: e.target.checked })}
                  />{" "}
                  Xuất bản chương trình
                </label>
                <button className="btn primary" disabled={busy}>
                  Lưu chương trình
                </button>
              </form>
              <div className="academy-compact-list">
                {courses.map((x) => (
                  <div className={`academy-outline-row ${x.id === courseId ? "active" : ""}`} key={x.id}>
                    <button
                      onClick={() => {
                        setCourseId(x.id);
                        setLevelId(null);
                        setUnitId(null);
                      }}
                    >
                      <strong>{x.title}</strong>
                      <small>{status(x.active)}</small>
                    </button>
                    <button className="btn small" onClick={() => editCourse(x)}>
                      Sửa
                    </button>
                    <button className="btn small danger" onClick={() => remove("course", x.id, x.title)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="card academy-authoring-panel">
              <div className="card-title-row">
                <div>
                  <span className="academy-kicker">Cấp 2</span>
                  <h3>Level</h3>
                </div>
                {levelForm.id && (
                  <button className="btn small" onClick={() => setLevelForm({ ...EMPTY_LEVEL })}>
                    Tạo mới
                  </button>
                )}
              </div>
              {!selectedCourse ? (
                <EmptyState title="Chọn chương trình trước" />
              ) : (
                <>
                  <p className="muted small">
                    Thuộc: <strong>{selectedCourse.title}</strong>
                  </p>
                  <form onSubmit={submitLevel}>
                    <div className="grid2">
                      <label className="field">
                        <span>Tên level</span>
                        <input
                          required
                          value={levelForm.title}
                          onChange={(e) => setLevelForm({ ...levelForm, title: e.target.value })}
                          placeholder="Level 1"
                        />
                      </label>
                      <label className="field">
                        <span>Mã</span>
                        <input
                          value={levelForm.code}
                          onChange={(e) => setLevelForm({ ...levelForm, code: e.target.value })}
                          placeholder="L1"
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>Chuẩn đầu ra</span>
                      <textarea
                        rows={2}
                        value={levelForm.outcome}
                        onChange={(e) => setLevelForm({ ...levelForm, outcome: e.target.value })}
                      />
                    </label>
                    <div className="grid2">
                      <label className="field">
                        <span>Số buổi</span>
                        <input
                          type="number"
                          min={0}
                          value={levelForm.session_count}
                          onChange={(e) => setLevelForm({ ...levelForm, session_count: Number(e.target.value) })}
                        />
                      </label>
                      <label className="field">
                        <span>Thứ tự</span>
                        <input
                          type="number"
                          value={levelForm.sort_order}
                          onChange={(e) => setLevelForm({ ...levelForm, sort_order: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={levelForm.active}
                        onChange={(e) => setLevelForm({ ...levelForm, active: e.target.checked })}
                      />{" "}
                      Xuất bản level
                    </label>
                    <button className="btn primary" disabled={busy}>
                      Lưu level
                    </button>
                  </form>
                  <div className="academy-compact-list">
                    {courseLevels.map((x) => (
                      <div className={`academy-outline-row ${x.id === levelId ? "active" : ""}`} key={x.id}>
                        <button
                          onClick={() => {
                            setLevelId(x.id);
                            setUnitId(null);
                          }}
                        >
                          <strong>{x.title}</strong>
                          <small>
                            {x.session_count} buổi · {status(x.active)}
                          </small>
                        </button>
                        <button className="btn small" onClick={() => editLevel(x)}>
                          Sửa
                        </button>
                        <button className="btn small danger" onClick={() => remove("level", x.id, x.title)}>
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="card academy-authoring-panel">
              <div className="card-title-row">
                <div>
                  <span className="academy-kicker">Cấp 3</span>
                  <h3>Unit</h3>
                </div>
                {unitForm.id && (
                  <button className="btn small" onClick={() => setUnitForm({ ...EMPTY_UNIT })}>
                    Tạo mới
                  </button>
                )}
              </div>
              {!selectedLevel ? (
                <EmptyState title="Chọn level trước" />
              ) : (
                <>
                  <p className="muted small">
                    Thuộc: <strong>{selectedLevel.title}</strong>
                  </p>
                  <form onSubmit={submitUnit}>
                    <div className="grid2">
                      <label className="field">
                        <span>Tên unit</span>
                        <input
                          required
                          value={unitForm.title}
                          onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                          placeholder="Unit 1: My funny friends"
                        />
                      </label>
                      <label className="field">
                        <span>Mã</span>
                        <input
                          value={unitForm.code}
                          onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value })}
                          placeholder="U1"
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>Mô tả</span>
                      <textarea
                        rows={2}
                        value={unitForm.description}
                        onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                      />
                    </label>
                    <div className="grid2">
                      <label className="field">
                        <span>Thứ tự</span>
                        <input
                          type="number"
                          value={unitForm.sort_order}
                          onChange={(e) => setUnitForm({ ...unitForm, sort_order: Number(e.target.value) })}
                        />
                      </label>
                      <label className="check academy-check-bottom">
                        <input
                          type="checkbox"
                          checked={unitForm.active}
                          onChange={(e) => setUnitForm({ ...unitForm, active: e.target.checked })}
                        />{" "}
                        Xuất bản
                      </label>
                    </div>
                    <button className="btn primary" disabled={busy}>
                      Lưu unit
                    </button>
                  </form>
                  <div className="academy-compact-list">
                    {levelUnits.map((x) => (
                      <div className={`academy-outline-row ${x.id === unitId ? "active" : ""}`} key={x.id}>
                        <button onClick={() => setUnitId(x.id)}>
                          <strong>{x.title}</strong>
                          <small>{status(x.active)}</small>
                        </button>
                        <button className="btn small" onClick={() => editUnit(x)}>
                          Sửa
                        </button>
                        <button className="btn small danger" onClick={() => remove("unit", x.id, x.title)}>
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <section className="card academy-lesson-editor">
            <div className="card-title-row">
              <div>
                <span className="academy-kicker">Cấp 4</span>
                <h2>{lessonForm.id ? "Sửa buổi học" : "Tạo buổi học / Lesson plan"}</h2>
                <p className="muted small">
                  {selectedCourse?.title ?? "Chưa chọn chương trình"}
                  {selectedLevel ? ` → ${selectedLevel.title}` : ""}
                  {selectedUnit ? ` → ${selectedUnit.title}` : ""}
                </p>
              </div>
              {lessonForm.id && (
                <button
                  className="btn"
                  onClick={() => setLessonForm({ ...EMPTY_LESSON, objectives: { ...EMPTY_OBJECTIVES } })}
                >
                  Tạo buổi mới
                </button>
              )}
            </div>
            {!selectedCourse ? (
              <EmptyState title="Chọn chương trình trước khi tạo buổi học" />
            ) : (
              <form onSubmit={submitLesson}>
                <div className="academy-form-4">
                  <label className="field">
                    <span>Số buổi</span>
                    <input
                      type="number"
                      min={1}
                      value={lessonForm.session_no ?? ""}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, session_no: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Loại bài</span>
                    <select
                      value={lessonForm.lesson_type}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, lesson_type: e.target.value as AcademyLesson["lesson_type"] })
                      }
                    >
                      <option value="lesson">Bài học</option>
                      <option value="review">Reading / Review</option>
                      <option value="cambridge">Cambridge practice</option>
                      <option value="midterm">Ôn tập giữa kỳ</option>
                      <option value="test">Kiểm tra</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Thời lượng</span>
                    <input
                      type="number"
                      min={1}
                      value={lessonForm.duration_min}
                      onChange={(e) => setLessonForm({ ...lessonForm, duration_min: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Phiên bản</span>
                    <input
                      value={lessonForm.version_label}
                      onChange={(e) => setLessonForm({ ...lessonForm, version_label: e.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Tên bài / buổi học</span>
                  <input
                    required
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="Lesson 1: Vocabulary – My funny friends"
                  />
                </label>
                <label className="field">
                  <span>Tóm tắt</span>
                  <input
                    value={lessonForm.summary}
                    onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })}
                  />
                </label>
                <div className="academy-editor-section">
                  <h3>Mục tiêu bài học</h3>
                  <div className="grid2">
                    {objective("outcome", "Đến cuối buổi học")}
                    {objective("lesson", "Mục tiêu bài học")}
                    {objective("language", "Mục tiêu ngôn ngữ")}
                    {objective("skills", "Mục tiêu kỹ năng")}
                    {objective("pronunciation", "Mục tiêu phát âm")}
                  </div>
                </div>
                <div className="academy-editor-section">
                  <h3>Tiến trình giảng dạy</h3>
                  <label className="field">
                    <span>Các bước dạy</span>
                    <textarea
                      rows={12}
                      value={lessonForm.content}
                      onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                      placeholder={
                        "1. Review từ vựng\n2. Warm-up\n3. Lead-in\n4. Presentation\n5. Pronunciation focus\n6. Practice\n7. Production\n8. Worksheet\n9. Wrap-up & Exit ticket"
                      }
                    />
                  </label>
                </div>
                <div className="academy-editor-section">
                  <h3>Tài liệu & bài tập</h3>
                  <div className="grid2">
                    <label className="field">
                      <span>Tài liệu tham khảo</span>
                      <textarea
                        rows={4}
                        value={lessonForm.references_text}
                        onChange={(e) => setLessonForm({ ...lessonForm, references_text: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Bài tập về nhà</span>
                      <textarea
                        rows={4}
                        value={lessonForm.homework}
                        onChange={(e) => setLessonForm({ ...lessonForm, homework: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Ghi chú cho giáo viên</span>
                    <textarea
                      rows={3}
                      value={lessonForm.teacher_notes}
                      onChange={(e) => setLessonForm({ ...lessonForm, teacher_notes: e.target.value })}
                    />
                  </label>
                </div>
                <div className="academy-editor-section">
                  <h3>Liên kết tài nguyên</h3>
                  <div className="academy-resource-grid">
                    {(
                      [
                        ["video_url", "Video hướng dẫn"],
                        ["resource_url", "Giáo án/PDF"],
                        ["slide_url", "Slide"],
                        ["game_url", "Game"],
                        ["worksheet_url", "Worksheet"],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="field" key={key}>
                        <span>{label}</span>
                        <input
                          type="url"
                          value={lessonForm[key]}
                          onChange={(e) => setLessonForm({ ...lessonForm, [key]: e.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="academy-publish-bar">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={lessonForm.active}
                      onChange={(e) => setLessonForm({ ...lessonForm, active: e.target.checked })}
                    />{" "}
                    Xuất bản buổi học
                  </label>
                  <label className="field inline">
                    <span>Thứ tự</span>
                    <input
                      type="number"
                      value={lessonForm.sort_order}
                      onChange={(e) => setLessonForm({ ...lessonForm, sort_order: Number(e.target.value) })}
                    />
                  </label>
                  <button className="btn primary big" disabled={busy}>
                    {busy ? "Đang lưu…" : "Lưu lesson plan"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="card">
            <div className="card-title-row">
              <h3>Buổi học trong mục đang chọn</h3>
              <span className="muted small">{visibleLessons.length} buổi</span>
            </div>
            {visibleLessons.length === 0 ? (
              <EmptyState title="Chưa có buổi học" body="Chọn chương trình, level/unit rồi tạo lesson plan đầu tiên." />
            ) : (
              <div className="academy-session-table">
                {visibleLessons.map((x) => (
                  <div className="academy-session-row" key={x.id}>
                    <span className={`academy-status-dot ${x.active ? "active" : ""}`} />
                    <div>
                      <strong>
                        {x.session_no ? `Buổi ${x.session_no} · ` : ""}
                        {x.title}
                      </strong>
                      <small>
                        {x.lesson_type} · {x.duration_min} phút · {status(x.active)}
                      </small>
                    </div>
                    <button className="btn small" onClick={() => editLesson(x)}>
                      Sửa chi tiết
                    </button>
                    <button className="btn small danger" onClick={() => remove("lesson", x.id, x.title)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
