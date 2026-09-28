export type RoleCode =
  | 'OWNER'
  | 'HR_ADMIN'
  | 'HR_MANAGER'
  | 'DEPARTMENT_MANAGER'
  | 'EMPLOYEE'
  | 'RECRUITER'
  | 'PAYROLL_ADMIN'
  | 'TRAINING_MANAGER';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  roleCode: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  organizationId?: string;
  roleCode?: string;
  permissions: string[];
  organizations?: OrganizationSummary[];
  requiresOrganizationSelection?: boolean;
  requiresOrganizationSetup?: boolean;
}

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}
