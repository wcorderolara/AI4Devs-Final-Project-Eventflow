#!/usr/bin/env bash
# Verifica el invariante estructural de US-090: 18 bounded contexts (Doc 14 §9 + US-116
# platform-health). Las capas sólo existen cuando tienen contenido: ningún directorio de
# `src/modules` puede quedar sin archivos `.ts` (sin placeholders `export {}` vacíos).
set -euo pipefail
cd "$(dirname "$0")/.."

MODULE_COUNT=$(find src/modules -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
if [ "$MODULE_COUNT" != "18" ]; then
  echo "ERROR: Expected 18 modules, found $MODULE_COUNT"; exit 1
fi

EMPTY_DIRS=""
while IFS= read -r dir; do
  if [ -z "$(find "$dir" -type f -name '*.ts' -print -quit)" ]; then
    EMPTY_DIRS="$EMPTY_DIRS $dir"
  fi
done < <(find src/modules -mindepth 1 -maxdepth 2 -type d)
if [ -n "$EMPTY_DIRS" ]; then
  echo "ERROR: Directories without .ts content:$EMPTY_DIRS"; exit 1
fi

echo "Structure check passed: 18 modules, all layer directories have content"
