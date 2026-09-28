# Architecture

## Overview

Monorepo SaaS: **NestJS API** (`backend/`) + **React SPA** (`frontend/`), PostgreSQL via Prisma, optional Redis for future queues.

## Tenancy

- JWT carries `organizationId`, `roleCode`, and `permissions`.
- `TenantGuard` blocks cross-tenant body fields; services scope queries with `organizationId` from the authenticated user.
- Never trust client-supplied tenant identifiers.

## Modules

| Domain | Path | Notes |
| --- | --- | --- |
| Auth & RBAC | `modules/auth`, `modules/rbac` | JWT access + httpOnly refresh rotation |
| Workforce | employees, departments, attendance, leave, payroll | Manager scope via `EmployeeScopeService` |
| Talent & L&D | recruitment, training, performance, onboarding | |
| Intelligence | `modules/intelligence` | Skills, gaps, risk, insights |
| AI Copilot | `modules/ai` | Provider abstraction, tool executor, RBAC at tool layer |
| Proactive | `modules/proactive` | Recommendations, automations, action center |
| Billing | `modules/billing` | Plans, subscriptions, usage, invoices; Stripe adapter stub |
| Settings | `modules/settings` | Organization JSON settings (AI, notifications, integrations) |
| Audit | `modules/audit` | Central `AuditLog` for security and compliance events |

## AI architecture

- LLM providers implement a shared interface (`mock`, OpenAI).
- Tools call existing services; permissions re-checked per tool.
- Writes may require user confirmation; actions logged to AI audit + central audit where applicable.

## Billing architecture

- **Plan** definitions live in the database (seeded from `DEFAULT_PLANS` in development).
- **PaymentProvider** interface; **StripePaymentProvider** is the default adapter (checkout stub until `STRIPE_SECRET_KEY` is set).
- Frontend loads plan names/prices from `GET /billing/plans` — no hard-coded pricing in UI components.

## Observability

- Request logging via `LoggingInterceptor`.
- Structured JSON logs in production via `logStructured` helper.
- Hooks for Sentry (`SENTRY_DSN`) documented in `.env.example`; wire in `main.ts` when DSN is present.

## Security

- Global rate limiting (`@nestjs/throttler`), Helmet + custom security headers, CORS allowlist, validation pipe whitelist.
- Password policy on register/reset; refresh token rotation; secrets server-side only.
