# 🧾 User Story: Preparar guion de demo guiada (10–15 min)

## 🆔 Metadata

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| ID                 | US-142                                         |
| Epic               | EPIC-DEMO-001 — Demo Readiness                 |
| Feature            | Guion narrativo de demo guiada                 |
| Module / Domain    | Demo / Documentación                           |
| User Role          | Product Owner / Presentador de demo            |
| Priority           | Must Have (P3)                                 |
| Status             | Approved                                       |
| Owner              | Product Owner / Business Analyst               |
| Approved By        | PO/BA Review                                   |
| Approval Date      | 2026-07-07                                     |
| Ready for Development Tasks | Yes                                   |
| Sprint / Milestone | MVP                                            |
| Created Date       | 2026-06-09                                     |
| Last Updated       | 2026-07-07                                     |

---

## 🎯 User Story

**As the** Product Owner / presentador de demo  
**I want** un guion narrativo documentado y versionado en el repo para la demo guiada de 10–15 minutos  
**So that** la evaluación académica del MVP sea consistente, repetible y cubra los 5 flujos clave sin improvisación

---

## 🧠 Business Context

### Context Summary
Esta es una historia de **documentación / entregable de demo**, no software ejecutable. El entregable es un documento markdown (`/management/artifacts/Demo-Script.md`) con el guion paso a paso de la demo guiada de 10–15 minutos que cubre los **5 flujos clave** de EventFlow: organizador, proveedor (vendor), admin, IA y cotización. El guion debe apoyarse en los datos seed reproducibles (PB-P0-014) para que cualquier presentador pueda ejecutar el recorrido end-to-end de forma determinista durante la evaluación académica del Trabajo Final de Máster.

### Related Domain Concepts
* Demo guiada (UC-DEMO-001).
* Datos seed demo (`seed:demo`) y personas/eventos seed concretos.
* MockAIProvider determinista (toggle IA para reproducibilidad).
* 5 flujos: organizador, vendor, admin, IA, cotización.

### Assumptions
* El criterio de demo está definido en Doc 3 §14.4 y NFR-DEMO-006 (recorrido 10–15 min cubriendo los 5 flujos).
* Los datos seed demo (personas y eventos) existen y son reproducibles vía el seed idempotente (PB-P0-014).
* La IA se demuestra con `OpenAIProvider` y con `MockAIProvider` (toggle), siendo el mock determinista para reproducibilidad (NFR-AI-008).
* El guion mapea a personas/eventos seed concretos: `admin@eventflow.demo` (SEED-USER-001), `organizer01@eventflow.demo` (SEED-USER-002), `vendor01@eventflow.demo` (SEED-USER-003), evento `active` (SEED-EVENT-001), Quotes `responded` (SEED-QUOTE-001) y `BookingIntent.confirmed_intent` (SEED-BOOKING-001).

### Dependencies
* **PB-P0-014** — Seed Script Idempotente + Datos Demo. El guion depende de datos seed reproducibles (personas, evento demo, cotizaciones, reseña, booking intent) para poder ejecutarse end-to-end de forma determinista.

---

## 🔗 Traceability

| Source                 | Reference                                                      |
| ---------------------- | ------------------------------------------------------------- |
| Backlog Item           | PB-P3-003 — Guion de demo guiada 10–15 min                    |
| FRD Requirement(s)     | Transversal — no implementa un FR directamente; documenta el recorrido de los flujos ya especificados |
| Use Case(s)            | UC-DEMO-001 (ejecutar demo guiada con datos seed)             |
| Business Rule(s)       | No aplica — historia de documentación; no introduce reglas de negocio |
| Permission Rule(s)     | No aplica — no introduce endpoints ni autorización runtime    |
| Data Entity / Entities | Referencia (solo lectura) a personas/eventos seed: SEED-USER-001/002/003, SEED-EVENT-001, SEED-QUOTE-001, SEED-BOOKING-001, SEED-REVIEW-001 |
| API Endpoint(s)        | No aplica — no consume ni expone endpoints                    |
| NFR Reference(s)       | NFR-DEMO-006 (demo 10–15 min, 5 flujos), NFR-AI-008 (IA seed determinista), NFR-PERF-005 (performance demo) |
| Related ADR(s)         | No aplica — el guion no altera decisiones de arquitectura     |
| Related Document(s)    | `/docs/3-MVP-Scope-Definition.md` §14.4, `/docs/8-Use-Cases-Specification.md` (UC-DEMO-001), `/docs/10-Non-Functional-Requirements.md` (NFR-DEMO-006), `/docs/11-Data-Seed-Strategy.md` (§27 SEED-DEMO-001..005, §12 personas seed) |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P3)
* Naturaleza: Entregable de documentación (guion), no software ejecutable.

### Explicitly Out of Scope
* No implementa features nuevas ni modifica producto.
* No crea ni modifica el endpoint de reset del seed (eso es US-140 / US-086 / PB-P0-014).
* No automatiza la demo end-to-end en código (eso sería E2E Playwright — US-128 / PB-P2-016).
* No incluye video, grabación ni material de marketing.
* No introduce pagos reales, contratos firmados, WhatsApp/chat/push, RAG/vector DB ni multi-tenant enterprise.

### Scope Notes
* Respetar guardrails MVP y principio demo-first / seed-first.
* El guion debe permanecer alineado a los datos seed vigentes; si el seed cambia, el guion se actualiza.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Guion documentado y versionado en el repo
**Given** el equipo requiere un recorrido de demo estándar  
**When** se completa esta historia  
**Then** existe el documento `/management/artifacts/Demo-Script.md` versionado en el repositorio, con guion narrativo paso a paso.

### AC-02: Cobertura de los 5 flujos clave
**Given** el guion de demo  
**When** se revisa su contenido  
**Then** cubre paso a paso, en secuencia precisa, los **5 flujos clave**: (1) organizador, (2) proveedor/vendor, (3) admin, (4) IA y (5) cotización, alineados a SEED-DEMO-001..005 y a Doc 3 §14.4.

### AC-03: Ventana de tiempo 10–15 minutos con timings por flujo
**Given** el guion de demo  
**When** se suman los tiempos estimados de cada flujo  
**Then** el recorrido completo encaja en la ventana de **10–15 minutos**, con un timing explícito asignado a cada uno de los 5 flujos (NFR-DEMO-006).

### AC-04: Mapeo explícito a usuarios y eventos del seed
**Given** el guion de demo  
**When** se describe cada flujo  
**Then** cada paso referencia personas y datos seed concretos: cuenta admin `admin@eventflow.demo` (SEED-USER-001), organizador `organizer01@eventflow.demo` (SEED-USER-002), vendor `vendor01@eventflow.demo` (SEED-USER-003), evento `active` (SEED-EVENT-001), Quotes en `responded` (SEED-QUOTE-001) y `BookingIntent.confirmed_intent` (SEED-BOOKING-001), incluyendo la indicación del toggle `OpenAIProvider` / `MockAIProvider`.

### AC-05: Ensayo (dry-run) registrado
**Given** el guion completo y el seed cargado (PB-P0-014)  
**When** se ejecuta el guion end-to-end contra los datos seed y se cronometra  
**Then** queda registrada la evidencia del ensayo (fecha, duración total, duración por flujo y resultado) dentro del documento o en un apartado de bitácora de ensayo, confirmando que el recorrido es reproducible en 10–15 minutos.

---

## ⚠️ Edge Cases

### EC-01: Un flujo falla durante la demo en vivo
**Given** se está ejecutando la demo guiada  
**When** un flujo específico falla o un dato seed no responde como se espera  
**Then** el guion documenta un plan de contingencia (fallback / orden alternativo de flujos) para continuar la demo sin bloquear la evaluación.

#### Handling
* El guion incluye una sección de contingencia: orden alternativo de flujos, activación del toggle `MockAIProvider` determinista si `OpenAIProvider` falla o excede timeout, y recomendación de recargar el seed (`seed:demo`) antes de reintentar.

### EC-02: El seed no está cargado o está desactualizado
**Given** un entorno de demo sin seed cargado o con seed obsoleto  
**When** el presentador inicia el guion  
**Then** el guion indica como paso previo (pre-flight) verificar/cargar el seed reproducible (PB-P0-014) antes de comenzar el recorrido.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                                             |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| VR-01 | El documento existe en la ruta canónica del repo           | Entregable inválido si no está en `/management/artifacts/Demo-Script.md` |
| VR-02 | Los 5 flujos están presentes y con timing                  | Guion incompleto si falta algún flujo o su timing              |
| VR-03 | El total de timings encaja en 10–15 min                    | Fuera de rango → ajustar el guion                              |
| VR-04 | Cada flujo referencia personas/eventos seed concretos      | Guion no trazable si usa datos genéricos en vez de IDs seed    |

---

## 🔐 Authorization & Security Rules

No aplica — esta historia no introduce endpoints ni runtime authorization. Es un entregable de documentación (guion). No maneja secretos, no accede a datos productivos y solo referencia datos seed ficticios (`*@eventflow.demo`).

### Negative Authorization Scenarios
* No aplica.

---

## 🤖 AI Behavior

No aplica — esta historia no invoca IA directamente. El guion únicamente **describe** cómo demostrar el flujo de IA existente (generación de plan/checklist con `OpenAIProvider` y toggle a `MockAIProvider` determinista, human-in-the-loop). No ejecuta ni modifica ninguna capacidad de IA.

### AI Involvement
* AI Feature: None (solo se documenta cómo demostrar AI-001..006 ya existentes)
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable (el guion sí documenta el fallback a `MockAIProvider` como contingencia de demo)

### AI Input / Output / Human-in-the-loop / Fallback
* Not applicable for this story.

---

## 🎨 UX / UI Notes

No aplica — historia de documentación. El entregable es un archivo markdown, sin pantalla, ruta ni componente de UI. El guion sí referencia las pantallas/rutas del producto existente como parte de la narrativa de cada flujo, pero no define ni modifica UI.

| Area                | Notes      |
| ------------------- | ---------- |
| Screen / Route      | No aplica  |
| Accessibility Notes | No aplica  |
| Responsive Notes    | No aplica  |
| i18n Notes          | El guion puede indicar el flujo multi-idioma (SEED-DEMO-005) como parte de la narrativa, sin implementar i18n |
| Currency Notes      | No aplica  |

---

## 🛠 Technical Notes

### Frontend
* No aplica — sin frontend.

### Backend
* No aplica — sin backend, servicio ni endpoint.

### Database
* No aplica — sin cambios de esquema, migración ni tabla. Solo referencia (lectura conceptual) a datos seed existentes.

### API
No aplica — el guion no consume ni expone endpoints.

### Deliverable / Artefacto
* Archivo: `/management/artifacts/Demo-Script.md` (markdown versionado en el repo).
* Estructura sugerida: pre-flight (verificación de seed) → Flujo 1 Organizador → Flujo 2 Cotización → Flujo 3 Proveedor → Flujo 4 Admin → Flujo 5 IA (o el orden narrativo óptimo), con timing por sección, referencias a personas/eventos seed y una sección de contingencia + bitácora de ensayo.

### Observability / Audit
* No aplica — sin ejecución runtime que auditar.

---

## 🧪 Test Scenarios

La "prueba" de esta historia es la validación documental y el ensayo (dry-run), no pruebas de software automatizadas.

### Validación Documental

| ID    | Scenario                                                                 | Type            |
| ----- | ------------------------------------------------------------------------ | --------------- |
| DV-01 | El documento existe en `/management/artifacts/Demo-Script.md`            | Doc review      |
| DV-02 | Los 5 flujos están presentes, en secuencia y con timing por flujo        | Doc review      |
| DV-03 | Cada flujo mapea a personas/eventos seed concretos (IDs SEED-*)          | Doc review      |
| DV-04 | Existe sección de contingencia (qué hacer si un flujo falla)             | Doc review      |

### Ensayo (Dry-run)

| ID    | Scenario                                                                                   | Expected Result                                             |
| ----- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| DR-01 | Ejecutar el guion end-to-end sobre el seed cargado y cronometrar                            | Recorrido completo en 10–15 min; evidencia registrada       |
| DR-02 | Ejecutar el fallback de contingencia (toggle `MockAIProvider`) ante fallo del flujo IA     | Demo continúa sin bloqueo; documentado en la bitácora       |

### AI Tests
No aplica — esta historia no invoca IA.

### Authorization Tests
No aplica — sin endpoints ni autorización.

### Accessibility Tests
No aplica — entregable de documentación sin UI propia.

---

## 📊 Business Impact

| Field               | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness; consistencia y reproducibilidad de la evaluación académica   |
| Expected Impact     | La demo del TFM se ejecuta sin improvisación, cubriendo los 5 flujos en 10–15 min |
| Success Criteria    | Guion en repo + ensayo registrado dentro de la ventana de tiempo             |
| Academic Demo Value | Alto — es el guion mismo de la evaluación académica del MVP                   |

---

## 🧩 Task Breakdown Readiness

### Potential Documentation Tasks
* Redactar el guion narrativo de los 5 flujos en `/management/artifacts/Demo-Script.md`.
* Asignar timing por flujo y validar la suma en 10–15 min.
* Mapear cada flujo a personas/eventos seed concretos (IDs SEED-*).
* Redactar la sección de contingencia (fallback / orden alternativo).
* Ejecutar el ensayo end-to-end y registrar la evidencia (bitácora).

### Potential Frontend / Backend / Database / AI / DevOps Tasks
* No aplica — historia de documentación.

---

## ✅ Definition of Ready

* [x] Rol claro (Product Owner / presentador de demo).
* [x] Goal claro (guion documentado de demo guiada).
* [x] Referencias a Docs (Doc 3 §14.4, Doc 8 UC-DEMO-001, Doc 10 NFR-DEMO-006, Doc 11 §12/§27).
* [x] Seguridad evaluada (No aplica, justificado).
* [x] Datos/entidades referenciadas (personas/eventos seed concretos).
* [x] AC en GWT, específicas y testeables.
* [x] Edge cases documentados (fallo de flujo, seed ausente).
* [x] Validación clara (VR-01..04).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-014).
* [x] Naturaleza del entregable definida (markdown en repo).
* [x] Estrategia de validación/ensayo definida.

---

## 🏁 Definition of Done

* [ ] `/management/artifacts/Demo-Script.md` creado y versionado en el repo.
* [ ] Los 5 flujos cubiertos paso a paso con timing por flujo.
* [ ] Recorrido total dentro de 10–15 min.
* [ ] Mapeo explícito a personas/eventos del seed (IDs SEED-*).
* [ ] Sección de contingencia (fallback) documentada.
* [ ] Ensayo (dry-run) ejecutado y evidencia registrada.

---

## 📝 Notes
* Alineación aplicada: prioridad corregida a **Must Have (P3)** y reencuadre de historia de código a **historia de documentación/demo**, conforme al backlog autoritativo (PB-P3-003) y a Doc 3 §14.4 / NFR-DEMO-006. Estas son alineaciones, no decisiones bloqueantes.
* La creación del archivo `Demo-Script.md` ocurre en implementación, no durante la refinación.
