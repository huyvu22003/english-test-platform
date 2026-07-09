import { useMemo, useState } from "react";
import {
  assignTeacherToClass,
  createStaffAccount,
  listClasses,
  listClassTeachers,
  listProfiles,
  removeTeacherFromClass,
  updateProfile,
} from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import type { AdminRole, ClassRow, ClassTeacher, Profile } from "../../lib/types";

const ROLES: { value: AdminRole; label: string; note: string }[] = [
  { value: "owner", label: "Owner", note: "Toàn quyền hệ thống." },
  { value: "admin", label: "Admin", note: "Quản trị vận hành, giáo viên, lớp, đề và bài chấm." },
  { value: "teacher", label: "Teacher", note: "Phụ trách lớp, xem/chấm bài lớp được giao." },
  { value: "grader", label: "Grader", note: "Chỉ tập trung chấm bài được giao." },
  { value: "content_editor", label: "Content editor", note: "Soạn/sửa đề, không phụ trách chấm." },
];

function teacherLabel(p: Profile): string {
  return p.full_name || p.email || p.id.slice(0, 8);
}

export default function StaffPage() {
  const profiles = useAsync<Profile[]>(listProfiles, []);
  const classes = useAsync<ClassRow[]>(listClasses, []);
  const links = useAsync<ClassTeacher[]>(listClassTeachers, []);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function reload() {
    profiles.reload();
    links.reload();
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (profiles.data ?? []).filter((p) => {
      if (!q) return true;
      return [p.email, p.full_name, p.role].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [profiles.data, query]);

  const activeCount = (profiles.data ?? []).filter((p) => p.active !== false).length;
  const teacherCount = (profiles.data ?? []).filter((p) => ["teacher", "grader"].includes(p.role)).length;
  const assignedTeacherCount = new Set((links.data ?? []).map((x) => x.teacher_id)).size;
  const loading = profiles.loading || classes.loading || links.loading;
  const errors = [profiles.error, classes.error, links.error].filter(Boolean).join(" | ");

  return (
    <div className="admin-page staff-page">
      <header className="admin-page-head">
        <div>
          <span className="eyebrow dark">Staff & permissions</span>
          <h1>Giáo viên &amp; phân quyền</h1>
          <p className="muted small">Quản lý role, trạng thái tài khoản và lớp phụ trách cho từng giáo viên.</p>
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="Tổng quan giáo viên">
        <div className="admin-stat-card">
          <span>Tài khoản</span>
          <strong>{profiles.data?.length ?? 0}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Đang hoạt động</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Teacher / Grader</span>
          <strong>{teacherCount}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Đã gán lớp</span>
          <strong>{assignedTeacherCount}</strong>
        </div>
      </section>

      <div className="card admin-form-card staff-note-card">
        <strong>Tài khoản giáo viên</strong>
        <p className="muted small">
          Admin tạo login mới trực tiếp tại đây. Mật khẩu nên đổi sau khi giáo viên đăng nhập lần đầu.
        </p>
      </div>

      <CreateStaffForm onCreated={reload} onErr={setErr} />

      <div className="card admin-form-card staff-filter-card">
        <label className="field inline">
          <span>Tìm giáo viên</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Email, tên, role…" />
        </label>
      </div>

      {loading && <Spinner />}
      {(err || errors) && <ErrorBox msg={[err, errors].filter(Boolean).join(" | ")} />}

      {rows.length === 0 && !loading ? (
        <EmptyState
          title="Chưa có hồ sơ giáo viên"
          body="Hãy chạy migration vận hành và tạo/đăng nhập tài khoản giáo viên trong Supabase Auth."
        />
      ) : (
        <div className="staff-list">
          {rows.map((p) => (
            <StaffCard
              key={p.id}
              profile={p}
              classes={classes.data ?? []}
              links={links.data ?? []}
              onChanged={reload}
              onErr={setErr}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateStaffForm({ onCreated, onErr }: { onCreated: () => void; onErr: (m: string | null) => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("teacher");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createAccount() {
    setBusy(true);
    setMsg(null);
    onErr(null);
    try {
      await createStaffAccount({
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        role,
        active,
      });
      setMsg(`Đã tạo tài khoản ${email.trim()}.`);
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("teacher");
      setActive(true);
      onCreated();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card admin-form-card staff-create-card">
      <div className="card-title-row compact">
        <div>
          <h3>Tạo tài khoản mới</h3>
          <p className="muted small">Dành cho giáo viên, người chấm bài hoặc người soạn đề.</p>
        </div>
      </div>
      <div className="grid2 admin-form-grid">
        <label className="field">
          <span>Email đăng nhập</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="giaovien@example.com"
          />
        </label>
        <label className="field">
          <span>Tên hiển thị</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tên giáo viên" />
        </label>
        <label className="field">
          <span>Mật khẩu tạm</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
          />
        </label>
        <label className="field">
          <span>Vai trò</span>
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="check staff-active-toggle">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Kích hoạt ngay sau khi tạo</span>
      </label>
      {msg && <p className="success-text small">{msg}</p>}
      <div className="form-actions">
        <button
          className="btn primary"
          type="button"
          disabled={busy || !email.trim() || password.length < 8}
          onClick={createAccount}
        >
          {busy ? "Đang tạo…" : "Tạo tài khoản"}
        </button>
      </div>
    </section>
  );
}

function StaffCard({
  profile,
  classes,
  links,
  onChanged,
  onErr,
}: {
  profile: Profile;
  classes: ClassRow[];
  links: ClassTeacher[];
  onChanged: () => void;
  onErr: (m: string | null) => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [role, setRole] = useState<AdminRole>(profile.role);
  const [active, setActive] = useState(profile.active !== false);
  const [busy, setBusy] = useState(false);
  const assignedClassIds = new Set(links.filter((x) => x.teacher_id === profile.id).map((x) => x.class_id));

  async function saveProfile() {
    setBusy(true);
    onErr(null);
    try {
      await updateProfile(profile.id, { full_name: fullName.trim() || null, role, active });
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleClass(classId: string, checked: boolean) {
    setBusy(true);
    onErr(null);
    try {
      if (checked) await assignTeacherToClass(classId, profile.id);
      else await removeTeacherFromClass(classId, profile.id);
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card staff-card ${active ? "" : "is-disabled"}`}>
      <div className="staff-card-main">
        <div>
          <h3>{teacherLabel(profile)}</h3>
          <p className="muted small">
            {profile.email || "Chưa có email"} · {profile.id.slice(0, 8)}
          </p>
        </div>
        <span className={`status-badge ${active ? "open" : "closed"}`}>{active ? "Đang hoạt động" : "Đã khóa"}</span>
      </div>

      <div className="grid2 admin-form-grid">
        <label className="field">
          <span>Tên hiển thị</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="field">
          <span>Vai trò</span>
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="muted small">{ROLES.find((r) => r.value === role)?.note}</span>
        </label>
      </div>

      <label className="check staff-active-toggle">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Cho phép tài khoản hoạt động trong panel</span>
      </label>

      <div className="staff-class-box">
        <div className="card-title-row compact">
          <div>
            <h4>Lớp phụ trách</h4>
            <p className="muted small">Teacher/grader sẽ dùng danh sách này để lọc roster, bài chấm và dashboard.</p>
          </div>
        </div>
        <div className="staff-class-grid">
          {classes.map((c) => (
            <label className="check" key={c.id}>
              <input
                type="checkbox"
                checked={assignedClassIds.has(c.id)}
                onChange={(e) => toggleClass(c.id, e.target.checked)}
              />
              <span>{c.name}</span>
            </label>
          ))}
          {classes.length === 0 && <span className="muted small">Chưa có lớp.</span>}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn primary small" disabled={busy} onClick={saveProfile}>
          {busy ? "Đang lưu…" : "Lưu phân quyền"}
        </button>
      </div>
    </section>
  );
}
