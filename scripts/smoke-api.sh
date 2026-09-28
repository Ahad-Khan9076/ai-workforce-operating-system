#!/usr/bin/env bash
set -euo pipefail
BASE="${API_BASE:-http://localhost:3000/api/v1}"
EMAIL="${SMOKE_EMAIL:-smoke-$(date +%s)@example.com}"
PASSWORD="${SMOKE_PASSWORD:-SmokeTest1}"

echo "== Health =="
curl -sf "$BASE/health" | head -c 200
echo

echo "== Public billing plans =="
curl -sf "$BASE/billing/plans" | head -c 400
echo

echo "== Register =="
REG=$(curl -sf "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"Smoke\",\"lastName\":\"Test\"}")
TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Registered $EMAIL"

echo "== Authenticated /auth/me =="
curl -sf "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | head -c 300
echo

echo "Smoke API checks passed."
