# Security

## Authentication

- Short-lived JWT access tokens; refresh tokens in httpOnly cookies with rotation on refresh.
- Logout revokes refresh tokens and writes `auth.logout` audit events.

## Authorization

- Permission codes on JWT; enforced by `PermissionsGuard` and again in sensitive services (copilot tools, manager scope).

## Tenant isolation

- Organization context required for tenant routes; queries filtered by JWT `organizationId`.

## Transport & headers

- CORS restricted to configured origins in production.
- Helmet + `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS in production.

## Rate limiting

- Default: 120 requests / 60s per IP (configure via `RATE_LIMIT_*`).

## Input validation

- Global `ValidationPipe` with whitelist and forbid unknown properties.
- Password policy: minimum 8 characters, upper, lower, and digit.

## Secrets

- Never expose `JWT_SECRET`, `STRIPE_SECRET_KEY`, or `OPENAI_API_KEY` to the frontend.
- Use `STRIPE_PUBLISHABLE_KEY` only in client checkout flows when Stripe.js is integrated.

## Audit

- Central audit log for auth, org, employee, leave, billing, settings, AI/automation events (extend as needed).
