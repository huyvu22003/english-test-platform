// Chẩn đoán: trung bình 4 tiêu chí IELTS theo LỚP và theo HỌC VIÊN, làm nổi bật
// tiêu chí YẾU NHẤT để giáo viên biết cần ôn gì. Tính từ các bài ĐÃ CHẤM.
import { useMemo, useState } from "react";
import { listClasses, listStudents, listSubmissions } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import type { ClassRow, Student, Submission } from "../../lib/types";

const CRIT = [
  { key: "score_tr", label: "Task Response", short: "TR" },
  { key: "score_cc", label: "Coherence & Cohesion", short: "CC" },
  { key: "score_lr", label: "Lexical Resource", short: "LR" },
  { key: "score_gra", label: "Grammar", short: "GRA" },
] as const;

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export default function DiagnosticsPage() {
  const subs = useAsync<Submission[]>(listSubmissions, []);
  const students = useAsync<Student[]>(listStudents, []);
  const classes = useAsync<ClassRow[]>(listClasses, []);
  const [classId, setClassId] = useState("");

  // email -> class_id (nối bài làm vào lớp qua hồ sơ học viên)
  const emailClass = useMemo(() => {
    const m = new Map<string, string | null>();
    students.data?.forEach((s) => {
      if (s.email) m.set(s.email.toLowerCase(), s.class_id);
    });
    return m;
  }, [students.data]);

  const graded = useMemo(
    () => (subs.data ?? []).filter((s) => s.status === "graded" && s.score_tr != null),
    [subs.data],
  );

  const filtered = useMemo(() => {
    if (!classId) return graded;
    return graded.filter((s) => s.student_email && emailClass.get(s.student_email.toLowerCase()) === classId);
  }, [graded, classId, emailClass]);

  const classDashboard = useMemo(() => {
    return (classes.data ?? [])
      .map((c) => {
        const classStudents = (students.data ?? []).filter((s) => s.class_id === c.id);
        const emails = new Set(classStudents.map((s) => s.email?.toLowerCase()).filter(Boolean));
        const rows = graded.filter((s) => !!s.student_email && emails.has(s.student_email.toLowerCase()));
        const crit = CRIT.map((item) => ({
          ...item,
          value: avg(rows.map((s) => s[item.key] as number).filter((n): n is number => n != null)),
        }));
        const weak = crit
          .filter((item) => item.value != null)
          .sort((a, b) => (a.value as number) - (b.value as number))[0];
        const overall = avg(rows.map((s) => s.overall_band as number).filter((n): n is number => n != null));
        const activeStudents = new Set(rows.map((s) => (s.student_email ?? s.student_name ?? "").toLowerCase())).size;
        const needSupport = rows.filter((s) => (s.overall_band ?? 9) < 5.5).length;
        return {
          id: c.id,
          name: c.name,
          students: classStudents.length,
          activeStudents,
          submissions: rows.length,
          overall,
          weak,
          needSupport,
        };
      })
      .sort((a, b) => b.needSupport - a.needSupport || (a.overall ?? 99) - (b.overall ?? 99));
  }, [classes.data, students.data, graded]);

  // Trung bình toàn lớp theo từng tiêu chí
  const classAvg = CRIT.map((c) => ({
    ...c,
    value: avg(filtered.map((s) => s[c.key] as number).filter((n): n is number => n != null)),
  }));
  const weakest = classAvg.filter((c) => c.value != null).sort((a, b) => (a.value as number) - (b.value as number))[0];
  const selectedClassName = classes.data?.find((c) => c.id === classId)?.name;

  // Gom theo học viên (email)
  const perStudent = useMemo(() => {
    const map = new Map<string, { name: string; subs: Submission[] }>();
    filtered.forEach((s) => {
      const key = (s.student_email ?? s.student_name ?? "?").toLowerCase();
      if (!map.has(key)) map.set(key, { name: s.student_name ?? key, subs: [] });
      map.get(key)!.subs.push(s);
    });
    return [...map.values()]
      .map((v) => {
        const crit = CRIT.map((c) => ({
          ...c,
          value: avg(v.subs.map((s) => s[c.key] as number).filter((n): n is number => n != null)),
        }));
        const weak = crit.filter((c) => c.value != null).sort((a, b) => (a.value as number) - (b.value as number))[0];
        const overall = avg(v.subs.map((s) => s.overall_band as number).filter((n): n is number => n != null));
        const latest = v.subs[0];
        return { name: v.name, count: v.subs.length, crit, weak, overall, cefr: latest?.cefr ?? null };
      })
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  }, [filtered]);

  const loading = subs.loading || students.loading || classes.loading;

  return (
    <div className="admin-page diagnostics-page">
      <header className="admin-page-head">
        <div>
          <span className="eyebrow dark">Learning diagnostics</span>
          <h1>Chẩn đoán điểm yếu</h1>
          <p className="muted small">
            Phân tích trung bình 4 tiêu chí IELTS theo lớp và theo từng học viên từ các bài đã chấm.
          </p>
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="Tổng quan chẩn đoán">
        <div className="admin-stat-card">
          <span>Bài đã chấm</span>
          <strong>{filtered.length}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Học viên</span>
          <strong>{perStudent.length}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Phạm vi</span>
          <strong>{classId ? "Lớp" : "Tất cả"}</strong>
        </div>
        <div className="admin-stat-card urgent">
          <span>Điểm yếu</span>
          <strong>{weakest?.short ?? "—"}</strong>
        </div>
      </section>

      <div className="card admin-form-card diagnostics-filter-card">
        <div className="card-title-row compact">
          <div>
            <h3>Phạm vi phân tích</h3>
            <p className="muted small">
              {selectedClassName ? `Đang xem lớp ${selectedClassName}.` : "Đang xem toàn bộ học viên."} Cột đỏ là tiêu
              chí yếu nhất cần ưu tiên ôn.
            </p>
          </div>
        </div>
        <label className="field inline">
          <span>Lọc theo lớp</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Tất cả học viên</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <Spinner />}
      {subs.error && <ErrorBox msg={subs.error} />}

      {classDashboard.length > 0 && (
        <div className="card diagnostics-class-card">
          <div className="card-title-row compact">
            <div>
              <h3>Dashboard lớp</h3>
              <p className="muted small">Ưu tiên các lớp có nhiều bài dưới band 5.5 hoặc tiêu chí yếu rõ.</p>
            </div>
          </div>
          <div className="diagnostics-class-grid">
            {classDashboard.slice(0, 6).map((row) => (
              <button className="diagnostics-class-item" key={row.id} type="button" onClick={() => setClassId(row.id)}>
                <span>{row.name}</span>
                <strong>{row.overall ?? "—"}</strong>
                <small>
                  {row.activeStudents}/{row.students} HV có bài · yếu {row.weak?.short ?? "—"} · {row.needSupport} bài
                  cần hỗ trợ
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tổng quan lớp */}
      <div className="card diagnostics-summary-card">
        <div className="card-title-row compact">
          <div>
            <h3>Trung bình {classId ? "lớp" : "toàn bộ"}</h3>
            <p className="muted small">Tính trên {filtered.length} bài Writing đã được chấm đủ tiêu chí.</p>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu chẩn đoán"
            body="Cần có bài Writing đã chấm đủ 4 tiêu chí trong phạm vi đang chọn."
          />
        ) : (
          <div className="crit-cards">
            {classAvg.map((c) => (
              <div className={`crit-card ${weakest && c.short === weakest.short ? "weak" : ""}`} key={c.key}>
                <div className="crit-val">{c.value ?? "—"}</div>
                <div className="crit-lbl">{c.label}</div>
              </div>
            ))}
          </div>
        )}
        {weakest && weakest.value != null && (
          <p className="warn-text">
            → Điểm yếu chung: <strong>{weakest.label}</strong> (trung bình {weakest.value}).
          </p>
        )}
      </div>

      {/* Theo học viên */}
      {perStudent.length > 0 && (
        <div className="card table-wrap diagnostics-table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Bài</th>
                <th>Overall</th>
                <th>CEFR</th>
                {CRIT.map((c) => (
                  <th key={c.key}>{c.short}</th>
                ))}
                <th>Điểm yếu</th>
              </tr>
            </thead>
            <tbody>
              {perStudent.map((p, i) => (
                <tr key={i}>
                  <td data-label="Học viên">{p.name}</td>
                  <td data-label="Bài">{p.count}</td>
                  <td data-label="Overall">
                    <strong>{p.overall ?? "—"}</strong>
                  </td>
                  <td data-label="CEFR">{p.cefr ?? "—"}</td>
                  {p.crit.map((c) => (
                    <td
                      key={c.key}
                      data-label={c.short}
                      className={p.weak && c.short === p.weak.short ? "cell-weak" : ""}
                    >
                      {c.value ?? "—"}
                    </td>
                  ))}
                  <td className="small" data-label="Điểm yếu">
                    {p.weak?.label ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {perStudent.length === 0 && !loading && (
        <EmptyState
          title="Chưa có học viên để phân tích"
          body="Khi có bài đã chấm, bảng theo học viên sẽ tự xuất hiện tại đây."
        />
      )}
    </div>
  );
}
