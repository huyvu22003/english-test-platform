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

// Chặn vào trang quản trị khi chưa đăng nhập.
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="center muted">Đang kiểm tra đăng nhập…</div>;
  if (!session) return <Navigate to="/admin/login" replace />;
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
            <Route index element={<Navigate to="topics" replace />} />
            <Route path="topics" element={<TopicsPage />} />
            <Route path="tests/:testId" element={<TestEditorPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="roster" element={<RosterPage />} />
            <Route path="diagnostics" element={<DiagnosticsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="sessions" element={<SessionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
