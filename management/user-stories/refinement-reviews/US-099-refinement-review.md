# User Story Refinement Review — US-099

## Source User Story File

`management/user-stories/US-099-prisma-schema.md`

## Decision Resolution Artifact

`management/user-stories/decision-resolutions/US-099-decision-resolution.md` — **No encontrado**. Las decisiones PO/Tech/QA aplicables están formalizadas dentro del propio User Story en la sección `PO/BA Decisions Applied`, lo que es suficiente bajo las reglas de precedencia del skill (la sección `PO/BA Decisions Applied` cuenta como decisión formalizada).

## Review Date

2026-06-09

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                          |
| ------------------------------------------ | ------------------------------------------------------------------- |
| User Story ID                              | US-099                                                              |
| File Path                                  | `management/user-stories/US-099-prisma-schema.md`                   |
| Backlog Item                               | PB-P0-001 — Database Schema, Migrations & Constraints               |
| Epic                                       | EPIC-DB-001 — Database & Prisma Physical Model                      |
| Estado actual                              | Ready for Approval                                                  |
| Estado recomendado                         | Ready for Approval                                                  |
| Nivel de riesgo                            | Bajo                                                                |
| Calidad general                            | Alta                                                                |
| Requiere decisión PO                       | No                                                                  |
| Requiere decisión técnica                  | No                                                                  |
| Requiere decisión QA                       | No                                                                  |
| Requiere decisión Seguridad                | No                                                                  |
| Decision Resolution artifact found         | No                                                                  |
| User Story file updated                    | Yes                                                                 |
| Refinement review artifact created/updated | Yes (evidencia no bloqueante)                                       |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-099-refinement-review.md` |

---

## 2. Diagnóstico PO/BA

US-099 es una historia técnica de fundación que entrega únicamente la declaración de `prisma/schema.prisma` (sin migraciones, sin índices avanzados, sin constraints físicos, sin lógica de aplicación). Es **clara**, **valiosa**, **testable**, **trazable**, **alineada con el MVP** y **respetuosa del scope**.

* El rol (`System`) es correcto para una historia de fundación de DB.
* El goal (declarar los 19 modelos MVP, enums, mappings y convenciones físicas) es preciso y verificable mediante `prisma validate` / `prisma generate` / tests estructurales.
* El valor de negocio es explícito: desbloquea EPIC-BE-001, EPIC-API-001, EPIC-AI-001 y EPIC-SEED-001.
* Los límites con US-100 (migraciones), US-101 (índices avanzados) y US-102 (constraints C-001..C-062) están **explícitos y formalizados** en `PO/BA Decisions Applied`.
* No introduce scope creep: respeta MVP guardrails (sin pagos, contratos, chat, WhatsApp, push, RAG, multi-tenant, IA autónoma).
* No requiere `Split Required`: la historia es atómica y de tamaño razonable para entrega.

Las acciones aplicadas en esta refinación fortalecen trazabilidad y formalizan una Tech Decision implícita.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                  | Impacto                                                              | Recomendación                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media     | Documentation Alignment Required: Doc 18 §11/§12 declara `event_types` con PK `code`, mientras US-099 + ADR-DB-002 establecen `id UUID` PK y `code` unique.               | Riesgo de confusión futura al implementar migraciones (US-100).      | Amendar Doc 18 §11 y §12 para alinear con ADR-DB-002. No bloquea US-099: la PO/BA Decision y ADR-DB-002 (Accepted) tienen precedencia sobre Doc 18.                                                         |
| Media     | Documentation Alignment Required: Doc 18 §26 declara mecanismos mixtos de soft delete (`is_active`, `status`, solo `attachments` usa `deleted_at`), mientras US-099 estandariza `deletedAt` para los 7 modelos. | Riesgo de divergencia con repositorios futuros si Doc 18 no se amenda. | Tech Decision uniforme formalizada en `PO/BA Decisions Applied` (válida bajo ADR-DB-004 que admite `status` o `deleted_at`). Amendar Doc 18 §26 para reflejar el mecanismo uniforme. No bloquea US-099. |
| Baja      | Documentation Alignment Required: PB-P0-001 (Backlog Prioritized) menciona `VendorWork` y `Task` en la descripción. Doc 6 §6 establece que `VendorPortfolioItem` se cubre con `Attachment` polimórfico, y la entidad canónica es `EventTask`. | Posible interpretación errada al generar tareas de desarrollo.       | Amendar la descripción de PB-P0-001 para usar `EventTask` y eliminar `VendorWork`. No bloquea US-099.                                                                                                       |
| Baja      | Trazabilidad ADR ampliada: la versión original solo listaba ADR-ARCH-001, ADR-BE-001, ADR-DB-001. La historia depende también de ADR-DB-002, ADR-DB-003, ADR-DB-004, ADR-DB-005 y ADR-AI-006. | Pérdida menor de trazabilidad ADR↔User Story.                        | Resuelto en esta refinación: la sección Traceability ahora incluye los ADRs faltantes.                                                                                                                       |
| Baja      | AC-07 y AC-09 carecían de referencia explícita a los ADRs habilitantes (ADR-DB-004 y ADR-DB-002).                                                                          | Riesgo menor de reinterpretar el mecanismo / la PK en QA o code review. | Resuelto en esta refinación: AC-07 y AC-09 ahora citan ADR-DB-004 y ADR-DB-002 respectivamente.                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                       |
| ------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Schema explícitamente excluye campos de pago (SEC-03).                                                            |
| No introduce contratos firmados      | Pass      | SEC-04 lo prohíbe.                                                                                                |
| No introduce WhatsApp/chat/push      | Pass      | SEC-04 + Out of Scope.                                                                                            |
| Respeta human-in-the-loop IA         | Pass      | `AIRecommendationStatus` incluye `pending/accepted/edited/rejected/discarded`.                                    |
| Respeta backend como source of truth | Pass      | Schema relacional con FKs explícitas, sin lógica en frontend.                                                     |
| Respeta seed/demo si aplica          | Pass      | `is_seed` declarado en cada modelo operativo según Doc 18 §8.5 y BR-SEED-005.                                     |
| No introduce RAG/vector DB           | Pass      | Explícitamente fuera de scope.                                                                                    |
| No introduce multi-tenant enterprise | Pass      | Explícitamente fuera de scope.                                                                                    |
| No introduce P4/Future scope         | Pass      | Sin `EventCollaborator`, `Availability` avanzada, `Conversation`, `Payment`, etc.                                 |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                              | Acción recomendada                                                                                                            |
| ----- | ------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-02 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-03 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-04 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-05 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-06 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-07 | Clear (refinado) | Falta de referencia explícita a ADR-DB-004 como habilitante del mecanismo uniforme `deletedAt`. | **Aplicado en esta refinación:** AC-07 cita ADR-DB-004 y Doc 18 §26; clarifica que `status`/`is_active` pueden coexistir como atributos funcionales pero el marcador canónico es `deletedAt`. |
| AC-08 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-09 | Clear (refinado) | Falta de referencia explícita a ADR-DB-002 y a la implicación sobre US-100.                     | **Aplicado en esta refinación:** AC-09 cita ADR-DB-002 y aclara que la migración derivada (US-100) generará `id uuid` PK y `code text` unique. |
| AC-10 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |
| AC-11 | Clear        | —                                                                                               | Sin cambios.                                                                                                                  |

---

## 6. Gaps Detectados

### Producto / Negocio

No aplica. PO/BA Decisions Applied cubre los puntos críticos.

### Backend / API

No aplica directamente — US-099 es declaración estática. La integración backend (`prisma generate` dentro del módulo backend) está cubierta por dependencia a PB-P0-002.

### Frontend / UX

No aplica.

### Base de Datos

* `EventType` requiere coordinación con US-100 para migrar `event_types` con `id uuid` PK + `code` unique (no `code` como PK físico). Cubierto vía AC-09 reforzado.
* Los 7 modelos con soft delete uniforme requieren coordinación con US-101 para índices parciales `WHERE deleted_at IS NULL`. Esto pertenece a US-101 (Index Strategy), no bloquea US-099.
* Los `unique parciales` y `check constraints` necesarios (ej. C-043 reviews, C-060 attachments) pertenecen a US-102.

### Seguridad / Autorización

Cubierto por SEC-01..SEC-05. No introduce endpoints ni runtime authorization en esta historia.

### IA / PromptOps

* `AIPromptVersion` declarado conforme a ADR-AI-006 (estrategia híbrida).
* `AIRecommendationStatus` cubre el flujo human-in-the-loop (ADR-AI-005).

### QA / Testing

Cubierto por TS-01..TS-10 y NT-01..NT-08. Estrategia QA formalizada en PO/BA Decisions Applied: `prisma validate` + `prisma generate` + tests estructurales sobre `schema.prisma`.

### Seed / Demo

`is_seed` declarado en cada modelo operativo MVP, conforme a Doc 18 §8.5, BR-SEED-005 y NFR-DEMO-003. No requiere cambios adicionales de seed en US-099 — eso pertenece a EPIC-SEED-001.

### Documentación / Trazabilidad

Resuelto en esta refinación con la incorporación de ADR-DB-002, ADR-DB-003, ADR-DB-004, ADR-DB-005 y ADR-AI-006 en la sección Traceability.

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones requeridas para refinar US-099 ya están formalizadas en `PO/BA Decisions Applied` o respaldadas por ADRs aceptados. El siguiente skill recomendado es `eventflow-user-story-approval`.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado                                                                                                                       | Decisión vigente                                                                                              | Acción recomendada                                                                                                                | ¿Bloquea aprobación? |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Doc 18 §11/§12     | Declara `event_types | PK code`; US-099 usa `id UUID` PK + `code` unique.                                                                | ADR-DB-002 (Accepted) — UUID v4 para todas las tablas. PO/BA Decision Applied en US-099.                       | Amendar Doc 18 §11 y §12 para alinear con ADR-DB-002 (cambiar PK físico de `event_types` a `id uuid`, `code text unique`).         | No                   |
| Doc 18 §26         | Declara mecanismos mixtos (`is_active`, `status`, `deleted_at` solo en attachments); US-099 estandariza `deletedAt` para los 7 modelos.   | ADR-DB-004 (Accepted) — admite `status` o `deleted_at`. Tech Decision uniforme en `PO/BA Decisions Applied`. | Amendar Doc 18 §26 para reflejar el mecanismo uniforme `deletedAt` y aclarar que `status`/`is_active` permanecen como atributos funcionales. | No                   |
| PB-P0-001 (Backlog Prioritized) — Description | Menciona `VendorWork` y `Task`.                                                                                                           | Doc 6 §6 (línea 144): `VendorPortfolioItem` se cubre con `Attachment` polimórfico. Entidad canónica: `EventTask`. | Amendar la descripción de PB-P0-001 para usar `EventTask` y eliminar `VendorWork`.                                                  | No                   |
| EPIC Map — alias `US-DB-001` | Coexisten `US-DB-001` y `US-099` como referencias a la misma historia.                                                                    | PO/BA Decision Applied: `US-099` es el ID oficial.                                                            | Mantener `US-DB-001` como alias interno o limpiar la referencia del EPIC Map en una pasada de housekeeping documental.            | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                   |
| User Story file path                       | `management/user-stories/US-099-prisma-schema.md`                                     |
| User Story ID verified                     | Yes (US-099)                                                                          |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-099-decision-resolution.md` (n/a)    |
| Refinement review artifact created/updated | Yes (no bloqueante, como evidencia)                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-099-refinement-review.md`              |
| Final recommended status                   | Ready for Approval                                                                    |
| Next recommended skill                     | `eventflow-user-story-approval`                                                       |
| Reason                                     | Todas las decisiones formalizadas en `PO/BA Decisions Applied` y respaldadas por ADRs aceptados; los hallazgos restantes son Documentation Alignment Required (no bloqueantes). |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* **Aplicado**: `Last Updated` actualizado a `2026-06-09 (refinement pass)`.

### Business Context

Sin cambios.

### PO/BA Decisions Applied

* **Aplicado**: nueva fila `Soft delete mechanism` que formaliza la Tech Decision de mecanismo uniforme `deletedAt` (permitida por ADR-DB-004) y marca Doc 18 §26 como Documentation Alignment Required.
* **Aplicado**: nueva fila `EventType PK precedence` que documenta explícitamente la precedencia de ADR-DB-002 + PO/BA Decision sobre Doc 18 §11/§12 (no bloqueante).

### Traceability

* **Aplicado**: `Related ADR(s)` ampliado a `ADR-ARCH-001, ADR-BE-001, ADR-DB-001, ADR-DB-002, ADR-DB-003, ADR-DB-004, ADR-DB-005, ADR-AI-006`.

### Scope Guardrails

Sin cambios.

### Acceptance Criteria

* **Aplicado AC-07**: cita ADR-DB-004 y Doc 18 §26; clarifica que `status`/`is_active` pueden coexistir como atributos funcionales y que el marcador canónico es `deletedAt`.
* **Aplicado AC-09**: cita ADR-DB-002; clarifica que la migración derivada en US-100 generará `id uuid` PK y `code text` unique para `event_types`.

### Technical Notes

Sin cambios estructurales; los §Database, §`EventType` y §`AIPromptVersion` ya estaban completos y alineados con Doc 18 (salvo los puntos amendados arriba).

### QA Notes

Sin cambios. Estrategia ya formalizada (TS-01..TS-10 + NT-01..NT-08 + jobs CI `prisma validate` y `prisma generate`).

### Definition of Ready

Sin cambios — todos los checkboxes ya estaban marcados.

### Definition of Done

Sin cambios — la lista DoD ya cubre todos los puntos requeridos para esta historia técnica.

### Notes

* **Aplicado**: nueva sub-sección `Documentation Alignment Required (no bloqueante)` lista los items que deben amendarse en documentos fuente posteriores al merge.

---

## 11. Recomendación Final

`Ready for Approval`.

Justificación:

1. Todas las decisiones requeridas para entregar US-099 están formalizadas: ya sea en `PO/BA Decisions Applied`, en ADRs aceptados (ADR-DB-001..ADR-DB-005, ADR-AI-006), o en docs fuente vinculantes (Doc 6, Doc 18 — con las salvedades documentadas).
2. Los hallazgos de alineación documental no contradicen ADRs aceptados, no introducen scope creep y no implican imposibilidad de implementación. Son Documentation Alignment Required (no bloqueantes) y deben tratarse como tareas de housekeeping documental posteriores al merge.
3. La historia respeta MVP guardrails, principios EventFlow y delegación correcta hacia US-100, US-101 y US-102.
4. La calidad de Acceptance Criteria es alta: cada AC es específico, testable y vinculado a comportamiento físico verificable.
5. QA strategy es clara y ejecutable (`prisma validate`, `prisma generate`, tests estructurales sobre `schema.prisma`).
6. La historia es atómica, no requiere split y queda lista para pasar por la `Approval Gate` mediante el skill `eventflow-user-story-approval`.

---

## Próximo paso

Ejecutar el skill `eventflow-user-story-approval` sobre `management/user-stories/US-099-prisma-schema.md`.
