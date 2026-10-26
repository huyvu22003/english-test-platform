import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import { getAcademyData, setAcademyLessonCompleted, setAcademyLessonFavorite } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { AcademyLesson } from "../../lib/types";
import { useAsync } from "../../lib/useAsync";

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

export default function AcademyLearnPage() {
  const { session, profile, canManageContent, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user.id ?? "";
  const academy = useAsync(() => getAcademyData(userId), [userId]);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const courses = useMemo(() => (academy.data?.courses ?? []).filter((course) => course.active), [academy.data]);
  const lessons = useMemo(() => (academy.data?.lessons ?? []).filter((lesson) => lesson.active), [academy.data]);
  const completed = useMemo(() => new Set(academy.data?.completedLessonIds ?? []), [academy.data]);
  const favorites = useMemo(() => new Set(academy.data?.favoriteLessonIds ?? []), [academy.data]);

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courseId, courses]);

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return courses.filter((course) => {
      const items = lessons.filter((lesson) => lesson.course_id === course.id);
      const haystack = `${course.title} ${course.description} ${course.department} ${items
        .map((lesson) => `${lesson.title} ${lesson.summary}`)
        .join(" ")}`.toLocaleLowerCase("vi");
      return (!q || haystack.includes(q)) && (!favoritesOnly || items.some((lesson) => favorites.has(lesson.id)));
    });
  }, [courses, lessons, query, favoritesOnly, favorites]);

  const selectedCourse = courses.find((course) => course.id === courseId) ?? null;
  const courseLessons = lessons.filter((lesson) => lesson.course_id === selectedCourse?.id);
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId) ?? null;
  const completedCount = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const progress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const nextLesson = lessons.find((lesson) => !completed.has(lesson.id)) ?? lessons[0] ?? null;

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

  const embedUrl = youtubeEmbed(selectedLesson?.video_url ?? null);
  const videoUrl = validHttpUrl(selectedLesson?.video_url ?? null);
  const resourceUrl = validHttpUrl(selectedLesson?.resource_url ?? null);

  return (
    <div className="academy-learn-shell">
      <header className="academy-learn-header">
        <Link to="/academy" aria-label="Trang chủ Học viện nội bộ">
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
        <section className="academy-learn-hero">
          <div>
            <span className="eyebrow">Internal Academy</span>
            <h1>Chào {profile?.full_name?.split(" ").pop() || "bạn"}, hôm nay mình học gì?</h1>
            <p>Giáo án, video và quy trình chuẩn dành cho đội ngũ IELTS Ms. Trà My.</p>
          </div>
          {nextLesson && (
            <button
              className="btn primary big"
              onClick={() => {
                setCourseId(nextLesson.course_id);
                setLessonId(nextLesson.id);
              }}
            >
              {completedCount ? "Tiếp tục học" : "Bắt đầu học"} →
            </button>
          )}
        </section>

        <section className="academy-learn-stats" aria-label="Tiến độ học tập">
          <div className="card">
            <span>Khóa học</span>
            <strong>{courses.length}</strong>
          </div>
          <div className="card">
            <span>Bài đã hoàn thành</span>
            <strong>
              {completedCount}/{lessons.length}
            </strong>
          </div>
          <div className="card academy-progress-stat">
            <span>Tiến độ tổng</span>
            <strong>{progress}%</strong>
            <div className="academy-progress-track">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <section className="academy-learn-tools card">
          <input
            aria-label="Tìm khóa học hoặc bài học"
            placeholder="Tìm giáo án, bài học, chủ đề…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />
            Chỉ mục yêu thích
          </label>
        </section>

        {(academy.error || actionError) && <ErrorBox msg={academy.error || actionError || "Có lỗi xảy ra."} />}
        {academy.loading ? (
          <Spinner label="Đang tải học viện…" />
        ) : (
          <div className="academy-layout">
            <aside className="academy-course-list card" aria-label="Danh sách khóa học">
              <div className="card-title-row compact">
                <h3>Khóa học của tôi</h3>
                <span className="muted small">{visibleCourses.length}</span>
              </div>
              {visibleCourses.length === 0 ? (
                <EmptyState
                  title="Chưa có khóa học phù hợp"
                  body="Thử bỏ bộ lọc hoặc quay lại sau khi quản lý xuất bản nội dung."
                />
              ) : (
                visibleCourses.map((course) => {
                  const items = lessons.filter((lesson) => lesson.course_id === course.id);
                  const done = items.filter((lesson) => completed.has(lesson.id)).length;
                  return (
                    <button
                      key={course.id}
                      className={`academy-course-button ${course.id === courseId ? "active" : ""}`}
                      onClick={() => {
                        setCourseId(course.id);
                        setLessonId(null);
                      }}
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
                    <button className="btn small" onClick={() => toggleFavorite(selectedLesson)}>
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
                    <span className="academy-course-department">{selectedCourse.department}</span>
                    <h2>{selectedCourse.title}</h2>
                    <p>{selectedCourse.description}</p>
                  </div>
                  <div className="academy-lesson-list">
                    {courseLessons.length === 0 ? (
                      <EmptyState title="Khóa học chưa có bài được xuất bản" />
                    ) : (
                      courseLessons.map((lesson, index) => (
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
        )}
      </main>
    </div>
  );
}
