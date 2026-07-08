# 🧾 User Story: Validar checklist pre-demo

## 🆔 Metadata

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| ID                 | US-143                                         |
| Epic               | EPIC-DEMO-001 — Demo Readiness                 |
| Feature            | Checklist pre-demo (idioma, moneda, captcha test, seed, toggle) |
| Module / Domain    | Demo / Documentación                           |
| User Role          | Product Owner / Presentador de demo            |
| Priority           | Must Have (P3)                                 |
| Status             | Approved with Minor Notes                      |
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
**I want** un checklist pre-demo documentado y versionado que verifique idioma, moneda, captcha en modo test, estado del seed, smoke tests, métricas admin y el toggle Mock/OpenAI  
**So that** evitemos sorpresas durante la presentación y la evaluación académica del MVP se ejecute sin incidentes en menos de 10 minutos de verificación

---

## 🧠 Business Context

### Context Summary
Esta es una historia de **documentación / entregable de demo**, no software ejecutable. El entregable es un documento markdown (`/management/artifacts/Pre-Demo-Checklist.md`) con una lista verificable de comprobaciones que deben pasarse **antes** de iniciar la demo guiada (US-142 / PB-P3-003). Cada ítem del checklist tiene un criterio de verificación objetivo (cómo se comprueba), un estado esperado y una acción correctiva si falla. El checklist completo debe poder ejecutarse en **menos de 10 minutos** para reducir el riesgo de una demo fallida durante la evaluación del Trabajo Final de Máster.

### Related Domain Concepts
* Demo guiada (UC-DEMO-001) y sus criterios (Doc 3 §14.4).
* Datos seed demo reproducibles (`seed:demo`, PB-P0-014) y reset del entorno demo (US-140 / PB-P3-001).
* Toggle de proveedor de IA `LLM_PROVIDER` (`openai` / `mock`) y `AI_DEMO_MODE` / `AI_USE_MOCK_FALLBACK` (runbook US-144 / PB-P3-005).
* Captcha en modo test/stub determinista (`CAPTCHA_DISABLED` / test keys, NFR-TEST-006).
* Multi-idioma y multi-moneda (SEED-DEMO-005, NFR-I18N-004/006).
* Smoke tests sobre la Demo URL (US-146 / PB-P3-007, PB-P2-016).
* Métricas de admin visibles en pantalla (Doc 3 §14.4).

### Assumptions
* Los criterios de demo están definidos en Doc 3 §14.4 y NFR-DEMO-006 (recorrido de 10–15 min cubriendo los 5 flujos, métricas admin visibles, toggle IA).
* Las variables de entorno de la demo están definidas en Doc 21 (`LLM_PROVIDER`, `AI_USE_MOCK_FALLBACK`, `AI_DEMO_MODE`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY`, `CAPTCHA_DISABLED`) y en la lista pre-despliegue de Doc 21 §23.2–§23.3.
* El seed idempotente (PB-P0-014) y el endpoint de reset del entorno demo (US-140 / PB-P3-001) existen y permiten dejar el estado reproducible.
* El runbook del toggle Mock/OpenAI (US-144 / PB-P3-005) existe y documenta cómo alternar y verificar el proveedor de IA.
* El smoke test sobre la Demo URL (US-146 / PB-P3-007) existe y es ejecutable manualmente o por workflow.

### Dependencies
* **PB-P3-001 (US-140)** — Endpoint admin de reset del entorno Demo. El checklist referencia el reset como acción correctiva cuando el estado del seed no es reproducible.
* **PB-P3-005 (US-144)** — Runbook del toggle `LLM_PROVIDER` / `AI_DEMO_MODE`. El checklist verifica que el toggle esté en el estado deseado y referencia el runbook como acción correctiva.

---

## 🔗 Traceability

| Source                 | Reference                                                      |
| ---------------------- | ------------------------------------------------------------- |
| Backlog Item           | PB-P3-004 — Checklist pre-demo (idioma, moneda, captcha test, seed, toggle) |
| FRD Requirement(s)     | Transversal — no implementa un FR directamente; verifica las precondiciones de los flujos ya especificados |
| Use Case(s)            | UC-DEMO-001 (ejecutar demo guiada con datos seed)             |
| Business Rule(s)       | BR-EVENT-007 (moneda del evento inmutable — solo se verifica su valor esperado, no se altera) |
| Permission Rule(s)     | No aplica — no introduce endpoints ni autorización runtime    |
| Data Entity / Entities | Referencia (solo lectura) a datos seed: SEED-USER-001/002/003, SEED-EVENT-001, SEED-QUOTE-001, SEED-BOOKING-001, SEED-REVIEW-001 |
| API Endpoint(s)        | No aplica — no consume ni expone endpoints (referencia el reset demo de US-140 como acción correctiva, sin implementarlo) |
| NFR Reference(s)       | NFR-DEMO-006 (demo 10–15 min, 5 flujos, métricas admin), NFR-TEST-006 (captcha testeable vía mock/stub en CI/QA), NFR-TEST-004 (flujos E2E/smoke), NFR-I18N-006 (multi-idioma y multi-moneda), NFR-I18N-004 (monedas soportadas) |
| Related ADR(s)         | No aplica — el checklist no altera decisiones de arquitectura; verifica configuración operacional |
| Related Document(s)    | `/docs/21-Deployment-and-DevOps-Design.md` (§23.2–§23.3 checklist de despliegue, §26 columna "Verificación pre-demo", env vars captcha/IA), `/docs/19-Security-and-Authorization-Design.md` (captcha, sin secretos en logs), `/docs/11-Data-Seed-Strategy.md` (SEED-DEMO-005, verificación de seed), `/docs/3-MVP-Scope-Definition.md` §14.4 (criterios de demo) |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P3)
* Naturaleza: Entregable de documentación (checklist manual verificable), no software ejecutable.

### Explicitly Out of Scope
* No implementa features nuevas ni modifica producto.
* No automatiza el checklist en código; es una lista manual/documentada (cualquier automatización futura sería otra historia, apoyada en el smoke de US-146 / PB-P3-007).
* No crea el endpoint de reset del entorno demo (eso es US-140 / PB-P3-001).
* No crea el runbook del toggle Mock/OpenAI (eso es US-144 / PB-P3-005).
* No crea el smoke test (eso es US-146 / PB-P3-007) ni el guion de demo (eso es US-142 / PB-P3-003).
* No implementa ni configura el captcha; solo verifica que esté en modo test.
* No introduce pagos reales, contratos firmados, WhatsApp/chat/push, RAG/vector DB, conversión automática de moneda ni multi-tenant enterprise.

### Scope Notes
* Respetar guardrails MVP y principios demo-first / seed-first.
* El checklist debe permanecer alineado a las variables de entorno y datos seed vigentes; si el seed o la configuración cambian, el checklist se actualiza.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Checklist documentado y versionado en el repo
**Given** el equipo requiere una verificación estándar antes de la demo  
**When** se completa esta historia  
**Then** existe el documento `/management/artifacts/Pre-Demo-Checklist.md` versionado en el repositorio, con la lista de comprobaciones pre-demo.

### AC-02: Cobertura de los ítems verificables requeridos
**Given** el checklist pre-demo  
**When** se revisa su contenido  
**Then** cubre, como mínimo, los siguientes ítems: (a) estado del seed cargado/reproducible, (b) idioma del usuario, (c) moneda del evento demo, (d) captcha en modo test, (e) smoke tests pasados, (f) métricas admin visibles y (g) toggle Mock/OpenAI (`LLM_PROVIDER`) en el estado deseado.

### AC-03: Cada ítem tiene criterio de verificación objetivo y estado esperado
**Given** cada ítem del checklist  
**When** se lee su definición  
**Then** cada ítem indica **cómo se comprueba** (criterio de verificación objetivo, p. ej. comando, pantalla, variable de entorno o registro esperado) y su **estado esperado** (valor o resultado correcto), evitando comprobaciones ambiguas o subjetivas.

### AC-04: Cada ítem tiene acción correctiva definida
**Given** cada ítem del checklist  
**When** un ítem falla la verificación  
**Then** el checklist documenta la **acción correctiva** a ejecutar antes de la demo (p. ej. recargar/reset del seed vía US-140, cambiar el toggle `LLM_PROVIDER`/`AI_DEMO_MODE` según el runbook US-144, activar captcha en modo test, ajustar idioma/moneda del evento demo).

### AC-05: Checklist ejecutable en menos de 10 minutos
**Given** el checklist completo  
**When** una persona ejecuta todas las verificaciones de forma secuencial  
**Then** el recorrido completo se puede completar en **menos de 10 minutos**, con una estimación de tiempo total registrada en el documento.

### AC-06: Trazabilidad a fuentes autoritativas
**Given** cada ítem del checklist  
**When** se revisa su justificación  
**Then** los ítems referencian las fuentes autoritativas correspondientes (Doc 3 §14.4, Doc 21 §23.2–§23.3 y env vars, NFR-DEMO-006, NFR-TEST-006, NFR-I18N-004/006, SEED-DEMO-005), sin inventar identificadores.

---

## ⚠️ Edge Cases

### EC-01: Un ítem del checklist falla durante la verificación pre-demo
**Given** se está ejecutando el checklist antes de la demo  
**When** un ítem no cumple su estado esperado (p. ej. seed no cargado, toggle en el proveedor equivocado, captcha activo en modo real, moneda/idioma incorrectos, smoke en rojo)  
**Then** el checklist indica la acción correctiva específica y solo se declara "listo para demo" cuando todos los ítems obligatorios están en verde.

#### Handling
* Seed no reproducible → ejecutar reset del entorno demo (US-140 / PB-P3-001) o re-aplicar `seed:demo` (PB-P0-014) y re-verificar.
* Toggle IA en estado no deseado → ajustar `LLM_PROVIDER` (`openai`/`mock`) y `AI_USE_MOCK_FALLBACK`/`AI_DEMO_MODE` según el runbook (US-144 / PB-P3-005) y re-verificar.
* Captcha en modo real → activar `CAPTCHA_DISABLED`/test keys (NFR-TEST-006) para que el login demo no se bloquee.
* Smoke en rojo → revisar logs, corregir causa raíz y re-ejecutar el smoke (US-146 / PB-P3-007) antes de continuar.

### EC-02: Contingencia por caída de OpenAI cerca de la demo
**Given** OpenAI no está disponible o sin cuota justo antes de la demo  
**When** se ejecuta el ítem del toggle Mock/OpenAI  
**Then** el checklist indica conmutar a `LLM_PROVIDER=mock` con `AI_DEMO_MODE=true` (o garantizar `AI_USE_MOCK_FALLBACK=true`) según el runbook, dejando el estado deseado documentado en el registro de la corrida.

---

## 🚫 Validation Rules

| ID    | Rule                                                            | Message / Behavior                                                        |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| VR-01 | El documento existe en la ruta canónica del repo               | Entregable inválido si no está en `/management/artifacts/Pre-Demo-Checklist.md` |
| VR-02 | Los 7 ítems obligatorios (a–g) están presentes                 | Checklist incompleto si falta algún ítem                                  |
| VR-03 | Cada ítem tiene criterio de verificación, estado esperado y acción correctiva | Ítem no accionable si le falta alguno de los tres                         |
| VR-04 | La estimación total es < 10 minutos                            | Fuera de rango → simplificar o priorizar ítems                            |
| VR-05 | Los ítems no exponen secretos en el documento                  | Referenciar nombres de variables, nunca valores de `CAPTCHA_SECRET_KEY`/`OPENAI_API_KEY` (Doc 19) |

---

## 🔐 Authorization & Security Rules

No aplica como autorización runtime — esta historia no introduce endpoints ni runtime authorization. Es un entregable de documentación (checklist). El captcha en modo test es un **ítem a verificar**, no una capacidad que esta historia implemente. Consideraciones de seguridad documental: el checklist debe referenciar variables de entorno por nombre y nunca incluir valores de secretos (`CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`); sin secretos en el documento ni en logs (Doc 19).

### Negative Authorization Scenarios
* No aplica — sin endpoints ni control de acceso runtime en esta historia.

---

## 🤖 AI Behavior

No aplica — esta historia no invoca IA directamente. El checklist únicamente **verifica** que el toggle del proveedor de IA (`LLM_PROVIDER`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`) esté en el estado deseado para la demo. No ejecuta ni modifica ninguna capacidad de IA.

### AI Involvement
* AI Feature: None (solo se verifica el estado del toggle de proveedor ya existente)
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable (el checklist sí documenta la contingencia a `MockAIProvider` como acción correctiva)

### AI Input / Output / Human-in-the-loop / Fallback
* Not applicable for this story.

---

## 🎨 UX / UI Notes

No aplica — historia de documentación. El entregable es un archivo markdown, sin pantalla, ruta ni componente de UI. El checklist sí referencia pantallas del producto (login, panel admin, detalle de evento demo) como puntos de verificación, pero no define ni modifica UI.

| Area                | Notes      |
| ------------------- | ---------- |
| Screen / Route      | No aplica  |
| Accessibility Notes | No aplica  |
| Responsive Notes    | No aplica  |
| i18n Notes          | El checklist verifica el idioma del usuario/evento demo (SEED-DEMO-005, NFR-I18N-006), sin implementar i18n |
| Currency Notes      | El checklist verifica la moneda del evento demo (NFR-I18N-004/006, BR-EVENT-007), sin implementar lógica de moneda |

---

## 🛠 Technical Notes

### Frontend
* No aplica — sin frontend.

### Backend
* No aplica — sin backend, servicio ni endpoint.

### Database
* No aplica — sin cambios de esquema, migración ni tabla. Solo verificación (lectura) del estado del seed existente.

### API
No aplica — el checklist no consume ni expone endpoints. Referencia el endpoint de reset demo (US-140 / PB-P3-001) únicamente como acción correctiva.

### Deliverable / Artefacto
* Archivo: `/management/artifacts/Pre-Demo-Checklist.md` (markdown versionado en el repo).
* Estructura sugerida: tabla de ítems con columnas **Ítem | Cómo se verifica | Estado esperado | Acción correctiva | Fuente**, cubriendo los 7 ítems (a–g), más una estimación de tiempo total (< 10 min) y un espacio de registro de la corrida (fecha, responsable, resultado por ítem).
* Ítems mínimos: (a) seed cargado/reproducible (SEED-* clave presentes; Doc 11), (b) idioma del usuario (NFR-I18N-006, SEED-DEMO-005), (c) moneda del evento demo (NFR-I18N-004; BR-EVENT-007), (d) captcha en modo test (`CAPTCHA_DISABLED`/test keys; NFR-TEST-006), (e) smoke tests pasados (US-146 / PB-P3-007; Doc 21 §23.3), (f) métricas admin visibles (Doc 3 §14.4), (g) toggle `LLM_PROVIDER`/`AI_DEMO_MODE` en estado deseado (Doc 21; runbook US-144 / PB-P3-005).

### Observability / Audit
* No aplica — sin ejecución runtime que auditar.

---

## 🧪 Test Scenarios

La "prueba" de esta historia es la validación documental y una corrida del checklist (dry-run), no pruebas de software automatizadas.

### Validación Documental

| ID    | Scenario                                                                        | Type       |
| ----- | ------------------------------------------------------------------------------- | ---------- |
| DV-01 | El documento existe en `/management/artifacts/Pre-Demo-Checklist.md`            | Doc review |
| DV-02 | Los 7 ítems obligatorios (a–g) están presentes                                  | Doc review |
| DV-03 | Cada ítem tiene criterio de verificación, estado esperado y acción correctiva   | Doc review |
| DV-04 | Existe estimación de tiempo total < 10 min y espacio de registro de corrida     | Doc review |
| DV-05 | Los ítems referencian fuentes reales (Doc 3 §14.4, Doc 21, NFR-*, SEED-DEMO-005) sin IDs inventados | Doc review |

### Corrida del Checklist (Dry-run)

| ID    | Scenario                                                                                        | Expected Result                                             |
| ----- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| DR-01 | Ejecutar los 7 ítems de forma secuencial sobre el entorno demo y cronometrar                    | Todos en verde; verificación completa en < 10 min           |
| DR-02 | Forzar el fallo de un ítem (p. ej. toggle en proveedor equivocado) y aplicar la acción correctiva | El ítem pasa a verde tras la corrección documentada         |

### AI Tests
No aplica — esta historia no invoca IA.

### Authorization Tests
No aplica — sin endpoints ni autorización.

### Accessibility Tests
No aplica — entregable de documentación sin UI propia.

---

## 📊 Business Impact

| Field               | Value                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness; reducción del riesgo de demo fallida                              |
| Expected Impact     | La demo del TFM inicia con el entorno verificado (seed, idioma, moneda, captcha, smoke, métricas, toggle) en < 10 min |
| Success Criteria    | Checklist en repo + corrida registrada con todos los ítems en verde en < 10 min   |
| Academic Demo Value | Alto — asegura que la demo evaluada arranque sin incidentes                       |

---

## 🧩 Task Breakdown Readiness

### Potential Documentation Tasks
* Redactar el checklist de los 7 ítems (a–g) en `/management/artifacts/Pre-Demo-Checklist.md`.
* Para cada ítem, definir criterio de verificación, estado esperado y acción correctiva.
* Añadir la estimación de tiempo total (< 10 min) y el espacio de registro de corrida.
* Vincular cada ítem a su fuente autoritativa (Doc 3 §14.4, Doc 21, NFR-*, SEED-DEMO-005).
* Ejecutar la corrida (dry-run) y registrar el resultado por ítem.

### Potential Frontend / Backend / Database / AI / DevOps Tasks
* No aplica — historia de documentación.

---

## ✅ Definition of Ready

* [x] Rol claro (Product Owner / presentador de demo).
* [x] Goal claro (checklist pre-demo documentado y verificable).
* [x] Referencias a Docs (Doc 3 §14.4, Doc 21 §23.2–§23.3, Doc 11, Doc 19).
* [x] Seguridad evaluada (No aplica runtime; sin secretos en el documento, justificado).
* [x] Datos/entidades referenciadas (datos seed clave, IDs SEED-*).
* [x] AC en GWT, específicas y testeables.
* [x] Edge cases documentados (ítem falla; contingencia OpenAI).
* [x] Validación clara (VR-01..05).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P3-001 / US-140, PB-P3-005 / US-144).
* [x] Naturaleza del entregable definida (markdown en repo).
* [x] Estrategia de validación/corrida definida.

---

## 🏁 Definition of Done

* [ ] `/management/artifacts/Pre-Demo-Checklist.md` creado y versionado en el repo.
* [ ] Los 7 ítems obligatorios (a–g) presentes, cada uno con criterio de verificación, estado esperado y acción correctiva.
* [ ] Estimación de tiempo total documentada y < 10 minutos.
* [ ] Cada ítem trazado a su fuente autoritativa (sin IDs inventados).
* [ ] Corrida (dry-run) ejecutada con todos los ítems en verde y resultado registrado.
* [ ] Sin secretos en el documento (solo nombres de variables).

---

## 📝 Notes
* Alineación aplicada: prioridad corregida a **Must Have (P3)**, reencuadre de historia de código a **historia de documentación/demo**, y saneamiento de trazabilidad conforme al backlog autoritativo (PB-P3-004). Estas son alineaciones, no decisiones bloqueantes.
* Trazabilidad saneada: se removió el ID inexistente **NFR-PERF-API-001**; se descartó **NFR-OBS-001** (aplica a auditoría de `AdminAction`, no a la verificación pre-demo) y el comodín **NFR-TEST-\***; se sustituyeron por IDs verificados (NFR-DEMO-006, NFR-TEST-006, NFR-TEST-004, NFR-I18N-004/006, SEED-DEMO-005, UC-DEMO-001).
* Convención de ruta propuesta: `/management/artifacts/Pre-Demo-Checklist.md`, consistente con `/management/artifacts/Demo-Script.md` de US-142. Es una convención de nombres determinista, no un requisito de producto inventado.
* La creación del archivo `Pre-Demo-Checklist.md` ocurre en implementación, no durante la refinación.
