import { useMemo } from "react";
import {
  listClasses,
  listClassTeachers,
  listProfiles,
  listSessions,
  listStudents,
  listSubmissions,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useAsync } from "../../lib/useAsync";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import type { ClassRow, ClassTeacher, ExamSession, Profile, Student, Submission } from "../../lib/types";

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function isPending(s: Submission): boolean {
  return s.status === "submitted" || s.status === "assigned" || s.status === "in_review";
}

function classNameForSubmission(s: Submission, students: Student[], classes: ClassRow[]): string {
  const student = students.find(
    (x) =>
      x.id === s.student_id ||
      (!!x.email && !!s.student_email && x.email.toLowerCase() === s.student_email.toLowerCase()),
  );
  const c = classes.find((x) => x.id === student?.class_id);
  return c?.name ?? "Chưa xếp lớp";
}

export default function OperationsPage() {
  const { isAdmin } = useAuth();
  const subs = useAsync<Submission[]>(listSubmissions, []);
  const students = useAsync<Student[]>(listStudents, []);
  const classes = useAsync<ClassRow[]>(listClasses, []);
  const sessions = useAsync<ExamSession[]>(() => (isAdmin ? listSessions() : Promise.resolve([])), [isAdmin]);
  const profiles = useAsync<Profile[]>(listProfiles, []);
  const classTeachers = useAsync<ClassTeacher[]>(listClassTeachers, []);

  const loading =
    subs.loading ||
    students.loading ||
    classes.loading ||
    sessions.loading ||
    profiles.loading ||
    classTeachers.loading;
  const allSubs = subs.data ?? [];
  const pending = allSubs.filter(isPending);
  const overdue = pending.filter((s) => Date.now() - new Date(s.submitted_at).getTime() > 36 * 60 * 60 * 1000);
  const unassignedStudents = (students.data ?? []).filter((s) => !s.class_id).length;
  const noCodeStudents = (students.data ?? []).filter((s) => !s.code).length;
  const openSessions = (sessions.data ?? []).filter((s) => {
    const now = Date.now();
    return (
      (!s.open_at || now >= new Date(s.open_at).getTime()) && (!s.close_at || now <= new Date(s.close_at).getTime())
    );
  });

  const teacherWorkload = useMemo(() => {
    const teachers = (profiles.data ?? []).filter(
      (p) => p.active !== false && ["owner", "admin", "teacher", "grader"].includes(p.role),
    );
    return teachers
      .map((p) => {
        const assigned = allSubs.filter((s) => s.assigned_to === p.id && isPending(s));
        const graded = allSubs.filter((s) => s.assigned_to === p.id && s.status === "graded");
        const assignedClasses = (classTeachers.data ?? []).filter((x) => x.teacher_id === p.id).length;
        return { profile: p, assigned: assigned.length, graded: graded.length, assignedClasses };
      })
      .sort((a, b) => b.assigned - a.assigned);
  }, [allSubs, profiles.data, classTeachers.data]);

  const classRows = useMemo(() => {
    return (classes.data ?? [])
      .map((c) => {
        const classStudents = (students.data ?? []).filter((s) => s.class_id === c.id);
        const emails = new Set(classStudents.map((s) => s.email?.toLowerCase()).filter(Boolean));
        const ids = new Set(classStudents.map((s) => s.id));
        const classSubs = allSubs.filter(
          (s) =>
            (!!s.student_id && ids.has(s.student_id)) ||
            (!!s.student_email && emails.has(s.student_email.toLowerCase())),
        );
        const classPending = classSubs.filter(isPending);
        const teachers = (classTeachers.data ?? [])
          .filter((x) => x.class_id === c.id)
          .map(
            (x) =>
              profiles.data?.find((p) => p.id === x.teacher_id)?.full_name ||
              profiles.data?.find((p) => p.id === x.teacher_id)?.email ||
              "GV",
          )
          .join(", ");
        return {
          className: c.name,
          students: classStudents.length,
          pending: classPending.length,
          graded: classSubs.filter((s) => s.status === "graded").length,
          avgBand: avg(classSubs.map((s) => s.overall_band ?? s.band ?? null).filter((n): n is number => n != null)),
          teachers: teachers || "Chưa gán",
        };
      })
      .sort((a, b) => b.pending - a.pending || a.className.localeCompare(b.className));
  }, [allSubs, classes.data, students.data, classTeachers.data, profiles.data]);

  const errors = [subs.error, students.error, classes.error, sessions.error, profiles.error, classTeachers.error]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="admin-page operations-page">
      <header className="admin-page-head">
        <div>
          <span className="eyebrow dark">Operations</span>
          <h1>Tổng quan vận hành</h1>
          <p className="muted small">Theo dõi tồn bài, phân lớp, workload giáo viên và các buổi thi đang mở.</p>
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="Tổng quan vận hành">
        <div className="admin-stat-card urgent">
          <span>Bài chờ xử lý</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="admin-stat-card urgent">
          <span>Quá 36 giờ</span>
          <strong>{overdue.length}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Học viên chưa xếp lớp</span>
          <strong>{unassignedStudents}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Buổi thi đang mở</span>
          <strong>{openSessions.length}</strong>
        </div>
      </section>

      {loading && <Spinner />}
      {errors && <ErrorBox msg={errors} />}

      <div className="grid2 admin-split-grid">
        <section className="card admin-form-card ops-card">
          <div className="card-title-row compact">
            <div>
              <h3>Workload giáo viên</h3>
              <p className="muted small">Dựa trên bài được giao và số lớp phụ trách.</p>
            </div>
          </div>
          {teacherWorkload.length === 0 ? (
            <EmptyState
              title="Chưa có hồ sơ giáo viên"
              body="Sau khi tài khoản giáo viên đăng nhập hoặc profile được tạo, danh sách sẽ hiện tại đây."
            />
          ) : (
            <table className="table compact-table">
              <thead>
                <tr>
                  <th>Giáo viên</th>
                  <th>Đang chấm</th>
                  <th>Đã chấm</th>
                  <th>Lớp</th>
                </tr>
              </thead>
              <tbody>
                {teacherWorkload.map((x) => (
                  <tr key={x.profile.id}>
                    <td>
                      <strong>{x.profile.full_name || x.profile.email}</strong>
                      <div className="muted small">{x.profile.role}</div>
                    </td>
                    <td>{x.assigned}</td>
                    <td>{x.graded}</td>
                    <td>{x.assignedClasses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card admin-form-card ops-card">
          <div className="card-title-row compact">
            <div>
              <h3>Cảnh báo nhanh</h3>
              <p className="muted small">Các điểm cần dọn để vận hành ổn định.</p>
            </div>
          </div>
          <ul className="ops-alert-list">
            <li>
              <strong>{pending.length}</strong>
              <span>bài chưa hoàn tất chấm/duyệt.</span>
            </li>
            <li>
              <strong>{overdue.length}</strong>
              <span>bài đã chờ quá 36 giờ.</span>
            </li>
            <li>
              <strong>{unassignedStudents}</strong>
              <span>học viên chưa được xếp lớp.</span>
            </li>
            <li>
              <strong>{noCodeStudents}</strong>
              <span>học viên chưa có mã HV.</span>
            </li>
            <li>
              <strong>{openSessions.length}</strong>
              <span>buổi thi đang mở.</span>
            </li>
          </ul>
        </section>
      </div>

      <section className="card table-wrap ops-table-card">
        <div className="ops-table-head">
          <h3>Theo lớp</h3>
          <p className="muted small">Ưu tiên xử lý các lớp có nhiều bài đang chờ.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Lớp</th>
              <th>Giáo viên phụ trách</th>
              <th>Học viên</th>
              <th>Chờ chấm</th>
              <th>Đã chấm</th>
              <th>Band TB</th>
            </tr>
          </thead>
          <tbody>
            {classRows.map((r) => (
              <tr key={r.className}>
                <td>
                  <strong>{r.className}</strong>
                </td>
                <td className="small">{r.teachers}</td>
                <td>{r.students}</td>
                <td>{r.pending}</td>
                <td>{r.graded}</td>
                <td>{r.avgBand ?? "—"}</td>
              </tr>
            ))}
            {classRows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Chưa có lớp để thống kê.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {pending.length > 0 && (
        <section className="card table-wrap ops-table-card">
          <div className="ops-table-head">
            <h3>Bài cần xử lý gần nhất</h3>
            <p className="muted small">Danh sách nhanh để quản lý biết bài nào đang tồn.</p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Nộp lúc</th>
                <th>Học viên</th>
                <th>Lớp</th>
                <th>Chủ đề</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pending.slice(0, 12).map((s) => (
                <tr key={s.id}>
                  <td className="small">{new Date(s.submitted_at).toLocaleString("vi-VN")}</td>
                  <td>
                    {s.student_name}
                    <div className="muted small">{s.student_email}</div>
                  </td>
                  <td>{classNameForSubmission(s, students.data ?? [], classes.data ?? [])}</td>
                  <td>{s.topic_name}</td>
                  <td>
                    <span className="pill off small">
                      {s.status === "submitted" ? "Chờ chấm" : s.status === "assigned" ? "Đã giao" : "Cần review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
