# AI Workforce Operating System

Multi-tenant B2B HR SaaS that combines core workforce operations with **workforce intelligence** and a **tool-grounded AI copilot**. Built as a production-style monorepo (NestJS API + React SPA).

## What it does

| Area | Capabilities |
| --- | --- |
| **Core HR** | Organizations, RBAC, employees, departments, documents, skills |
| **Time & pay** | Shifts, attendance, leave, payroll engine, payslips |
| **Talent** | Recruitment ATS, CV pipeline, mock AI screening, hire → onboarding |
| **People development** | LMS, performance cycles, goals, reviews |
| **Intelligence** | Skill gaps, talent matching, risk rules, actionable insights, role-based dashboards |
| **AI copilot** | HR / manager / employee modes; read tools + confirmed write actions; audit trail |

**Security model:** tenant scope from JWT (not client `organizationId`); permissions enforced in guards and **again at every copilot tool**.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind v4, TanStack Query, Zustand, React Router |
| Backend | NestJS, Prisma 6, PostgreSQL, JWT + httpOnly refresh |
| AI | Provider abstraction (`mock` / OpenAI); no direct DB access from the model |
| Local infra | Docker Compose (PostgreSQL, Redis) |

## Quick start

### Prerequisites

- Node.js 20+
- Docker (recommended)

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

API: `http://localhost:3000/api/v1` · Health: `GET /api/v1/health`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173` (Vite proxies `/api` to the backend)

### Optional: OpenAI copilot

```bash
# backend/.env
OPENAI_API_KEY=sk-...
AI_PROVIDER=auto   # mock when key is absent
```

## Repository layout

```text
hr_project/
  backend/           NestJS modular monolith, Prisma schema & migrations
  frontend/          Vite React application shell + feature modules
  docker-compose.yml PostgreSQL + Redis
```

## Main UI routes

- `/` — Dashboard (workforce + intelligence cards)
- `/employees`, `/departments`, `/organization`
- `/workforce/attendance`, `/workforce/leave`, `/workforce/payroll`, `/workforce/training`, `/workforce/performance`, `/workforce/skills`
- `/recruitment/jobs`, `/recruitment/candidates`
- `/intelligence/insights`, `/intelligence/risk`, `/intelligence/copilot`

## Quality checks

```bash
cd backend && npm run typecheck && npm run lint && npm run test && npm run build
cd frontend && npm run typecheck && npm run lint && npm run build
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. Never commit `.env` files.

Required backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS` (default includes `http://localhost:5173`)

## Architecture notes

### Multi-tenancy

- Tenant-owned data uses `organizationId`.
- Session carries org context; `TenantGuard` blocks client-supplied tenant overrides.

### RBAC

Roles include `OWNER`, `HR_ADMIN`, `HR_MANAGER`, `DEPARTMENT_MANAGER`, `EMPLOYEE`, `RECRUITER`, `PAYROLL_ADMIN`, `TRAINING_MANAGER`, with granular permission codes (e.g. `employee.read`, `payroll.manage`, `ai.use`).

### Copilot tools

Reads (headcount, employees, attendance, leave, payroll summary, training, performance, skill gaps, risks, hiring) execute immediately after permission checks. Writes (leave, approvals, check-ins, training assign, etc.) create a **pending action** until the user confirms.

---

## Implementation phases (reference)

<details>
<summary>Phases 0–8 (expand)</summary>

### Phase 8 — AI workforce copilot

- `AiConversation`, tools, `AiAction` confirmation, `AiAuditLog`, `/ai/copilot/*`, UI at `/intelligence/copilot`

### Phase 7 — Workforce intelligence

- Skill requirements & gaps, talent matching, risk engine, insights, dashboards — `/intelligence/*`

### Phase 6 — Onboarding, LMS, performance

- Templates, enrollments, certificates, review workflows — `/onboarding/*`, `/training/*`, `/performance/*`

### Phase 5 — Recruitment / ATS

- Jobs, pipeline, mock AI screening, hire flow — `/recruitment/*`

### Phase 4 — Payroll

- Config-driven engine, periods, payslips — `/payroll/*`

### Phase 3 — Attendance & leave

- Shifts, clock in/out, leave balances — `/attendance/*`, `/leave/*`

### Phase 2 — Organization & employees

- Structure, employee profiles, analytics dashboard

### Phase 1 — Auth & tenant foundation

- JWT refresh, org onboarding, invitations, members, roles

### Phase 0 — Foundation

- Monorepo scaffold, shell UI, Prisma base schema, lint/test pipeline

</details>

## Product direction

Move from **what happened** → **why it matters** → **recommended action** → **help executing** — with copilots that only act through approved, audited tools.

## License

Private / all rights reserved unless you add an open-source license file.
