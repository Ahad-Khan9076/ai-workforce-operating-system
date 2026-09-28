# API overview

Base URL: `/api/v1`

## Auth

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- `POST /auth/select-organization`
- `GET /auth/me`

## Billing

- `GET /billing/plans` (public catalog)
- `GET /billing/subscription`, `/billing/usage`, `/billing/invoices` — `billing.read`
- `POST /billing/checkout` — `billing.manage`

## Settings

- `GET /settings/profile`
- `GET /settings/organization` — `organization.read`
- `PATCH /settings/organization` — `settings.manage` (JSON: notifications, ai, integrations, security)

## Audit

- `GET /audit-logs?limit=50` — `audit.read`, tenant-scoped

## Intelligence & AI

- `/intelligence/*` — insights, risk, skills, action center
- `/ai/copilot/*` — streaming copilot (see module controllers)

All other HR modules follow REST patterns under their resource prefixes (`/employees`, `/leave`, etc.).
