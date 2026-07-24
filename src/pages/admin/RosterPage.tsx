// Quản lý ROSTER: lớp/khóa + học viên (mã, tên, email, lớp). Mã học viên dùng để
// học sinh đăng nhập nhanh (rpc_student_by_code) và để nối bài làm vào hồ sơ.
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteClass, deleteStudent, listClasses, listStudents, saveClass, saveStudent } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { ErrorBox, Spinner } from "../../components/common";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import type { ClassRow, Student } from "../../lib/types";

export default function RosterPage() {
  const [searchParams] = useSearchParams();
  const classes = useAsync<ClassRow[]>(listClasses, []);
  const students = useAsync<Student[]>(listStudents, []);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [classFilter, setClassFilter] = useState(searchParams.get("class") ?? "");
  const [issueFilter, setIssueFilter] = useState(searchParams.get("issue") ?? "");

  function reload() {
    classes.reload();
    students.reload();
  }
  const classMap = useMemo(() => {
    const m = new Map<string, string>();
    classes.data?.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [classes.data]);

  const studentRows = students.data ?? [];
  const assignedCount = studentRows.filter((s) => !!s.class_id).length;
  const emailCount = studentRows.filter((s) => !!s.email).length;
  const duplicateCodes = duplicateValues(studentRows.map((s) => s.code));
  const duplicateEmails = duplicateValues(studentRows.map((s) => s.email));
  const missingCodeCount = studentRows.filter((s) => !s.code).length;
  const incompleteCount = studentRows.filter((s) => !s.code || !s.email || !s.class_id).length;
  const filteredStudents = studentRows.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      [s.code, s.full_name, s.email, s.class_id ? classMap.get(s.class_id) : ""].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    const matchesClass = !classFilter || (classFilter === "__none" ? !s.class_id : s.class_id === classFilter);
    const matchesIssue =
      !issueFilter ||
      (issueFilter === "missing-code" && !s.code) ||
      (issueFilter === "missing-email" && !s.email) ||
      (issueFilter === "incomplete" && (!s.code || !s.email || !s.class_id)) ||
      (issueFilter === "duplicate-code" && !!s.code && duplicateCodes.has(s.code.trim().toLowerCase())) ||
      (issueFilter === "duplicate-email" && !!s.email && duplicateEmails.has(s.email.trim().toLowerCase()));
    return matchesQuery && matchesClass && matchesIssue;
  });

  return (
    <div className="admin-page roster-page">
      <AdminPageHeader
        eyebrow="Roster & phân lớp"
        title="Lớp & Học viên"
        subtitle="Quản lý lớp, email và mã học viên để giới hạn buổi thi theo roster chính xác."
        statsAriaLabel="Tổng quan roster"
        stats={[
          { label: "Học viên", value: studentRows.length },
          { label: "Lớp / khóa", value: classes.data?.length ?? 0 },
          { label: "Đã xếp lớp", value: assignedCount },
          { label: "Có email", value: emailCount },
        ]}
      />

      {err && <ErrorBox msg={err} />}
      <div className="card admin-form-card roster-quality-card">
        <div className="card-title-row compact">
          <div>
            <h3>Kiểm tra roster</h3>
            <p className="muted small">Dọn nhanh dữ liệu thiếu hoặc trùng trước khi mở buổi thi thật.</p>
          </div>
        </div>
        <div className="roster-quality-grid">
          <button className="roster-quality-item" type="button" onClick={() => setIssueFilter("missing-code")}>
            <span>Thiếu mã HV</span>
            <strong>{missingCodeCount}</strong>
          </button>
          <button className="roster-quality-item" type="button" onClick={() => setIssueFilter("missing-email")}>
            <span>Thiếu email</span>
            <strong>{studentRows.length - emailCount}</strong>
          </button>
          <button className="roster-quality-item" type="button" onClick={() => setClassFilter("__none")}>
            <span>Chưa xếp lớp</span>
            <strong>{studentRows.length - assignedCount}</strong>
          </button>
          <button className="roster-quality-item" type="button" onClick={() => setIssueFilter("duplicate-code")}>
            <span>Trùng mã</span>
            <strong>{duplicateCodes.size}</strong>
          </button>
          <button className="roster-quality-item" type="button" onClick={() => setIssueFilter("duplicate-email")}>
            <span>Trùng email</span>
            <strong>{duplicateEmails.size}</strong>
          </button>
          <button className="roster-quality-item" type="button" onClick={() => setIssueFilter("incomplete")}>
            <span>Cần bổ sung</span>
            <strong>{incompleteCount}</strong>
          </button>
        </div>
      </div>
      <div className="grid2 admin-split-grid">
        <ClassPanel classes={classes.data ?? []} loading={classes.loading} onChanged={reload} onErr={setErr} />
        <NewStudent classes={classes.data ?? []} students={studentRows} onAdded={students.reload} onErr={setErr} />
      </div>

      <div className="section-head admin-section-head">
        <div>
          <h2 className="section">Danh sách học viên</h2>
          <p className="muted small">
            Hiển thị {filteredStudents.length}/{studentRows.length} học viên.
          </p>
        </div>
        <div className="roster-toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, email, mã, lớp…" />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">Tất cả lớp</option>
            <option value="__none">Chưa xếp lớp</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}>
            <option value="">Mọi trạng thái dữ liệu</option>
            <option value="incomplete">Cần bổ sung mã/email/lớp</option>
            <option value="missing-code">Thiếu mã HV</option>
            <option value="missing-email">Thiếu email</option>
            <option value="duplicate-code">Trùng mã HV</option>
            <option value="duplicate-email">Trùng email</option>
          </select>
        </div>
      </div>
      {students.loading && <Spinner />}
      {students.error && <ErrorBox msg={students.error} />}
      <div className="card table-wrap roster-table-card">
        <table className="table roster-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Lớp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <StudentRow
                key={s.id}
                s={s}
                classes={classes.data ?? []}
                className={s.class_id ? classMap.get(s.class_id) : ""}
                duplicateCode={!!s.code && duplicateCodes.has(s.code.trim().toLowerCase())}
                duplicateEmail={!!s.email && duplicateEmails.has(s.email.trim().toLowerCase())}
                onChanged={students.reload}
                onErr={setErr}
              />
            ))}
            {studentRows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Chưa có học viên. Thêm ở ô bên phải, hoặc học viên sẽ tự được tạo khi nộp bài (theo email).
                </td>
              </tr>
            )}
            {studentRows.length > 0 && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Không có học viên khớp bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function duplicateValues(values: Array<string | null | undefined>): Set<string> {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = value?.trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}

function ClassPanel({
  classes,
  loading,
  onChanged,
  onErr,
}: {
  classes: ClassRow[];
  loading: boolean;
  onChanged: () => void;
  onErr: (m: string) => void;
}) {
  const [name, setName] = useState("");
  async function add() {
    if (name.trim().length < 1) return;
    try {
      await saveClass({ name: name.trim() });
      setName("");
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function remove(c: ClassRow) {
    if (!confirm(`Xóa lớp "${c.name}"? (học viên trong lớp sẽ về "chưa xếp lớp")`)) return;
    try {
      await deleteClass(c.id);
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="card admin-form-card roster-panel">
      <div className="card-title-row compact">
        <div>
          <h3>Lớp / khóa</h3>
          <p className="muted small">Dùng để giới hạn buổi thi và lọc tiến bộ.</p>
        </div>
      </div>
      <div className="row-form roster-add-row">
        <input placeholder="Tên lớp mới…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary small" onClick={add}>
          + Thêm
        </button>
      </div>
      {loading && <Spinner />}
      <ul className="chip-list roster-chip-list">
        {classes.map((c) => (
          <li key={c.id} className="chip">
            {c.name}
            <button className="x" onClick={() => remove(c)} title="Xóa">
              ×
            </button>
          </li>
        ))}
        {classes.length === 0 && !loading && <span className="muted small">Chưa có lớp.</span>}
      </ul>
    </div>
  );
}

function NewStudent({
  classes,
  students,
  onAdded,
  onErr,
}: {
  classes: ClassRow[];
  students: Student[];
  onAdded: () => void;
  onErr: (m: string) => void;
}) {
  const [f, setF] = useState({ code: "", full_name: "", email: "", class_id: "" });
  async function add() {
    if (f.full_name.trim().length < 2) {
      onErr("Nhập họ tên học viên.");
      return;
    }
    const codeKey = f.code.trim().toLowerCase();
    const emailKey = f.email.trim().toLowerCase();
    if (codeKey && students.some((s) => s.code?.trim().toLowerCase() === codeKey)) {
      onErr("Mã học viên đã tồn tại trong roster. Kiểm tra lại trước khi thêm.");
      return;
    }
    if (emailKey && students.some((s) => s.email?.trim().toLowerCase() === emailKey)) {
      onErr("Email đã tồn tại trong roster. Kiểm tra lại trước khi thêm.");
      return;
    }
    try {
      await saveStudent({
        code: f.code.trim() || null,
        full_name: f.full_name.trim(),
        email: f.email.trim() || null,
        class_id: f.class_id || null,
      });
      setF({ code: "", full_name: "", email: "", class_id: "" });
      onAdded();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="card admin-form-card roster-panel">
      <div className="card-title-row compact">
        <div>
          <h3>Thêm học viên</h3>
          <p className="muted small">Email là thông tin chính để kiểm tra đúng lớp khi vào phòng thi.</p>
        </div>
      </div>
      <div className="grid2 admin-form-grid">
        <label className="field">
          <span>Mã (tùy chọn)</span>
          <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="vd: HV001" />
        </label>
        <label className="field">
          <span>Họ tên</span>
          <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Lớp</span>
          <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
            <option value="">— Chưa xếp —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button className="btn primary" onClick={add}>
          + Thêm học viên
        </button>
      </div>
    </div>
  );
}

function StudentRow({
  s,
  classes,
  className,
  onChanged,
  onErr,
  duplicateCode,
  duplicateEmail,
}: {
  s: Student;
  classes: ClassRow[];
  className?: string;
  duplicateCode: boolean;
  duplicateEmail: boolean;
  onChanged: () => void;
  onErr: (m: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({
    code: s.code ?? "",
    full_name: s.full_name,
    email: s.email ?? "",
    class_id: s.class_id ?? "",
  });

  async function save() {
    try {
      await saveStudent({
        id: s.id,
        code: f.code.trim() || null,
        full_name: f.full_name.trim(),
        email: f.email.trim() || null,
        class_id: f.class_id || null,
      });
      setEdit(false);
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function remove() {
    if (!confirm(`Xóa học viên "${s.full_name}"?`)) return;
    try {
      await deleteStudent(s.id);
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (edit) {
    return (
      <tr className="editing-row">
        <td data-label="Mã">
          <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        </td>
        <td data-label="Họ tên">
          <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </td>
        <td data-label="Email">
          <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </td>
        <td data-label="Lớp">
          <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
            <option value="">— Chưa xếp —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </td>
        <td className="grading-row-action">
          <div className="row-actions">
            <button className="btn small primary" onClick={save}>
              Lưu
            </button>
            <button className="btn ghost small" onClick={() => setEdit(false)}>
              Hủy
            </button>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr className={duplicateCode || duplicateEmail || !s.code || !s.email || !s.class_id ? "roster-attention-row" : ""}>
      <td data-label="Mã">
        {s.code ? <span className="pill code-pill">{s.code}</span> : <span className="muted">—</span>}
        {duplicateCode && <div className="warn-text small">Trùng mã</div>}
      </td>
      <td data-label="Họ tên">
        <strong>{s.full_name}</strong>
      </td>
      <td className="small" data-label="Email">
        {s.email || <span className="muted">—</span>}
        {duplicateEmail && <div className="warn-text small">Trùng email</div>}
      </td>
      <td data-label="Lớp">
        {className ? (
          <span className="status-badge open">{className}</span>
        ) : (
          <span className="status-badge closed">Chưa xếp</span>
        )}
      </td>
      <td className="grading-row-action">
        <div className="row-actions">
          <button className="btn ghost small" onClick={() => setEdit(true)}>
            Sửa
          </button>
          <button className="btn ghost small danger" onClick={remove}>
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}
