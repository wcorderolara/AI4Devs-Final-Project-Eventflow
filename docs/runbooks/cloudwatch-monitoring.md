# Runbook — Monitoring CloudWatch mínimo del backend — US-141 / PB-P3-002

> Observabilidad operacional **mínima viable** del backend EventFlow: logs visibles en CloudWatch,
> métricas básicas (servicio + IA) y **alarmas mínimas** de 5xx y de caída del healthcheck.
> Trazabilidad: US-141 (PB-P3-002), Doc 21 §19/§30, NFR-OBS-002/003/005/006, NFR-REL-002 ·
> ADR-DEVOPS-007 (CloudWatch), ADR-DEVOPS-008 (backend en EC2), ADR-TEST-001.
> Artefacto de provisión: [`infra/cloudwatch/provision-cloudwatch.sh`](../../infra/cloudwatch/provision-cloudwatch.sh).

## Estado / plataforma (2026-07-28)

| Dato | Valor |
| --- | --- |
| Cuenta / región | `357919579117` · `us-east-1` |
| Plataforma backend | **EC2 (Docker + Caddy TLS)** — ADR-DEVOPS-008 (supersede App Runner ADR-DEVOPS-003) |
| Logging | CloudWatch Logs vía **Docker `awslogs` driver** (ver §1) — ADR-DEVOPS-007 |
| Log Group | `/eventflow/backend` (parametrizable: `LOG_GROUP`) |
| Retención | **14 días** (rango permitido 14–30, Doc 21 §30) |
| Endpoints observados | `GET /health`, `GET /health/ready` (propiedad de US-116; **no** se modifican) |

> **Hallazgo de alineación (Tech Spec vs ADR).** La Technical Spec de US-141 describe App Runner
> (`AWS/AppRunner`, log groups de App Runner). App Runner fue **superseded por EC2** (ADR-DEVOPS-008,
> Accepted). Este runbook y el script implementan la variante **log-driven** — métricas derivadas de
> los logs estructurados del backend — que es **independiente de la plataforma** y funciona en EC2.
> Recomendación no bloqueante: actualizar la Tech Spec para reflejar EC2 + enfoque log-driven.

---

## 1. Prerrequisito — enviar los logs del backend a CloudWatch (dependencia de US-136 en EC2)

En App Runner el shipping de stdout→CloudWatch era automático. En **EC2 no lo es**: el `docker run`
del backend ([`infra/ec2/provision-ec2.sh`](../../infra/ec2/provision-ec2.sh)) debe usar el log
driver `awslogs`. Sin esto **no hay Log Group** y las métricas/alarmas de abajo no tienen fuente.

Agregar al `docker run` del contenedor `backend`:

```bash
docker run -d --name backend --restart always --network eventflow \
  --log-driver=awslogs \
  --log-opt awslogs-region=us-east-1 \
  --log-opt awslogs-group=/eventflow/backend \
  --log-opt awslogs-create-group=true \
  ... (resto de flags/env sin cambios) ...
```

IAM: el instance role de la EC2 (`EventflowEc2Role`) necesita `logs:CreateLogGroup`,
`logs:CreateLogStream` y `logs:PutLogEvents` sobre `arn:aws:logs:us-east-1:357919579117:log-group:/eventflow/*`.
(El script de esta US **no** modifica el `docker run`; ese wiring pertenece a US-136 / ADR-DEVOPS-008.)

---

## 2. Provisión de la capa de monitoreo (este script)

```bash
AWS_REGION=us-east-1 bash infra/cloudwatch/provision-cloudwatch.sh
```

Idempotente. Hace, sin tocar el backend:

1. **Retención** del Log Group a `LOG_RETENTION_DAYS` (14–30 d) — AC-01.
2. **Metric filters** (extraen métricas desde los logs; sin SDK ni cambios de código):

   | Filtro | Patrón | Métrica | Namespace | AC |
   | --- | --- | --- | --- | --- |
   | `eventflow-backend-5xx` | `{ $.res.status >= 500 }` | `Http5xx` | `EventFlow/Backend` | AC-03 |
   | `eventflow-health-ready-down` | `{ $.event = "health.ready.dependency_down" }` | `HealthReadyDown` | `EventFlow/Backend` | AC-04/EC-01 |
   | `eventflow-ai-timeouts` | `"ai.provider.timeout"` | `AiTimeouts` | `EventFlow/AI` | AC-02 |
   | `eventflow-ai-errors` | `"ai.provider.failure"` | `AiErrors` | `EventFlow/AI` | AC-02 |
   | `eventflow-ai-fallback` | `"ai.fallback_used"` | `AiFallbackToMock` | `EventFlow/AI` | AC-02 |

3. **Alarma de 5xx** (`eventflow-backend-5xx`) sobre `Http5xx` — AC-03.
4. **Alarma de healthcheck** (`eventflow-backend-healthcheck-down`) sobre `HealthReadyDown` — AC-04/EC-01.

### Patrones de log: pino JSON vs console stub

- El **request-logger** y el **healthcheck** emiten **pino JSON** (`{ res: { status } }`,
  `{ event: 'health.ready.dependency_down' }`) → se filtran con **patrones JSON**.
- La **capa de ejecución AI** (`ai-execution-logger`) usa el stub console legacy (coexistencia
  Deviation D-01 de US-113) → sus líneas no son JSON limpio, por eso se filtran por **subcadena**
  sobre los nombres de evento estables (`ai.provider.timeout`, `ai.provider.failure`,
  `ai.fallback_used`). Solo contadores/dimensiones; nunca prompts/respuestas/PII (VR-03, US-123).

### Métricas de IA — nota de honestidad

`AiErrors`, `AiTimeouts` y `AiFallbackToMock` se derivan de eventos ya emitidos. **`AiInvocations`
(invocaciones exitosas)** no tiene hoy un evento de log dedicado (la ruta de éxito no loguea): se
aproxima con el conteo de requests a los endpoints IA o requiere un log de éxito futuro. No se
inventa la métrica.

---

## 3. Alarmas — parámetros y anti falso positivo

| Alarma | Métrica | Umbral | Periodos | treatMissingData | Racional |
| --- | --- | --- | --- | --- | --- |
| `eventflow-backend-5xx` | `EventFlow/Backend Http5xx` (Sum) | `> FIVEXX_THRESHOLD` (def 5) | `FIVEXX_EVAL_PERIODS` ≥ 2, `datapoints=FIVEXX_DATAPOINTS` | `notBreaching` | ≥2 periodos + M-de-N diferencian pico transitorio (EC-02) de degradación sostenida |
| `eventflow-backend-healthcheck-down` | `EventFlow/Backend HealthReadyDown` (Sum) | `> 0` | `HEALTH_EVAL_PERIODS` (def 3) | `notBreaching` | readiness fallido sostenido = caída; multi-periodo evita flapping (EC-01, NFR-REL-002); sin datos = sano |

Overrides por env (ej.): `FIVEXX_THRESHOLD`, `FIVEXX_EVAL_PERIODS`, `HEALTH_EVAL_PERIODS`,
`SNS_TOPIC_ARN` (opcional; sin SNS las alarmas quedan activas y visibles en la consola, sin
notificación — suficiente para el MVP; on-call/PagerDuty están fuera de alcance).

**Backstop de instancia (opcional).** Como red de seguridad a nivel host se puede añadir una alarma
sobre `AWS/EC2 StatusCheckFailed` (instancia caída). No es obligatoria: `HealthReadyDown` cubre la
indisponibilidad de la aplicación y sus dependencias.

---

## 4. Validación fail-fast (VR-01 / VR-02 / NT-01)

```bash
AWS_REGION=us-east-1 bash infra/cloudwatch/provision-cloudwatch.sh --check
```

Verifica que existan las **2 alarmas** y que el Log Group tenga **retención**. Sale con código ≠ 0
si falta algo — úsalo como **gate previo** a declarar el entorno "monitoreado" (no se despliega
monitoreo silenciosamente incompleto). Es el equivalente reproducible de OPS-004.

---

## 5. Verificación operativa (TS-01..TS-04) — requiere entorno desplegado

| Test | Cómo verificar |
| --- | --- |
| TS-01 (logs visibles) | CloudWatch Logs Insights sobre `/eventflow/backend`: `fields @timestamp, correlationId, msg | filter ispresent(correlationId)`. |
| TS-02 (métricas) | CloudWatch → Metrics → `EventFlow/Backend` y `EventFlow/AI`; confirmar datapoints. |
| TS-03 (alarma 5xx) | Inyectar 5xx sostenidos en un entorno de prueba; la alarma pasa a `ALARM` y vuelve a `OK`. |
| TS-04 (alarma healthcheck) | Forzar readiness fallido (dependencia caída) sostenido; `HealthReadyDown` sube y la alarma pasa a `ALARM`. |

Estas verificaciones **requieren la EC2 desplegada con el `awslogs` driver activo** (§1) y no se
ejecutan localmente.

---

## 6. Seguridad (SEC-01..03, VR-03)

- **Sin secretos/PII** en logs ni métricas: la redacción central del logger (US-108/US-113,
  `redactSecrets`/`redactPII`) cubre `*secret`/`*token`/`*password`/PII antes de stdout; las
  métricas solo transportan contadores/dimensiones. Verificado por los tests
  `us108-log-redaction`, `us113-pino-logger`, `us122-payload-sanitizer`, `us123-ai-execution-safe-logs`.
- **Healthcheck público** (`GET /health`, US-116) sin auth y con payload liviano (SEC-01) —
  verificado por `us116-platform-health` / `health.spec`.
- **IAM de mínimo alcance**: instance role con `logs:*LogEvents`/`CreateLogGroup`/`CreateLogStream`
  sobre `/eventflow/*` (§1) y `cloudwatch:PutMetricData` si en el futuro se emiten métricas custom
  vía SDK. El rol operador que corre este script necesita `logs:PutRetentionPolicy`,
  `logs:PutMetricFilter` y `cloudwatch:PutMetricAlarm`.

---

## 7. Alineaciones documentales (Tech Spec §16)

- **Naming del healthcheck**: los paths canónicos son `GET /health` y `GET /health/ready`
  (Doc 21 §10.4; US-116), **no** `/healthz` `/readyz`. Referencias residuales en artefactos de
  backlog/épica unificadas por US-141 DOC-001.
- **Alarmas mínimas al MVP**: las alarmas de **5xx** y **healthcheck** se promueven al MVP
  (PB-P3-002). Las alarmas de **latencia/percentiles** y de **fallo del LLM** permanecen como
  **futuro** (Doc 21 §19.5). Namespaces de métricas: `EventFlow/Backend`, `EventFlow/AI`.
  Retención de logs: 14–30 días (Doc 21 §30).
