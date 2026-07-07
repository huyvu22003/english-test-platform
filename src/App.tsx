import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import StudentHome from "./pages/student/StudentHome";
import ExamPage from "./pages/student/ExamPage";
import WritingExamPage from "./pages/student/WritingExamPage";
import PlacementExamPage from "./pages/student/PlacementExamPage";
import ResultPage from "./pages/student/ResultPage";
import ProgressPage from "./pages/student/ProgressPage";
import SessionEntryPage from "./pages/student/SessionEntryPage";
import SessionExamPage from "./pages/student/SessionExamPage";
import LoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import TopicsPage from "./pages/admin/TopicsPage";
import TestEditorPage from "./pages/admin/TestEditorPage";
import SubmissionsPage from "./pages/admin/SubmissionsPage";
import RosterPage from "./pages/admin/RosterPage";
import DiagnosticsPage from "./pages/admin/DiagnosticsPage";
import ImportPage from "./pages/admin/ImportPage";
import SessionsPage from "./pages/admin/SessionsPage";
import OperationsPage from "./pages/admin/OperationsPage";
import StaffPage from "./pages/admin/StaffPage";

// Chặn vào trang quản trị khi chưa đăng nhập.
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, profileLoading, profile } = useAuth();
  if (loading || profileLoading) return <div className="center muted">Đang kiểm tra đăng nhập…</div>;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (profile?.active === false) return <div className="center muted">Tài khoản giáo viên này đang bị khóa. Liên hệ admin để mở lại.</div>;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/operations" replace />;
  return <>{children}</>;
}

function RequireContent({ children }: { children: ReactNode }) {
  const { canManageContent } = useAuth();
  if (!canManageContent) return <Navigate to="/admin/operations" replace />;
  return <>{children}</>;
}

function RequireGrading({ children }: { children: ReactNode }) {
  const { canGrade, isAdmin } = useAuth();
  if (!canGrade && !isAdmin) return <Navigate to="/admin/operations" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Học sinh */}
          <Route path="/" element={<StudentHome />} />
          <Route path="/writing/:topicId" element={<WritingExamPage />} />
          <Route path="/placement/:testId" element={<PlacementExamPage />} />
          <Route path="/exam/:testId" element={<ExamPage />} />
          <Route path="/exam-room" element={<SessionEntryPage />} />
          <Route path="/session/:sessionId" element={<SessionExamPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/progress" element={<ProgressPage />} />

          {/* Giáo viên */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="operations" replace />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="staff" element={<RequireAdmin><StaffPage /></RequireAdmin>} />
            <Route path="topics" element={<RequireContent><TopicsPage /></RequireContent>} />
            <Route path="topics/:skill" element={<RequireContent><TopicsPage /></RequireContent>} />
            <Route path="tests/:testId" element={<RequireContent><TestEditorPage /></RequireContent>} />
            <Route path="submissions" element={<RequireGrading><SubmissionsPage /></RequireGrading>} />
            <Route path="roster" element={<RequireAdmin><RosterPage /></RequireAdmin>} />
            <Route path="diagnostics" element={<RequireGrading><DiagnosticsPage /></RequireGrading>} />
            <Route path="import" element={<RequireContent><ImportPage /></RequireContent>} />
            <Route path="sessions" element={<RequireAdmin><SessionsPage /></RequireAdmin>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
