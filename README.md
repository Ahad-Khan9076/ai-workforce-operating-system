# AI Workforce Operating System

![AI Workforce Operating System banner](docs/assets/readme-banner.svg)

[![GitHub](https://img.shields.io/github/stars/Ahad-Khan9076/ai-workforce-operating-system?style=social)](https://github.com/Ahad-Khan9076/ai-workforce-operating-system)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/API-NestJS-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/UI-React_19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/db-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178C6?logo=typescript&logoColor=white)

Multi-tenant B2B HR SaaS: core workforce operations, **workforce intelligence**, **proactive recommendations**, and a **tool-grounded AI copilot** — in one production-style monorepo.

**Repository:** [github.com/Ahad-Khan9076/ai-workforce-operating-system](https://github.com/Ahad-Khan9076/ai-workforce-operating-system)

---

## Table of contents

- [At a glance](#at-a-glance)
- [Architecture](#architecture)
- [Intelligence loop](#intelligence-loop)
- [AI copilot flow](#ai-copilot-flow)
- [Quick start](#quick-start)
- [Demo account](#demo-account)
- [Documentation](#documentation)
- [Quality checks](#quality-checks)
- [License](#license)

---

## At a glance

```mermaid
mindmap
  root((AI Workforce OS))
    Core HR
      Employees
      Departments
      RBAC
    Time and pay
      Attendance
      Leave
      Payroll
    Talent
      Recruitment ATS
      Onboarding
    Development
      Training LMS
      Performance
    Intelligence
      Skill gaps
      Risk center
      Insights
    Proactive
      Action center
      Automations
    AI
      Copilot tools
      Confirmed writes
    SaaS
      Billing plans
      Usage
      Audit logs
```

| Area | What you get |
| --- | --- |
| **Core HR** | Orgs, RBAC, employees, departments, documents, skills |
| **Time & pay** | Shifts, attendance, leave, payroll engine, payslips |
| **Talent** | Jobs, candidates, pipeline, hire → onboarding |
| **People development** | LMS, performance cycles, goals, reviews |
| **Intelligence** | Gaps, talent match, risk rules, role-aware insights |
| **Proactive** | Recommendations, action center, automations, notifications |
| **AI copilot** | HR / manager / employee modes; audited tools + confirm-before-write |
| **SaaS** | Plans, subscriptions, usage, invoices, settings, central audit |

Tenant scope comes from the **JWT**, not client-supplied `organizationId`. Permissions run in API guards and **again on every copilot tool**.

---

## Architecture

```mermaid
flowchart TB
  subgraph Client
    SPA[React SPA · Vite]
  end

  subgraph API["NestJS API"]
    GW[Guards · JWT · RBAC · Tenant]
    MOD[Domain modules]
    AI[AI Copilot · Tools]
    PRO[Proactive engine]
    BILL[Billing · Usage]
  end

  subgraph Data
    PG[(PostgreSQL)]
    REDIS[(Redis · future queues)]
  end

  SPA -->|"/api/v1 · cookies + Bearer"| GW
  GW --> MOD
  GW --> AI
  GW --> PRO
  GW --> BILL
  MOD --> PG
  AI --> MOD
  PRO --> MOD
  BILL --> PG
  MOD -.-> REDIS
```

```text
hr_project/
├── backend/          NestJS · Prisma · migrations · tests
├── frontend/         React 19 · TanStack Query · shadcn/ui
├── docs/             Architecture · deploy · security · API · UI
├── docker-compose.yml          Postgres + Redis (dev)
└── docker-compose.prod.yml     Full stack (prod)
```

---

## Intelligence loop

From signal to action — without bypassing humans for risky steps:

```mermaid
sequenceDiagram
  participant Data as Workforce data
  participant Engine as Recommendation engine
  participant AC as Action Center
  participant User as Admin / HR
  participant Auto as Automation engine

  Data->>Engine: Rules scan (attendance, skills, training…)
  Engine->>AC: Recommendations + evidence
  User->>AC: Approve or dismiss
  AC->>Auto: Optional automation (audited)
  Auto->>Data: Notify · assign · escalate
```

**UI:** `/intelligence/action-center` · `/intelligence/insights` · `/intelligence/risk`

---

## AI copilot flow

The model never touches the database directly — only **approved tools** behind RBAC:

```mermaid
flowchart LR
  U[User message] --> C[Copilot]
  C --> T{Tool needed?}
  T -->|Read| R[Execute read tool]
  T -->|Write| P[Pending AiAction]
  P --> OK{User confirms?}
  OK -->|Yes| W[Execute write tool]
  OK -->|No| X[Reject]
  R --> A[Audit log]
  W --> A
```

**UI:** `/intelligence/copilot` · streaming chat · confirmation cards for writes

---

## Quick start

### Prerequisites

- Node.js 20+
- Docker **or** embedded Postgres (no Docker)

### 1. Database

**Docker (recommended):**

```bash
docker compose up -d
```

**No Docker:**

```bash
cd backend && npm run db:local
```

Keep that terminal open (embedded PostgreSQL on `localhost:5432`).

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Health: `GET /api/v1/health`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- App: `http://localhost:5173` (Vite proxies `/api` to the backend)

**502 Bad Gateway?** Start PostgreSQL and the backend. Verify: `curl http://localhost:3000/api/v1/health`

### Optional: OpenAI copilot

```bash
# backend/.env
OPENAI_API_KEY=sk-...
AI_PROVIDER=auto
```

---

## Demo account

After `npm run db:seed` (development only):

| Field | Value |
| --- | --- |
| Email | `demo@hrworkforce.local` |
| Password | `DemoOwner1` |
| Organization | Demo Workforce Co |
| Role | OWNER (full access) |

Override with `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` in `backend/.env`. Set `SEED_DEMO=false` to skip.

The same seed loads a **full demo dataset** for org `demo-workforce`: ~13 employees across Engineering, HR, and Sales; pending and approved leave; attendance (including a pending correction); September payroll in review; open jobs with candidates; training enrollments; performance goals; skills gaps; workforce risks and insights; Action Center recommendations; sample billing usage, invoice, and audit logs. Re-running `db:seed` is idempotent for permissions and the demo user; fixture bulk data is inserted once (skipped if the marker job *Senior Backend Engineer (Demo)* already exists). To reload fixtures, reset the dev database (`prisma migrate reset` in `backend/`) or delete that job and related demo rows before seeding again.

---

## Main routes

| Section | Routes |
| --- | --- |
| **Home** | `/` — attention-first dashboard (risks, actions, metrics) |
| **People** | `/employees`, `/departments`, `/organization` |
| **Workforce** | `/workforce/attendance`, `/leave`, `/payroll`, `/training`, `/performance`, `/workforce/skills` |
| **Recruitment** | `/recruitment/jobs`, `/recruitment/candidates` |
| **Intelligence** | `/intelligence/action-center`, `/insights`, `/risk`, `/copilot` |
| **Admin** | `/settings`, `/settings/members`, `/settings/roles`, `/admin/billing`, `/admin/audit-logs` |

---

## Documentation

| Doc | Contents |
| --- | --- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, tenancy, AI & billing design |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker prod, migrations, env |
| [SECURITY.md](docs/SECURITY.md) | Auth, headers, rate limits, secrets |
| [API.md](docs/API.md) | REST overview |
| [TESTING.md](docs/TESTING.md) | CI-style checks & smoke checklist |
| [UI.md](docs/UI.md) | Layout, nav, accessibility conventions |

---

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind v4, TanStack Query, Zustand, shadcn/ui |
| Backend | NestJS 12, Prisma 6, PostgreSQL, JWT + httpOnly refresh rotation |
| AI | Provider abstraction (`mock` / OpenAI); tool executor with RBAC |
| Ops | Docker, rate limiting, Helmet, structured logging hooks |

---

## Quality checks

```bash
cd backend && npm run typecheck && npm run lint && npm run test && npm run build
cd frontend && npm run typecheck && npm run lint && npm run build
```

---

## Implementation phases

<details>
<summary>Phases 0–10 (reference)</summary>

| Phase | Focus |
| --- | --- |
| **10** | SaaS billing, usage, settings, audit, security, Docker, docs |
| **9** | Proactive recommendations, action center, automations |
| **8** | AI copilot, tools, confirmation, audit |
| **7** | Skill gaps, talent match, risk, insights |
| **6** | Onboarding, LMS, performance |
| **5** | Recruitment / ATS |
| **4** | Payroll engine |
| **3** | Attendance & leave |
| **2** | Organization & employees |
| **1** | Auth, tenants, RBAC |
| **0** | Monorepo scaffold |

</details>

---

## Product direction

**What happened** → **why it matters** → **recommended action** → **help executing** — with copilots that only act through approved, audited tools.

---

## License

Private / all rights reserved unless an open-source license file is added.
