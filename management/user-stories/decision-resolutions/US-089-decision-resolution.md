# PO/BA Decision Resolution — US-089

## Source User Story File
management/user-stories/US-089-bootstrap-node-express-ts.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-089-refinement-review.md

## Decision Date
2026-06-11

---

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                              |
| -------------------------------------------- | ------------------------------------------------------------------ |
| User Story ID                                | US-089                                                             |
| User Story file path                         | management/user-stories/US-089-bootstrap-node-express-ts.md        |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-089-refinement-review.md |
| Existing decision resolution found           | No                                                                 |
| Backlog Item                                 | PB-P0-002 — Backend Modular Monolith Bootstrap                     |
| Epic                                         | EPIC-BE-001 — Backend Modular Monolith                             |
| Estado antes de decisiones                   | Ready for Approval (refinement ya aplicado en ciclo anterior)      |
| Cantidad de preguntas revisadas              | 0 bloqueantes + 1 Documentation Alignment Required (no bloqueante) |
| Decisiones PO/BA tomadas                     | 5 (formalizadas desde decisiones ya aplicadas en refinement)       |
| Decisiones técnicas recomendadas             | 0                                                                  |
| ¿Desbloquea aprobación?                      | N/A — no había bloqueantes; se formaliza el estado existente       |
| User Story file updated                      | Yes (sección `PO/BA Decisions Applied` agregada)                   |
| Decision Resolution artifact created/updated | Yes                                                                |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-089-decision-resolution.md |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                |

---

## Contexto de esta ejecución

La US-089 llegó a este skill con **status Ready for Approval** tras el ciclo de refinement previo. El refinement review reportó cero preguntas bloqueantes; todos los issues eran de calidad interna (NFR IDs incorrectos, AC no testeables, documentación desalineada) y fueron resueltos directamente en el archivo de la US usando ADRs aceptados y documentación técnica existente.

Este ciclo del skill tiene como único objetivo:
1. Formalizar las decisiones aplicadas en `PO/BA Decisions Applied` dentro de la US.
2. Crear el Decision Resolution artifact como registro permanente.
3. Documentar el único item de Documentation Alignment Required (no bloqueante).

---

## 2. Decisiones Respondidas

### Decisión 1 — Nombre del health endpoint: `/healthz` vs `GET /health`

#### Pregunta original

> PB-P0-002 Acceptance Summary, PB-P0-015 y R0 Foundation usan `/healthz`. Doc 14 §8.3 y Doc 16 §180/192 usan `GET /health`. ¿Cuál es el nombre correcto?

#### Respuesta PO/BA

El nombre correcto para el health check del backend de EventFlow MVP es **`GET /health`**, conforme a los documentos técnicos de diseño (Doc 14 §8.3 y Doc 16 §180/192). Estos documentos son más específicos y más recientes que las referencias en el Product Backlog. Las referencias a `/healthz` en PB-P0-002, PB-P0-015 y R0 Foundation son inconsistencias de nomenclatura que deben alinearse, pero no requieren nuevo ADR ni decisión PO adicional.

#### Decisión formal

```
El health check del backend es GET /health (no /healthz).
Fuente de verdad: Doc 14 §8.3 y Doc 16 §180/192.
Las referencias a /healthz en el Product Backlog se alinearán como trabajo de Documentation Alignment en un ciclo separado.
```

#### Rationale

Doc 14 es el documento de diseño técnico del backend y Doc 16 es la especificación de la API. Ambos son más específicos que el Product Backlog. La inconsistencia es de nomenclatura entre artefactos de planificación vs. artefactos de diseño técnico; el diseño técnico prevalece. No se requiere ADR porque no hay conflicto con ninguna ADR existente y la decisión no altera el comportamiento funcional.

#### Impacto en la User Story

| Sección              | Cambio                                                                    |
| -------------------- | ------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Decisión formalizada: `GET /health` como nombre canónico del endpoint. |
| Notes                | Ya incluye la aclaración sobre `GET /health` vs `/healthz`.               |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional — decisión derivada directamente de Doc 14 y Doc 16.

---

### Decisión 2 — NFR IDs aplicables a bootstrap

#### Pregunta original

> `NFR-PERF-API-001` y `NFR-OBS-001` referenciados en el Draft no existen o no aplican. ¿Cuáles son los NFR IDs correctos para US-089?

#### Respuesta PO/BA

Los NFR aplicables a la historia de bootstrap son:
- **NFR-PERF-001**: P95 < 1.5s para endpoints no-IA — aplica al `GET /health` endpoint.
- **NFR-OBS-006**: Logging estructurado a stdout es suficiente (no requiere APM enterprise) — aplica al logging de arranque.
- **NFR-SEC-008**: API keys y secretos solo en variables de entorno, nunca en repo — aplica a `.env.example`.
- **NFR-DEPLOY-002**: `.env.example` con todas las variables requeridas sin valores reales — aplica directamente al AC-04.

`NFR-PERF-API-001` no existe en Doc 10; es un ID fabricado. `NFR-OBS-001` aplica exclusivamente a AdminAction logging de acciones administrativas, lo cual no es relevante para el bootstrap del servidor.

#### Decisión formal

```
Los NFR IDs aplicables a US-089 son: NFR-PERF-001, NFR-OBS-006, NFR-SEC-008, NFR-DEPLOY-002.
NFR-PERF-API-001 es un ID inexistente y debe eliminarse de cualquier referencia.
NFR-OBS-001 no aplica a historias de bootstrap o infraestructura técnica.
```

#### Rationale

Los NFR IDs deben existir en Doc 10 y ser relevantes para el comportamiento de la historia. Referenciar NFRs inexistentes rompe la trazabilidad y confunde la validación QA.

#### Impacto en la User Story

| Sección       | Cambio                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Traceability  | `NFR Reference(s)` actualizado a los 4 IDs correctos. Ya aplicado.      |
| PO/BA Decisions Applied | Decisión formalizada.                                           |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 3 — Scope de Prisma en esta US

#### Pregunta original

> ¿Hasta dónde llega el scope de Prisma en US-089? ¿Incluye migraciones?

#### Respuesta PO/BA

US-089 cubre únicamente la inicialización del servidor y el health endpoint. Prisma se **instala como dependencia** y se invoca `prisma.$connect()` en `server.ts` como stub para verificar la conectividad al arranque, pero **las migraciones, el schema Prisma y la seed pertenecen a una US separada** de infraestructura de base de datos (fuera del scope de PB-P0-002).

#### Decisión formal

```
US-089 instala Prisma y llama prisma.$connect() como stub en server.ts.
Las migraciones y el schema Prisma pertenecen a una US separada de infraestructura de base de datos.
```

#### Rationale

PB-P0-002 define bootstrap del servidor, no infraestructura de base de datos. Separar la preocupación evita que US-089 acumule scope de múltiples backlog items.

#### Impacto en la User Story

| Sección              | Cambio                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Scope Guardrails     | Out of Scope ya incluye "Migraciones de base de datos y Prisma schema". |
| Technical Notes      | Ya menciona "Prisma client instalado; $connect() stub; sin migraciones". |
| PO/BA Decisions Applied | Decisión formalizada.                                           |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 4 — Scope de middlewares en esta US

#### Pregunta original

> ¿US-089 implementa los middlewares completos o solo stubs?

#### Respuesta PO/BA

US-089 es exclusivamente el **bootstrap del servidor**: `server.ts`, `app.ts`, Zod config, `GET /health`. La implementación completa del pipeline de middlewares (correlation, logging, auth, role, ownership, validation, rate limit, captcha, upload, errorHandler) pertenece a **US-091**. Esta US únicamente registra middlewares vacíos o stubs en `app.ts` para que el servidor compile y arranque.

#### Decisión formal

```
US-089 registra middlewares stub vacíos en app.ts.
La implementación completa del pipeline de middlewares es responsabilidad exclusiva de US-091.
```

#### Rationale

PB-P0-002 descompone el bootstrap en tres US: US-089 (servidor), US-090 (estructura de módulos), US-091 (middlewares). Mantener esta separación evita que US-089 sea demasiado grande y permite que US-091 se apruebe y planifique de forma independiente.

#### Impacto en la User Story

| Sección              | Cambio                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Scope Guardrails     | Out of Scope ya incluye "Pipeline de middlewares completo (US-091)".            |
| Notes                | Ya indica que middlewares se registran como stubs en esta US.                   |
| PO/BA Decisions Applied | Decisión formalizada.                                                        |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

### Decisión 5 — Response shape de `GET /health`

#### Pregunta original

> ¿Qué estructura retorna `GET /health`?

#### Respuesta PO/BA

El endpoint `GET /health` retorna `{ "status": "ok", "version": string, "uptimeMs": number }` con HTTP `200 OK`, conforme a Doc 16 §192. No requiere autenticación. No está bajo el prefijo `/api/v1` (Doc 16 §180: "El health check no se versiona").

#### Decisión formal

```
GET /health retorna HTTP 200 con { "status": "ok", "version": string, "uptimeMs": number }.
No se versiona bajo /api/v1. No requiere autenticación.
```

#### Rationale

Conforme a Doc 16 §180 y §192. Estandarizar el shape facilita el monitoreo de infraestructura y la verificación de CI/CD.

#### Impacto en la User Story

| Sección              | Cambio                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Acceptance Criteria  | AC-02 ya especifica el response shape correctamente.                            |
| Technical Notes      | API table ya muestra `GET /health` con response shape.                          |
| PO/BA Decisions Applied | Decisión formalizada.                                                        |

#### ¿Bloqueaba aprobación?

No

#### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
|--:|------|----------|------|------------------------|----------------------|
| 1 | Nombre del health endpoint | `GET /health` per Doc 14 §8.3 y Doc 16 §180/192 | PO/BA | No | No requiere |
| 2 | NFR IDs aplicables | `NFR-PERF-001`, `NFR-OBS-006`, `NFR-SEC-008`, `NFR-DEPLOY-002` | BA / Traceability | No | No requiere |
| 3 | Scope de Prisma | Solo `$connect()` stub; migraciones en US separada | PO/BA | No | No requiere |
| 4 | Scope de middlewares | Stubs vacíos en esta US; pipeline completo en US-091 | PO/BA | No | No requiere |
| 5 | Response shape `GET /health` | `{ status: "ok", version: string, uptimeMs: number }` per Doc 16 §192 | BA / Tech | No | No requiere |

---

## 4. Cambios Aplicados a la User Story

### PO/BA Decisions Applied

Sección `### PO/BA Decisions Applied` creada bajo `## 🧠 Business Context` con las 5 decisiones formalizadas en tabla.

### Resto de la User Story

Sin cambios adicionales. El refinement previo ya había aplicado todos los cambios necesarios (AC específicos, NFR IDs correctos, Technical Notes detalladas, etc.). Este ciclo solo agrega la sección de decisiones formalizadas.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| PB-P0-002 Acceptance Summary (`management/artifacts/4-Product-Backlog-Prioritized.md`) | Usa `/healthz` en lugar de `GET /health` | `GET /health` per Doc 14 §8.3 y Doc 16 §180/192 | Actualizar PB-P0-002 Acceptance Summary en próximo ciclo de mantenimiento de backlog | No |
| PB-P0-015 (ítem DevOps / App Runner) | Referencia `/healthz` como endpoint de health para el container | `GET /health` per Doc 14 y Doc 16 | Actualizar PB-P0-015 para usar `GET /health` consistentemente | No |
| R0 Foundation milestone description | "Backend con `/healthz` operativo" | `GET /health` | Actualizar descripción del milestone en próximo ciclo | No |

**Nota**: Estos tres items de alineación no bloquean la aprobación de US-089 ya que la decisión técnica está formalizada en Doc 14 y Doc 16 (fuentes de verdad del diseño) y no contradice ninguna ADR aceptada.

---

## 6. File Update Result

| Campo                                        | Valor                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                       |
| User Story file path                         | `management/user-stories/US-089-bootstrap-node-express-ts.md`                            |
| Decision Resolution artifact created/updated | Yes                                                                                       |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-089-decision-resolution.md`             |
| New User Story status                        | Ready for Approval                                                                        |
| Remaining blockers                           | No                                                                                        |
| Reason                                       | No había preguntas bloqueantes. Las 5 decisiones derivadas de ADRs y documentación técnica existente se formalizaron en `PO/BA Decisions Applied`. |

---

## 7. Estado recomendado después de aplicar decisiones

**Ready for Approval**

US-089 tenía status `Ready for Approval` desde el ciclo de refinement previo. Este ciclo formaliza las decisiones en el artefacto permanente y añade la sección `PO/BA Decisions Applied` a la US. No hay preguntas bloqueantes pendientes ni items que requieran Tech Lead, QA Lead o Security Lead adicionales.

---

## 8. Próximo Paso Recomendado

```
1. Revisar la sección PO/BA Decisions Applied en la User Story para confirmar que las decisiones están correctamente expresadas.
2. Ejecutar eventflow-user-story-approval sobre US-089.
3. En un ciclo separado de mantenimiento de backlog, actualizar PB-P0-002, PB-P0-015 y R0 Foundation para usar GET /health en lugar de /healthz.
```
