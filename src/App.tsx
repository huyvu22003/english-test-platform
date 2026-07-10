import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import ErrorBoundary from "./components/ErrorBoundary";
import { Skeleton } from "./components/common";

const StudentHome = lazy(() => import("./pages/student/StudentHome"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ExamPage = lazy(() => import("./pages/student/ExamPage"));
const WritingExamPage = lazy(() => import("./pages/student/WritingExamPage"));
const PlacementExamPage = lazy(() => import("./pages/student/PlacementExamPage"));
const ResultPage = lazy(() => import("./pages/student/ResultPage"));
const ProgressPage = lazy(() => import("./pages/student/ProgressPage"));
const SessionEntryPage = lazy(() => import("./pages/student/SessionEntryPage"));
const SessionExamPage = lazy(() => import("./pages/student/SessionExamPage"));

const LoginPage = lazy(() => import("./pages/admin/LoginPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const TopicsPage = lazy(() => import("./pages/admin/TopicsPage"));
const TestEditorPage = lazy(() => import("./pages/admin/TestEditorPage"));
const SubmissionsPage = lazy(() => import("./pages/admin/SubmissionsPage"));
const RosterPage = lazy(() => import("./pages/admin/RosterPage"));
const DiagnosticsPage = lazy(() => import("./pages/admin/DiagnosticsPage"));
const ImportPage = lazy(() => import("./pages/admin/ImportPage"));
const SessionsPage = lazy(() => import("./pages/admin/SessionsPage"));
const OperationsPage = lazy(() => import("./pages/admin/OperationsPage"));
const StaffPage = lazy(() => import("./pages/admin/StaffPage"));

function Loading() {
  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <Skeleton heading lines={4} />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, profileLoading, profile } = useAuth();
  if (loading || profileLoading) return <div className="center muted">Đang kiểm tra đăng nhập…</div>;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (profile?.active === false)
    return <div className="center muted">Tài khoản giáo viên này đang bị khóa. Liên hệ admin để mở lại.</div>;
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
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
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
                <Route
                  path="staff"
                  element={
                    <RequireAdmin>
                      <StaffPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="topics"
                  element={
                    <RequireContent>
                      <TopicsPage />
                    </RequireContent>
                  }
                />
                <Route
                  path="topics/:skill"
                  element={
                    <RequireContent>
                      <TopicsPage />
                    </RequireContent>
                  }
                />
                <Route
                  path="tests/:testId"
                  element={
                    <RequireContent>
                      <TestEditorPage />
                    </RequireContent>
                  }
                />
                <Route
                  path="submissions"
                  element={
                    <RequireGrading>
                      <SubmissionsPage />
                    </RequireGrading>
                  }
                />
                <Route
                  path="roster"
                  element={
                    <RequireAdmin>
                      <RosterPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="diagnostics"
                  element={
                    <RequireGrading>
                      <DiagnosticsPage />
                    </RequireGrading>
                  }
                />
                <Route
                  path="import"
                  element={
                    <RequireContent>
                      <ImportPage />
                    </RequireContent>
                  }
                />
                <Route
                  path="sessions"
                  element={
                    <RequireAdmin>
                      <SessionsPage />
                    </RequireAdmin>
                  }
                />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
