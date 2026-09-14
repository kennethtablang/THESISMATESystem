import {
  LayoutDashboard, Users, FileText, Calendar,
  Bell, BarChart3, UserCircle, Star, Upload, Cpu,
  ShieldCheck, BookOpen, Megaphone, PenLine, Activity,
  GraduationCap, Building2, CalendarRange, ClipboardList,
} from 'lucide-react'

// Single source for per-role navigation. The sidebar renders it and the top bar's search
// offers the same pages, so the two cannot disagree about where a role may go.
// { divider: true, label: 'Section' } entries render as labeled section breaks
export const navByRole = {
  SuperAdmin: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { divider: true, label: 'Management' },
    { label: 'User Management',  icon: ShieldCheck,     to: '/users' },
    { label: 'Classrooms',       icon: Building2,       to: '/classrooms' },
    { label: 'Advisers',         icon: GraduationCap,   to: '/advisers' },
    { label: 'Manage Groups',    icon: Users,           to: '/groups' },
    { label: 'All Documents',    icon: FileText,        to: '/documents' },
    { divider: true, label: 'Academic' },
    { label: 'System Tracker',   icon: Cpu,             to: '/system-features' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { divider: true, label: 'Defenses' },
    { label: 'Defense Schedules',  icon: Calendar,       to: '/defenses' },
    { label: 'Defense Scheduler',  icon: CalendarRange,  to: '/defense-scheduler' },
    { label: 'Rubric Manager',     icon: ClipboardList,  to: '/rubric-manager' },
    { divider: true, label: 'Reports' },
    { label: 'Reports',            icon: BarChart3,      to: '/reports' },
  ],
  Admin: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { divider: true, label: 'Management' },
    { label: 'User Management',  icon: ShieldCheck,     to: '/users' },
    { label: 'Classrooms',       icon: Building2,       to: '/classrooms' },
    { label: 'Advisers',         icon: GraduationCap,   to: '/advisers' },
    { label: 'Manage Groups',    icon: Users,           to: '/groups' },
    { divider: true, label: 'Academic' },
    { label: 'Chapters',         icon: FileText,        to: '/chapters' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { divider: true, label: 'Defenses' },
    { label: 'Defense Schedules',  icon: Calendar,       to: '/defenses' },
    { label: 'Defense Scheduler',  icon: CalendarRange,  to: '/defense-scheduler' },
    { label: 'Rubric Manager',     icon: ClipboardList,  to: '/rubric-manager' },
    { divider: true, label: 'Reports' },
    { label: 'Reports',            icon: BarChart3,      to: '/reports' },
  ],
  Faculty: [
    { label: 'Dashboard',             icon: LayoutDashboard, to: '/dashboard' },
    { divider: true, label: 'Academic' },
    { label: 'My Groups',             icon: Users,           to: '/groups' },
    { label: 'Manuscripts',           icon: BookOpen,        to: '/documents' },
    { label: 'System Tracker',        icon: Cpu,             to: '/system-features' },
    { label: 'Monitoring',            icon: Activity,        to: '/monitoring' },
    { divider: true, label: 'Defenses' },
    { label: 'Defense Schedules',  icon: Calendar,      to: '/defenses' },
    { label: 'Defense Scheduler',  icon: CalendarRange, to: '/defense-scheduler' },
    { label: 'Rate Defenses',      icon: Star,          to: '/ratings' },
    { divider: true, label: 'Reports' },
    { label: 'Reports',               icon: BarChart3,       to: '/reports' },
  ],
  Student: [
    { label: 'Dashboard',            icon: LayoutDashboard, to: '/dashboard' },
    { divider: true, label: 'My Work' },
    { label: 'My Class',             icon: Megaphone,       to: '/my-class' },
    { label: 'My Group',             icon: Users,           to: '/groups' },
    { label: 'Manuscript',           icon: PenLine,         to: '/manuscript' },
    { label: 'Upload Documents',     icon: Upload,          to: '/documents' },
    { label: 'System Tracker',       icon: Cpu,             to: '/system-features' },
    { label: 'Monitoring',           icon: Activity,        to: '/monitoring' },
    { divider: true, label: 'Schedule' },
    { label: 'Defense Schedule',     icon: Calendar,        to: '/defenses' },
  ],
}

export const accountItems = [
  { label: 'Notifications', icon: Bell,        to: '/notifications' },
  { label: 'My Profile',    icon: UserCircle,  to: '/profile' },
]
