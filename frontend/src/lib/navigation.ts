import {
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Target,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import type { NavSection } from '@/types';

export const sidebarNavigation: NavSection[] = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'People',
    items: [
      { title: 'Employees', href: '/employees', icon: Users },
      { title: 'Departments', href: '/departments', icon: Building2 },
      { title: 'Organization', href: '/organization', icon: Briefcase },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { title: 'Jobs', href: '/recruitment/jobs', icon: ClipboardList },
      { title: 'Candidates', href: '/recruitment/candidates', icon: UserCircle },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { title: 'Attendance', href: '/workforce/attendance', icon: CalendarClock },
      { title: 'Leave', href: '/workforce/leave', icon: CalendarClock },
      { title: 'Payroll', href: '/workforce/payroll', icon: Wallet },
      { title: 'Training', href: '/workforce/training', icon: GraduationCap },
      { title: 'Performance', href: '/workforce/performance', icon: Target },
      { title: 'Skills', href: '/workforce/skills', icon: Sparkles },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { title: 'Action Center', href: '/intelligence/action-center', icon: Sparkles },
      { title: 'Workforce Insights', href: '/intelligence/insights', icon: BarChart3 },
      { title: 'Risk Center', href: '/intelligence/risk', icon: AlertTriangle },
      { title: 'AI Copilot', href: '/intelligence/copilot', icon: Bot },
    ],
  },
  {
    label: 'Administration',
    items: [
      { title: 'Settings', href: '/settings', icon: Settings },
      { title: 'Members', href: '/settings/members', icon: Users },
      { title: 'Roles & Permissions', href: '/settings/roles', icon: Shield },
      { title: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
      { title: 'Billing', href: '/admin/billing', icon: CreditCard },
    ],
  },
];

export const breadcrumbLabels: Record<string, string> = {
  '': 'Dashboard',
  people: 'People',
  employees: 'Employees',
  departments: 'Departments',
  organization: 'Organization',
  recruitment: 'Recruitment',
  jobs: 'Jobs',
  candidates: 'Candidates',
  workforce: 'Workforce',
  attendance: 'Attendance',
  leave: 'Leave',
  payroll: 'Payroll',
  training: 'Training',
  performance: 'Performance',
  skills: 'Skills',
  intelligence: 'Intelligence',
  'action-center': 'Action Center',
  insights: 'Workforce Insights',
  risk: 'Risk Center',
  copilot: 'AI Copilot',
  admin: 'Administration',
  settings: 'Settings',
  members: 'Members',
  roles: 'Roles & Permissions',
  'audit-logs': 'Audit Logs',
  billing: 'Billing',
  onboarding: 'Onboarding',
};
