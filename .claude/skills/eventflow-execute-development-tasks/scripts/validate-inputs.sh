#!/usr/bin/env bash
#
# validate-inputs.sh — Validador estructural NO destructivo para la skill
# eventflow-execute-development-tasks.
#
# Valida SOLO estructura: cantidad de argumentos, existencia de archivos,
# consistencia de User Story ID, Phase y posición de backlog entre las rutas.
#
# NO modifica código fuente. NO ejecuta migraciones. NO escribe el execution
# record. NO tiene dependencias externas (solo bash + grep POSIX + basename).
#
# Uso:
#   bash validate-inputs.sh <user_story_path> <tech_spec_path> <tasks_path>
#
# Códigos de salida:
#   0  estructura válida
#   2  cantidad de argumentos inválida (no son exactamente 3)
#   3  archivo faltante
#   4  discrepancia de User Story ID
#   5  discrepancia de Phase
#   6  discrepancia de posición de backlog
#
set -u

err() { printf 'ERROR: %s\n' "$1" >&2; }
ok()  { printf 'OK: %s\n' "$1"; }

# --- 1. Cantidad de argumentos -------------------------------------------------
if [ "$#" -ne 3 ]; then
  err "Se esperan exactamente 3 argumentos: <user_story_path> <tech_spec_path> <tasks_path>. Recibidos: $#"
  err 'Uso: bash validate-inputs.sh "<user_story_path>" "<tech_spec_path>" "<tasks_path>"'
  exit 2
fi

US_PATH="$1"
TS_PATH="$2"
TK_PATH="$3"

# --- 2. Existencia de archivos -------------------------------------------------
missing=0
for f in "$US_PATH" "$TS_PATH" "$TK_PATH"; do
  if [ ! -f "$f" ]; then
    err "Archivo no encontrado: $f"
    missing=1
  fi
done
[ "$missing" -eq 0 ] || exit 3

# --- Helpers de extracción -----------------------------------------------------
# Extrae el primer patrón US-<digitos> de un texto dado.
extract_us() { printf '%s\n' "$1" | grep -oE 'US-[0-9]+' | head -n1; }
# Extrae el primer patrón PB-P<phase>-<num> de un texto dado.
extract_pb() { printf '%s\n' "$1" | grep -oE 'PB-P[0-9]+-[0-9]+' | head -n1; }
# Extrae el primer patrón P<digit> aislado de una ruta (segmento de Phase).
extract_phase_from_path() { printf '%s\n' "$1" | grep -oE '/P[0-9]+/' | head -n1 | tr -d '/'; }

# IDs desde nombres de archivo
US_FROM_US_NAME="$(extract_us "$(basename "$US_PATH")")"
US_FROM_TS_NAME="$(extract_us "$(basename "$TS_PATH")")"
US_FROM_TK_NAME="$(extract_us "$(basename "$TK_PATH")")"

# IDs desde contenido (primeras 60 líneas: metadata)
US_FROM_US_BODY="$(extract_us "$(head -n 60 "$US_PATH" 2>/dev/null)")"
US_FROM_TS_BODY="$(extract_us "$(head -n 60 "$TS_PATH" 2>/dev/null)")"
US_FROM_TK_BODY="$(extract_us "$(head -n 60 "$TK_PATH" 2>/dev/null)")"

# --- 3. Consistencia de User Story ID -----------------------------------------
if [ -z "$US_FROM_US_NAME" ] || [ -z "$US_FROM_TS_NAME" ] || [ -z "$US_FROM_TK_NAME" ]; then
  err "No se pudo extraer un User Story ID (US-###) de uno o más nombres de archivo."
  err "  user-story: '${US_FROM_US_NAME:-<vacío>}'  tech-spec: '${US_FROM_TS_NAME:-<vacío>}'  tasks: '${US_FROM_TK_NAME:-<vacío>}'"
  exit 4
fi

for pair in "TS_NAME:$US_FROM_TS_NAME" "TK_NAME:$US_FROM_TK_NAME"; do
  val="${pair#*:}"
  if [ "$val" != "$US_FROM_US_NAME" ]; then
    err "Discrepancia de User Story ID entre nombres de archivo: user-story=$US_FROM_US_NAME, ${pair%%:*}=$val"
    exit 4
  fi
done

# Chequeo de contenido (solo si se pudo extraer; advertencia -> error si contradice)
for pair in "US_BODY:$US_FROM_US_BODY" "TS_BODY:$US_FROM_TS_BODY" "TK_BODY:$US_FROM_TK_BODY"; do
  val="${pair#*:}"
  if [ -n "$val" ] && [ "$val" != "$US_FROM_US_NAME" ]; then
    err "Discrepancia de User Story ID en contenido: esperado=$US_FROM_US_NAME, ${pair%%:*}=$val"
    exit 4
  fi
done
ok "User Story ID consistente: $US_FROM_US_NAME"

# --- 4. Consistencia de Phase (Tech Spec vs Tasks, por ruta) -------------------
PHASE_TS="$(extract_phase_from_path "$TS_PATH")"
PHASE_TK="$(extract_phase_from_path "$TK_PATH")"
if [ -z "$PHASE_TS" ] || [ -z "$PHASE_TK" ]; then
  err "No se pudo extraer la Phase (segmento /P#/) de la ruta de Tech Spec y/o Tasks."
  err "  tech-spec: '${PHASE_TS:-<vacío>}'  tasks: '${PHASE_TK:-<vacío>}'"
  exit 5
fi
if [ "$PHASE_TS" != "$PHASE_TK" ]; then
  err "Discrepancia de Phase entre rutas: tech-spec=$PHASE_TS, tasks=$PHASE_TK"
  exit 5
fi
ok "Phase consistente: $PHASE_TS"

# --- 5. Consistencia de posición de backlog (Tech Spec vs Tasks, por ruta) -----
PB_TS="$(extract_pb "$TS_PATH")"
PB_TK="$(extract_pb "$TK_PATH")"
if [ -z "$PB_TS" ] || [ -z "$PB_TK" ]; then
  err "No se pudo extraer la posición de backlog (PB-P#-###) de la ruta de Tech Spec y/o Tasks."
  err "  tech-spec: '${PB_TS:-<vacío>}'  tasks: '${PB_TK:-<vacío>}'"
  exit 6
fi
if [ "$PB_TS" != "$PB_TK" ]; then
  err "Discrepancia de posición de backlog entre rutas: tech-spec=$PB_TS, tasks=$PB_TK"
  exit 6
fi

# La Phase del backlog debe coincidir con la Phase de la ruta (PB-P0-* ⇔ P0)
PB_PHASE="$(printf '%s\n' "$PB_TS" | grep -oE 'P[0-9]+' | head -n1)"
if [ "$PB_PHASE" != "$PHASE_TS" ]; then
  err "La posición de backlog ($PB_TS) no es compatible con la Phase de la ruta ($PHASE_TS)."
  exit 6
fi
ok "Backlog position consistente: $PB_TS (compatible con $PHASE_TS)"

printf '\n'
ok "Validación estructural superada."
printf 'US=%s  PHASE=%s  BACKLOG=%s\n' "$US_FROM_US_NAME" "$PHASE_TS" "$PB_TS"
exit 0
