// Quản lý BUỔI THI (exit/mock): tạo buổi gắn 1 đề + MÃ THI + cửa sổ thời gian +
// một-lần-nộp + ngưỡng tự nộp khi vi phạm + có/không hiện điểm cho HS.
import { useMemo, useState } from "react";
import { deleteSession, listAllTests, listClasses, listSessions, listSubmissions, saveSession } from "../../lib/api";
import { downloadGradeReportWorkbook } from "../../lib/gradeReport";
import { useAsync } from "../../lib/useAsync";
import { EmptyState, ErrorBox, Spinner } from "../../components/common";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import type { ClassRow, ExamSession, Submission, TestWithTopic } from "../../lib/types";

function genCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
// datetime-local -> ISO; "" -> null
function toIso(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

type SessionState = "scheduled" | "open" | "closed" | "locked" | "missing_test";

function sessionState(s: ExamSession, test?: TestWithTopic): { key: SessionState; label: string; tone: string } {
  if (!test) return { key: "missing_test", label: "Thiếu đề", tone: "locked" };
  if (test.active === false) return { key: "locked", label: "Đề bị khóa", tone: "locked" };

  const now = Date.now();
  const openAt = s.open_at ? new Date(s.open_at).getTime() : null;
  const closeAt = s.close_at ? new Date(s.close_at).getTime() : null;

  if (openAt && now < openAt) return { key: "scheduled", label: "Sắp mở", tone: "scheduled" };
  if (closeAt && now > closeAt) return { key: "closed", label: "Đã đóng", tone: "closed" };
  return { key: "open", label: "Đang mở", tone: "open" };
}

export default function SessionsPage() {
  const sessions = useAsync<ExamSession[]>(listSessions, []);
  const tests = useAsync<TestWithTopic[]>(listAllTests, []);
  const submissions = useAsync<Submission[]>(listSubmissions, []);
  const classes = useAsync<ClassRow[]>(listClasses, []);
  const [err, setErr] = useState<string | null>(null);

  const sessionRows = sessions.data ?? [];
  const submissionRows = submissions.data ?? [];
  const testsById = useMemo(() => new Map((tests.data ?? []).map((t) => [t.id, t])), [tests.data]);
  const openSessions = sessionRows.filter((s) => sessionState(s, testsById.get(s.test_id ?? "")).key === "open").length;
  const scheduledSessions = sessionRows.filter(
    (s) => sessionState(s, testsById.get(s.test_id ?? "")).key === "scheduled",
  ).length;
  const blockedSessions = sessionRows.filter((s) => {
    const state = sessionState(s, testsById.get(s.test_id ?? "")).key;
    return state === "closed" || state === "locked" || state === "missing_test";
  }).length;

  return (
    <div className="admin-page sessions-page">
      <AdminPageHeader
        eyebrow="Vận hành kiểm tra"
        title="Buổi thi & Mã thi"
        subtitle={
          <>
            Tạo buổi thi gắn 1 đề; học sinh vào bằng <strong>mã thi</strong> tại trang chủ → "Vào phòng thi".
          </>
        }
        statsAriaLabel="Tổng quan buổi thi"
        stats={[
          { label: "Tổng buổi thi", value: sessionRows.length },
          { label: "Đang mở", value: openSessions },
          { label: "Sắp mở", value: scheduledSessions },
          { label: "Đã đóng/khóa", value: blockedSessions },
          { label: "Bài nộp", value: submissionRows.length },
        ]}
      />

      {err && <ErrorBox msg={err} />}

      <NewSession
        tests={tests.data ?? []}
        classes={classes.data ?? []}
        onAdded={() => {
          sessions.reload();
          submissions.reload();
        }}
        onErr={setErr}
      />

      <h2 className="section">Danh sách buổi thi</h2>
      {sessions.loading && <Spinner />}
      {sessions.error && <ErrorBox msg={sessions.error} />}
      {submissions.error && <ErrorBox msg={`Không tải được bài nộp để xuất bảng điểm: ${submissions.error}`} />}
      {sessions.data?.map((s) => (
        <SessionRow
          key={s.id}
          s={s}
          tests={tests.data ?? []}
          submissions={submissions.data ?? []}
          classes={classes.data ?? []}
          onChanged={() => {
            sessions.reload();
            submissions.reload();
          }}
          onErr={setErr}
        />
      ))}
      {sessions.data && sessions.data.length === 0 && (
        <EmptyState
          title="Chưa có buổi thi nào"
          body="Tạo buổi thi đầu tiên ở form phía trên, sau đó gửi mã thi cho học sinh vào phòng thi."
        />
      )}
    </div>
  );
}

function testLabel(t: TestWithTopic): string {
  const skill =
    t.skill === "writing"
      ? "Viết"
      : t.skill === "reading"
        ? "Đọc"
        : t.skill === "listening"
          ? "Nghe"
          : "Use of English";
  const kind = t.topic_category === "intensive_2026" ? " · Tăng cường" : "";
  const state = t.active === false ? " · ĐANG KHÓA" : "";
  return `${t.topic_name}${kind} · ${t.title ?? "Đề " + t.version_label} (${skill})${state}`;
}

function NewSession({
  tests,
  classes,
  onAdded,
  onErr,
}: {
  tests: TestWithTopic[];
  classes: ClassRow[];
  onAdded: () => void;
  onErr: (m: string) => void;
}) {
  const activeTests = useMemo(() => tests.filter((t) => t.active !== false), [tests]);
  const lockedCount = tests.length - activeTests.length;
  const [f, setF] = useState({
    name: "",
    test_id: "",
    class_id: "",
    access_code: genCode(),
    open_at: "",
    close_at: "",
    one_submission: true,
    max_violations: 2,
    show_result: false,
  });
  async function add() {
    if (f.name.trim().length < 2) {
      onErr("Nhập tên buổi thi.");
      return;
    }
    if (!f.test_id) {
      onErr("Chọn đề cho buổi thi.");
      return;
    }
    try {
      await saveSession({
        name: f.name.trim(),
        test_id: f.test_id,
        access_code: f.access_code.trim().toUpperCase(),
        ...(f.class_id ? { class_id: f.class_id } : {}),
        open_at: toIso(f.open_at),
        close_at: toIso(f.close_at),
        one_submission: f.one_submission,
        max_violations: Number(f.max_violations) || 0,
        show_result: f.show_result,
      });
      setF({
        name: "",
        test_id: "",
        class_id: "",
        access_code: genCode(),
        open_at: "",
        close_at: "",
        one_submission: true,
        max_violations: 2,
        show_result: false,
      });
      onAdded();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="card admin-form-card session-create-card">
      <div className="card-title-row">
        <div>
          <h3>Tạo buổi thi</h3>
          <p className="muted small">Chọn đề, thời gian, lớp được phép vào và quy định nộp bài.</p>
        </div>
        <span className="pill">Mã: {f.access_code}</span>
      </div>
      <div className="grid2 admin-form-grid">
        <label className="field">
          <span>Tên buổi thi</span>
          <input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="vd: Thi cuối khóa IELTS 6.0 - T6"
          />
        </label>
        <label className="field">
          <span>Đề thi</span>
          <select value={f.test_id} onChange={(e) => setF({ ...f, test_id: e.target.value })}>
            <option value="">— Chọn đề đang mở —</option>
            {activeTests.map((t) => (
              <option key={t.id} value={t.id}>
                {testLabel(t)}
              </option>
            ))}
          </select>
          <span className="muted small">
            {activeTests.length} đề đang mở{lockedCount > 0 ? ` · ${lockedCount} đề đang khóa đã ẩn` : ""}
          </span>
        </label>
        <label className="field">
          <span>Mã thi</span>
          <div className="row-form">
            <input value={f.access_code} onChange={(e) => setF({ ...f, access_code: e.target.value })} />
            <button className="btn small" type="button" onClick={() => setF({ ...f, access_code: genCode() })}>
              Đổi mã
            </button>
          </div>
        </label>
        <label className="field">
          <span>Giới hạn lớp (tùy chọn)</span>
          <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
            <option value="">Tất cả học sinh có mã thi</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="muted small">Chọn lớp để chỉ học sinh trong roster lớp đó được vào/nộp bài.</span>
        </label>
        <label className="field">
          <span>Tự nộp khi vi phạm ≥ (mặc định 2)</span>
          <input
            type="number"
            min={0}
            value={f.max_violations}
            onChange={(e) => setF({ ...f, max_violations: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Mở lúc (tùy chọn)</span>
          <input type="datetime-local" value={f.open_at} onChange={(e) => setF({ ...f, open_at: e.target.value })} />
        </label>
        <label className="field">
          <span>Đóng lúc (tùy chọn)</span>
          <input type="datetime-local" value={f.close_at} onChange={(e) => setF({ ...f, close_at: e.target.value })} />
        </label>
      </div>
      <div className="settings-strip">
        <label className="check">
          <input
            type="checkbox"
            checked={f.one_submission}
            onChange={(e) => setF({ ...f, one_submission: e.target.checked })}
          />{" "}
          <span>Chỉ cho nộp 1 lần / học sinh</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={f.show_result}
            onChange={(e) => setF({ ...f, show_result: e.target.checked })}
          />{" "}
          <span>Hiện điểm cho học sinh ngay sau nộp (trắc nghiệm)</span>
        </label>
      </div>
      <div className="form-actions">
        <button className="btn primary" onClick={add}>
          + Tạo buổi thi
        </button>
      </div>
    </div>
  );
}

function SessionRow({
  s,
  tests,
  submissions,
  classes,
  onChanged,
  onErr,
}: {
  s: ExamSession;
  tests: TestWithTopic[];
  submissions: Submission[];
  classes: ClassRow[];
  onChanged: () => void;
  onErr: (m: string) => void;
}) {
  const test = useMemo(() => tests.find((t) => t.id === s.test_id), [tests, s.test_id]);
  const className = useMemo(() => classes.find((c) => c.id === s.class_id)?.name ?? null, [classes, s.class_id]);
  const sessionSubs = useMemo(() => submissions.filter((x) => x.session_id === s.id), [submissions, s.id]);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const state = sessionState(s, test);
  const accessCode = s.access_code ?? "";
  const examLink =
    typeof window === "undefined"
      ? `/exam-room?code=${encodeURIComponent(accessCode)}`
      : `${window.location.origin}/exam-room?code=${encodeURIComponent(accessCode)}`;

  async function remove() {
    if (!confirm(`Xóa buổi thi "${s.name}"?`)) return;
    try {
      await deleteSession(s.id);
      onChanged();
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function exportScores() {
    if (sessionSubs.length === 0) {
      onErr("Buổi thi này chưa có bài nộp để xuất bảng điểm.");
      return;
    }
    const safeName =
      s.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "buoi-thi";
    try {
      await downloadGradeReportWorkbook({
        session: s,
        test,
        className,
        submissions: sessionSubs,
        filename: `bang-diem-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    } catch (e) {
      onErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function copyText(text: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      onErr("Không copy được tự động. Hãy copy thủ công mã/link đang hiển thị.");
    }
  }

  const canUse = state.key === "open";
  return (
    <div className={`card sub session-card session-state-${state.key} ${canUse ? "is-open" : "is-closed"}`}>
      <div className="q-row-head session-card-head">
        <div className="session-main">
          <div className="session-title-line">
            <strong>{s.name}</strong>
            <span className="pill code-pill">{accessCode || "Chưa có mã"}</span>
            <span className={`status-badge ${state.tone}`}>{state.label}</span>
          </div>
          <div className="muted small session-test-name">{test ? testLabel(test) : "(đề đã xóa?)"}</div>
          <div className="session-share-box">
            <div>
              <b>Link vào phòng</b>
              <span>{examLink}</span>
            </div>
            <div className="session-share-actions">
              <button
                className="btn small"
                type="button"
                disabled={!accessCode}
                onClick={() => copyText(accessCode, "code")}
              >
                {copied === "code" ? "Đã copy mã" : "Copy mã"}
              </button>
              <button className="btn small" type="button" onClick={() => copyText(examLink, "link")}>
                {copied === "link" ? "Đã copy link" : "Copy link"}
              </button>
            </div>
          </div>
          <div className="session-meta-grid">
            <span>
              <b>Mở</b>
              {s.open_at ? new Date(s.open_at).toLocaleString("vi-VN") : "Ngay"}
            </span>
            <span>
              <b>Đóng</b>
              {s.close_at ? new Date(s.close_at).toLocaleString("vi-VN") : "Không giới hạn"}
            </span>
            <span>
              <b>Lớp</b>
              {className ?? "Mọi lớp"}
            </span>
            <span>
              <b>Bài nộp</b>
              {sessionSubs.length}
            </span>
          </div>
          <div className="session-rules muted small">
            {s.one_submission ? "1 lần/HS" : "Cho phép nộp nhiều lần"}
            {s.max_violations ? ` · tự nộp khi vi phạm ≥ ${s.max_violations}` : ""}
            {s.show_result ? " · hiện điểm sau nộp" : ""}
          </div>
        </div>
        <div className="actions session-actions">
          <button className="btn small" onClick={exportScores} disabled={sessionSubs.length === 0}>
            ⬇ Xuất bảng điểm
          </button>
          <button className="btn ghost small danger" onClick={remove}>
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
