# PO/BA Decision Resolution — US-114

## Source User Story File
management/user-stories/US-114-correlation-id-propagation.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-114-refinement-review.md

## Decision Date
2026-07-07

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-114                                                                                                            |
| User Story file path                         | `management/user-stories/US-114-correlation-id-propagation.md`                                                    |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-114-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-011 — Correlation IDs end-to-end (P2, Should Have, posición 1 de 1)                                        |
| Epic                                         | EPIC-OBS-001                                                                                                       |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 7 (Q1–Q7)                                                                                                          |
| Decisiones PO/BA tomadas                     | 0 (todas Tech Recommendations sin input PO)                                                                        |
| Decisiones técnicas recomendadas             | 7 (D1 UUID v4; D2 `X-Correlation-Id` canonical; D3 read-or-generate + 400 si inválido; D4 envelope + header echo; D5 integración US-113 via AsyncLocalStorage; D6 fetch interceptor frontend; D7 helper `generateCorrelationId` para jobs) |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                 |
| User Story file updated                      | Yes                                                                                                                |
| Decision Resolution artifact created/updated | Yes                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-114-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

Todas las decisiones son deterministas desde `docs/22 §ADR-API-004`, `docs/16 §426/§652/§653`, `docs/18 §110/§869`, US-113 Approved. Se aplican como `Tech Recommendation` conforme al skill rule.

---

## 2. Decisiones Respondidas

## Decisión 1 — UUID v4 (Q1)

### Respuesta PO/BA

`docs/22 §ADR-API-004 §2456`: "Cada request entrante recibe (o genera) un `X-Correlation-Id` (**UUID v4**)". Explícito y sin ambigüedad.

### Decisión formal

```text
Formato del ID: **UUID v4** (RFC 4122). Generación server-side vía `crypto.randomUUID()` (Node.js 20+ nativo). Generación client-side vía `crypto.randomUUID()` (Web Crypto API, disponible en browsers modernos).
```

### Rationale

* `docs/22 §ADR-API-004` explícito.
* `crypto.randomUUID()` nativo evita dependencia adicional (Node 20+ y browsers modernos).
* UUID v4 minimiza colisiones y no expone timestamp (diferencia con v1/v7).

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                          |
| Acceptance Criteria  | AC-01 declara UUID v4 explícito.                                                     |
| Technical Notes      | Backend + Frontend usan `crypto.randomUUID()`.                                       |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 2 — Header canónico `X-Correlation-Id` (Q2)

### Respuesta PO/BA

`docs/22 §ADR-API-004 §2456`: header explícito `X-Correlation-Id`. HTTP RFC 7230 declara headers case-insensitive; wire canonical `X-Correlation-Id` para consistencia.

### Decisión formal

```text
Header canónico wire: `X-Correlation-Id` (mixed-case per convención `X-*` custom headers). Case-insensitive matching per RFC 7230 en el middleware entrante. El middleware SIEMPRE emite el nombre canónico en outbound (`req.set('X-Correlation-Id', id)` en backend response y en frontend fetch outbound).
```

### Rationale

* ADR-API-004 explícito.
* Case-insensitive matching cubre variaciones de clientes.
* Wire canonical estable para debugging.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D2.                                                                          |
| Acceptance Criteria  | AC-04 declara header echo en cada response.                                          |
| Technical Notes      | Backend + Frontend usan `X-Correlation-Id` como wire nombre.                         |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 3 — Estrategia read-or-generate + política ante header inválido (Q3)

### Respuesta PO/BA

`docs/22 §ADR-API-004`: "recibe (o genera)". `ADR-SEC-001` (Prevent Injection): validar TODO input externo. Silent-generate cuando el header viene inválido perdería observabilidad y podría enmascarar un cliente mal implementado. Fail-fast con 400 es defensa en profundidad.

### Decisión formal

```text
Middleware backend valida el header `X-Correlation-Id` entrante con Zod:

- Si header AUSENTE → GENERAR nuevo `crypto.randomUUID()`.
- Si header PRESENTE y matchea regex UUID v4 (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` case-insensitive) → REUSAR.
- Si header PRESENTE pero INVÁLIDO → responder **400 `INVALID_CORRELATION_ID`** con envelope de error:
  ```json
  {
    "error": {
      "code": "INVALID_CORRELATION_ID",
      "message": "X-Correlation-Id must be a valid UUID v4",
      "correlationId": "<newly generated UUID v4>"
    }
  }
  ```
  (Nota: el `error.correlationId` retornado es un ID NUEVO generado por el server para trazabilidad del error; el ID inválido del cliente NO se propaga).
```

### Rationale

* Alineado con ADR-SEC-001 (defensa contra inyección).
* Alineado con `ADR-API-004` (recibe o genera).
* Fail-fast defensivo previene silent bugs en clientes mal implementados.
* El `error.correlationId` server-generated permite trazar el fallo aunque el cliente enviara garbage.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                          |
| Acceptance Criteria  | AC-02 (reuso), AC-03 (400 si inválido).                                              |
| Validation Rules     | VR-01 declara regex UUID v4 estricta.                                                |
| Technical Notes      | Zod schema aplicado al header.                                                       |
| Test Scenarios       | TS-01, TS-02, TS-03 + NT-01.                                                         |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 4 — Response envelope + header echo (Q4)

### Respuesta PO/BA

`docs/16 §426`: "Toda respuesta incluye `meta.correlationId` y `meta.timestamp` (ISO 8601 UTC)". `docs/16 §652/§653`: envelope de respuesta + error llevan `meta.correlationId`. Este es un contract MVP explícito.

### Decisión formal

```text
Para TODAS las responses (2xx, 4xx, 5xx):
1) Response HTTP header `X-Correlation-Id: <id>` (echo del ID del contexto).
2) Body envelope obligatorio:
   - Success (2xx): body incluye `meta.correlationId: <id>` (y `meta.timestamp: <ISO-8601 UTC>` per docs/16 §426).
   - Error (4xx, 5xx): body incluye `error.correlationId: <id>`.

El helper de envelope existente (probable `src/shared/http/response.ts` — a ratificar en Technical Spec) DEBE leer del `correlationContext.getStore()` (US-113 D4) para inyectar el valor. Si el helper aún no existe (parte de PB-P0-002), US-114 lo crea con estos requisitos mínimos.

Integridad: response header y body envelope DEBEN coincidir (mismo ID). Test IT-01 verifica este invariante.
```

### Rationale

* Alineado con `docs/16 §426/§652/§653`.
* Alineado con ADR-API-004: propagación en "logs y respuestas".
* Consistencia header vs body evita bugs de observabilidad.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                          |
| Acceptance Criteria  | AC-04 (header echo), AC-05 (success envelope), AC-06 (error envelope).               |
| Technical Notes      | Backend describe helper de envelope integrado con `correlationContext`.               |
| Test Scenarios       | TS-04, TS-05, IT-01 (invariante header==body).                                        |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 5 — Integración con US-113 via AsyncLocalStorage (Q5)

### Respuesta PO/BA

US-113 (Approved) D4 declara `correlationContext = new AsyncLocalStorage<{correlationId}>()` como singleton en `src/shared/context/correlation-id.ts`. US-113 §7 documenta orden de middlewares: US-114 → US-113 → auth → ...

### Decisión formal

```text
US-114 middleware ejecuta:
```ts
export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const raw = req.header('X-Correlation-Id');
  const correlationId = raw ? validateOrThrow(raw) : crypto.randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);
  (req as any).correlationId = correlationId; // para acceso directo si es útil
  correlationContext.run({ correlationId }, () => next());
};
```

El `correlationContext.run(...)` es el mismo singleton exportado por US-113 D4 desde `src/shared/context/correlation-id.ts`. Ambas historias comparten el módulo sin duplicar la instancia.

Orden en `app.ts`:
1. `correlationIdMiddleware` (US-114 — OWNER; genera/valida ID; setea response header; corre `run(...)`).
2. `requestLogger` (US-113 — CONSUME; `mixin` lee `correlationContext.getStore()?.correlationId`).
3. Auth, role, ownership, validation, rate limit, captcha, upload, error handler (existentes de PB-P0-002).
```

### Rationale

* Reuso 1:1 del singleton `correlationContext` de US-113 sin duplicación.
* Orden garantiza que TODO log posterior tenga el ID.
* US-113 §7 lo declara explícitamente; US-114 lo materializa.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                          |
| Acceptance Criteria  | AC-07 declara `correlationContext.getStore()` retorna el mismo ID.                    |
| Technical Notes      | Backend describe wiring de middlewares + reuso de singleton.                          |
| Test Scenarios       | TS-06 verifica invariante ID en context == ID en response.                            |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional (respaldado por US-113 Approved).

---

## Decisión 6 — Frontend fetch interceptor (Q6)

### Respuesta PO/BA

PB-P2-011 Acceptance Summary: "Frontend lo propaga en `fetch`". `docs/15 §Frontend Architecture` (por confirmar en Technical Spec si menciona interceptor específico) — en MVP, patrón pragmático es interceptor global en cliente API.

### Decisión formal

```text
Frontend implementa un fetch interceptor global en `apps/web/lib/api/client.ts` (o equivalente según docs/15). Cada outbound request:

1) Genera `X-Correlation-Id = crypto.randomUUID()` (Web Crypto API disponible en browsers modernos MVP scope).
2) Adjunta el header a la request.
3) Opcionalmente, si `LOG_LEVEL` frontend >= debug, imprime en console el `correlationId` de la response para debugging.

Sin persistencia cross-request en MVP (cada fetch genera nuevo ID). Persistencia por sesión (para agrupar múltiples requests de una acción de usuario en un mismo ID) queda para Future US (requiere decisión PO sobre semántica de session vs request-scoped tracking).

Interceptor recomendado se implementa como wrapper del fetch nativo o vía cliente `ky` (según convención existente en `apps/web/lib/api/`; ratificar en Technical Spec).

Documentation Alignment con `docs/15`: si `docs/15 §Frontend Architecture` no declara explícitamente el interceptor, agregar sección "Correlation ID Propagation" en `docs/15`.
```

### Rationale

* PB-P2-011 explícito.
* `crypto.randomUUID()` nativo browser evita dependencias.
* Simplicidad MVP: cada request nuevo ID (patrón "request-scoped").
* Extensible: Future US puede agregar session-scoped IDs sin romper contrato.

### Impacto

| Sección              | Cambio                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D6.                                                                                |
| Acceptance Criteria  | AC-08 declara fetch interceptor con `crypto.randomUUID()` por outbound request.             |
| Technical Notes      | Frontend describe interceptor global en `apps/web/lib/api/client.ts`.                       |
| Test Scenarios       | TS-07 (unit MSW), TS-08 (opcional cliente lee response header), E2E-01.                     |
| Documentation Alignment | `docs/15` puede requerir sección "Correlation ID Propagation" (verificar en Tech Spec).   |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** durante Technical Spec para ratificar path exacto (`apps/web/lib/api/client.ts` vs otra convención) y librería base (`fetch` vs `ky`).

---

## Decisión 7 — Helper `generateCorrelationId` para jobs (Q7, parcial)

### Respuesta PO/BA

US-034 D5 declara `correlationId=job-emit-t7-<timestamp>` para operar fuera de HTTP context. Otros jobs (AutoCompletePastEventsJob, ExpireQuotesJob, SeedResetJob) probablemente requerirán patrón similar. Centralizar el helper evita divergencia.

### Decisión formal

```text
US-114 exporta un helper adicional en `src/shared/context/correlation-id.ts` (colocado con `correlationContext` de US-113):

```ts
export function generateCorrelationId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
```

Uso en jobs:
```ts
// EmitT7NotificationsJob (US-034 D5)
const correlationId = generateCorrelationId('job-emit-t7');
correlationContext.run({ correlationId }, () => runJob());
```

Este helper NO es requerido por US-114 en sí (que sólo maneja HTTP), pero se documenta como parte de la infraestructura de correlation para ser reusado por jobs de US-034, futuros AutoCompletePastEventsJob, ExpireQuotesJob, etc.
```

### Rationale

* Centralización evita divergencia entre jobs.
* Prefijo hace legible el ID en logs (`job-emit-t7-<uuid>` vs `<uuid>` a secas).
* Consistente con US-034 D5 aprobada.

### Impacto

| Sección              | Cambio                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D7.                                                                        |
| Technical Notes      | Backend documenta el helper + colocación con singleton de US-113.                  |
| Test Scenarios       | UT del helper con y sin prefix.                                                    |
| Notes                | Handoff con US-034 (patrón ya usado) y otros jobs futuros.                          |

### ¿Bloqueaba aprobación? Parcial. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                    | Decisión                                                                                                                   | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                            |
| -: | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
|  1 | Versión UUID                             | UUID v4 nativo (`crypto.randomUUID()`).                                                                                     | Tech Recommendation | Sí                     | No requiere                                     |
|  2 | Nombre canónico del header               | `X-Correlation-Id` (case-insensitive matching).                                                                             | Tech Recommendation | Sí                     | No requiere                                     |
|  3 | Read-or-generate + política inválido    | Ausente → generar; válido → reusar; inválido → 400 `INVALID_CORRELATION_ID`.                                                | Tech Recommendation | Sí                     | No requiere                                     |
|  4 | Response envelope + header echo          | Header echo en TODAS responses. Success: `meta.correlationId`. Error: `error.correlationId`. Header==body invariante.       | Tech Recommendation | Sí                     | No requiere                                     |
|  5 | Integración US-113                      | US-114 middleware corre `correlationContext.run(...)` de US-113. Orden: US-114 → US-113 → auth → ...                        | Tech Recommendation | Sí                     | No requiere                                     |
|  6 | Frontend fetch interceptor              | Interceptor global en `apps/web/lib/api/client.ts` con `crypto.randomUUID()` por outbound request. Sin persistencia MVP.    | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  7 | Helper `generateCorrelationId` para jobs | Helper con prefix opcional colocado con el singleton `correlationContext` en `src/shared/context/correlation-id.ts`.        | Tech Recommendation | Parcial                | No requiere                                     |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-114-correlation-id-propagation.md`.

Resumen: reescritura mayor de plantilla genérica a contenido específico (paralelo a US-113 Approved).

---

## 5. Documentation Alignment Required

| Documento / Fuente     | Conflicto                                                          | Decisión vigente                                          | Acción recomendada                                                                    | ¿Bloquea aprobación? |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------- |
| PB-P2-011 Traceability | Sin IDs explícitos.                                                | US-114 refinada declara IDs canónicos.                    | Ampliar Traceability del backlog item.                                                | No                   |
| `docs/15 §Frontend`    | Verificar si menciona explícitamente el fetch interceptor.          | D6 requiere el interceptor.                                | Agregar sección "Correlation ID Propagation" en `docs/15` (verificar en Tech Spec).   | No                   |

**Nota**: No hay conflictos con `docs/22 §ADR-API-004`, `docs/16 §426/§652/§653`, `docs/18 §110/§869`. US-114 sólo materializa lo que esos documentos ya declaran.

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                |
| User Story file path                         | `management/user-stories/US-114-correlation-id-propagation.md`                                                                                     |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-114-decision-resolution.md`                                                                       |
| New User Story status                        | Ready for Approval                                                                                                                                 |
| Remaining blockers                           | No                                                                                                                                                 |
| Reason                                       | 7 Tech Recommendations formalizadas con respaldo documental (ADR-API-004, docs/16 §envelope, docs/18 §ai_rec, US-113 Approved). Sin decisiones PO reales. D6 marca Tech Lead Validation durante Tech Spec para ratificar path frontend. |

---

## 7. Estado recomendado

`Ready for Approval`

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación.
2. Run `eventflow-user-story-approval`.
3. Run `eventflow-user-story-technical-spec`.
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-114-correlation-id-propagation.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-114-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
