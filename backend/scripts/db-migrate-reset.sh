#!/usr/bin/env bash
# EventFlow — Wrapper env-aware para `prisma migrate reset` (US-100 / BE-002).
#
# Política (US-100 AC-10, SEC-05, Decision Resolution §7; Doc 21 §10):
#   `prisma migrate reset` está permitido ÚNICAMENTE en local.
#   Debe bloquearse en CI/QA/Demo porque DESTRUYE datos (seed/demo).
#
# Guard: falla con exit code distinto de 0 si detecta un entorno no-local:
#   - CI=true (GitHub Actions y la mayoría de CI lo exportan), o
#   - NODE_ENV distinto de "local" (cuando NODE_ENV está definido).
#
# Forward-only canónico (ADR-DB-005): las correcciones se aplican vía
# migraciones correctivas adicionales, nunca editando migraciones mergeadas.
set -euo pipefail

BLOCK_MSG="❌ prisma migrate reset bloqueado en CI/QA/Demo. Permitido solo en local. Ver Doc 21 §10 y README (§ Database Migrations)."

# 1) CI explícito → bloquear.
if [ "${CI:-}" = "true" ]; then
  echo "$BLOCK_MSG" >&2
  echo "   (motivo: CI=true)" >&2
  exit 1
fi

# 2) NODE_ENV definido y distinto de "local" → bloquear.
if [ -n "${NODE_ENV:-}" ] && [ "${NODE_ENV}" != "local" ]; then
  echo "$BLOCK_MSG" >&2
  echo "   (motivo: NODE_ENV='${NODE_ENV}' != 'local')" >&2
  exit 1
fi

# 3) Guard superado → ejecutar reset real en local, delegando flags al usuario.
echo "⚠️  Ejecutando 'prisma migrate reset' en entorno LOCAL. Esto elimina y recrea la BD local."

# Seam de prueba (solo QA-004): permite verificar que el guard local se supera
# sin tocar ninguna base de datos. No afecta el uso real en local.
if [ "${EF_MIGRATE_RESET_DRY_RUN:-}" = "1" ]; then
  echo "DRY-RUN: prisma migrate reset $*"
  exit 0
fi

exec npx prisma migrate reset "$@"
