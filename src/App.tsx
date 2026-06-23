import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import StudentHome from "./pages/student/StudentHome";
import ExamPage from "./pages/student/ExamPage";
import ResultPage from "./pages/student/ResultPage";
import LoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import TopicsPage from "./pages/admin/TopicsPage";
import TestEditorPage from "./pages/admin/TestEditorPage";
import SubmissionsPage from "./pages/admin/SubmissionsPage";

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
          <Route path="/exam/:testId" element={<ExamPage />} />
          <Route path="/result" element={<ResultPage />} />

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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
