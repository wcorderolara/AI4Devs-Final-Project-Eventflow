#!/usr/bin/env bash
#
# dev-local.sh — Levanta el entorno local de EventFlow (DB + backend + frontend) de forma limpia.
#
# Resuelve los problemas recurrentes del entorno local:
#   - Backend: carga .env (--env-file) y corre en transpile-only (evita el type-check de ts-node).
#   - Frontend: limpia .next antes de arrancar para evitar el cache corrupto / mezcla con `next build`.
#   - Mata procesos previos en los puertos 3000/3001 antes de arrancar (evita EADDRINUSE).
#   - Arranca ambos servidores "detached" (nohup) para que sobrevivan a la terminal.
#
# Uso:
#   ./scripts/dev-local.sh            # levanta DB + backend + frontend (limpiando .next)
#   ./scripts/dev-local.sh --clean    # además borra node_modules/.cache del frontend
#   ./scripts/dev-local.sh front      # solo frontend (clean .next + arranque)
#   ./scripts/dev-local.sh back       # solo backend
#   ./scripts/dev-local.sh stop       # detiene backend y frontend
#   ./scripts/dev-local.sh status     # muestra el estado de los 3 servicios
#
set -euo pipefail

# ── Rutas y config ───────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
WEB_DIR="$ROOT/web"
LOG_DIR="$ROOT/.dev-logs"
DB_CONTAINER="ef-eventflow"
BACKEND_PORT=3001
FRONTEND_PORT=3000

mkdir -p "$LOG_DIR"

# ── Helpers ──────────────────────────────────────────────────────────────────
c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
c_red() { printf '\033[31m%s\033[0m\n' "$1"; }
c_blue() { printf '\033[36m%s\033[0m\n' "$1"; }

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti ":$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "$pids" | xargs -r kill -9 2>/dev/null || true
    sleep 1
  fi
}

wait_http() {
  # wait_http <url> <label> <max_seconds>
  local url="$1" label="$2" max="${3:-40}" i=0 code
  while [ "$i" -lt "$max" ]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then c_green "  ✓ $label OK ($url)"; return 0; fi
    sleep 1; i=$((i + 1))
  done
  c_red "  ✗ $label no respondió a tiempo ($url) — revisa $LOG_DIR"
  return 1
}

# ── DB ───────────────────────────────────────────────────────────────────────
start_db() {
  c_blue "▸ Base de datos (Docker: $DB_CONTAINER)"
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
      c_yellow "  Contenedor detenido → arrancando…"
      docker start "$DB_CONTAINER" >/dev/null
    else
      c_red "  ✗ No existe el contenedor '$DB_CONTAINER'. Créalo/levántalo manualmente (Postgres en :5433)."
      return 1
    fi
  fi
  c_green "  ✓ DB corriendo (localhost:5433)"
}

# ── Backend ──────────────────────────────────────────────────────────────────
start_back() {
  c_blue "▸ Backend (puerto $BACKEND_PORT)"
  kill_port "$BACKEND_PORT"
  # Aplica migraciones pendientes y genera el cliente Prisma (idempotente).
  ( cd "$BACKEND_DIR" && npx prisma migrate deploy >/dev/null 2>&1 || true )
  ( cd "$BACKEND_DIR" && TS_NODE_TRANSPILE_ONLY=true nohup node --env-file=.env --loader ts-node/esm src/server.ts \
      > "$LOG_DIR/backend.log" 2>&1 & disown )
  wait_http "http://localhost:$BACKEND_PORT/health" "Backend" 40
}

# ── Frontend ─────────────────────────────────────────────────────────────────
start_front() {
  c_blue "▸ Frontend (puerto $FRONTEND_PORT)"
  kill_port "$FRONTEND_PORT"
  # Limpia SIEMPRE el cache .next (evita corrupción y mezcla con artefactos de `next build`).
  c_yellow "  Limpiando .next…"
  rm -rf "$WEB_DIR/.next"
  if [ "${1:-}" = "--clean" ]; then rm -rf "$WEB_DIR/node_modules/.cache"; fi
  ( cd "$WEB_DIR" && nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 & disown )
  wait_http "http://localhost:$FRONTEND_PORT/" "Frontend" 60
}

# ── Stop / Status ────────────────────────────────────────────────────────────
stop_all() {
  c_blue "▸ Deteniendo servidores"
  kill_port "$FRONTEND_PORT"; kill_port "$BACKEND_PORT"
  pkill -9 -f "$WEB_DIR/node_modules/.bin/next" 2>/dev/null || true
  c_green "  ✓ Backend y frontend detenidos (la DB Docker sigue corriendo)"
}

status() {
  c_blue "▸ Estado del entorno"
  docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$" \
    && c_green "  ✓ DB       localhost:5433" || c_red "  ✗ DB       (contenedor no corre)"
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 http://localhost:$BACKEND_PORT/health 2>/dev/null)" = "200" ] \
    && c_green "  ✓ Backend  http://localhost:$BACKEND_PORT" || c_red "  ✗ Backend  http://localhost:$BACKEND_PORT"
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 http://localhost:$FRONTEND_PORT/ 2>/dev/null)" = "200" ] \
    && c_green "  ✓ Frontend http://localhost:$FRONTEND_PORT" || c_red "  ✗ Frontend http://localhost:$FRONTEND_PORT"
}

banner() {
  echo
  c_green "════════════════════════════════════════════"
  c_green " EventFlow local listo"
  c_green "   Frontend  → http://localhost:$FRONTEND_PORT"
  c_green "   Backend   → http://localhost:$BACKEND_PORT"
  c_green "   Login demo→ organizer0@seed.eventflow.test / Demo1234!"
  c_green "   Logs      → $LOG_DIR/{backend,frontend}.log"
  c_green "════════════════════════════════════════════"
}

# ── Dispatch ─────────────────────────────────────────────────────────────────
case "${1:-all}" in
  front)  start_front "${2:-}";;
  back)   start_back;;
  stop)   stop_all;;
  status) status;;
  --clean) start_db; start_back; start_front --clean; banner;;
  all|"") start_db; start_back; start_front; banner;;
  *) c_red "Uso: $0 [all|--clean|front|back|stop|status]"; exit 1;;
esac
