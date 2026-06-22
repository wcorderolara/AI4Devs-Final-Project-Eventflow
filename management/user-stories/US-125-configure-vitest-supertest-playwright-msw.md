# 🧾 User Story: Configurar Vitest + Supertest + Playwright + MSW

## 🆔 Metadata

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| ID                 | US-125                                      |
| Epic               | EPIC-QA-001 — Testing & Quality Gates       |
| Backlog Item       | PB-P0-015 — QA Tooling Setup                |
| Feature            | Tooling de testing (foundation)             |
| Module / Domain    | QA / DevOps                                 |
| User Role          | System                                      |
| Priority           | Must Have                                   |
| Status             | Approved                                    |
| Owner              | Product Owner / Business Analyst            |
| Approved By        | PO/BA Review                                |
| Approval Date      | 2026-06-22                                  |
| Ready for Development Tasks | Yes                                |
| Sprint / Milestone | MVP — P0 Foundation                         |
| Created Date       | 2026-06-09                                  |
| Last Updated       | 2026-06-22                                  |

---

## 🎯 User Story

**As the** equipo QA y plataforma de EventFlow,
**I want** configurar el stack base de testing (Vitest + Supertest en backend, Vitest + Testing Library + MSW en frontend y Playwright para E2E) con scripts npm compartidos y wiring para CI,
**So that** todas las historias siguientes puedan implementar quality gates desde el primer commit, cubriendo unit, integration, API contract, frontend components y E2E sobre seed, alineados con la pirámide de pruebas definida en Doc 20.

---

## 🧠 Business Context

### Context Summary

EventFlow define en Doc 20 (Testing Strategy) una pirámide ~60% unit / 30% integración + API / 10% E2E. Esta historia entrega únicamente el **setup base** del tooling (no construye suites funcionales completas, que se desarrollarán progresivamente en PB-P2-014/015/016). El setup debe permitir que cualquier desarrollador y el pipeline CI ejecuten los tres niveles desde el repositorio.

### Related Domain Concepts

* Testing pyramid (Doc 20 §7)
* API contract testing (Doc 20 §4)
* MSW handlers alineados al contrato OpenAPI (Doc 16, Doc 20 §5)
* Seed-first E2E (Doc 20 §6, Doc 11)

### Assumptions

* PB-P0-002 (scaffold backend Express + TypeScript) ya está disponible.
* PB-P0-012 (scaffold frontend Next.js + TypeScript) ya está disponible.
* Postgres efímero (contenedor o esquema temporal) está disponible para la integración backend, según Doc 20 §3.
* Node.js LTS y npm/pnpm están definidos por el scaffold y no se redefinen aquí.

### Dependencies

* PB-P0-002 — Scaffold backend.
* PB-P0-012 — Scaffold frontend.
* ADR-TEST-001 (Vitest + Supertest en backend) — Accepted.
* ADR-TEST-002 (MSW + Playwright en frontend/E2E) — Accepted.

---

## ✅ PO/BA Decisions Applied

| Decisión                                                                                                                            | Fuente                |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Backend usa Vitest como runner y Supertest sobre Express para tests de API.                                                          | ADR-TEST-001          |
| Frontend usa Vitest + Testing Library + MSW para componentes/integración; E2E usa Playwright sobre seed.                             | ADR-TEST-002          |
| Esta historia entrega el setup base; las suites funcionales completas se entregan en PB-P2-014/015/016.                              | PB-P0-015 Notes       |
| Pipeline CI debe invocar los tres niveles (unit/integration, API, E2E) — el wiring lo cubre PB-P0-017; aquí se exponen los scripts.  | PB-P0-015 Acceptance  |
| MSW handlers se alinean al contrato OpenAPI; las suites de drift se implementan en PB-P2-015.                                        | Doc 20 §5             |

---

## 🔗 Traceability

| Source                 | Reference                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| Backlog Item           | PB-P0-015                                                                   |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR; habilita capacidades futuras. |
| Use Case(s)            | Transversal — no implementa directamente un UC; habilita capacidades futuras. |
| Business Rule(s)       | Transversal — no implementa BR directamente.                                |
| Permission Rule(s)     | No aplica — esta historia no introduce endpoints ni runtime authorization. |
| Data Entity / Entities | No aplica — esta historia no modifica el modelo de datos.                  |
| API Endpoint(s)        | No aplica — esta historia no introduce endpoints.                          |
| NFR Reference(s)       | NFR-TEST-* (Doc 10), NFR-OBS-001                                            |
| Related ADR(s)         | ADR-TEST-001, ADR-TEST-002, ADR-DEVOPS-001                                  |
| Related Document(s)    | Doc 20 (Testing Strategy), Doc 14 §Tests, Doc 15 §Tests, Doc 21 (DevOps), Doc 22 (ADRs), Doc 11 (Seed) |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope (P0 Foundation).
* MVP Relevance: Must Have.

### Explicitly Out of Scope

* Implementar suites funcionales completas (cubierto por PB-P2-014/015/016).
* Crear handlers MSW para todos los endpoints (cubierto por PB-P2-015).
* Construir la suite E2E completa del flujo demo (cubierto por PB-P2-016).
* Wiring del pipeline CI (cubierto por PB-P0-017; aquí solo se exponen los scripts npm que CI invocará).
* Reporte de cobertura con umbrales bloqueantes (umbrales finales se definen en P2; aquí solo se habilita `c8`/`v8` provider).
* Visual regression, mutation testing y carga (fuera de MVP).
* Tests AI funcionales (cubierto por historias del epic AI).

### Scope Notes

* Esta historia entrega únicamente el cableado del tooling y un test mínimo de humo por nivel que demuestra que la cadena funciona.
* Cualquier configuración compartida (helpers, factories, setup files) se ubica en rutas convencionales del repo para que las historias siguientes la reutilicen.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Vitest configurado en backend con script npm

**Given** el repositorio backend con scaffold de PB-P0-002 disponible
**When** se ejecuta `npm test` en el paquete backend
**Then** Vitest corre con `vitest.config.ts`, usa el provider de cobertura v8 y termina con código de salida 0 ejecutando al menos un test de humo (ej. dominio puro).

### AC-02: Supertest configurado sobre la app Express

**Given** la app Express expuesta por el scaffold backend
**When** se ejecuta `npm test` y se incluye al menos un test API de humo (ej. `GET /healthz`)
**Then** el test usa Supertest contra la `app` Express, valida status 200 y un envelope mínimo, sin requerir levantar un servidor real en puerto.

### AC-03: Vitest + Testing Library + MSW configurados en frontend

**Given** el repositorio frontend con scaffold de PB-P0-012 disponible
**When** se ejecuta `npm test` en el paquete frontend
**Then** Vitest corre con setup que inicializa el servidor MSW (Node) antes de cada suite, expone un handler de humo y termina con código de salida 0.

### AC-04: Playwright configurado para E2E

**Given** el repositorio con Playwright instalado y `playwright.config.ts` presente
**When** se ejecuta `npm run test:e2e`
**Then** Playwright lanza al menos un browser headless, ejecuta un test de humo (ej. carga de página pública) y termina con código de salida 0.

### AC-05: Scripts npm estandarizados expuestos

**Given** los paquetes backend y frontend del monorepo / repo
**When** se inspeccionan los `package.json` correspondientes
**Then** existen como mínimo: `test` (Vitest), `test:watch`, `test:coverage`, `test:e2e` (Playwright) y `test:ci` que encadena los niveles requeridos por el pipeline CI (PB-P0-017).

### AC-06: MSW listo para integración en dev y tests

**Given** el frontend con MSW instalado
**When** un desarrollador importa el módulo de mocks compartido
**Then** el módulo expone un `handlers[]` inicial (vacío o con un handler de humo) y utilidades `server` (Node, para tests) y `worker` (browser, opcional para dev), siguiendo la convención de Doc 15.

### AC-07: Documentación mínima de uso del stack

**Given** el setup completado
**When** un desarrollador consulta el repo
**Then** existe un `README` o sección equivalente que indica cómo ejecutar cada nivel (`npm test`, `npm run test:e2e`), dónde agregar nuevos tests y dónde extender los handlers MSW.

---

## ⚠️ Edge Cases

### EC-01: Postgres efímero no disponible para integración backend

**Given** la suite integración intenta crear un esquema temporal
**When** la base no está disponible
**Then** Vitest debe fallar rápido con un mensaje claro, sin colgar el runner y sin enmascarar el error como "test passed".

#### Handling

* Fail-fast en el setup global; mensaje guía hacia la variable `DATABASE_URL` o el contenedor esperado.

### EC-02: Browsers de Playwright no instalados

**Given** un entorno limpio sin browsers descargados
**When** se ejecuta `npm run test:e2e`
**Then** Playwright debe detectar la falta y mostrar el comando exacto (`npx playwright install`), terminando con código no-cero sin reportar éxito falso.

### EC-03: MSW intercepta una request no manejada

**Given** un test frontend ejecuta una request que no tiene handler
**When** corre la suite
**Then** MSW debe configurarse con `onUnhandledRequest: 'error'` (o equivalente) para que el test falle de forma determinista, no silenciosa.

### EC-04: Conflicto de puertos al ejecutar Playwright

**Given** el dev server del frontend usa un puerto fijo
**When** otro proceso ocupa el puerto
**Then** Playwright debe fallar con mensaje claro; la configuración debe permitir override por variable de entorno.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                  | Message / Behavior                                                                      |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| VR-01 | `vitest.config.ts` y `playwright.config.ts` deben existir y ser parseables.            | Fail-fast con error de configuración si faltan o son inválidos.                          |
| VR-02 | Scripts npm declarados en AC-05 deben existir en los `package.json` correspondientes. | El comando `npm run` lista los scripts; ausencia rompe el AC.                            |
| VR-03 | MSW debe estar configurado con `onUnhandledRequest: 'error'` en tests.                | Evita falsos positivos por requests no mockeadas.                                        |
| VR-04 | Supertest debe consumir la `app` Express exportada, no levantar un servidor en puerto. | Garantiza aislamiento y velocidad.                                                       |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Aplicar los lineamientos de seguridad de Doc 19 a cualquier configuración de tests que use credenciales o variables de entorno. |
| SEC-02 | Secretos requeridos por tests (ej. JWT_SECRET, claves de cookies) vienen de Secrets Manager o variables de entorno locales; nunca hardcodeados en el repo. |
| SEC-03 | Logs y reportes de cobertura no deben incluir secretos ni datos personales reales; usar datos sintéticos.                       |
| SEC-04 | Playwright no debe ejecutarse contra ambientes productivos por defecto; el `baseURL` debe apuntar a entorno local o CI.         |

### Negative Authorization Scenarios

* Si un test detecta un secreto hardcodeado o un `baseURL` apuntando a producción → bloqueo del PR (regla a reforzar en PB-P0-017).

---

## 🤖 AI Behavior

Esta historia no invoca IA directamente.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* No aplica — esta historia no invoca IA directamente.

### AI Output

* No aplica — esta historia no invoca IA directamente.

### Human-in-the-loop Rules

* No aplica — esta historia no invoca IA directamente.

### AI Error / Fallback Behavior

* No aplica — esta historia no invoca IA directamente.

---

## 🎨 UX / UI Notes

No aplica — esta historia no introduce UI. Toda esta sección queda marcada explícitamente como **N/A**.

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A   |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — la accesibilidad funcional se prueba en historias UI, con tooling habilitado aquí (Testing Library + Playwright). |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | N/A   |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: N/A.
* Components: N/A.
* State Management: N/A (no introduce estado nuevo; sólo tooling).
* Forms: N/A.
* API Client: N/A — pero MSW debe interceptar el cliente HTTP definido en PB-P0-013.
* Setup esperado: `src/test/setup.ts` que inicializa MSW `server` (Node) y limpia entre tests; `src/mocks/{handlers.ts,server.ts,browser.ts}` siguiendo Doc 15.

### Backend

* Use Case / Service: N/A (capacidad técnica).
* Controller / Route: N/A — usa el endpoint de humo `GET /healthz` ya provisto por el scaffold para AC-02.
* Authorization Policy: N/A.
* Validation: N/A.
* Transaction Required: N/A.
* Setup esperado: `vitest.config.ts` con coverage v8; setup global que prepara DB efímera para la suite de integración (skippable mediante variable si la DB no está disponible localmente).

### Database

* Main Tables: —
* Constraints: N/A.
* Index Considerations: N/A.
* Notas: la suite de integración backend consume un esquema temporal Postgres (Doc 20 §3); no se crean tablas nuevas en esta historia.

### API

| Method | Endpoint   | Purpose                                                                 |
| ------ | ---------- | ----------------------------------------------------------------------- |
| GET    | /healthz   | Único endpoint consumido por el test Supertest de humo (provisto por scaffold). |

### Observability / Audit

* Correlation ID Required: No aplica — esta historia no emite logs runtime de producción.
* Log Event Required: No aplica.
* AdminAction Required: No.
* AIRecommendation Required: No.
* Nota: el output de los runners debe ser legible en CI (reporters por defecto + `--reporter=verbose` cuando se invoca en `test:ci`).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                 | Type             |
| ----- | ------------------------------------------------------------------------ | ---------------- |
| TS-01 | `npm test` en backend ejecuta un test unit de humo con Vitest y pasa.    | Unit             |
| TS-02 | `npm test` en backend ejecuta un test API de humo con Supertest y pasa. | API / Integration |
| TS-03 | `npm test` en frontend ejecuta un test de componente de humo con Vitest + Testing Library + MSW y pasa. | Frontend Unit     |
| TS-04 | `npm run test:e2e` ejecuta un test Playwright de humo y pasa.            | E2E               |
| TS-05 | `npm run test:coverage` genera reporte de cobertura sin fallar.          | Quality          |

### Negative Tests

| ID    | Scenario                                                                                   | Expected Result                                                       |
| ----- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| NT-01 | `vitest.config.ts` ausente o inválido.                                                      | Fail-fast con error de configuración.                                  |
| NT-02 | Playwright invocado sin browsers instalados.                                                | Fail-fast con instrucción `npx playwright install`.                    |
| NT-03 | Test frontend hace request sin handler MSW registrado.                                      | El test falla por `onUnhandledRequest: 'error'`.                       |
| NT-04 | Supertest intenta levantar servidor en puerto y el puerto está ocupado.                     | Configuración debe usar `app` directamente; AC-02 verifica el patrón.  |

### AI Tests

No aplica — esta historia no invoca IA directamente.

### Authorization Tests

| ID         | Scenario                                                  | Expected Result |
| ---------- | --------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Setup completado por una pipeline sin secretos hardcoded. | Success         |

### Accessibility Tests

No aplica funcionalmente, pero el tooling habilitado (Testing Library + Playwright) debe permitir agregar checks a11y en historias UI futuras.

---

## 📊 Business Impact

| Field               | Value                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Calidad de entrega, time-to-merge, escape rate de bugs.                                                      |
| Expected Impact     | Habilita quality gates desde el primer commit; reduce regresiones tardías; condición previa para PB-P0-017. |
| Success Criteria    | Tres niveles de test corren localmente con un solo comando cada uno y el `test:ci` cubre los tres.           |
| Academic Demo Value | Foundation — soporta la trazabilidad académica de cobertura por pirámide.                                    |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Instalar Vitest + Testing Library + MSW; agregar `src/test/setup.ts` y `src/mocks/{handlers.ts,server.ts,browser.ts}`.
* Crear test de humo de componente que usa un handler MSW.
* Agregar scripts npm `test`, `test:watch`, `test:coverage`.

### Potential Backend Tasks

* Instalar Vitest + Supertest + provider de cobertura v8.
* Crear `vitest.config.ts` y setup global con DB efímera opcional.
* Crear test unit de humo y test API Supertest contra `GET /healthz`.
* Agregar scripts npm `test`, `test:watch`, `test:coverage`.

### Potential Database Tasks

* Documentar variable `DATABASE_URL` para esquema temporal de tests (sin migraciones nuevas).

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Definir convención de carpetas de tests y nombres de archivos.
* Definir umbrales iniciales de cobertura (reporting only, no bloqueante).

### Potential DevOps / Config Tasks

* Instalar Playwright y descargar browsers (`npx playwright install`).
* Crear `playwright.config.ts` con `baseURL` parametrizado.
* Agregar script `test:e2e` y `test:ci` que encadena los tres niveles.
* Documentar comandos en `README`.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro y acotado al setup.
* [x] Referencias a Docs (20, 14, 15, 21, 22) y ADRs (TEST-001, TEST-002, DEVOPS-001).
* [x] Permisos / Seguridad explicitados (No aplica + reglas SEC para secretos y baseURL).
* [x] Entidades listadas (No aplica).
* [x] AC en GWT y específicos por herramienta.
* [x] Edge cases documentados (4).
* [x] Validación clara (4 reglas).
* [x] Out of Scope explícito (suites funcionales, CI wiring, umbrales bloqueantes).
* [x] Dependencias conocidas (PB-P0-002, PB-P0-012).
* [x] UX states marcados N/A explícitamente.
* [x] API marcada N/A salvo `/healthz` de humo.
* [x] Tests definidos por nivel.
* [ ] Tech Lead validó (gate de aprobación formal).

---

## 🏁 Definition of Done

* [ ] `npm test` corre Vitest y pasa en backend y frontend.
* [ ] `npm run test:e2e` corre Playwright y pasa.
* [ ] MSW configurado con `onUnhandledRequest: 'error'` y handler de humo.
* [ ] Scripts `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:ci` presentes.
* [ ] Documentación mínima en `README` actualizada.
* [ ] PR revisado por Tech Lead y QA Lead.
* [ ] Pipeline CI (cuando esté disponible vía PB-P0-017) puede invocar `test:ci` sin cambios adicionales.

---

## 📝 Notes

* Esta historia es **foundation only**: deliberadamente no construye suites funcionales completas.
* Las suites de cobertura amplia se entregan en PB-P2-014 (Vitest dominio), PB-P2-015 (contract MSW) y PB-P2-016 (E2E demo flow).
* Si en implementación se detecta que algún script ya existe parcialmente por el scaffold, debe extenderse — no duplicarse.
* Confirmar con Tech Lead la convención exacta de carpetas (`tests/`, `__tests__/` o colocados junto al código) antes del PR; esto es decisión técnica menor, no bloqueante para aprobación de la User Story.
