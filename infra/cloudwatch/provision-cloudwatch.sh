#!/usr/bin/env bash
# Monitoring CloudWatch minimo del backend EventFlow (US-141 / PB-P3-002 - Doc 21 §19; ADR-DEVOPS-007).
#
# PLATAFORMA: el backend corre en **EC2 (Docker + Caddy)** por ADR-DEVOPS-008 (Accepted), que
# SUPERSEDE App Runner (ADR-DEVOPS-003). La Tech Spec de US-141 describia App Runner (superseded);
# aqui se implementa la variante **log-driven** — independiente de la plataforma — que solo requiere
# que los logs del backend lleguen a un CloudWatch Log Group (ver PRERREQUISITO abajo).
#
# Este script agrega la capa MINIMA de observabilidad SIN tocar el backend ni el envio base de logs:
#   1. Fija la retencion del Log Group a LOG_RETENTION_DAYS (14-30d, AC-01, Doc 21 §30).
#   2. Crea metric filters sobre los logs estructurados (pino JSON) ya emitidos:
#        - 5xx:            { $.res.status >= 500 }             -> EventFlow/Backend Http5xx        (AC-03)
#        - healthcheck:    { $.event = "health.ready.dependency_down" } -> HealthReadyDown         (AC-04/EC-01)
#      y sobre los eventos de la capa AI (console stub, patron de subcadena):
#        - "ai.provider.timeout" -> EventFlow/AI AiTimeouts
#        - "ai.provider.failure" -> EventFlow/AI AiErrors
#        - "ai.fallback_used"    -> EventFlow/AI AiFallbackToMock                                   (AC-02)
#   3. Alarma de 5xx sobre la metrica custom Http5xx (>=1 alarma activa, AC-03/EC-02).
#   4. Alarma de healthcheck sobre HealthReadyDown (indisponibilidad sostenida, AC-04/EC-01).
#
# Solo se emiten contadores; nunca prompts/respuestas/PII (VR-03). Este script no maneja secretos.
#
# PRERREQUISITO (dependencia de US-136 en EC2): el `docker run` del backend debe enviar stdout a
# CloudWatch Logs. En EC2 esto NO es automatico (a diferencia de App Runner). Habilitalo agregando el
# log driver awslogs al contenedor (ver docs/runbooks/cloudwatch-monitoring.md §1):
#     docker run ... --log-driver=awslogs \
#       --log-opt awslogs-region=$AWS_REGION --log-opt awslogs-group=$LOG_GROUP \
#       --log-opt awslogs-create-group=true ...
# Sin esto no hay Log Group y este script (y sus alarmas) no tienen fuente.
#
# Modo validacion fail-fast (VR-01/VR-02, OPS-004, NT-01):
#   AWS_REGION=us-east-1 bash infra/cloudwatch/provision-cloudwatch.sh --check
#   Verifica que existan las 2 alarmas y que el Log Group tenga retencion; exit != 0 si falta algo.
#
# Prerrequisitos (fail-fast): aws CLI v2 + credenciales validas; AWS_REGION.
# Variables de entrada (override por env):
#   AWS_REGION            (requerida)
#   LOG_GROUP             (default: /eventflow/backend)  -- Log Group destino del awslogs driver
#   LOG_RETENTION_DAYS    (default: 14)   -- 14..30 (Doc 21 §30, control de costos)
#   FIVEXX_THRESHOLD      (default: 5)    -- conteo de 5xx por periodo que dispara la alarma
#   FIVEXX_PERIOD         (default: 300)  -- segundos por periodo
#   FIVEXX_EVAL_PERIODS   (default: 2)    -- periodos (>=2 evita falso positivo transitorio, EC-02)
#   FIVEXX_DATAPOINTS     (default: 2)    -- datapoints en ALARM dentro de la ventana (M de N)
#   HEALTH_PERIOD         (default: 60)   -- segundos por periodo (alarma healthcheck)
#   HEALTH_EVAL_PERIODS   (default: 3)    -- periodos (anti-flapping, EC-01)
#   SNS_TOPIC_ARN         (opcional)      -- si se define, se asocia como accion de las alarmas
#
# Uso (provisionar / idempotente):
#   AWS_REGION=us-east-1 bash infra/cloudwatch/provision-cloudwatch.sh

set -euo pipefail

LOG_GROUP="${LOG_GROUP:-/eventflow/backend}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-14}"
FIVEXX_THRESHOLD="${FIVEXX_THRESHOLD:-5}"
FIVEXX_PERIOD="${FIVEXX_PERIOD:-300}"
FIVEXX_EVAL_PERIODS="${FIVEXX_EVAL_PERIODS:-2}"
FIVEXX_DATAPOINTS="${FIVEXX_DATAPOINTS:-2}"
HEALTH_PERIOD="${HEALTH_PERIOD:-60}"
HEALTH_EVAL_PERIODS="${HEALTH_EVAL_PERIODS:-3}"

BACKEND_NS="EventFlow/Backend"
AI_NS="EventFlow/AI"
FIVEXX_ALARM_NAME="eventflow-backend-5xx"
HEALTH_ALARM_NAME="eventflow-backend-healthcheck-down"

MODE="${1:-provision}"

fail() { echo "[provision-cloudwatch] ERROR: $1" >&2; exit 1; }
info() { echo "[provision-cloudwatch] $1"; }

command -v aws >/dev/null 2>&1 || fail "aws CLI no instalado."
[ -n "${AWS_REGION:-}" ] || fail "AWS_REGION no exportada."
aws sts get-caller-identity >/dev/null 2>&1 || fail "Credenciales AWS invalidas."

[ "$LOG_RETENTION_DAYS" -ge 14 ] && [ "$LOG_RETENTION_DAYS" -le 30 ] \
  || fail "LOG_RETENTION_DAYS=$LOG_RETENTION_DAYS fuera de rango 14..30 (Doc 21 §30)."
[ "$FIVEXX_EVAL_PERIODS" -ge 2 ] \
  || fail "FIVEXX_EVAL_PERIODS debe ser >=2 para diferenciar picos transitorios (EC-02)."

# --------------------------------------------------------------------------
# Modo --check: validacion fail-fast (no crea nada). VR-01/VR-02, OPS-004, NT-01.
# --------------------------------------------------------------------------
if [ "$MODE" = "--check" ]; then
  info "Validando configuracion de monitoreo (fail-fast)..."
  missing=0

  for alarm in "$FIVEXX_ALARM_NAME" "$HEALTH_ALARM_NAME"; do
    found="$(aws cloudwatch describe-alarms --alarm-names "$alarm" --region "$AWS_REGION" \
      --query "MetricAlarms[0].AlarmName" --output text 2>/dev/null || true)"
    if [ -z "$found" ] || [ "$found" = "None" ]; then
      echo "[provision-cloudwatch] FALTA alarma: $alarm" >&2
      missing=1
    else
      info "OK alarma presente: $alarm"
    fi
  done

  retention="$(aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$AWS_REGION" \
    --query "logGroups[?logGroupName=='${LOG_GROUP}'].retentionInDays | [0]" --output text 2>/dev/null || true)"
  if [ -z "$retention" ] || [ "$retention" = "None" ]; then
    echo "[provision-cloudwatch] FALTA retencion en Log Group: $LOG_GROUP (¿awslogs driver habilitado?)" >&2
    missing=1
  else
    info "OK retencion Log Group ${LOG_GROUP}: ${retention}d"
  fi

  [ "$missing" -eq 0 ] || fail "Configuracion de monitoreo incompleta (VR-01/VR-02). Corre el script sin --check."
  info "Configuracion de monitoreo COMPLETA (alarmas 5xx + healthcheck + retencion)."
  exit 0
fi

# --------------------------------------------------------------------------
# Modo provision (idempotente).
# --------------------------------------------------------------------------
info "Region=$AWS_REGION LogGroup=$LOG_GROUP Retencion=${LOG_RETENTION_DAYS}d"

# El Log Group debe existir (lo crea el awslogs driver con awslogs-create-group=true). Lo aseguramos
# de forma idempotente para poder fijar retencion aunque el contenedor aun no haya emitido.
aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true

# 1) Retencion (AC-01, Doc 21 §30).
info "Fijando retencion del Log Group a ${LOG_RETENTION_DAYS}d..."
aws logs put-retention-policy --log-group-name "$LOG_GROUP" \
  --retention-in-days "$LOG_RETENTION_DAYS" --region "$AWS_REGION"

# 2) Metric filters (idempotentes: put-metric-filter sobreescribe por nombre).
put_filter() {
  local name="$1" pattern="$2" metric="$3" namespace="$4"
  info "Metric filter $name -> ${namespace}/${metric}"
  aws logs put-metric-filter --log-group-name "$LOG_GROUP" --region "$AWS_REGION" \
    --filter-name "$name" --filter-pattern "$pattern" \
    --metric-transformations \
      "metricName=${metric},metricNamespace=${namespace},metricValue=1,defaultValue=0"
}

# 5xx y readiness-down: logs pino (JSON) -> patrones JSON. AI: console stub -> patron de subcadena.
put_filter "eventflow-backend-5xx"        '{ $.res.status >= 500 }'                      "Http5xx"          "$BACKEND_NS"
put_filter "eventflow-health-ready-down"  '{ $.event = "health.ready.dependency_down" }' "HealthReadyDown" "$BACKEND_NS"
put_filter "eventflow-ai-timeouts"        '"ai.provider.timeout"'                        "AiTimeouts"       "$AI_NS"
put_filter "eventflow-ai-errors"          '"ai.provider.failure"'                        "AiErrors"         "$AI_NS"
put_filter "eventflow-ai-fallback"        '"ai.fallback_used"'                           "AiFallbackToMock" "$AI_NS"
# NOTA (honestidad): AiInvocations (invocaciones exitosas) no tiene hoy evento de log dedicado; se
# aproxima con el conteo de requests a los endpoints IA o requiere un log de exito futuro. Ver runbook.

# 3) Alarma de 5xx (AC-03, EC-02). Sobre la metrica custom Http5xx. >=2 periodos + M de N.
info "Alarma 5xx: $FIVEXX_ALARM_NAME (threshold=$FIVEXX_THRESHOLD, periods=$FIVEXX_EVAL_PERIODS)..."
# shellcheck disable=SC2086
aws cloudwatch put-metric-alarm --region "$AWS_REGION" \
  --alarm-name "$FIVEXX_ALARM_NAME" \
  --alarm-description "US-141: tasa sostenida de 5xx del backend supera el umbral." \
  --namespace "$BACKEND_NS" --metric-name "Http5xx" \
  --statistic Sum --period "$FIVEXX_PERIOD" \
  --threshold "$FIVEXX_THRESHOLD" --comparison-operator GreaterThanThreshold \
  --evaluation-periods "$FIVEXX_EVAL_PERIODS" --datapoints-to-alarm "$FIVEXX_DATAPOINTS" \
  --treat-missing-data notBreaching \
  ${SNS_TOPIC_ARN:+--alarm-actions "$SNS_TOPIC_ARN" --ok-actions "$SNS_TOPIC_ARN"}

# 4) Alarma de healthcheck/disponibilidad (AC-04, EC-01). Sobre HealthReadyDown: el readiness fallido
#    sostenido (dependencia caida) dispara la alarma. Multi-periodo anti-flapping; missing = OK.
info "Alarma healthcheck: $HEALTH_ALARM_NAME (periods=$HEALTH_EVAL_PERIODS)..."
# shellcheck disable=SC2086
aws cloudwatch put-metric-alarm --region "$AWS_REGION" \
  --alarm-name "$HEALTH_ALARM_NAME" \
  --alarm-description "US-141: readiness fallido sostenido (dependencia caida / healthcheck down)." \
  --namespace "$BACKEND_NS" --metric-name "HealthReadyDown" \
  --statistic Sum --period "$HEALTH_PERIOD" \
  --threshold 0 --comparison-operator GreaterThanThreshold \
  --evaluation-periods "$HEALTH_EVAL_PERIODS" --datapoints-to-alarm "$HEALTH_EVAL_PERIODS" \
  --treat-missing-data notBreaching \
  ${SNS_TOPIC_ARN:+--alarm-actions "$SNS_TOPIC_ARN" --ok-actions "$SNS_TOPIC_ARN"}

info "OK - monitoreo minimo provisionado. Verifica con: bash infra/cloudwatch/provision-cloudwatch.sh --check"
