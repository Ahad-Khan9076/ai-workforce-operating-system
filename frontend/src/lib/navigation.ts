import type { NavSection } from '@/types';

export const sidebarNavigation: NavSection[] = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', href: '/' }],
  },
  {
    label: 'People',
    items: [
      { title: 'Employees', href: '/employees' },
      { title: 'Departments', href: '/departments' },
      { title: 'Organization', href: '/organization' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { title: 'Jobs', href: '/recruitment/jobs' },
      { title: 'Candidates', href: '/recruitment/candidates' },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { title: 'Attendance', href: '/workforce/attendance' },
      { title: 'Leave', href: '/workforce/leave' },
      { title: 'Payroll', href: '/workforce/payroll' },
      { title: 'Training', href: '/workforce/training' },
      { title: 'Performance', href: '/workforce/performance' },
      { title: 'Skills', href: '/workforce/skills' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { title: 'Workforce Insights', href: '/intelligence/insights' },
      { title: 'Risk Center', href: '/intelligence/risk' },
      { title: 'AI Copilot', href: '/intelligence/copilot' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { title: 'Settings', href: '/settings' },
      { title: 'Members', href: '/settings/members' },
      { title: 'Roles & Permissions', href: '/settings/roles' },
      { title: 'Audit Logs', href: '/admin/audit-logs' },
      { title: 'Billing', href: '/admin/billing' },
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
  insights: 'Workforce Insights',
  risk: 'Risk Center',
  copilot: 'AI Copilot',
  admin: 'Administration',
  settings: 'Settings',
  roles: 'Roles & Permissions',
  'audit-logs': 'Audit Logs',
  billing: 'Billing',
};
