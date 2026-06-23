// Chẩn đoán: trung bình 4 tiêu chí IELTS theo LỚP và theo HỌC VIÊN, làm nổi bật
// tiêu chí YẾU NHẤT để giáo viên biết cần ôn gì. Tính từ các bài ĐÃ CHẤM.
import { useMemo, useState } from "react";
import { listClasses, listStudents, listSubmissions } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, Spinner } from "../../components/common";
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
    students.data?.forEach((s) => { if (s.email) m.set(s.email.toLowerCase(), s.class_id); });
    return m;
  }, [students.data]);

  const graded = useMemo(
    () => (subs.data ?? []).filter((s) => s.status === "graded" && s.score_tr != null),
    [subs.data]
  );

  const filtered = useMemo(() => {
    if (!classId) return graded;
    return graded.filter((s) => s.student_email && emailClass.get(s.student_email.toLowerCase()) === classId);
  }, [graded, classId, emailClass]);

  // Trung bình toàn lớp theo từng tiêu chí
  const classAvg = CRIT.map((c) => ({
    ...c, value: avg(filtered.map((s) => s[c.key] as number).filter((n): n is number => n != null)),
  }));
  const weakest = classAvg
    .filter((c) => c.value != null)
    .sort((a, b) => (a.value as number) - (b.value as number))[0];

  // Gom theo học viên (email)
  const perStudent = useMemo(() => {
    const map = new Map<string, { name: string; subs: Submission[] }>();
    filtered.forEach((s) => {
      const key = (s.student_email ?? s.student_name ?? "?").toLowerCase();
      if (!map.has(key)) map.set(key, { name: s.student_name ?? key, subs: [] });
      map.get(key)!.subs.push(s);
    });
    return [...map.values()].map((v) => {
      const crit = CRIT.map((c) => ({
        ...c, value: avg(v.subs.map((s) => s[c.key] as number).filter((n): n is number => n != null)),
      }));
      const weak = crit.filter((c) => c.value != null).sort((a, b) => (a.value as number) - (b.value as number))[0];
      const overall = avg(v.subs.map((s) => s.overall_band as number).filter((n): n is number => n != null));
      const latest = v.subs[0];
      return { name: v.name, count: v.subs.length, crit, weak, overall, cefr: latest?.cefr ?? null };
    }).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  }, [filtered]);

  const loading = subs.loading || students.loading || classes.loading;

  return (
    <div>
      <div className="title-row">
        <h1>Chẩn đoán điểm yếu</h1>
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Tất cả học viên</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <p className="muted small">Tính từ {filtered.length} bài đã chấm. Cột tô đỏ = tiêu chí yếu nhất (cần ưu tiên ôn).</p>

      {loading && <Spinner />}
      {subs.error && <ErrorBox msg={subs.error} />}

      {/* Tổng quan lớp */}
      <div className="card">
        <h3>Trung bình {classId ? "lớp" : "toàn bộ"}</h3>
        {filtered.length === 0 ? (
          <p className="muted">Chưa có bài đã chấm trong phạm vi này.</p>
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
          <p className="warn-text">→ Điểm yếu chung: <strong>{weakest.label}</strong> (trung bình {weakest.value}).</p>
        )}
      </div>

      {/* Theo học viên */}
      {perStudent.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Học viên</th><th>Bài</th><th>Overall</th><th>CEFR</th>
                {CRIT.map((c) => <th key={c.key}>{c.short}</th>)}<th>Điểm yếu</th></tr>
            </thead>
            <tbody>
              {perStudent.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.count}</td>
                  <td><strong>{p.overall ?? "—"}</strong></td>
                  <td>{p.cefr ?? "—"}</td>
                  {p.crit.map((c) => (
                    <td key={c.key} className={p.weak && c.short === p.weak.short ? "cell-weak" : ""}>{c.value ?? "—"}</td>
                  ))}
                  <td className="small">{p.weak?.label ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
