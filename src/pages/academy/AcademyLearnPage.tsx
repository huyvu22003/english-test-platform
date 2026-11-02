import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import { getAcademyData, setAcademyLessonCompleted, setAcademyLessonFavorite } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AcademyLesson, AcademyObjectives } from "../../lib/types";
import { useAsync } from "../../lib/useAsync";

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function youtubeEmbed(value: string | null) {
  const url = safeUrl(value);
  if (!url) return null;
  const parsed = new URL(url);
  if (parsed.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
  if (parsed.hostname.endsWith("youtube.com")) {
    const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  return null;
}
const TYPE_LABEL: Record<AcademyLesson["lesson_type"], string> = {
  lesson: "Bài học",
  review: "Reading / Review",
  cambridge: "Cambridge practice",
  midterm: "Ôn tập giữa kỳ",
  test: "Kiểm tra",
};

export default function AcademyLearnPage() {
  const { session, profile, canManageContent, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user.id ?? "";
  const academy = useAsync(() => getAcademyData(userId), [userId]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string>("all");
  const [lessonType, setLessonType] = useState<string>("all");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const courses = useMemo(() => (academy.data?.courses ?? []).filter((x) => x.active), [academy.data]);
  const levels = useMemo(() => (academy.data?.levels ?? []).filter((x) => x.active), [academy.data]);
  const units = useMemo(() => (academy.data?.units ?? []).filter((x) => x.active), [academy.data]);
  const lessons = useMemo(() => (academy.data?.lessons ?? []).filter((x) => x.active), [academy.data]);
  const completed = useMemo(() => new Set(academy.data?.completedLessonIds ?? []), [academy.data]);
  const favorites = useMemo(() => new Set(academy.data?.favoriteLessonIds ?? []), [academy.data]);
  const selectedCourse = courses.find((x) => x.id === courseId) ?? null;
  const courseLevels = levels.filter((x) => x.course_id === courseId);
  const selectedLevel = levels.find((x) => x.id === levelId) ?? null;
  const levelUnits = units.filter((x) => x.level_id === levelId);
  const selectedLesson = lessons.find((x) => x.id === lessonId) ?? null;

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courseId, courses]);
  useEffect(() => {
    if (courseId && courseLevels.length && !courseLevels.some((x) => x.id === levelId)) setLevelId(courseLevels[0].id);
  }, [courseId, courseLevels, levelId]);
  useEffect(() => {
    setUnitId("all");
    setLessonId(null);
  }, [levelId]);

  const visibleLessons = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return lessons.filter((x) => {
      if (x.course_id !== courseId) return false;
      if (levelId && x.level_id !== levelId) return false;
      if (unitId !== "all" && x.unit_id !== unitId) return false;
      if (lessonType !== "all" && x.lesson_type !== lessonType) return false;
      if (favoritesOnly && !favorites.has(x.id)) return false;
      const objectives = Object.values(x.objectives ?? {}).join(" ");
      return (
        !q || `${x.title} ${x.summary} ${x.content} ${x.homework} ${objectives}`.toLocaleLowerCase("vi").includes(q)
      );
    });
  }, [lessons, courseId, levelId, unitId, lessonType, favoritesOnly, favorites, query]);

  const courseLessons = lessons.filter((x) => x.course_id === courseId);
  const completedCount = courseLessons.filter((x) => completed.has(x.id)).length;
  const progress = courseLessons.length ? Math.round((completedCount / courseLessons.length) * 100) : 0;

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
  async function logout() {
    await signOut();
    navigate("/admin/login?next=/academy", { replace: true });
  }

  function objectiveItem(key: keyof AcademyObjectives, label: string) {
    const text = selectedLesson?.objectives?.[key];
    return text ? (
      <div className="academy-objective-item">
        <dt>{label}</dt>
        <dd>{text}</dd>
      </div>
    ) : null;
  }
  const resources = selectedLesson
    ? ([
        [selectedLesson.resource_url, "Xem giáo án chi tiết"],
        [selectedLesson.slide_url, "Chiếu slide"],
        [selectedLesson.game_url, "Chơi game"],
        [selectedLesson.worksheet_url, "Mở worksheet"],
      ].filter(([url]) => safeUrl(url)) as [string, string][])
    : [];
  const embedUrl = youtubeEmbed(selectedLesson?.video_url ?? null);

  return (
    <div className="academy-learn-shell">
      <header className="academy-learn-header">
        <Link to="/academy">
          <Logo height={42} />
        </Link>
        <div className="academy-learn-account">
          <span>
            <strong>{profile?.full_name || session?.user.email}</strong>
            <small>Học viên nội bộ</small>
          </span>
          {canManageContent && (
            <Link className="btn small" to="/admin/academy">
              Quản lý nội dung
            </Link>
          )}
          <button className="btn small" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="academy-learn-main" id="main">
        {academy.loading ? (
          <Spinner label="Đang tải học viện…" />
        ) : (
          <>
            <section className="academy-syllabus-hero">
              <div className="academy-syllabus-top">
                <div>
                  <span className="eyebrow">Syllabus</span>
                  <h1>{selectedCourse?.title || "Internal Academy"}</h1>
                  <p>{selectedCourse?.description || "Giáo án và tài liệu đào tạo nội bộ."}</p>
                </div>
                <div className="academy-syllabus-actions">
                  {courses.length > 1 && (
                    <select
                      aria-label="Chọn chương trình"
                      value={courseId ?? ""}
                      onChange={(e) => {
                        setCourseId(e.target.value);
                        setLevelId(null);
                        setLessonId(null);
                      }}
                    >
                      <option value="" disabled>
                        Chọn chương trình
                      </option>
                      {courses.map((x) => (
                        <option value={x.id} key={x.id}>
                          {x.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="academy-progress-ring">
                    <strong>{progress}%</strong>
                    <small>hoàn thành</small>
                  </div>
                </div>
              </div>
              <div className="academy-level-tabs" role="tablist" aria-label="Chọn level">
                {courseLevels.map((x) => (
                  <button key={x.id} className={x.id === levelId ? "active" : ""} onClick={() => setLevelId(x.id)}>
                    <span>{x.title}</span>
                    <small>
                      {x.session_count || lessons.filter((lesson) => lesson.level_id === x.id).length} buổi
                      {x.outcome ? ` · ${x.outcome}` : ""}
                    </small>
                  </button>
                ))}
              </div>
              <div className="academy-syllabus-search">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm từ vựng, ngữ pháp, dạng đề…"
                />
              </div>
            </section>

            <section className="academy-filter-bar card">
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="all">Tất cả unit</option>
                {levelUnits.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
              <div className="academy-type-tabs">
                <button className={lessonType === "all" ? "active" : ""} onClick={() => setLessonType("all")}>
                  Tất cả
                </button>
                {Object.entries(TYPE_LABEL).map(([key, label]) => (
                  <button key={key} className={lessonType === key ? "active" : ""} onClick={() => setLessonType(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="check">
                <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />{" "}
                Yêu thích
              </label>
              <span className="muted small">{visibleLessons.length} buổi</span>
            </section>

            {(academy.error || actionError) && <ErrorBox msg={academy.error || actionError || "Có lỗi xảy ra."} />}
            {!selectedCourse ? (
              <EmptyState title="Chưa có chương trình được xuất bản" />
            ) : selectedLesson ? (
              <article className="academy-detail-layout">
                <section className="card academy-session-plan">
                  <button className="btn ghost small" onClick={() => setLessonId(null)}>
                    ← Danh sách buổi học
                  </button>
                  <div className="academy-lesson-heading">
                    <div>
                      <span className="pill">
                        {TYPE_LABEL[selectedLesson.lesson_type]} · Buổi {selectedLesson.session_no ?? "—"}
                      </span>
                      <h2>{selectedLesson.title}</h2>
                      <p className="muted">{selectedLesson.summary}</p>
                    </div>
                    <button className="btn small" onClick={() => toggleFavorite(selectedLesson)}>
                      {favorites.has(selectedLesson.id) ? "★ Đã yêu thích" : "☆ Yêu thích"}
                    </button>
                  </div>
                  {embedUrl && (
                    <div className="academy-video">
                      <iframe src={embedUrl} title={`Video: ${selectedLesson.title}`} allowFullScreen />
                    </div>
                  )}
                  <div className="academy-content academy-procedure">
                    <h3>Tiến trình giảng dạy</h3>
                    {selectedLesson.content || "Bài học chưa có tiến trình."}
                  </div>
                  {resources.length > 0 && (
                    <div className="academy-resource-actions">
                      {resources.map(([url, label]) => (
                        <a className="btn" href={url} target="_blank" rel="noreferrer" key={label}>
                          {label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                  {selectedLesson.homework && (
                    <section className="academy-homework">
                      <h3>● Bài tập về nhà</h3>
                      <div>{selectedLesson.homework}</div>
                    </section>
                  )}
                  {selectedLesson.teacher_notes && (
                    <section className="academy-teacher-note">
                      <h3>Ghi chú cho giáo viên</h3>
                      <div>{selectedLesson.teacher_notes}</div>
                    </section>
                  )}
                </section>
                <aside className="card academy-objectives-panel">
                  <h3>LESSON PLAN · SESSION {selectedLesson.session_no ?? "—"}</h3>
                  <p className="muted">
                    {selectedLevel?.title} · {levelUnits.find((x) => x.id === selectedLesson.unit_id)?.title}
                  </p>
                  <dl>
                    <div className="academy-objective-item">
                      <dt>Thời lượng</dt>
                      <dd>{selectedLesson.duration_min} phút</dd>
                    </div>
                    {selectedLesson.references_text && (
                      <div className="academy-objective-item">
                        <dt>Tài liệu tham khảo</dt>
                        <dd>{selectedLesson.references_text}</dd>
                      </div>
                    )}
                    {objectiveItem("outcome", "Mục tiêu cuối buổi")}
                    {objectiveItem("lesson", "Mục tiêu bài học")}
                    {objectiveItem("language", "Mục tiêu ngôn ngữ")}
                    {objectiveItem("skills", "Mục tiêu kỹ năng")}
                    {objectiveItem("pronunciation", "Mục tiêu phát âm")}
                  </dl>
                  <button
                    className={`btn big ${completed.has(selectedLesson.id) ? "" : "primary"}`}
                    onClick={() => toggleCompleted(selectedLesson)}
                  >
                    {completed.has(selectedLesson.id) ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
                  </button>
                </aside>
              </article>
            ) : (
              <section className="academy-session-cards">
                {visibleLessons.length === 0 ? (
                  <EmptyState
                    title="Chưa có buổi học phù hợp"
                    body="Thử thay đổi bộ lọc hoặc quay lại khi quản lý xuất bản nội dung."
                  />
                ) : (
                  visibleLessons.map((x) => (
                    <article className="card academy-session-card" key={x.id}>
                      <div className="academy-session-card-head">
                        <span className={`academy-step ${completed.has(x.id) ? "done" : ""}`}>
                          {completed.has(x.id) ? "✓" : (x.session_no ?? "•")}
                        </span>
                        <div>
                          <span className="academy-course-department">{TYPE_LABEL[x.lesson_type]}</span>
                          <h3>{x.title}</h3>
                          <p>{x.summary}</p>
                        </div>
                        <button
                          className="academy-favorite-button"
                          onClick={() => toggleFavorite(x)}
                          aria-label="Yêu thích"
                        >
                          {favorites.has(x.id) ? "★" : "☆"}
                        </button>
                      </div>
                      <div className="academy-session-card-meta">
                        <span>{x.duration_min} phút</span>
                        <span>v{x.version_label}</span>
                        <button className="btn primary small" onClick={() => setLessonId(x.id)}>
                          Xem giáo án →
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
