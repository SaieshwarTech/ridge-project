import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  ClipboardCheck,
  History,
  BarChart3,
  FileSpreadsheet,
  ScrollText,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@shared/types.js";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
  { to: "/mark", label: "Mark Attendance", icon: ClipboardCheck, roles: ["teacher"] },
  { to: "/students", label: "Students", icon: Users, roles: ["admin"] },
  { to: "/teachers", label: "Teachers", icon: GraduationCap, roles: ["admin"] },
  { to: "/classes", label: "Classes", icon: School, roles: ["admin"] },
  { to: "/subjects", label: "Subjects", icon: BookOpen, roles: ["admin"] },
  { to: "/history", label: "Attendance History", icon: History, roles: ["admin", "teacher", "student"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "teacher"] },
  { to: "/reports", label: "Reports & Export", icon: FileSpreadsheet, roles: ["admin", "teacher"] },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
  { to: "/profile", label: "Profile & Settings", icon: UserCircle, roles: ["admin", "teacher", "student"] },
];
