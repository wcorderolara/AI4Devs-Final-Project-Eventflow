#!/usr/bin/env bash
# US-116 (PB-P2-013 / QA-004) — Smoke curl del healthcheck y readiness.
#
# Cubre §13.4:
#   Smoke-01: curl -f -sS <url>/health          → 200 con status="ok".
#   Smoke-02: curl -f -sS <url>/health/ready    → 200 con dependencies.postgres="ok"
#                                                  (o 503 si DB down — reportado).
#
# Uso:
#   BASE_URL=http://localhost:3000 bash backend/scripts/us116-health-smoke.sh
#
# CI post-deploy: agregar step tras `apprunner deploy` que apunte `BASE_URL` al
# endpoint público y ejecute este script. El script SALE 0 si `/health` responde
# 200; sale ≠0 si `/health` no responde o el shape no matchea (misconfig).
# `/health/ready` es informativo (reporta postgres/aiProvider) pero no falla el
# smoke — App Runner ya usa `/health` como probe primario (§15).
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# Smoke-01 — /health
health_out=$(mktemp)
status=$(curl -sS -o "${health_out}" -w '%{http_code}' "${BASE_URL}/health")
[ "${status}" = "200" ] || fail "Smoke-01: /health esperado 200, obtenido ${status}"
resp_status=$(jq -r '.status' "${health_out}")
[ "${resp_status}" = "ok" ] || fail "Smoke-01: .status esperado 'ok', obtenido '${resp_status}'"
version=$(jq -r '.version' "${health_out}")
uptime=$(jq -r '.uptimeMs' "${health_out}")
timestamp=$(jq -r '.timestamp' "${health_out}")
[ -n "${version}" ] && [ "${version}" != "null" ] || fail "Smoke-01: .version ausente"
[ "${uptime}" -ge 0 ] || fail "Smoke-01: .uptimeMs no es entero >= 0"
echo "${timestamp}" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' || fail "Smoke-01: .timestamp no es ISO-8601"
pass "Smoke-01 /health → 200 (version=${version}, uptimeMs=${uptime})"
rm -f "${health_out}"

# Smoke-02 — /health/ready (informativo)
ready_out=$(mktemp)
status=$(curl -sS -o "${ready_out}" -w '%{http_code}' "${BASE_URL}/health/ready")
resp_status=$(jq -r '.status' "${ready_out}")
pg=$(jq -r '.dependencies.postgres' "${ready_out}")
ai=$(jq -r '.dependencies.aiProvider' "${ready_out}")
case "${status}" in
  200)
    [ "${resp_status}" = "ok" ] || [ "${resp_status}" = "degraded" ] \
      || fail "Smoke-02: HTTP 200 pero .status='${resp_status}' (esperaba ok|degraded)"
    pass "Smoke-02 /health/ready → 200 (status=${resp_status}, postgres=${pg}, aiProvider=${ai})"
    ;;
  503)
    [ "${resp_status}" = "error" ] || fail "Smoke-02: HTTP 503 pero .status='${resp_status}' (esperaba error)"
    echo "WARN Smoke-02 /health/ready → 503 postgres=${pg} aiProvider=${ai} — ¿DB no accesible desde el runner?"
    ;;
  *)
    fail "Smoke-02: /health/ready HTTP inesperado ${status}"
    ;;
esac
rm -f "${ready_out}"

echo "US-116 smoke OK"
