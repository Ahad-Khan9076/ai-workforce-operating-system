#!/usr/bin/env bash
# Start Postgres (Docker) + migrate/seed + API. Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! nc -z localhost 5432 2>/dev/null; then
  if command -v docker >/dev/null 2>&1; then
    echo "Starting PostgreSQL via Docker Compose…"
    docker compose up -d postgres redis
    echo "Waiting for Postgres…"
    for _ in $(seq 1 30); do
      nc -z localhost 5432 && break
      sleep 1
    done
  else
    echo "ERROR: PostgreSQL is not running on localhost:5432."
    echo "Install Docker Desktop and run: docker compose up -d"
    echo "Or start Homebrew Postgres: brew services start postgresql@16"
    exit 1
  fi
fi

if ! nc -z localhost 5432 2>/dev/null; then
  echo "ERROR: Postgres still not reachable on :5432"
  exit 1
fi

echo "Database OK. Migrating and seeding…"
(cd backend && npm run db:migrate && npm run db:seed)

echo ""
echo "Start the API in one terminal:  cd backend && npm run start:dev"
echo "Start the UI in another:        cd frontend && npm run dev"
echo ""
echo "Demo login: demo@hrworkforce.local / DemoOwner1"
