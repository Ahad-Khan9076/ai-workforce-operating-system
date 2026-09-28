# Deployment

## Local development

```bash
docker compose up -d
cd backend && cp .env.example .env && npm install && npm run db:generate && npm run db:migrate && npm run db:seed && npm run start:dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Production (Docker Compose)

1. Copy root `.env.example` to `.env` and set `JWT_SECRET`, `POSTGRES_PASSWORD`, `CORS_ORIGINS`, `APP_URL`.
2. Build and run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

3. Frontend: `http://localhost:8080` (proxies `/api` to backend).
4. Backend health: `GET http://localhost:3000/api/v1/health`.

## Database migrations

- Development: `npm run db:migrate` (Prisma migrate dev).
- Production container: `prisma migrate deploy` runs on backend startup (see `backend/Dockerfile`).

## Seed data

- `npm run db:seed` — permissions, roles, billing plans (**development only**; do not run arbitrary seeds against production without review).

## Environment variables

See `backend/.env.example`, `frontend/.env.example`, and root `.env.example`.

## Testing before release

```bash
cd backend && npm run typecheck && npm run lint && npm run test && npm run build
cd frontend && npm run typecheck && npm run lint && npm run build
```
