# 🎓 Reporte final de evidencia académica — EventFlow (AI4Devs)

> **User Story:** US-150 (PB-P3-011) · **Épica:** EPIC-ACAD-001 — Academic Evidence
> **Versión:** 1.0 · **Última actualización:** 2026-07-29
> **Rol propietario:** Product Owner · **Naturaleza:** entregable documental de **cierre** (consolidación por enlace)
> **Estado:** ✅ **Entregable final — listo para evaluación** (ver §7 · congelación de evidencia)

Índice ejecutivo de cierre del proyecto académico. Mapea **épicas → User Stories → criterios y
métricas académicas** ([Doc 3 §14.2/§15](../../docs/3-MVP-Scope-Definition.md)) y **enlaza** —sin
duplicar— la evidencia ya producida por las historias hermanas del épico académico: índice de ADRs
(US-147), matriz de trazabilidad (US-148) y catálogo sanitizado de prompts/outputs (US-149).

> 🔒 **Sanitización (VR-03 · SEC-02/03).** Este reporte **no** contiene secretos ni PII: solo
> referencia evidencia sanitizada y las identidades **seed** públicas (`*@seed.eventflow.test`). Los
> valores sensibles permanecen en AWS Secrets Manager, nunca en el repositorio.

---

## 0. Tabla de contenido

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Mapeo épicas → User Stories → criterios/métricas académicas](#2-mapeo-épicas--user-stories--criteriosmétricas-académicas)
3. [Evidencia consolidada (por enlace)](#3-evidencia-consolidada-por-enlace)
4. [Mapeo a la rúbrica AI4Devs (criterios académicos)](#4-mapeo-a-la-rúbrica-ai4devs-criterios-académicos)
5. [Métricas académicas recomendadas (Doc 3 §15)](#5-métricas-académicas-recomendadas-doc-3-15)
6. [Gaps de evidencia (pendientes accionables — EC-01)](#6-gaps-de-evidencia-pendientes-accionables--ec-01)
7. [Estado de entrega y congelación de evidencia](#7-estado-de-entrega-y-congelación-de-evidencia)

---

## 1. Resumen ejecutivo

EventFlow es un workspace de planificación de eventos asistido por IA con un flujo simplificado de
cotización de proveedores (MVP, Trabajo Final de Máster). Este reporte evidencia, con trazabilidad,
la cobertura de la **rúbrica académica AI4Devs** (materializada en los criterios de
[Doc 3 §14.2](../../docs/3-MVP-Scope-Definition.md) y las métricas de §15).

| Indicador de cierre | Estado | Evidencia |
|---|---|---|
| Épicas del MVP | 24 (foundation + producto + gobernanza + demo/académica) | [Epic Map](1-EventFlow-Epic-Map.md) |
| User Stories | 150 (`management/user-stories/US-*.md`) | [Coverage Matrix](2-User-Stories-Coverage-Matrix.md) · [Traceability Matrix](User-Stories-Traceability-Matrix.md) |
| ADRs aceptados | ≥ 5 requeridos → **48** documentados | [ADR Index](ADR-Index.md) · [docs/22](../../docs/22-Architecture-Decision-Records.md) |
| Features IA con prompts documentados | 7 (AI-001..008) | [AI-Prompt-Evidence-Catalog](AI-Prompt-Evidence-Catalog.md) |
| Cobertura de pruebas (lógica crítica) | Gate ≥ 55% bloqueante en CI | [backend/vitest.config.ts](../../backend/vitest.config.ts) |
| Deploy accesible | AWS (Amplify + App Runner) + smoke | [docs/21](../../docs/21-Deployment-and-DevOps-Design.md) · [Demo-URL-Smoke-Runbook](Demo-URL-Smoke-Runbook.md) |
| Evidencia HITL (IA editable/validada) | `AIRecommendation` + PromptOps | [docs/17](../../docs/17-AI-Architecture-and-PromptOps-Design.md) · [schema.prisma](../../backend/prisma/schema.prisma) |

**Gaps abiertos (no fabricados, EC-01):** la **URL Demo concreta** y los **screenshots
representativos** son evidencia **operativa** pendiente del despliegue/captura (ver §6). No bloquean
la trazabilidad documental; se listan como pendientes accionables.

---

## 2. Mapeo épicas → User Stories → criterios/métricas académicas

Consolidación **por enlace**: el detalle US → FRD/UC/BR/NFR/ADR vive en la
[Matriz de trazabilidad](User-Stories-Traceability-Matrix.md) (US-148) y el desglose épica → US en
el [Epic Map](1-EventFlow-Epic-Map.md) y la [Coverage Matrix](2-User-Stories-Coverage-Matrix.md).
La tabla siguiente resume qué criterio/métrica académica evidencia cada épica.

| Épica | Foco | Criterio académico (§14.2) / Métrica (§15) evidenciada |
|---|---|---|
| [EPIC-BE-001](1-EventFlow-Epic-Map.md) Backend Modular Monolith | Arquitectura backend | Separación FE/BE/DB/IA (§14.3); ADRs (§14.2) |
| EPIC-DB-001 Database & Prisma | Modelo de datos | Modelo de datos documentado (§14.2) |
| EPIC-FE-001 Frontend Next.js | UI del producto | Deploy funcional (§14.2); flujos E2E (§15 #1) |
| EPIC-API-001 REST API Contract | Contrato de API | Contrato de API documentado (§14.2) |
| EPIC-SEC-001 Security & RBAC | Seguridad/autorización | Criterios técnicos (§14.3); RBAC negativa (CI) |
| EPIC-AI-001 LLMProvider & PromptOps | Abstracción IA + prompts | Prompts versionados (§14.2); ADRs LLM; #features IA ≥5 (§15) |
| EPIC-SEED-001 Seed Reproducible | Seed idempotente | Seed reproducible en un comando (§14.3/§15 #7) |
| EPIC-OPS-001 AWS Deploy + CI/CD | Despliegue | Deploy funcional accesible (§14.2/§15 #9) |
| EPIC-AUTH-001 Auth & Access | Login/roles | Flujo multi-rol (§15 #4) |
| EPIC-EVT-001 Organizer Event Mgmt | Eventos organizador | Flujo E2E organizador (§15 #1) |
| EPIC-AIP-001 AI-Assisted Planning | Plan IA | Generación de plan IA (§15 #2) |
| EPIC-TASK-001 Checklist & Tasks | Checklist IA | Generación de checklist IA (§15 #3) |
| EPIC-BUD-001 Budget & Currency | Presupuesto | Distribución de presupuesto IA (feature IA §15) |
| EPIC-VND-001 Vendor Directory & Profile | Proveedores | Panel proveedor (§15 #5) |
| EPIC-QR-001 Quote Request & Response | Cotización | Flujo cotización org ↔ proveedor (§15 #4) |
| EPIC-CMP-001 Quote Comparison & Booking | Comparador + booking | Comparación de cotizaciones; `confirmed_intent` (§14.4) |
| EPIC-ADM-001 Admin Governance | Admin | Admin funcional (§15 #6) |
| EPIC-REV-001 Reviews & Moderation | Reseñas | Reseña visible (§14.4) |
| EPIC-NOT-001 Notifications | Notificaciones | Soporte de flujos multi-rol |
| EPIC-QA-001 Testing & Quality Gates | Pruebas/CI | Cobertura ≥50% lógica crítica (§14.2/§14.3/§15 #8) |
| EPIC-OBS-001 Observability & Audit | Logs/auditoría | Criterios técnicos (§14.3) |
| EPIC-DEMO-001 Demo Readiness | Demo | Criterios de demo (§14.4); demo 10–15 min |
| EPIC-ACAD-001 Academic Evidence | Evidencia académica | Documentación trazable IA + decisiones humanas (§15 #10) |

> El detalle exhaustivo por User Story (una fila por US con sus FRD/UC/BR/NFR/ADR) **no se duplica**
> aquí: es la [Matriz de trazabilidad](User-Stories-Traceability-Matrix.md) (US-148 / PB-P3-009).

---

## 3. Evidencia consolidada (por enlace)

Cada artefacto es propiedad de su historia; aquí se **enlaza**, no se reproduce.

| # | Evidencia | Artefacto (enlace) | Propiedad |
|---|---|---|---|
| E-1 | **Índice de ADRs** (≥5 → 48 aceptados; criterio humano) | [ADR-Index.md](ADR-Index.md) · [docs/22](../../docs/22-Architecture-Decision-Records.md) | US-147 / PB-P3-008 ([US](../user-stories/US-147-adr-index.md)) |
| E-2 | **Matriz de trazabilidad** US → FRD/UC/BR/NFR/ADR | [User-Stories-Traceability-Matrix.md](User-Stories-Traceability-Matrix.md) | US-148 / PB-P3-009 ([US](../user-stories/US-148-us-frd-uc-traceability.md)) |
| E-3 | **Catálogo de prompts/outputs** (7 features IA, sanitizado) | [AI-Prompt-Evidence-Catalog.md](AI-Prompt-Evidence-Catalog.md) | US-149 / PB-P3-010 ([US](../user-stories/US-149-document-prompt-outputs.md)) |
| E-4 | **Evidencia HITL** (IA editable + validación humana) | [docs/17](../../docs/17-AI-Architecture-and-PromptOps-Design.md) · modelo `AIRecommendation` en [schema.prisma](../../backend/prisma/schema.prisma) | EPIC-AI-001 |
| E-5 | **Cobertura de pruebas** en lógica crítica (gate ≥55% en CI) | [backend/vitest.config.ts](../../backend/vitest.config.ts) · [pr.yml](../../.github/workflows/pr.yml) | EPIC-QA-001 |
| E-6 | **Deploy AWS** (Amplify + App Runner) + IaC | [docs/21](../../docs/21-Deployment-and-DevOps-Design.md) · [amplify.yml](../../amplify.yml) · [infra/](../../infra/) | EPIC-OPS-001 |
| E-7 | **Demo readiness** (guion, checklist, toggle IA, smoke) | [Demo-Script.md](Demo-Script.md) · [Pre-Demo-Checklist.md](Pre-Demo-Checklist.md) · [AI-Provider-Toggle-Runbook.md](AI-Provider-Toggle-Runbook.md) · [Demo-URL-Smoke-Runbook.md](Demo-URL-Smoke-Runbook.md) | EPIC-DEMO-001 |
| E-8 | **Seed reproducible** + garantía demo (`confirmed_intent` + reseña) | [US-145-demo-readiness-mapping.md](US-145-demo-readiness-mapping.md) | EPIC-SEED-001 / EPIC-DEMO-001 |
| E-9 | **Discovery, decisiones PO y MVP scope** | [Doc 3](../../docs/3-MVP-Scope-Definition.md) · [Product Backlog](4-Product-Backlog-Prioritized.md) | Discovery |
| E-10 | **URL pública Demo** (frontend + backend) | [docs/21 §25.1](../../docs/21-Deployment-and-DevOps-Design.md) — **placeholder** hasta el deploy (ver §6, gap G-1) | Operación de demo |
| E-11 | **Screenshots representativos** | **Pendiente** (ver §6, gap G-2) | Operación de demo |

---

## 4. Mapeo a la rúbrica AI4Devs (criterios académicos)

La rúbrica AI4Devs se materializa en los **9 criterios académicos** de
[Doc 3 §14.2](../../docs/3-MVP-Scope-Definition.md). Cada criterio se asocia a su evidencia (o se
marca como gap explícito — VR-01).

| # | Criterio académico (§14.2) | Evidencia | Estado |
|---|---|---|---|
| C-1 | Discovery, decisiones PO y MVP scope documentados | E-9 · [Doc 3](../../docs/3-MVP-Scope-Definition.md) · [Product Backlog](4-Product-Backlog-Prioritized.md) | ✅ Cubierto |
| C-2 | User stories trazables para cada feature Must Have | E-2 · [Traceability Matrix](User-Stories-Traceability-Matrix.md) · [Coverage Matrix](2-User-Stories-Coverage-Matrix.md) | ✅ Cubierto |
| C-3 | Modelo de datos documentado | [schema.prisma](../../backend/prisma/schema.prisma) · [docs/6](../../docs/6-Domain-Data-Model.md) | ✅ Cubierto |
| C-4 | Contrato de API documentado | [docs/16](../../docs/16-API-Design-Specification.md) · OpenAPI ([backend/openapi.json](../../backend/openapi.json)) | ✅ Cubierto |
| C-5 | ADRs que evidencien criterio humano | E-1 · [ADR-Index.md](ADR-Index.md) (48 aceptados) | ✅ Cubierto |
| C-6 | Evidencia de prompts versionados | E-3 · [AI-Prompt-Evidence-Catalog.md](AI-Prompt-Evidence-Catalog.md) (7 features) | ✅ Cubierto |
| C-7 | Cobertura de pruebas en lógica crítica (≥50%) | E-5 · [backend/vitest.config.ts](../../backend/vitest.config.ts) (gate ≥55%) | ✅ Cubierto |
| C-8 | Deploy funcional accesible para evaluación | E-6 + E-10 · [docs/21](../../docs/21-Deployment-and-DevOps-Design.md) — **URL concreta pendiente** (G-1) | ⚠️ Parcial (gap G-1) |
| C-9 | Documentación de IA usada en cada fase del proyecto | E-3 + E-4 · [docs/17](../../docs/17-AI-Architecture-and-PromptOps-Design.md) · prompts del repo (`prompts/`) | ✅ Cubierto |

### Criterios de demo (§14.4)

| Criterio de demo | Evidencia | Estado |
|---|---|---|
| Demo guiada 10–15 min, 5 flujos | [Demo-Script.md](Demo-Script.md) | ✅ Cubierto |
| Seed con eventos `draft`/`active`/`completed` | [US-145-demo-readiness-mapping.md](US-145-demo-readiness-mapping.md) | ✅ Cubierto |
| ≥1 `BookingIntent.confirmed_intent` visible | [US-145-demo-readiness-mapping.md](US-145-demo-readiness-mapping.md) (guardia verificada) | ✅ Cubierto |
| ≥1 reseña visible | [US-145-demo-readiness-mapping.md](US-145-demo-readiness-mapping.md) | ✅ Cubierto |
| Métricas de admin visibles | [Demo-Script.md](Demo-Script.md) (flujo admin) | ✅ Cubierto |
| IA con OpenAI y Mock (toggle) | [AI-Provider-Toggle-Runbook.md](AI-Provider-Toggle-Runbook.md) | ✅ Cubierto |

---

## 5. Métricas académicas recomendadas (Doc 3 §15)

| Prioridad | Métrica (§15) | Evidencia | Estado |
|---:|---|---|---|
| 1 | Flujo E2E del organizador completado | [Demo-Script.md](Demo-Script.md) · [Demo-URL-Smoke-Runbook.md](Demo-URL-Smoke-Runbook.md) (login→eventos→IA→comparador) | ✅ |
| 2 | Generación de plan IA funcional | AI-001 en [AI-Prompt-Evidence-Catalog.md](AI-Prompt-Evidence-Catalog.md) | ✅ |
| 3 | Generación de checklist IA funcional | AI-002 en [AI-Prompt-Evidence-Catalog.md](AI-Prompt-Evidence-Catalog.md) | ✅ |
| 4 | Flujo de cotización organizador ↔ proveedor | AI-005/AI-006 en [catálogo](AI-Prompt-Evidence-Catalog.md); EPIC-QR/CMP | ✅ |
| 5 | Panel proveedor funcional | EPIC-VND-001 ([Epic Map](1-EventFlow-Epic-Map.md)) | ✅ |
| 6 | Admin funcional (categorías, proveedores, reseñas) | EPIC-ADM-001 · [Demo-Script.md](Demo-Script.md) | ✅ |
| 7 | Seed reproducible | `npm run seed` (idempotente) · [US-145 mapping](US-145-demo-readiness-mapping.md) | ✅ |
| 8 | Tests en lógica crítica | [backend/vitest.config.ts](../../backend/vitest.config.ts) (gate) | ✅ |
| 9 | Deploy funcional | [docs/21](../../docs/21-Deployment-and-DevOps-Design.md) + [infra/](../../infra/) — URL concreta pendiente (G-1) | ⚠️ Parcial |
| 10 | Documentación trazable de IA + decisiones humanas | [ADR-Index.md](ADR-Index.md) + [AI-Prompt-Evidence-Catalog.md](AI-Prompt-Evidence-Catalog.md) + [docs/17](../../docs/17-AI-Architecture-and-PromptOps-Design.md) | ✅ |

**Métricas complementarias:** features IA ≥5 → **7** ([catálogo](AI-Prompt-Evidence-Catalog.md));
prompts documentados ≥1/feature → **7/7**; ADRs ≥5 → **48** ([ADR-Index](ADR-Index.md)); outputs IA
editables → 100% (HITL, [docs/17](../../docs/17-AI-Architecture-and-PromptOps-Design.md)); fallbacks
`MockAIProvider` demostrables → sí ([AI-Provider-Toggle-Runbook](AI-Provider-Toggle-Runbook.md)).

---

## 6. Gaps de evidencia (pendientes accionables — EC-01)

> Se listan **sin fabricar** evidencia. Son evidencia **operativa** (no de código de US-150),
> resolubles por la operación de demo/despliegue antes de la evaluación.

| Gap | Descripción | Acción correctiva | Responsable |
|---|---|---|---|
| **G-1** | **URL Demo concreta** no fijada — [docs/21 §25.1](../../docs/21-Deployment-and-DevOps-Design.md) la deja como "URL provista por Amplify/App Runner" | Tras el deploy, registrar las URLs públicas (frontend + backend) en docs/21 §25.1 y actualizar E-10/C-8/#9 | DevOps / PO |
| **G-2** | **Screenshots representativos** no versionados (no existe carpeta de capturas) | Capturar los 5 flujos de la demo y versionarlos (p. ej. `docs/screenshots/`), enlazándolos en E-11 | Operación de demo |

Ambos gaps están **marcados explícitamente** en las secciones correspondientes (C-8, #9, E-10,
E-11); ningún criterio queda sin evidencia **ni** sin gap explícito (VR-01).

---

## 7. Estado de entrega y congelación de evidencia

- **Estado:** ✅ **Entregable final — listo para evaluación**, con 2 gaps operativos abiertos (§6)
  que no afectan la trazabilidad documental.
- **Validación ejecutada (US-150):** revisión documental DV-01..04, **link check** de enlaces
  relativos (0 rotos) y **revisión de sanitización** (sin secretos/PII) — ver el
  [execution record](../workflows/development-execution/P3/PB-P3-011/US-150-execution.md).
- **Congelación de evidencia:** este reporte consolida el estado al **2026-07-29**. La evidencia
  hermana (US-147/148/149) es un **catálogo vivo**; ante cambios, regenerar los artefactos fuente
  (sus scripts) y revisar los enlaces de este índice. El reporte es **índice, no copia**.
- **Cierre:** entregable de cierre del proyecto académico (PB-P3-011, EPIC-ACAD-001), complementa el
  guion de demo (US-142) y el checklist pre-demo (US-143).
