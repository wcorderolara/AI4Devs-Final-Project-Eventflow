#!/usr/bin/env bash
# US-115 (PB-P2-012 / QA-004) — Smoke curl del endpoint `GET /api/v1/admin/ai-metrics`.
#
# Cubre los 3 escenarios de la Tech Spec §13 Smoke:
#   Smoke-01: admin autenticado → 200 con shape (`data.windows[0].features[0].type`).
#   Smoke-02: sin cookie → 401.
#   Smoke-03: organizer autenticado → 403.
#
# Requiere:
#   - El backend corriendo local (default `http://localhost:3000`, override con `BASE_URL`).
#   - `curl` + `jq`.
#   - Cookies pre-generadas (para uso demo). En CI se ejecutan los IT (`us115-*.integration`).
#
# Uso:
#   BASE_URL=http://localhost:3000 \
#   ADMIN_COOKIE="session=<admin sid>" \
#   ORG_COOKIE="session=<organizer sid>" \
#     bash backend/scripts/us115-ai-metrics-smoke.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_COOKIE="${ADMIN_COOKIE:-}"
ORG_COOKIE="${ORG_COOKIE:-}"
ENDPOINT="${BASE_URL}/api/v1/admin/ai-metrics"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# Smoke-01 — admin OK
if [ -n "${ADMIN_COOKIE}" ]; then
  status=$(curl -sS -o /tmp/us115-admin.json -w '%{http_code}' -H "Cookie: ${ADMIN_COOKIE}" "${ENDPOINT}")
  [ "${status}" = "200" ] || fail "Smoke-01 admin: esperado 200, obtenido ${status}"
  count=$(jq '.data.windows | length' /tmp/us115-admin.json)
  first_type=$(jq -r '.data.windows[0].features[0].type' /tmp/us115-admin.json)
  [ "${first_type}" = "event_plan" ] || fail "Smoke-01: features[0].type esperado 'event_plan', obtenido '${first_type}'"
  pass "Smoke-01 admin → 200 con ${count} ventana(s), features[0].type=${first_type}"
else
  echo "SKIP Smoke-01 (ADMIN_COOKIE no seteada)"
fi

# Smoke-02 — sin cookie → 401
status=$(curl -sS -o /dev/null -w '%{http_code}' "${ENDPOINT}")
[ "${status}" = "401" ] || fail "Smoke-02 sin cookie: esperado 401, obtenido ${status}"
pass "Smoke-02 sin cookie → 401"

# Smoke-03 — organizer → 403
if [ -n "${ORG_COOKIE}" ]; then
  status=$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: ${ORG_COOKIE}" "${ENDPOINT}")
  [ "${status}" = "403" ] || fail "Smoke-03 organizer: esperado 403, obtenido ${status}"
  pass "Smoke-03 organizer → 403"
else
  echo "SKIP Smoke-03 (ORG_COOKIE no seteada)"
fi

echo "US-115 smoke OK"
