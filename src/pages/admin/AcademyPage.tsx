import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import {
  deleteAcademyCourse,
  deleteAcademyLesson,
  getAcademyData,
  saveAcademyCourse,
  saveAcademyLesson,
  setAcademyLessonCompleted,
  setAcademyLessonFavorite,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AcademyCourse, AcademyLesson } from "../../lib/types";
import { useAsync } from "../../lib/useAsync";

const EMPTY_COURSE = {
  title: "",
  description: "",
  department: "academic",
  cover_url: "",
  active: false,
  sort_order: 0,
};

const EMPTY_LESSON = {
  title: "",
  summary: "",
  content: "",
  video_url: "",
  resource_url: "",
  duration_min: 5,
  version_label: "1.0",
  active: false,
  sort_order: 0,
};

function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function validHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function AcademyPage() {
  const { session, canManageContent } = useAuth();
  const userId = session?.user.id ?? "";
  const academy = useAsync(() => getAcademyData(userId), [userId]);
  const [view, setView] = useState<"learn" | "manage">("learn");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({ ...EMPTY_COURSE } as typeof EMPTY_COURSE & { id?: string });
  const [lessonForm, setLessonForm] = useState({ ...EMPTY_LESSON } as typeof EMPTY_LESSON & { id?: string });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const courses = useMemo(() => academy.data?.courses ?? [], [academy.data]);
  const lessons = useMemo(() => academy.data?.lessons ?? [], [academy.data]);
  const completed = useMemo(() => new Set(academy.data?.completedLessonIds ?? []), [academy.data]);
  const favorites = useMemo(() => new Set(academy.data?.favoriteLessonIds ?? []), [academy.data]);

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courseId, courses]);

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return courses.filter((course) => {
      const courseLessons = lessons.filter((lesson) => lesson.course_id === course.id);
      const matches =
        !q ||
        `${course.title} ${course.description} ${course.department} ${courseLessons.map((x) => `${x.title} ${x.summary}`).join(" ")}`
          .toLocaleLowerCase("vi")
          .includes(q);
      const hasFavorite = !favoritesOnly || courseLessons.some((lesson) => favorites.has(lesson.id));
      return matches && hasFavorite;
    });
  }, [courses, lessons, query, favoritesOnly, favorites]);

  const selectedCourse = courses.find((x) => x.id === courseId) ?? null;
  const courseLessons = lessons.filter((x) => x.course_id === selectedCourse?.id);
  const selectedLesson = lessons.find((x) => x.id === lessonId) ?? null;
  const totalPublished = lessons.filter((x) => x.active).length;
  const completedPublished = lessons.filter((x) => x.active && completed.has(x.id)).length;
  const progress = totalPublished ? Math.round((completedPublished / totalPublished) * 100) : 0;

  function chooseCourse(id: string) {
    setCourseId(id);
    setLessonId(null);
  }

  async function toggleCompleted(lesson: AcademyLesson) {
    setActionError(null);
    try {
      await setAcademyLessonCompleted(userId, lesson.id, !completed.has(lesson.id));
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  async function toggleFavorite(lesson: AcademyLesson) {
    setActionError(null);
    try {
      await setAcademyLessonFavorite(userId, lesson.id, !favorites.has(lesson.id));
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  function editCourse(course: AcademyCourse) {
    setCourseId(course.id);
    setCourseForm({
      id: course.id,
      title: course.title,
      description: course.description,
      department: course.department,
      cover_url: course.cover_url ?? "",
      active: course.active,
      sort_order: course.sort_order,
    });
  }

  function editLesson(lesson: AcademyLesson) {
    setCourseId(lesson.course_id);
    setLessonForm({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      content: lesson.content,
      video_url: lesson.video_url ?? "",
      resource_url: lesson.resource_url ?? "",
      duration_min: lesson.duration_min,
      version_label: lesson.version_label,
      active: lesson.active,
      sort_order: lesson.sort_order,
    });
  }

  async function submitCourse(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      const saved = await saveAcademyCourse(courseForm, userId);
      setCourseId(saved.id);
      setCourseForm({ ...EMPTY_COURSE });
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitLesson(event: React.FormEvent) {
    event.preventDefault();
    if (!courseId) return;
    setBusy(true);
    setActionError(null);
    try {
      await saveAcademyLesson({ ...lessonForm, course_id: courseId }, userId);
      setLessonForm({ ...EMPTY_LESSON });
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeCourse(course: AcademyCourse) {
    if (!window.confirm(`Xóa khóa học “${course.title}” và toàn bộ bài học?`)) return;
    setActionError(null);
    try {
      await deleteAcademyCourse(course.id);
      if (courseId === course.id) setCourseId(null);
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  async function removeLesson(lesson: AcademyLesson) {
    if (!window.confirm(`Xóa bài học “${lesson.title}”?`)) return;
    setActionError(null);
    try {
      await deleteAcademyLesson(lesson.id);
      academy.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  const embedUrl = youtubeEmbed(selectedLesson?.video_url ?? null);
  const videoUrl = validHttpUrl(selectedLesson?.video_url ?? null);
  const resourceUrl = validHttpUrl(selectedLesson?.resource_url ?? null);

  return (
    <div className="admin-page academy-page">
      <AdminPageHeader
        eyebrow="Internal Academy"
        title="Học viện nội bộ"
        subtitle="Giáo án, video và hướng dẫn từng bước dành cho đội ngũ IELTS Ms. Trà My."
        stats={[
          { label: "Khóa học", value: courses.filter((x) => x.active).length },
          { label: "Bài đã học", value: `${completedPublished}/${totalPublished}` },
          { label: "Tiến độ", value: `${progress}%` },
        ]}
      />

      <div className="academy-toolbar card">
        <div className="academy-view-tabs" role="tablist" aria-label="Chế độ Internal Academy">
          <button className={`btn ${view === "learn" ? "primary" : ""}`} onClick={() => setView("learn")}>
            Học tập
          </button>
          {canManageContent && (
            <button className={`btn ${view === "manage" ? "primary" : ""}`} onClick={() => setView("manage")}>
              Quản lý nội dung
            </button>
          )}
        </div>
        {view === "learn" && (
          <div className="academy-search-row">
            <input
              aria-label="Tìm khóa học hoặc bài học"
              placeholder="Tìm giáo án, bài học, chủ đề…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="check">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Chỉ
              mục yêu thích
            </label>
          </div>
        )}
      </div>

      {(academy.error || actionError) && <ErrorBox msg={academy.error || actionError || "Có lỗi xảy ra."} />}
      {academy.loading ? (
        <Spinner label="Đang tải học viện…" />
      ) : view === "learn" ? (
        <div className="academy-layout">
          <aside className="academy-course-list card" aria-label="Danh sách khóa học">
            <div className="card-title-row compact">
              <h3>Khóa học</h3>
              <span className="muted small">{visibleCourses.length}</span>
            </div>
            {visibleCourses.length === 0 ? (
              <EmptyState
                title="Chưa có khóa học phù hợp"
                body="Thử bỏ bộ lọc hoặc quay lại sau khi quản lý xuất bản nội dung."
              />
            ) : (
              visibleCourses.map((course) => {
                const items = lessons.filter((x) => x.course_id === course.id && x.active);
                const done = items.filter((x) => completed.has(x.id)).length;
                return (
                  <button
                    key={course.id}
                    className={`academy-course-button ${course.id === courseId ? "active" : ""}`}
                    onClick={() => chooseCourse(course.id)}
                  >
                    <span className="academy-course-department">{course.department}</span>
                    <strong>{course.title}</strong>
                    <span>
                      {done}/{items.length} bài hoàn thành
                    </span>
                  </button>
                );
              })
            )}
          </aside>

          <section className="academy-main">
            {!selectedCourse ? (
              <EmptyState title="Chọn một khóa học" body="Nội dung bài học sẽ hiển thị tại đây." />
            ) : selectedLesson ? (
              <article className="card academy-lesson-detail">
                <button className="btn ghost small" onClick={() => setLessonId(null)}>
                  ← Danh sách bài học
                </button>
                <div className="academy-lesson-heading">
                  <div>
                    <span className="pill">Phiên bản {selectedLesson.version_label}</span>
                    <h2>{selectedLesson.title}</h2>
                    <p className="muted">{selectedLesson.summary}</p>
                  </div>
                  <button
                    className="btn small"
                    aria-label="Đánh dấu yêu thích"
                    onClick={() => toggleFavorite(selectedLesson)}
                  >
                    {favorites.has(selectedLesson.id) ? "★ Đã yêu thích" : "☆ Yêu thích"}
                  </button>
                </div>
                {embedUrl ? (
                  <div className="academy-video">
                    <iframe
                      src={embedUrl}
                      title={`Video: ${selectedLesson.title}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : videoUrl ? (
                  <a className="btn" href={videoUrl} target="_blank" rel="noreferrer">
                    Mở video hướng dẫn ↗
                  </a>
                ) : null}
                <div className="academy-content">{selectedLesson.content || "Bài học chưa có nội dung văn bản."}</div>
                {resourceUrl && (
                  <a className="btn" href={resourceUrl} target="_blank" rel="noreferrer">
                    Xem tài liệu trực tuyến ↗
                  </a>
                )}
                <div className="academy-complete-bar">
                  <span>Thời lượng dự kiến: {selectedLesson.duration_min} phút</span>
                  <button
                    className={`btn ${completed.has(selectedLesson.id) ? "" : "primary"}`}
                    onClick={() => toggleCompleted(selectedLesson)}
                  >
                    {completed.has(selectedLesson.id) ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
                  </button>
                </div>
              </article>
            ) : (
              <div className="card">
                <div className="academy-course-hero">
                  <div>
                    <span className="academy-course-department">{selectedCourse.department}</span>
                    <h2>{selectedCourse.title}</h2>
                    <p>{selectedCourse.description}</p>
                  </div>
                </div>
                <div className="academy-lesson-list">
                  {courseLessons.filter((x) => x.active).length === 0 ? (
                    <EmptyState title="Khóa học chưa có bài được xuất bản" />
                  ) : (
                    courseLessons
                      .filter((x) => x.active)
                      .map((lesson, index) => (
                        <button key={lesson.id} className="academy-lesson-row" onClick={() => setLessonId(lesson.id)}>
                          <span className={`academy-step ${completed.has(lesson.id) ? "done" : ""}`}>
                            {completed.has(lesson.id) ? "✓" : index + 1}
                          </span>
                          <span className="academy-lesson-copy">
                            <strong>{lesson.title}</strong>
                            <span>{lesson.summary || "Hướng dẫn chi tiết"}</span>
                          </span>
                          <span className="academy-lesson-meta">
                            {favorites.has(lesson.id) ? "★ " : ""}
                            {lesson.duration_min} phút ›
                          </span>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : canManageContent ? (
        <div className="academy-manage-grid">
          <section>
            <form className="card" onSubmit={submitCourse}>
              <div className="card-title-row">
                <div>
                  <h3>{courseForm.id ? "Sửa khóa học" : "Tạo khóa học"}</h3>
                  <p className="muted small">Nên bắt đầu với Giáo viên - Academic.</p>
                </div>
                {courseForm.id && (
                  <button type="button" className="btn small" onClick={() => setCourseForm({ ...EMPTY_COURSE })}>
                    Tạo mới
                  </button>
                )}
              </div>
              <label className="field">
                <span>Tên khóa học</span>
                <input
                  required
                  minLength={2}
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
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
                Xuất bản cho nhân sự
              </label>
              <button className="btn primary" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu khóa học"}
              </button>
            </form>
            <div className="card">
              <h3>Danh sách khóa học</h3>
              {courses.map((course) => (
                <div className="academy-manage-row" key={course.id}>
                  <button className="academy-manage-select" onClick={() => setCourseId(course.id)}>
                    <strong>{course.title}</strong>
                    <span>{course.active ? "Đang xuất bản" : "Bản nháp"}</span>
                  </button>
                  <button className="btn small" onClick={() => editCourse(course)}>
                    Sửa
                  </button>
                  <button className="btn small danger" onClick={() => removeCourse(course)}>
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section>
            {!selectedCourse ? (
              <EmptyState title="Chọn hoặc tạo khóa học trước" />
            ) : (
              <>
                <form className="card" onSubmit={submitLesson}>
                  <div className="card-title-row">
                    <div>
                      <h3>{lessonForm.id ? "Sửa bài học" : "Thêm bài học"}</h3>
                      <p className="muted small">Thuộc: {selectedCourse.title}</p>
                    </div>
                    {lessonForm.id && (
                      <button type="button" className="btn small" onClick={() => setLessonForm({ ...EMPTY_LESSON })}>
                        Tạo mới
                      </button>
                    )}
                  </div>
                  <label className="field">
                    <span>Tên bài học</span>
                    <input
                      required
                      minLength={2}
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Tóm tắt</span>
                    <input
                      value={lessonForm.summary}
                      onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Nội dung/hướng dẫn từng bước</span>
                    <textarea
                      rows={9}
                      value={lessonForm.content}
                      onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                      placeholder="Bước 1…\nBước 2…"
                    />
                  </label>
                  <div className="grid2">
                    <label className="field">
                      <span>Link video (YouTube)</span>
                      <input
                        type="url"
                        value={lessonForm.video_url}
                        onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Link tài liệu xem online</span>
                      <input
                        type="url"
                        value={lessonForm.resource_url}
                        onChange={(e) => setLessonForm({ ...lessonForm, resource_url: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="academy-form-3">
                    <label className="field">
                      <span>Thời lượng (phút)</span>
                      <input
                        type="number"
                        min={1}
                        max={180}
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
                    <label className="field">
                      <span>Thứ tự</span>
                      <input
                        type="number"
                        value={lessonForm.sort_order}
                        onChange={(e) => setLessonForm({ ...lessonForm, sort_order: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={lessonForm.active}
                      onChange={(e) => setLessonForm({ ...lessonForm, active: e.target.checked })}
                    />{" "}
                    Xuất bản bài học
                  </label>
                  <button className="btn primary" disabled={busy}>
                    {busy ? "Đang lưu…" : "Lưu bài học"}
                  </button>
                </form>
                <div className="card">
                  <h3>Bài học trong khóa</h3>
                  {courseLessons.length === 0 ? (
                    <EmptyState title="Chưa có bài học" />
                  ) : (
                    courseLessons.map((lesson) => (
                      <div className="academy-manage-row" key={lesson.id}>
                        <div className="academy-manage-select">
                          <strong>{lesson.title}</strong>
                          <span>{lesson.active ? `Đã xuất bản · v${lesson.version_label}` : "Bản nháp"}</span>
                        </div>
                        <button className="btn small" onClick={() => editLesson(lesson)}>
                          Sửa
                        </button>
                        <button className="btn small danger" onClick={() => removeLesson(lesson)}>
                          Xóa
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
