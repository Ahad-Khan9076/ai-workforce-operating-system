import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/app-layout';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import {
  GuestRoute,
  ProtectedRoute,
  RequireOrganizationRoute,
} from '@/features/auth/auth-guards';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { VerifyEmailPage } from '@/features/auth/verify-email-page';
import { AcceptInvitationPage } from '@/features/auth/accept-invitation-page';
import { OrganizationOnboardingPage } from '@/features/onboarding/organization-onboarding-page';
import { SelectOrganizationPage } from '@/features/onboarding/select-organization-page';
import { InviteOnboardingPage } from '@/features/onboarding/invite-onboarding-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { MembersSettingsPage } from '@/features/settings/members-settings-page';
import { RolesSettingsPage } from '@/features/settings/roles-settings-page';
import { EmployeesListPage } from '@/features/employees/employees-list-page';
import { EmployeeFormPage } from '@/features/employees/employee-form-page';
import { EmployeeDetailPage } from '@/features/employees/employee-detail-page';
import { DepartmentsListPage } from '@/features/departments/departments-list-page';
import { DepartmentDetailPage } from '@/features/departments/department-detail-page';
import { OrganizationPage } from '@/features/organization/organization-page';
import { AttendancePage } from '@/features/attendance/attendance-page';
import { LeavePage } from '@/features/leave/leave-page';
import { PayrollPage } from '@/features/payroll/payroll-page';
import { RecruitmentPage } from '@/features/recruitment/recruitment-page';
import { RecruitmentCandidatesPage } from '@/features/recruitment/candidates-page';
import { TrainingPage } from '@/features/training/training-page';
import { PerformancePage } from '@/features/performance/performance-page';
import { SkillsIntelligencePage } from '@/features/intelligence/skills-page';
import { WorkforceInsightsPage } from '@/features/intelligence/insights-page';
import { RiskCenterPage } from '@/features/intelligence/risk-page';
import { CopilotPage } from '@/features/copilot/copilot-page';
import { ActionCenterPage } from '@/features/intelligence/action-center-page';
import { BillingPage } from '@/features/billing/billing-page';
import { AuditLogsPage } from '@/features/admin/audit-logs-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/verify-email" element={<GuestRoute><VerifyEmailPage /></GuestRoute>} />
      <Route path="/accept-invitation" element={<GuestRoute><AcceptInvitationPage /></GuestRoute>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="onboarding/organization" element={<OrganizationOnboardingPage />} />
        <Route path="onboarding/select-organization" element={<SelectOrganizationPage />} />
        <Route
          path="onboarding/invite"
          element={
            <RequireOrganizationRoute>
              <InviteOnboardingPage />
            </RequireOrganizationRoute>
          }
        />

        <Route
          index
          element={
            <RequireOrganizationRoute>
              <DashboardPage />
            </RequireOrganizationRoute>
          }
        />

        <Route
          path="settings"
          element={
            <RequireOrganizationRoute>
              <SettingsPage />
            </RequireOrganizationRoute>
          }
        />
        <Route
          path="settings/members"
          element={
            <RequireOrganizationRoute>
              <MembersSettingsPage />
            </RequireOrganizationRoute>
          }
        />
        <Route
          path="settings/roles"
          element={
            <RequireOrganizationRoute>
              <RolesSettingsPage />
            </RequireOrganizationRoute>
          }
        />

        <Route path="employees" element={<RequireOrganizationRoute><EmployeesListPage /></RequireOrganizationRoute>} />
        <Route path="employees/new" element={<RequireOrganizationRoute><EmployeeFormPage /></RequireOrganizationRoute>} />
        <Route path="employees/:employeeId/edit" element={<RequireOrganizationRoute><EmployeeFormPage /></RequireOrganizationRoute>} />
        <Route path="employees/:employeeId" element={<RequireOrganizationRoute><EmployeeDetailPage /></RequireOrganizationRoute>} />
        <Route path="departments" element={<RequireOrganizationRoute><DepartmentsListPage /></RequireOrganizationRoute>} />
        <Route path="departments/:departmentId" element={<RequireOrganizationRoute><DepartmentDetailPage /></RequireOrganizationRoute>} />
        <Route path="organization" element={<RequireOrganizationRoute><OrganizationPage /></RequireOrganizationRoute>} />
        <Route path="people/employees" element={<Navigate to="/employees" replace />} />
        <Route path="people/departments" element={<Navigate to="/departments" replace />} />
        <Route path="people/organization" element={<Navigate to="/organization" replace />} />
        <Route path="recruitment/jobs" element={<RequireOrganizationRoute><RecruitmentPage /></RequireOrganizationRoute>} />
        <Route path="recruitment/candidates" element={<RequireOrganizationRoute><RecruitmentCandidatesPage /></RequireOrganizationRoute>} />
        <Route path="recruitment" element={<Navigate to="/recruitment/jobs" replace />} />
        <Route path="workforce/attendance" element={<RequireOrganizationRoute><AttendancePage /></RequireOrganizationRoute>} />
        <Route path="workforce/leave" element={<RequireOrganizationRoute><LeavePage /></RequireOrganizationRoute>} />
        <Route path="workforce/payroll" element={<RequireOrganizationRoute><PayrollPage /></RequireOrganizationRoute>} />
        <Route path="workforce/training" element={<RequireOrganizationRoute><TrainingPage /></RequireOrganizationRoute>} />
        <Route path="workforce/performance" element={<RequireOrganizationRoute><PerformancePage /></RequireOrganizationRoute>} />
        <Route path="workforce/skills" element={<RequireOrganizationRoute><SkillsIntelligencePage /></RequireOrganizationRoute>} />
        <Route path="intelligence/action-center" element={<RequireOrganizationRoute><ActionCenterPage /></RequireOrganizationRoute>} />
        <Route path="intelligence/insights" element={<RequireOrganizationRoute><WorkforceInsightsPage /></RequireOrganizationRoute>} />
        <Route path="intelligence/risk" element={<RequireOrganizationRoute><RiskCenterPage /></RequireOrganizationRoute>} />
        <Route path="intelligence/copilot" element={<RequireOrganizationRoute><CopilotPage /></RequireOrganizationRoute>} />
        <Route path="admin/audit-logs" element={<RequireOrganizationRoute><AuditLogsPage /></RequireOrganizationRoute>} />
        <Route path="admin/billing" element={<RequireOrganizationRoute><BillingPage /></RequireOrganizationRoute>} />
        <Route path="admin/settings" element={<Navigate to="/settings" replace />} />
        <Route path="admin/roles" element={<Navigate to="/settings/roles" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
