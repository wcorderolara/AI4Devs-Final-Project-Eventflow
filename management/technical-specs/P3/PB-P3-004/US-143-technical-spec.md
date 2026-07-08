# Technical Specification — US-143: Validar checklist pre-demo

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-143 |
| Source User Story | `management/user-stories/US-143-pre-demo-checklist-validation.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-143-decision-resolution.md` (no existe; no requerido) |
| Priority | P3 |
| Backlog ID | PB-P3-004 |
| Backlog Title | Checklist pre-demo (idioma, moneda, captcha test, seed, toggle) |
| Backlog Execution Order | P3 #4 (cuarto item del bloque P3 por posición: PB-P3-001 #1, PB-P3-002 #2, PB-P3-003 #3, PB-P3-004 #4) |
| User Story Position in Backlog Item | 1 de 1 (única US del backlog item) |
| Related User Stories in Backlog Item | US-143 |
| Epic | EPIC-DEMO-001 — Demo Readiness |
| Backlog Item Dependencies | PB-P3-001 (US-140 reset demo), PB-P3-005 (US-144 toggle Mock/OpenAI) |
| Feature | Checklist pre-demo (idioma, moneda, captcha test, seed, toggle) |
| Module / Domain | Demo / Documentación |
| User Story Status | Approved with Minor Notes (2026-07-07) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-07 |
| Last Updated | 2026-07-07 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P3-004 (Checklist pre-demo) pertenece al bloque **P3 — Demo Polish / Academic Evidence** del backlog priorizado, dentro del Epic **EPIC-DEMO-001 — Demo Readiness**. Su entregable es una **lista verificada** que debe ejecutarse **antes** de la demo guiada (US-142 / PB-P3-003), cubriendo: estado del seed, idioma del usuario, moneda del evento demo, captcha en modo test, smoke tests pasados, métricas admin visibles y toggle Mock/OpenAI.

El backlog item es MoSCoW **Must Have**, con Acceptance Summary: checklist documentado y ejecutable en `<10 min`. Traceability declarada: Doc 21. Depende de:

* **PB-P3-001 (US-140)** — Endpoint/panel admin de reset del entorno Demo. El checklist lo referencia como **acción correctiva** cuando el estado del seed no es reproducible (no lo implementa).
* **PB-P3-005 (US-144)** — Runbook del toggle `LLM_PROVIDER` / `AI_DEMO_MODE`. El checklist **verifica** el estado del toggle y referencia el runbook como acción correctiva (no lo implementa).

Naturaleza del entregable: **documentación / demo**, no software ejecutable. El artefacto es el markdown `/management/artifacts/Pre-Demo-Checklist.md`, versionado en el repositorio. Esta historia no introduce Frontend, Backend, Database, API ni invocación de IA.

### Execution Order Rationale

El orden de ejecución no lo define el ID de la User Story sino la posición dentro del Product Backlog Prioritized (`management/artifacts/4-Product-Backlog-Prioritized.md`, bloque §P3). Por **posición de listado** en dicho bloque, PB-P3-004 es el **cuarto** item: PB-P3-001 (#1), PB-P3-002 (#2), PB-P3-003 (#3), PB-P3-004 (#4). Por lo tanto su orden de ejecución dentro de P3 es **#4**.

Además del orden posicional, este checklist tiene dependencias funcionales duras: consolida y verifica precondiciones producidas por PB-P3-001 (reset), PB-P3-003 (guion de demo) y PB-P3-005 (toggle), y referencia el smoke de PB-P3-007 (US-146). Es coherente redactarlo una vez que esas piezas existen o están especificadas, de modo que las acciones correctivas apunten a procedimientos reales. La dependencia hacia US-140 ya cuenta con technical spec entregada (`management/technical-specs/P3/PB-P3-001/US-140-technical-spec.md`).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-143 | Redactar y validar el checklist pre-demo documental (7 ítems verificables) | 1 (única US del backlog item) |

---

## 3. Executive Technical Summary

El "diseño técnico" de esta historia es la **especificación del documento checklist**, no de software. Se debe producir el entregable markdown `/management/artifacts/Pre-Demo-Checklist.md`, versionado en el repositorio, que verifique de forma objetiva y accionable las precondiciones de la demo guiada del MVP antes de iniciarla.

El checklist se estructura como una **tabla de ítems** con columnas `Ítem | Cómo se verifica | Estado esperado | Acción correctiva | Fuente`, cubriendo los **7 ítems obligatorios**: (a) seed cargado/reproducible, (b) idioma del usuario, (c) moneda del evento demo, (d) captcha en modo test, (e) smoke tests pasados, (f) métricas admin visibles y (g) toggle `LLM_PROVIDER`/`AI_DEMO_MODE` en el estado deseado. Cada ítem indica su método de verificación concreto (variable de entorno, pantalla del producto o comando/registro), su estado esperado y la acción correctiva a ejecutar si falla, más la fuente autoritativa que lo justifica.

El documento incluye además: una **estimación de tiempo total `<10 min`** (con presupuesto por ítem) y una **sección de registro de la corrida** (fecha, responsable, resultado por ítem, estado final "listo para demo"). La validación de esta historia es **documental** (DV-01..05) más una **corrida en seco / dry-run** (DR-01/DR-02), no pruebas de software automatizadas.

Las acciones correctivas remiten a artefactos de otras historias sin reabrirlos ni implementarlos: reset del entorno demo (US-140 / PB-P3-001), toggle `LLM_PROVIDER`/`AI_DEMO_MODE` según runbook (US-144 / PB-P3-005), re-ejecución del smoke (US-146 / PB-P3-007) y re-aplicación de `seed:demo` (PB-P0-014). No hay endpoints, esquema de base de datos, componentes de UI ni invocación de IA que diseñar.

---

## 4. Scope Boundary

### In Scope

* Especificación de la **estructura y contenido requerido** del documento `/management/artifacts/Pre-Demo-Checklist.md`.
* Definición de los **7 ítems obligatorios (a–g)** con su método de verificación, estado esperado, acción correctiva y fuente autoritativa.
* Definición del **presupuesto de tiempo total `<10 min`** y del **registro de corrida** (dry-run log).
* Criterios de **validación documental (DV-01..05)** y de **corrida dry-run (DR-01/DR-02)** que gobiernan la aceptación.
* Trazabilidad de cada ítem a fuentes verificadas (Doc 3 §14.4, Doc 21 §23.2–§23.3 y tabla de env vars, NFR-DEMO-006, NFR-TEST-006, NFR-TEST-004, NFR-I18N-004/006, SEED-DEMO-005, UC-DEMO-001).

### Out of Scope

* **Redacción del contenido final** del `Pre-Demo-Checklist.md` (ocurre en implementación, no en esta spec).
* **Automatización** del checklist en código (lista manual/documentada; cualquier automatización futura se apoyaría en el smoke de US-146 / PB-P3-007 y sería otra historia).
* **Endpoint/panel de reset del entorno demo** → US-140 / PB-P3-001 (se referencia como acción correctiva, no se implementa).
* **Runbook del toggle Mock/OpenAI** → US-144 / PB-P3-005 (se referencia, no se crea).
* **Smoke test** → US-146 / PB-P3-007. **Guion de demo** → US-142 / PB-P3-003.
* **Implementación o configuración del captcha, i18n o lógica de moneda** (solo se verifican estados existentes).

### Explicit Non-Goals

* No introducir pagos reales, contratos firmados, WhatsApp/chat/push, RAG/vector DB, conversión automática de moneda ni multi-tenant enterprise (guardrails MVP).
* No alterar decisiones de arquitectura ni ADRs; el checklist verifica **configuración operacional**, no la modifica.
* No exponer secretos: se referencian variables por nombre, nunca valores de `CAPTCHA_SECRET_KEY` / `OPENAI_API_KEY` (Doc 19).

---

## 5. Architecture Alignment

### Backend Architecture

No aplica — la historia no introduce servicios, use cases ni endpoints. El backend solo se referencia como objeto de verificación (p. ej. lectura de estado de env vars y del seed vía procedimientos ya existentes).

### Frontend Architecture

No aplica — sin rutas, componentes ni UI. El checklist referencia pantallas del producto (login, panel admin, detalle de evento demo) como **puntos de observación**, sin definir ni modificar UI.

### Database Architecture

No aplica — sin cambios de esquema, migración ni tabla. Solo verificación (lectura) del estado del seed existente.

### API Architecture

No aplica — no consume ni expone endpoints. Referencia el endpoint de reset demo (US-140) únicamente como acción correctiva documentada.

### AI / PromptOps Architecture

No aplica — no invoca IA. El checklist únicamente **verifica** que el toggle del proveedor (`LLM_PROVIDER`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`) esté en el estado deseado; no ejecuta ni modifica ninguna capacidad de IA.

### Security Architecture

No aplica como autorización runtime — sin endpoints ni control de acceso. Única consideración de seguridad **documental**: el checklist no debe contener valores de secretos (`CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`), solo nombres de variables (Doc 19).

### Testing Architecture

Aplica en su variante **documental**: validación documental (DV-01..05) y corrida dry-run (DR-01/DR-02). No aplican Vitest/Supertest/Playwright/MSW ni MockAIProvider como suite de software para esta historia. Ver Sección 13.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Checklist documentado y versionado | El entregable es el archivo `/management/artifacts/Pre-Demo-Checklist.md` commiteado en el repo (ruta canónica). Su ausencia invalida la historia (VR-01). | Documentación |
| AC-02 — Cobertura de los 7 ítems (a–g) | El documento contiene los 7 ítems obligatorios: (a) seed, (b) idioma, (c) moneda, (d) captcha test, (e) smoke, (f) métricas admin, (g) toggle Mock/OpenAI. Falta de cualquiera = checklist incompleto (VR-02). | Documentación |
| AC-03 — Criterio de verificación objetivo + estado esperado | Cada ítem indica **cómo se comprueba** (env var, pantalla, comando/registro) y su **estado esperado** (valor/resultado correcto), sin ambigüedad (VR-03). | Documentación |
| AC-04 — Acción correctiva definida | Cada ítem documenta la acción correctiva concreta (reset US-140, toggle según runbook US-144, activar captcha test, ajustar idioma/moneda), remitiendo a artefactos existentes (VR-03). | Documentación |
| AC-05 — Ejecutable en `<10 min` | El documento registra una estimación de tiempo total `<10 min`, con presupuesto por ítem. Fuera de rango → simplificar/priorizar (VR-04). | Documentación |
| AC-06 — Trazabilidad a fuentes autoritativas | Cada ítem cita fuentes reales (Doc 3 §14.4, Doc 21 §23.2–§23.3 y env vars, NFR-DEMO-006, NFR-TEST-006, NFR-I18N-004/006, SEED-DEMO-005) sin inventar IDs (VR-05 documental). | Documentación |

---

## 7. Backend Technical Design

No aplica — historia de documentación/demo, sin backend, servicio ni endpoint que diseñar. El checklist verifica estados operacionales producidos por otras historias; no implementa lógica de servidor.

---

## 8. Frontend Technical Design

No aplica — sin frontend. El entregable es un markdown, sin pantalla, ruta ni componente. Las pantallas del producto (login, panel admin, detalle de evento) son puntos de observación del checklist, no artefactos a construir aquí.

---

## 9. API Contract Design

No aplica — el checklist no consume ni expone endpoints. La única referencia a API es el endpoint de reset demo de US-140 (`POST /api/v1/admin/seed/reset`), citado como acción correctiva y de propiedad de PB-P3-001.

---

## 10. Database / Prisma Design

No aplica — sin modelos, campos, relaciones, índices, constraints ni migraciones. El ítem (a) del checklist verifica (solo lectura) la presencia de datos seed clave; no altera el esquema ni los datos.

---

## 11. AI / PromptOps Design

No aplica — la historia no invoca IA. El ítem (g) del checklist verifica el **estado del toggle** de proveedor (`LLM_PROVIDER`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`) según Doc 21 y el runbook de US-144; no ejecuta prompts, providers ni fallback.

---

## 12. Security & Authorization Design

No aplica como autorización runtime — sin endpoints ni control de acceso en esta historia. Consideración de seguridad **documental** única: el documento debe referenciar variables de entorno por nombre y **nunca** incluir valores de secretos (`CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`); sin secretos en el documento ni en el registro de corrida (Doc 19, VR-05).

---

## 13. Testing Strategy

La "prueba" de esta historia es **validación documental** más una **corrida en seco (dry-run)** del checklist, no pruebas de software automatizadas. No aplican Unit/Integration/API/E2E/Accessibility/AI tests de software para el entregable.

### Validación Documental (Doc review)

| ID | Scenario | Type |
|---|---|---|
| DV-01 | El documento existe en `/management/artifacts/Pre-Demo-Checklist.md` | Doc review |
| DV-02 | Los 7 ítems obligatorios (a–g) están presentes | Doc review |
| DV-03 | Cada ítem tiene criterio de verificación, estado esperado y acción correctiva | Doc review |
| DV-04 | Existe estimación de tiempo total `<10 min` y espacio de registro de corrida | Doc review |
| DV-05 | Los ítems referencian fuentes reales (Doc 3 §14.4, Doc 21, NFR-*, SEED-DEMO-005) sin IDs inventados | Doc review |

### Corrida del Checklist (Dry-run)

| ID | Scenario | Expected Result |
|---|---|---|
| DR-01 | Ejecutar los 7 ítems de forma secuencial sobre el entorno demo y cronometrar | Todos en verde; verificación completa en `<10 min` |
| DR-02 | Forzar el fallo de un ítem (p. ej. toggle en proveedor equivocado) y aplicar la acción correctiva | El ítem pasa a verde tras la corrección documentada en el registro |

### CI Checks

No aplica como pipeline de software. Único control automatizable opcional: verificación de existencia del archivo en la ruta canónica (no requerido por la historia). Las pruebas de IA, autorización y accesibilidad: No aplica.

---

## 14. Observability & Audit

No aplica — sin ejecución runtime que auditar. El único "registro" es la **sección de registro de corrida** dentro del propio documento (fecha, responsable, resultado por ítem), que es documental, no telemetría de sistema.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

El checklist **verifica** (solo lectura, no crea ni modifica) la presencia y reproducibilidad de los datos seed clave del entorno demo, referenciados en la trazabilidad de la US:

* `SEED-USER-001/002/003` — cuentas demo por rol (admin/organizador/vendor) para login.
* `SEED-EVENT-001` — eventos en estados `draft`/`active`/`completed`, con `locale` y `currency` distintos (GTQ/USD/EUR; es-LATAM/es-ES/pt/en) para verificar idioma (b) y moneda (c).
* `SEED-QUOTE-001`, `SEED-BOOKING-001` (≥1 `confirmed_intent`), `SEED-REVIEW-001` (≥1 reseña visible) — soporte de los flujos demostrables.
* `SEED-DEMO-005` — escenario multi-idioma y multi-moneda (NFR-I18N-006), fuente para los ítems (b) y (c).

### Demo Scenario Supported

Soporta **UC-DEMO-001** (ejecutar demo guiada con datos seed) al garantizar, antes de iniciar, que las precondiciones de los 5 flujos (organizador, vendor, admin, IA, cotización) están verificadas: seed cargado, idioma/moneda correctos, captcha en modo test, smoke en verde, métricas admin visibles y toggle IA en estado deseado (Doc 3 §14.4, NFR-DEMO-006).

### Reset / Isolation Notes

Cuando el ítem (a) detecta seed no reproducible, la acción correctiva es re-aplicar `seed:demo` (PB-P0-014, seed idempotente) o ejecutar el **reset del entorno demo** de US-140 / PB-P3-001 (`POST /api/v1/admin/seed/reset` / workflow `seed-reset.yml`, idempotente y auditado, Doc 21 §24). El checklist no implementa el reset; lo invoca como procedimiento existente.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Convención de ruta del entregable | No hay ruta canónica declarada en el backlog (Traceability: Doc 21) | Usar `/management/artifacts/Pre-Demo-Checklist.md`, consistente con `/management/artifacts/Demo-Script.md` de US-142 (PB-P3-003) | Adoptar la ruta como convención determinista de nombres (no es requisito de producto inventado) | No |
| Prioridad y naturaleza de la US | La US original venía como historia de código P-no-P3 | Reencuadrada a **documentación/demo Must Have (P3)** y trazabilidad saneada conforme a PB-P3-004 | Alineación ya aplicada en la US (nota de la historia); mantener coherencia | No |
| Trazabilidad saneada | La US removió IDs inexistentes (NFR-PERF-API-001) y comodines (NFR-TEST-*) | Sustituidos por IDs verificados (NFR-DEMO-006, NFR-TEST-006, NFR-TEST-004, NFR-I18N-004/006, SEED-DEMO-005, UC-DEMO-001) | Mantener solo IDs verificados en el checklist | No |

Notas no bloqueantes: la ruta canónica propuesta y el reencuadre de prioridad/naturaleza ya fueron aplicados a la User Story; se registran aquí por completitud. No hay conflictos con ADRs aceptados ni impedimentos de implementación.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| El checklist se desactualiza si cambian env vars o el seed | Medio — verificaciones obsoletas dan falsa confianza | Vincular cada ítem a su fuente (Doc 21 env vars, SEED-*); actualizar el checklist cuando el seed/config cambien (Scope Notes de la US) |
| Fuga de secretos en el documento o en el registro de corrida | Alto — exposición de `CAPTCHA_SECRET_KEY`/`OPENAI_API_KEY` | Referenciar variables por nombre, nunca valores (VR-05, Doc 19); revisión documental DV en cada corrida |
| Recorrido supera los 10 min | Medio — riesgo de demo apurada | Presupuesto de tiempo por ítem; simplificar/priorizar ítems si excede (VR-04, DR-01) |
| Acción correctiva apunta a un procedimiento aún no entregado | Medio — corrección no ejecutable en la demo | Redactar el checklist una vez que US-140/US-144/US-146 existen o están especificadas; citar el artefacto exacto por ítem |
| Ambigüedad en criterios de verificación | Medio — resultados subjetivos | Exigir método objetivo por ítem (env var/pantalla/comando) y estado esperado explícito (AC-03, DV-03) |

---

## 18. Implementation Guidance for Coding Agents

Esta guía especifica **cómo debe estructurarse el documento checklist**; no se escribe aquí su contenido final ni código de producción.

### Archivos / carpetas impactados

* Crear: `/management/artifacts/Pre-Demo-Checklist.md` (markdown versionado en el repo, ruta canónica).

### Estructura requerida del documento

1. **Encabezado**: propósito, alcance (`<10 min` antes de la demo guiada US-142), y nota de "no exponer secretos".
2. **Tabla de ítems** con columnas exactas: `Ítem | Cómo se verifica | Estado esperado | Acción correctiva | Fuente`. Debe cubrir los **7 ítems (a–g)**:

| # | Ítem | Cómo se verifica (guía) | Estado esperado (guía) | Acción correctiva (guía) | Fuente |
|---|---|---|---|---|---|
| a | Seed cargado/reproducible | Verificar presencia de datos seed clave en el entorno demo (login por rol, ≥1 `confirmed_intent`, ≥1 reseña, eventos en `draft`/`active`/`completed`) | Datos seed presentes y reproducibles (`SEED-USER-001/002/003`, `SEED-EVENT-001`, `SEED-QUOTE-001`, `SEED-BOOKING-001`, `SEED-REVIEW-001`) | Re-aplicar `seed:demo` (PB-P0-014) o ejecutar reset del entorno demo (US-140 / PB-P3-001) y re-verificar | Doc 11 (SEED-*), Doc 3 §14.4 |
| b | Idioma del usuario/evento demo | Observar `locale` del usuario y del evento demo en pantalla | Idioma correcto según escenario (es-LATAM/es-ES/pt/en) | Ajustar idioma del usuario/evento demo antes de iniciar | NFR-I18N-006, SEED-DEMO-005 |
| c | Moneda del evento demo | Observar la moneda mostrada en el detalle/presupuesto del evento demo | Moneda esperada (GTQ/MXN/COP/EUR/USD) sin conversión automática | Seleccionar el evento demo con la moneda correcta (moneda inmutable, no se altera) | NFR-I18N-004, BR-EVENT-007 |
| d | Captcha en modo test | Verificar `CAPTCHA_DISABLED` / test keys (`NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY` en modo test) | Captcha en modo test/stub determinista (login demo no se bloquea) | Activar `CAPTCHA_DISABLED`/test keys para la demo | NFR-TEST-006, Doc 21 (env vars captcha) |
| e | Smoke tests pasados | Ejecutar/consultar el smoke sobre la Demo URL (login, dashboard, crear evento, ver sugerencia IA) | Smoke en verde (`GET /health` 200, flujo smoke pasa) | Revisar logs, corregir causa raíz y re-ejecutar el smoke (US-146 / PB-P3-007) | Doc 21 §23.3, NFR-TEST-004 |
| f | Métricas admin visibles | Abrir el panel admin y confirmar métricas en pantalla | Métricas de admin visibles | Verificar sesión admin y carga del panel; re-cargar seed si faltan datos | Doc 3 §14.4 |
| g | Toggle Mock/OpenAI en estado deseado | Confirmar `LLM_PROVIDER` (`openai`/`mock`), `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK` | Estado deseado (Demo preferido: `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true`; contingencia: `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true`) | Cambiar el toggle según el runbook (US-144 / PB-P3-005) y re-verificar | Doc 21 §23.2 y tabla env vars, runbook US-144 |

3. **Presupuesto de tiempo**: estimación por ítem y total `<10 min`, con criterio "listo para demo" solo cuando todos los ítems obligatorios están en verde.
4. **Registro de corrida (run log)**: tabla con fecha, responsable, resultado por ítem (verde/rojo), acción correctiva aplicada y estado final. Sin valores de secretos.

### Orden de implementación recomendado

1. Crear el archivo con encabezado y tabla de ítems (a–g).
2. Rellenar por ítem: cómo se verifica, estado esperado, acción correctiva y fuente.
3. Añadir presupuesto de tiempo (`<10 min`) y sección de registro de corrida.
4. Ejecutar la corrida dry-run (DR-01/DR-02) y registrar el resultado.

### Decisiones que no deben reabrirse

* Ruta canónica `/management/artifacts/Pre-Demo-Checklist.md` (convención alineada con Demo-Script.md).
* Naturaleza documental/demo y prioridad Must Have (P3).
* Estados deseados del toggle según Doc 21 §23.2 (no redefinir; remitir al runbook US-144).

### Qué no implementar

* No automatizar el checklist en código, no crear endpoints, esquema, UI ni invocación de IA.
* No implementar el reset (US-140), el runbook (US-144), el smoke (US-146) ni el guion (US-142): referenciarlos.

### Supuestos a preservar

* Seed idempotente (PB-P0-014), endpoint/panel de reset (US-140), runbook toggle (US-144) y smoke (US-146) existen o están especificados y son invocables como acciones correctivas.

---

## 19. Task Generation Notes

Guía para la skill de Development Tasks. **Solo tareas de documentación** (la US declara "No aplica" para Frontend/Backend/Database/AI/DevOps).

### Suggested Documentation Tasks

* Crear `/management/artifacts/Pre-Demo-Checklist.md` con encabezado y tabla de ítems (columnas `Ítem | Cómo se verifica | Estado esperado | Acción correctiva | Fuente`).
* Definir, por cada ítem (a–g), su criterio de verificación objetivo, estado esperado y acción correctiva.
* Añadir presupuesto de tiempo total `<10 min` (con desglose por ítem) y la sección de registro de corrida.
* Vincular cada ítem a su fuente autoritativa (Doc 3 §14.4, Doc 21 §23.2–§23.3 y env vars, NFR-DEMO-006, NFR-TEST-006, NFR-I18N-004/006, SEED-DEMO-005) sin inventar IDs.
* Ejecutar la corrida dry-run (DR-01/DR-02) y registrar el resultado por ítem.

### Required QA Tasks

* Validación documental DV-01..05 (existencia, cobertura de 7 ítems, tríada criterio/estado/acción por ítem, presupuesto+registro, fuentes reales).
* Corrida dry-run cronometrada (`<10 min`) y prueba de acción correctiva forzando un fallo.

### Required Security Tasks

* Revisión documental de que no aparecen valores de secretos (solo nombres de variables) — VR-05, Doc 19.

### Required Seed / Demo Tasks

* Verificación (solo lectura) del estado del seed como parte de la corrida dry-run (ítem a); ninguna tarea que modifique seed o esquema.

### Dependencies Between Tasks

* Redacción de ítems → antes del presupuesto/registro → antes de la corrida dry-run.
* Las acciones correctivas dependen (referencia) de US-140/US-144/US-146 ya entregadas o especificadas.

### Consolidated tasks.md

El backlog item PB-P3-004 tiene una única US (US-143); el `tasks.md` consolidado del backlog item puede componerse directamente de las tareas de documentación de esta historia.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P3-004) |
| Decision Resolution reviewed if present | N/A (no existe artefacto) |
| Scope clear | Pass |
| Architecture alignment clear | Pass (documentación; áreas de software = No aplica justificado) |
| API impact clear | N/A (sin API) |
| DB impact clear | N/A (sin cambios de esquema; solo lectura de seed) |
| AI impact clear | N/A (solo verificación de estado del toggle) |
| Security impact clear | Pass (sin autorización runtime; sin secretos en el documento) |
| Testing strategy clear | Pass (DV-01..05 + DR-01/DR-02) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La User Story está aprobada (Approved with Minor Notes), mapeada al backlog (PB-P3-004, P3 #4), con alcance, criterios de aceptación (AC-01..06), reglas de validación (VR-01..05) y estrategia de validación (DV-01..05 + DR-01/DR-02) claros. La naturaleza documental/demo está confirmada: no hay Frontend, Backend, Database, API ni IA que diseñar; las secciones de software se marcan `No aplica` con justificación. El contenido sustantivo (estructura del checklist, 7 ítems con verificación/estado/acción/fuente, presupuesto `<10 min`, registro de corrida) está especificado en las Secciones 3, 4, 6, 13, 15, 18 y 19. Las dependencias (US-140/US-144/US-146/US-142) se referencian sin reabrirse. No hay bloqueadores; las notas de alineación (ruta canónica, reencuadre de prioridad/naturaleza) son no bloqueantes y ya aplicadas. Procede generar Development Tasks con `eventflow-user-story-to-development-tasks`.
