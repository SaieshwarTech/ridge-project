import { useAuth } from "@/context/AuthContext.js";
import AdminDashboard from "./dashboards/AdminDashboard.js";
import TeacherDashboard from "./dashboards/TeacherDashboard.js";
import StudentDashboard from "./dashboards/StudentDashboard.js";

export default function DashboardRouter() {
  const { user } = useAuth();
  switch (user?.profile.role) {
    case "admin":
      return <AdminDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    default:
      return null;
  }
}
