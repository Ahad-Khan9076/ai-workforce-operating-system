import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session);
  if (session?.accessToken) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();

  if (!session?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session.requiresOrganizationSetup) {
    const allowed = location.pathname.startsWith('/onboarding');
    if (!allowed) {
      return <Navigate to="/onboarding/organization" replace />;
    }
  }

  if (session.requiresOrganizationSelection) {
    const allowed =
      location.pathname.startsWith('/onboarding/select-organization');
    if (!allowed) {
      return <Navigate to="/onboarding/select-organization" replace />;
    }
  }

  return children;
}

export function RequireOrganizationRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session);
  if (!session?.organizationId) {
    return <Navigate to="/onboarding/organization" replace />;
  }
  return children;
}
