# Technical Specification — US-142: Preparar guion de demo guiada (10–15 min)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-142 |
| Source User Story | `management/user-stories/US-142-prepare-demo-guion.md` |
| Decision Resolution Artifact | No aplica — no existe artefacto de decision-resolution para US-142 |
| Priority | P3 |
| Backlog ID | PB-P3-003 |
| Backlog Title | Guion de demo guiada 10–15 min (Guion narrativo de demo cubriendo 5 flujos clave) |
| Backlog Execution Order | P3 #3 (tercer ítem P3, tras PB-P3-001 y PB-P3-002) |
| User Story Position in Backlog Item | 1 de 1 (única US del ítem) |
| Related User Stories in Backlog Item | US-142 |
| Epic | EPIC-DEMO-001 — Demo Readiness |
| Backlog Item Dependencies | PB-P0-014 (Seed Script Idempotente + Datos Demo) |
| Feature | Guion narrativo de demo guiada |
| Module / Domain | Demo / Documentación |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-07 |
| Last Updated | 2026-07-07 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P3-003 pertenece al Epic EPIC-DEMO-001 (Demo Readiness), prioridad P3, MoSCoW **Must Have**. Su objetivo es producir un documento con el guion paso a paso para una demo guiada de 10–15 minutos que cubra los **5 flujos clave** de EventFlow: organizador, vendor, admin, IA y cotización. El entregable canónico es el archivo `/management/artifacts/Demo-Script.md`, con usuarios demo, evento demo y una secuencia precisa. Dependencia única: **PB-P0-014** (seed idempotente que provee las personas, eventos, cotizaciones, booking intent y reseña sobre los que el guion opera). Trazabilidad: Doc 3 §14.4.

### Execution Order Rationale

El orden de ejecución no proviene del ID de la User Story sino de la posición del ítem en `management/artifacts/4-Product-Backlog-Prioritized.md`. Dentro de la prioridad P3, los ítems aparecen ordenados PB-P3-001, PB-P3-002, **PB-P3-003**, PB-P3-004… Por lo tanto PB-P3-003 es el **tercer** ítem P3. El orden se deriva contando la posición ordinal del ítem dentro de la lista secuencial de ítems P3 del backlog priorizado (líneas 2157 → PB-P3-001, 2178 → PB-P3-002, 2199 → PB-P3-003). Funcionalmente el guion consume el seed (PB-P0-014, ya en P0), por lo que su dependencia dura está satisfecha mucho antes de P3; el resto de ítems P3 de demo (checklist pre-demo PB-P3-004, toggle Mock/OpenAI PB-P3-005, smoke test PB-P3-007) se apoyan o complementan este guion.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-142 | Redacción del guion narrativo de la demo guiada (único entregable del ítem) | 1 |

---

## 3. Executive Technical Summary

Esta especificación describe el **diseño de un documento**, no de software ejecutable. El entregable es el archivo markdown `/management/artifacts/Demo-Script.md`, versionado en el repositorio, que contiene el guion narrativo paso a paso de la demo guiada de 10–15 minutos de EventFlow.

El "diseño técnico" aquí equivale a la **especificación de la estructura del documento**: sus secciones obligatorias (pre-flight, los 5 flujos con timing por flujo que sumen 10–15 min, contingencia y bitácora de ensayo), el mapeo explícito de cada flujo a IDs seed concretos (SEED-USER-001/002/003, SEED-EVENT-001, SEED-QUOTE-001, SEED-BOOKING-001, SEED-REVIEW-001), el presupuesto de tiempo por flujo, la contingencia (fallback a `MockAIProvider` determinista) y el formato de evidencia del ensayo (dry-run).

No hay Frontend, Backend, Base de Datos, API ni invocación de IA que diseñar. El documento **referencia** (solo lectura conceptual) datos seed y pantallas del producto existente, sin crear ni modificar producto. La validación de esta historia es **documental** (DV-01..04) más un **ensayo cronometrado** (DR-01/02), no pruebas de software automatizadas.

El propósito de negocio es garantizar que la evaluación académica del MVP (Trabajo Final de Máster) sea **consistente, repetible y determinista**, cubriendo los 5 flujos clave sin improvisación (Doc 3 §14.4, NFR-DEMO-006).

---

## 4. Scope Boundary

### In Scope

- Especificación de la estructura y contenido requerido del documento `/management/artifacts/Demo-Script.md`.
- Definición de los **5 flujos clave** (organizador, vendor, admin, IA, cotización) que el guion debe cubrir paso a paso, en secuencia precisa.
- Presupuesto de tiempo (timing) por flujo, sumando la ventana de 10–15 minutos (NFR-DEMO-006).
- Mapeo explícito de cada flujo a personas/datos seed concretos (IDs SEED-*).
- Sección de pre-flight (verificación/carga del seed antes de iniciar).
- Sección de contingencia (fallback / orden alternativo; toggle `MockAIProvider` determinista).
- Formato de bitácora de ensayo (dry-run): fecha, duración total, duración por flujo, resultado.
- Validación documental (DV-01..04) y ejecución del ensayo (DR-01/02) como criterio de "prueba".

### Out of Scope

- Redactar el contenido narrativo definitivo de `Demo-Script.md` (eso ocurre en implementación / task breakdown, no en esta spec).
- Crear o modificar el endpoint de reset del seed (PB-P3-001 / US-140 / PB-P0-014).
- Automatizar la demo end-to-end en código (E2E Playwright → US-128 / PB-P2-016).
- Definir el seed o reabrir decisiones de seed (propiedad de PB-P0-014).
- Cualquier cambio en Frontend, Backend, Base de Datos, API o capa de IA.

### Explicit Non-Goals

- No es video, grabación ni material de marketing.
- No introduce features nuevas ni modifica el producto.
- No introduce pagos reales, contratos firmados, WhatsApp/chat/push, RAG/vector DB ni multi-tenant enterprise.
- No introduce reglas de negocio, endpoints ni autorización runtime.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica — el entregable es documentación (markdown). No hay servicio, controlador ni caso de uso runtime.

### Frontend Architecture

No aplica — no hay pantalla, ruta ni componente. El guion **referencia** pantallas/rutas existentes como narrativa, sin definir ni modificar UI.

### Database Architecture

No aplica — sin esquema, migración ni tabla. Solo referencia conceptual (lectura) a datos seed ya existentes.

### API Architecture

No aplica — el guion no consume ni expone endpoints.

### AI / PromptOps Architecture

No aplica como invocación. El guion **describe** cómo demostrar los features IA existentes (AI-001..006) con `OpenAIProvider` y el toggle a `MockAIProvider` determinista (NFR-AI-008), pero no ejecuta ni modifica IA.

### Security Architecture

No aplica — sin endpoints ni autorización runtime, sin secretos, sin datos productivos. Solo referencia datos seed ficticios (`*@eventflow.demo`).

### Testing Architecture

Aplica en su forma **documental**: validación de contenido del documento (DV-01..04) más un ensayo cronometrado (dry-run DR-01/02). No hay pruebas de software automatizadas (Vitest/Supertest/Playwright) en esta historia.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Guion documentado y versionado en el repo | El documento debe existir en la ruta canónica `/management/artifacts/Demo-Script.md`, en markdown, comiteado al repositorio. Es la unidad de entrega verificable (VR-01, DV-01). | Documentación |
| AC-02: Cobertura de los 5 flujos clave | El documento debe contener cinco secciones de flujo (organizador, vendor, admin, IA, cotización) paso a paso, en secuencia precisa, alineadas a SEED-DEMO-001..005 y a Doc 3 §14.4 (VR-02, DV-02). | Documentación |
| AC-03: Ventana 10–15 min con timings por flujo | Cada flujo lleva un timing explícito; la suma de timings debe encajar en 10–15 min (NFR-DEMO-006). Se especifica un presupuesto de tiempo por flujo (VR-03). | Documentación |
| AC-04: Mapeo explícito a usuarios/eventos del seed | Cada paso referencia IDs seed concretos: `admin@eventflow.demo` (SEED-USER-001), `organizer01@eventflow.demo` (SEED-USER-002), `vendor01@eventflow.demo` (SEED-USER-003), evento `active` (SEED-EVENT-001), Quotes `responded` (SEED-QUOTE-001), `BookingIntent.confirmed_intent` (SEED-BOOKING-001), reseña (SEED-REVIEW-001), más la indicación del toggle `OpenAIProvider` / `MockAIProvider` (VR-04, DV-03). | Documentación (referencia a datos seed) |
| AC-05: Ensayo (dry-run) registrado | Tras ejecutar el guion end-to-end contra el seed cargado y cronometrar, la evidencia (fecha, duración total, duración por flujo, resultado) queda registrada en el documento o en un apartado de bitácora (DR-01/02). | Documentación / Validación |

---

## 7. Backend Technical Design

No aplica — esta historia no crea ni modifica ningún módulo, caso de uso, controlador, ruta, DTO, repositorio, validación, manejo de errores, transacción ni observabilidad de backend. El entregable es un archivo markdown de documentación.

---

## 8. Frontend Technical Design

No aplica — esta historia no crea ni modifica rutas, páginas, componentes, formularios, estado, data fetching, estados de carga/error, accesibilidad ni i18n de frontend. El guion **menciona** pantallas del producto existente como parte de la narrativa, sin implementarlas.

---

## 9. API Contract Design

No aplica — el guion no consume ni expone endpoints. No hay contrato de API que diseñar.

---

## 10. Database / Prisma Design

No aplica — sin modelos impactados, campos, relaciones, índices, constraints ni migraciones. El guion solo referencia (lectura conceptual) datos seed ya existentes; la creación/propiedad de esos datos pertenece a PB-P0-014, que no se reabre aquí.

---

## 11. AI / PromptOps Design

No aplica como diseño ejecutable. El guion **describe** cómo demostrar los features IA existentes (generación de plan/checklist AI-001..004 y comparación de cotizaciones AI-005/006) usando `OpenAIProvider` y, como contingencia determinista, el toggle a `MockAIProvider` (NFR-AI-008). No se define ni versiona ningún prompt, esquema de entrada/salida, human-in-the-loop ni persistencia de `AIRecommendation` en esta historia.

---

## 12. Security & Authorization Design

No aplica — sin autenticación, autorización, ownership, roles runtime, escenarios negativos, auditoría ni manejo de datos sensibles. La demo se ejecuta con cuentas seed ficticias (`*@eventflow.demo`) y no accede a datos productivos ni secretos. El guion no introduce superficie de seguridad.

---

## 13. Testing Strategy

La "prueba" de esta historia es **validación documental** más un **ensayo (dry-run)**, no pruebas de software automatizadas.

### Unit Tests

No aplica.

### Integration Tests

No aplica.

### API Tests

No aplica.

### E2E Tests

No aplica — la automatización E2E es US-128 / PB-P2-016, explícitamente fuera de alcance.

### Security Tests

No aplica.

### Accessibility Tests

No aplica — entregable de documentación sin UI propia.

### AI Tests

No aplica — la historia no invoca IA.

### Seed / Demo Tests (Validación Documental + Ensayo)

Validación documental (revisión de contenido del documento):

| ID | Scenario | Type |
|---|---|---|
| DV-01 | El documento existe en `/management/artifacts/Demo-Script.md` | Doc review |
| DV-02 | Los 5 flujos están presentes, en secuencia y con timing por flujo | Doc review |
| DV-03 | Cada flujo mapea a personas/eventos seed concretos (IDs SEED-*) | Doc review |
| DV-04 | Existe sección de contingencia (qué hacer si un flujo falla) | Doc review |

Ensayo (dry-run):

| ID | Scenario | Expected Result |
|---|---|---|
| DR-01 | Ejecutar el guion end-to-end sobre el seed cargado y cronometrar | Recorrido completo en 10–15 min; evidencia registrada en la bitácora |
| DR-02 | Ejecutar el fallback de contingencia (toggle `MockAIProvider`) ante fallo del flujo IA | La demo continúa sin bloqueo; queda documentado en la bitácora |

### CI Checks

Opcional / no bloqueante: se puede añadir un check de existencia del archivo en la ruta canónica (VR-01) como validación ligera en CI, pero no es requisito de esta historia.

---

## 14. Observability & Audit

No aplica — no hay ejecución runtime que registrar, correlacionar, auditar (`AdminAction`) ni instrumentar con métricas. La única "evidencia" es la bitácora manual de ensayo dentro del propio documento.

---

## 15. Seed / Demo Data Impact

Esta es la sección **núcleo** de la historia: el guion mapea cada flujo a datos seed concretos ya provistos por PB-P0-014. No crea ni modifica seed; lo consume en solo lectura.

### Seed Data Required (referencia, propiedad de PB-P0-014)

| Seed ID | Rol en el guion | Referencia |
|---|---|---|
| SEED-USER-001 | Cuenta admin / Product Owner: `admin@eventflow.demo` | Doc 11 §12 (línea 277/303) |
| SEED-USER-002 | Organizador demo: `organizer01@eventflow.demo` | Doc 11 §12 (línea 330/357) |
| SEED-USER-003 | Proveedor/vendor demo: `vendor01@eventflow.demo` | Doc 11 §12 (línea 384/413) |
| SEED-EVENT-001 | Evento en estado `active` (más estados `draft`/`completed` visibles) | Doc 11 §775 |
| SEED-QUOTE-001 | QuoteRequests y Quotes en estado `responded` | Doc 11 §983 |
| SEED-BOOKING-001 | `BookingIntent.confirmed_intent` visible | Doc 11 §1059 |
| SEED-REVIEW-001 | Reseña visible + caso a moderar (flujo admin) | Doc 11 §1129 |

### Demo Scenario Supported

Los 5 flujos del guion mapean 1:1 a los escenarios `SEED-DEMO-001..005` (Doc 11 §27):

| Flujo del guion | Escenario seed | Soporte requerido | Salida esperada |
|---|---|---|---|
| Organizador (crea evento con IA) | SEED-DEMO-001 | SEED-USER-002, SEED-EVENTTYPE-001, SEED-CATEGORY-001, SEED-AI-001 (AI-001..004), SEED-AI-002 | Evento `draft → active` con plan IA aceptado, checklist confirmado, presupuesto sugerido |
| Cotización (solicitar/comparar/aceptar) | SEED-DEMO-002 | SEED-EVENT-001 (`active`), SEED-VENDOR-001/002 (aprobados), SEED-QUOTE-001 (`responded`), SEED-AI-001 (AI-005/006), SEED-BOOKING-001 (`confirmed_intent`) | Comparación lado a lado, marca preferida, BookingIntent confirmado |
| Proveedor/vendor (responde cotización) | SEED-DEMO-003 | SEED-USER-003, SEED-VENDOR-001 (`approved`), SEED-QUOTE-001 (QuoteRequest `sent`/`viewed`), SEED-NOTIF-001 | Vendor recibe notificación in-app, abre QuoteRequest y envía Quote |
| Admin (gobierna la plataforma) | SEED-DEMO-004 | SEED-USER-001, SEED-VENDOR-001 (`pending`/`rejected`), SEED-REVIEW-001 (con caso a moderar), SEED-EVENTTYPE-001, SEED-CATEGORY-001, SEED-ADMIN-001 | Aprobación de vendor, moderación de reseña, gestión de catálogo, consulta de bitácora |
| IA (multi-idioma / demostración determinista) | SEED-DEMO-005 | SEED-I18N-001/002, SEED-EVENT-001 (GTQ/USD/EUR; es-LATAM/es-ES/pt/en), SEED-AI-001 (respuestas IA por idioma) | UI cambia de idioma; eventos muestran moneda configurada; IA responde en el idioma del evento |

> Nota: SEED-DEMO-001..005 son agrupaciones de los seed IDs anteriores, no entidades nuevas (Doc 11 §26, línea 1758). El flujo "IA" puede demostrarse tanto dentro del flujo organizador (plan/checklist) como en el escenario multi-idioma; el guion define la secuencia narrativa óptima.

### Reset / Isolation Notes

- Pre-flight obligatorio: verificar/cargar el seed reproducible (`seed:demo`, PB-P0-014) antes de iniciar el recorrido (EC-02).
- Determinismo: para reproducibilidad ante fallo del provider real, el guion indica activar `MockAIProvider` vía toggle `LLM_PROVIDER` / `AI_DEMO_MODE` (NFR-AI-008), sin alterar el seed.
- La propiedad del reset del entorno demo es de PB-P3-001 / PB-P0-014; el guion solo lo **referencia** como paso previo.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Backlog PB-P3-003 vs. encuadre original de US-142 | La historia fue originalmente concebida como stub de código; el backlog autoritativo la define como entregable de documentación P3 | Reencuadre a **historia de documentación/demo** y prioridad corregida a **Must Have (P3)**, ya aplicado en la User Story (sección Notes) y reflejado en esta spec | Ninguna acción adicional; la alineación ya está aplicada y es consistente con Doc 3 §14.4 y NFR-DEMO-006 | No (no bloqueante) |

No hay conflictos adicionales. La alineación de prioridad/reencuadre ya está resuelta en la User Story aprobada; se documenta aquí por trazabilidad, no como bloqueo.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| El seed no está cargado o está desactualizado al ejecutar el ensayo | El recorrido falla o muestra datos vacíos (RISK-SEED-001) | Paso de pre-flight que verifica/recarga `seed:demo` (EC-02, DR-01) antes de iniciar |
| El provider IA real (`OpenAIProvider`) falla o excede timeout en vivo | El flujo IA bloquea la demo | Contingencia documentada: toggle a `MockAIProvider` determinista (EC-01, DR-02, NFR-AI-008) |
| La suma de timings excede la ventana de 10–15 min | Demo fuera de rango (VR-03) | Presupuesto de tiempo por flujo definido y validado en el ensayo cronometrado (AC-03, DR-01) |
| El guion referencia datos genéricos en vez de IDs seed | Guion no trazable ni reproducible (VR-04) | Mapeo obligatorio a IDs SEED-* verificados en §15 (DV-03) |
| Deriva entre el seed vigente y el guion | El guion queda obsoleto si el seed cambia | Regla: si el seed cambia, el guion se actualiza (Scope Notes de la US); mantener el guion alineado a Doc 11 |
| Scope creep hacia automatización E2E o video | Desvío del entregable documental | Out of Scope explícito: E2E es US-128/PB-P2-016; sin video/marketing |

---

## 18. Implementation Guidance for Coding Agents

Esta historia produce **documentación**, no código. La guía describe la estructura recomendada del documento a redactar en implementación.

### Archivos o carpetas probablemente impactados

- Crear: `/management/artifacts/Demo-Script.md` (única unidad de entrega).
- Referenciar (solo lectura, no modificar): `docs/11-Data-Seed-Strategy.md` (§12, §27), `docs/3-MVP-Scope-Definition.md` §14.4, `docs/8-Use-Cases-Specification.md` (UC-DEMO-001), `docs/10-Non-Functional-Requirements.md` (NFR-DEMO-006, NFR-AI-008, NFR-PERF-005).

### Estructura recomendada de `Demo-Script.md`

1. **Encabezado / metadata**: título, versión, dependencia (PB-P0-014), ventana objetivo 10–15 min, referencia a Doc 3 §14.4 y NFR-DEMO-006.
2. **Pre-flight (0 min, previo)**: verificar/cargar `seed:demo`; confirmar cuentas seed (`admin@`, `organizer01@`, `vendor01@`); confirmar toggle `LLM_PROVIDER` y disponibilidad de `MockAIProvider`.
3. **Flujo 1 — Organizador** (SEED-DEMO-001, SEED-USER-002): crear evento con plan IA; timing asignado.
4. **Flujo 2 — Cotización** (SEED-DEMO-002, SEED-EVENT-001, SEED-QUOTE-001, SEED-BOOKING-001): solicitar/comparar/aceptar cotización → BookingIntent confirmado; timing asignado.
5. **Flujo 3 — Proveedor/vendor** (SEED-DEMO-003, SEED-USER-003): responder una cotización; timing asignado.
6. **Flujo 4 — Admin** (SEED-DEMO-004, SEED-USER-001, SEED-REVIEW-001): aprobar vendor, moderar reseña, ver métricas/bitácora; timing asignado.
7. **Flujo 5 — IA** (SEED-DEMO-005 / demostración determinista): toggle `OpenAIProvider` ↔ `MockAIProvider`, human-in-the-loop, multi-idioma; timing asignado.
8. **Presupuesto de tiempo**: tabla con timing por flujo cuya suma cae en 10–15 min.
9. **Contingencia**: orden alternativo de flujos; fallback a `MockAIProvider`; recarga de seed antes de reintentar.
10. **Bitácora de ensayo (dry-run)**: tabla con fecha, duración total, duración por flujo, resultado (DR-01/02).

> El orden narrativo óptimo (p. ej. Organizador → Cotización → Proveedor → Admin → IA) puede ajustarse en la redacción; lo obligatorio es que los 5 flujos estén presentes, con timing, mapeados a seed, y que la suma encaje en 10–15 min.

### Decisiones que no deben reabrirse

- El contenido y propiedad del seed (PB-P0-014) — solo se referencia.
- Los IDs seed listados en §15 son reales y verificados; usarlos tal cual.
- El reencuadre a documentación P3 y la prioridad Must Have ya están cerrados.

### Qué NO implementar

- Nada de automatización E2E (Playwright) — es US-128 / PB-P2-016.
- Nada de video, grabación ni marketing.
- Ningún cambio de producto, endpoint, esquema o IA.

### Assumptions to preserve

- La IA se demuestra con `OpenAIProvider` y con `MockAIProvider` (toggle), siendo el mock determinista (NFR-AI-008).
- El guion permanece alineado al seed vigente; si el seed cambia, se actualiza el guion.

---

## 19. Task Generation Notes

Todas las tareas de esta historia son de **documentación**. No hay tareas de Frontend/Backend/DB/AI/DevOps.

### Suggested task groups (documentación)

- **DOC-1**: Redactar el guion narrativo de los 5 flujos en `/management/artifacts/Demo-Script.md` (estructura de §18).
- **DOC-2**: Asignar timing por flujo y validar que la suma encaje en 10–15 min (AC-03, VR-03).
- **DOC-3**: Mapear cada flujo a personas/eventos seed concretos (IDs SEED-*, §15) (AC-04, VR-04).
- **DOC-4**: Redactar el pre-flight (verificación/carga de seed) y la sección de contingencia (fallback a `MockAIProvider`, orden alternativo) (EC-01/EC-02, AC-05 parcial).
- **DOC-5**: Ejecutar el ensayo end-to-end (dry-run), cronometrar y registrar la evidencia en la bitácora (AC-05, DR-01/02).

### Required QA tasks

- Validación documental DV-01..04 (revisión de contenido: existencia, 5 flujos con timing, mapeo a seed, contingencia).
- Ejecución del ensayo cronometrado (DR-01) y del fallback de contingencia (DR-02).

### Required security tasks

- Ninguna — no aplica (sin superficie de seguridad).

### Required seed/demo tasks

- Ninguna de creación de seed (propiedad de PB-P0-014). Solo verificación de que los IDs SEED-* referenciados existen y son coherentes al momento del ensayo.

### Required documentation tasks

- Son la totalidad de la historia (DOC-1..DOC-5 arriba).

### Dependencies between tasks

- DOC-2, DOC-3 y DOC-4 dependen del esqueleto de DOC-1.
- DOC-5 (ensayo) depende de DOC-1..DOC-4 completos y del seed cargado (PB-P0-014).

### Consolidated tasks.md

Dado que PB-P3-003 tiene una sola User Story (US-142), el `tasks.md` del ítem de backlog puede consolidarse directamente desde esta historia sin necesidad de fusionar múltiples US.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved, 2026-07-07) |
| Product Backlog mapping found | Pass (PB-P3-003) |
| Decision Resolution reviewed if present | N/A (no existe artefacto) |
| Scope clear | Pass |
| Architecture alignment clear | Pass (mayoría No aplica, justificado) |
| API impact clear | N/A |
| DB impact clear | N/A (solo referencia a seed) |
| AI impact clear | N/A (solo se documenta cómo demostrar IA existente) |
| Security impact clear | N/A |
| Testing strategy clear | Pass (validación documental DV-01..04 + dry-run DR-01/02) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

La User Story está aprobada, mapeada a PB-P3-003 (P3 #3) con dependencia satisfecha (PB-P0-014), y su naturaleza documental está claramente acotada. Los 5 flujos, el presupuesto de tiempo 10–15 min, el mapeo a IDs seed verificados, la contingencia (fallback a `MockAIProvider`) y el formato de evidencia de ensayo están especificados sin ambigüedad. No hay bloqueos ni conflictos de documentación (la alineación de prioridad/reencuadre ya está aplicada y es no bloqueante). Puede proceder a `eventflow-user-story-to-development-tasks` para generar las tareas de documentación DOC-1..DOC-5.
