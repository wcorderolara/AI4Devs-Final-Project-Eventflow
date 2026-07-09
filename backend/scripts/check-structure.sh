#!/usr/bin/env bash
# Verifica el invariante estructural de US-090: 16 bounded contexts × 5 capas = 80 directorios.
set -euo pipefail
cd "$(dirname "$0")/.."

MODULE_COUNT=$(find src/modules -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
if [ "$MODULE_COUNT" != "16" ]; then
  echo "ERROR: Expected 16 modules, found $MODULE_COUNT"; exit 1
fi

LAYER_COUNT=$(find src/modules -mindepth 2 -maxdepth 2 -type d | wc -l | tr -d ' ')
if [ "$LAYER_COUNT" != "80" ]; then
  echo "ERROR: Expected 80 layer directories, found $LAYER_COUNT"; exit 1
fi

echo "Structure check passed: 16 modules × 5 layers = 80 directories"
