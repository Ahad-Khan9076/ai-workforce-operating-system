# UI / UX conventions

## Layout

- **PageShell** — max-width container and consistent vertical rhythm on all app pages.
- **PageHeader** — title, description, optional primary actions.
- **FilterBar** — search + filter controls for list views.
- **ResponsiveTable** — horizontal scroll wrapper for data tables on mobile.

## Navigation

- **Desktop:** collapsible sidebar with Lucide icons per route.
- **Mobile:** sheet menu from the top bar; breadcrumb collapses to current page title.
- Breadcrumb labels live in `frontend/src/lib/navigation.ts`.

## Auth

- **AuthLayout** — shared branding and card for login, register, forgot password.
- Inline **FormFieldError** messages and `aria-invalid` on inputs.

## Dashboard

Home prioritizes **needs attention**: critical risks → urgent actions → AI recommendations → workforce snapshot / trends.

## AI Copilot

- User vs **AI Copilot** messages are visually distinct.
- Pending tool actions use confirmation cards with tool code and Confirm/Reject.

## Accessibility

- Global `:focus-visible` ring in `index.css`.
- Sidebar and mobile nav use `aria-label` where needed.
- Form labels tied to inputs; errors use `role="alert"`.
