import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext.js";
import { AppLayout } from "./components/layout/AppLayout.js";
import type { Role } from "@shared/types.js";

import LoginPage from "./pages/LoginPage.js";
import DashboardRouter from "./pages/DashboardRouter.js";
import StudentsPage from "./pages/StudentsPage.js";
import TeachersPage from "./pages/TeachersPage.js";
import ClassesPage from "./pages/ClassesPage.js";
import SubjectsPage from "./pages/SubjectsPage.js";
import MarkAttendancePage from "./pages/MarkAttendancePage.js";
import HistoryPage from "./pages/HistoryPage.js";
import AnalyticsPage from "./pages/AnalyticsPage.js";
import ReportsPage from "./pages/ReportsPage.js";
import AuditLogPage from "./pages/AuditLogPage.js";
import ProfilePage from "./pages/ProfilePage.js";

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
    </div>
  );
}

function RequireAuth({ children, roles }: { children: JSX.Element; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.profile.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/mark" element={<RequireAuth roles={["teacher"]}><MarkAttendancePage /></RequireAuth>} />
        <Route path="/students" element={<RequireAuth roles={["admin"]}><StudentsPage /></RequireAuth>} />
        <Route path="/teachers" element={<RequireAuth roles={["admin"]}><TeachersPage /></RequireAuth>} />
        <Route path="/classes" element={<RequireAuth roles={["admin"]}><ClassesPage /></RequireAuth>} />
        <Route path="/subjects" element={<RequireAuth roles={["admin"]}><SubjectsPage /></RequireAuth>} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/analytics" element={<RequireAuth roles={["admin", "teacher"]}><AnalyticsPage /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth roles={["admin", "teacher"]}><ReportsPage /></RequireAuth>} />
        <Route path="/audit" element={<RequireAuth roles={["admin"]}><AuditLogPage /></RequireAuth>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
