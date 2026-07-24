import { useMemo, useState } from "react";
import { listPlacementSubmissions } from "../../lib/api";
import {
  placementReports,
  placementScoreLabel,
  skillOfPlacementSubmission,
  type PlacementStudentReport,
} from "../../lib/placement";
import { useAsync } from "../../lib/useAsync";
import { EmptyState, ErrorBox, SkillBadge, Spinner } from "../../components/common";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import type { PlacementSubmission } from "../../lib/types";

type FilterStatus = "all" | "complete" | "incomplete";

export default function PlacementResultsPage() {
  const subs = useAsync<PlacementSubmission[]>(listPlacementSubmissions, []);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const reports = useMemo(() => placementReports(subs.data ?? []), [subs.data]);
  const rows = useMemo(
    () =>
      reports.filter((r) => {
        if (status === "complete" && r.missingSkills.length > 0) return false;
        if (status === "incomplete" && r.missingSkills.length === 0) return false;
        if (q.trim()) {
          const hay = `${r.studentName} ${r.studentEmail}`.toLowerCase();
          if (!hay.includes(q.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [reports, q, status],
  );

  const complete = reports.filter((r) => r.missingSkills.length === 0).length;
  const pendingWriting = reports.filter((r) => r.skills.writing && r.skills.writing.status !== "graded").length;
  const readyRate = reports.length ? Math.round((complete / reports.length) * 100) : 0;

  function exportCsv() {
    const header = [
      "Hoc sinh",
      "Email",
      "Reading",
      "Listening",
      "Writing",
      "Use of English",
      "Ky nang da lam",
      "Trang thai",
      "Lop de xuat",
      "Can cu",
      "Cap nhat luc",
    ];
    const body = rows.map((r) => [
      r.studentName,
      r.studentEmail,
      skillResult(r.skills.reading),
      skillResult(r.skills.listening),
      skillResult(r.skills.writing),
      skillResult(r.skills.use_of_english),
      `${r.requiredSkillsDone}/3 chính${r.skills.use_of_english ? " + UoE" : ""}`,
      r.statusLabel,
      r.recommendedLevel,
      r.decisionBasis,
      r.latestAt ? new Date(r.latestAt).toLocaleString("vi-VN") : "",
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ket-qua-xep-lop-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-page placement-results-page">
      <AdminPageHeader
        eyebrow="Placement"
        title="Kết quả xếp lớp"
        subtitle="Tổng hợp Reading, Listening, Writing theo từng học viên để giáo viên quyết định lớp phù hợp."
        actions={
          <button className="btn primary" type="button" onClick={exportCsv} disabled={rows.length === 0}>
            Xuất CSV
          </button>
        }
        statsAriaLabel="Tổng quan xếp lớp"
        stats={[
          { label: "Học viên", value: reports.length },
          { label: "Đủ dữ liệu", value: complete },
          { label: "Writing chờ chấm", value: pendingWriting, urgent: pendingWriting > 0 },
          { label: "Sẵn sàng", value: `${readyRate}%` },
        ]}
      />

      <div className="card admin-form-card placement-filter-card">
        <div className="card-title-row compact">
          <div>
            <h3>Bộ lọc xếp lớp</h3>
            <p className="muted small">
              Đang hiển thị {rows.length}/{reports.length} học viên. Kết luận chắc nhất khi đủ Reading, Listening,
              Writing; Use of English là dữ liệu bổ trợ.
            </p>
          </div>
        </div>
        <div className="grading-filter-grid">
          <label className="field inline">
            <span>Tìm học viên</span>
            <input placeholder="Tên / email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="field inline">
            <span>Trạng thái</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as FilterStatus)}>
              <option value="all">Tất cả</option>
              <option value="complete">Đủ dữ liệu xếp lớp</option>
              <option value="incomplete">Còn thiếu kỹ năng</option>
            </select>
          </label>
        </div>
      </div>

      {subs.loading && <Spinner />}
      {subs.error && <ErrorBox msg={subs.error} />}

      {!subs.loading && rows.length === 0 ? (
        <EmptyState
          title={reports.length === 0 ? "Chưa có kết quả xếp lớp" : "Không có học viên khớp bộ lọc"}
          body={
            reports.length === 0
              ? "Khi học viên nộp bài trong mục Đề xếp lớp, kết quả sẽ được gom tại đây."
              : "Thử đổi bộ lọc hoặc tìm theo tên/email khác."
          }
        />
      ) : (
        <div className="card table-wrap placement-results-table">
          <table className="table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Reading</th>
                <th>Listening</th>
                <th>Writing</th>
                <th>UoE</th>
                <th>Trạng thái</th>
                <th>Lớp đề xuất</th>
                <th>Cập nhật</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <PlacementReportRow
                  key={r.key}
                  report={r}
                  open={openKey === r.key}
                  onToggle={() => setOpenKey((cur) => (cur === r.key ? null : r.key))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlacementReportRow({
  report,
  open,
  onToggle,
}: {
  report: PlacementStudentReport;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td>
          <strong>{report.studentName}</strong>
          <div className="muted small">{report.studentEmail || "Chưa có email"}</div>
        </td>
        <td>{skillResult(report.skills.reading)}</td>
        <td>{skillResult(report.skills.listening)}</td>
        <td>{skillResult(report.skills.writing)}</td>
        <td>{skillResult(report.skills.use_of_english)}</td>
        <td>
          <span className={report.missingSkills.length === 0 ? "ok-text" : "pill off small"}>
            {report.statusLabel}
          </span>
          <div className="muted small">{report.confidenceLabel}</div>
        </td>
        <td>
          <strong>{report.recommendedLevel}</strong>
          <div className="muted small placement-basis">{report.decisionBasis}</div>
        </td>
        <td className="small">{report.latestAt ? new Date(report.latestAt).toLocaleString("vi-VN") : "—"}</td>
        <td>
          <button className="btn ghost small" type="button" onClick={onToggle}>
            {open ? "Đóng" : "Chi tiết"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="detail-row">
          <td colSpan={9}>
            <div className="placement-detail-grid">
              {report.submissions.map((s) => {
                const skill = skillOfPlacementSubmission(s);
                return (
                  <div className="placement-detail-card" key={s.id}>
                    <div className="placement-detail-head">
                      <SkillBadge skill={skill} />
                      <span className="muted small">{new Date(s.submitted_at).toLocaleString("vi-VN")}</span>
                    </div>
                    <strong>{s.tests?.title || s.topic_name || "Bài xếp lớp"}</strong>
                    <div className="placement-result-line">
                      {placementScoreLabel(s)}
                      {s.violations ? <span className="viol">{s.violations} vi phạm</span> : <span>0 vi phạm</span>}
                    </div>
                    {skill === "writing" && s.status !== "graded" && (
                      <p className="warn-text small">Writing đã nộp nhưng chưa chấm xong.</p>
                    )}
                    {Array.isArray(s.result_detail) && s.result_detail.length > 0 && (
                      <div className="placement-level-mini">
                        {s.result_detail.map((d) => (
                          <span key={d.cefr} className={d.passed ? "ok-text" : "muted"}>
                            {d.cefr}: {d.correct}/{d.total}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function skillResult(row?: PlacementSubmission | null): string {
  if (!row) return "—";
  return placementScoreLabel(row);
}
