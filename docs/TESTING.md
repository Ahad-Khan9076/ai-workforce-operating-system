# Testing

## Backend

```bash
cd backend
npm run typecheck
npm run lint
npm run test          # unit tests (Vitest)
npm run test:e2e      # integration tests when DATABASE_URL is available
npm run build
```

## Frontend

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Manual smoke checklist

- Auth: register, login, logout, select organization
- RBAC: HR manager vs owner on billing/settings routes
- Tenant isolation: two orgs, no cross-tenant IDs in API bodies
- Core modules: employees, attendance, leave approve, payroll read
- Intelligence & copilot: insights, action center, copilot stream
- Billing: `/admin/billing` loads plans from API and usage snapshot
- Audit: `/admin/audit-logs` after login and leave approval
