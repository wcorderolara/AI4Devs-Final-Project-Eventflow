# 🧾 User Story: Dockerfile multi-stage para backend

## 🆔 Metadata

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| ID                 | US-133                                      |
| Epic               | EPIC-OPS-001 — Deployment & DevOps on AWS   |
| Backlog Item       | PB-P0-016 — Dockerfile Backend              |
| Feature            | Dockerfile multi-stage (foundation deploy)  |
| Module / Domain    | DevOps                                      |
| User Role          | System                                      |
| Priority           | Must Have (P0)                              |
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

**As the** equipo plataforma/DevOps de EventFlow,
**I want** un `Dockerfile` multi-stage para el backend Node.js + Express + Prisma con imagen base liviana, capas cacheables, usuario no-root y health check incluido,
**So that** podamos construir y desplegar el backend de manera reproducible en **AWS App Runner** (objetivo del MVP según ADR-DEVOPS-001 y Doc 21) y habilitar el pipeline CI/CD (PB-P0-017) sin reinventar la imagen.

---

## 🧠 Business Context

### Context Summary

Doc 21 §10 define que el backend se empaqueta como imagen Docker y se despliega en AWS App Runner (vía ECR). PB-P0-016 entrega únicamente el `Dockerfile`, su `.dockerignore` y la verificación de build local; el push a ECR y el wiring de App Runner se entregan en PB-P0-017 (CI) y PB-P2-023..026 (deploy). Esta historia es foundation: sin un Dockerfile correcto, el resto del DevOps base se bloquea.

### Related Domain Concepts

* Build multi-stage (Doc 21 §10.2).
* `.dockerignore` mínimo (Doc 21 §10.3).
* Health check `GET /healthz` (Doc 21 §10.4; alineado con scaffold y US-125).
* Variables y secretos vía Secrets Manager / SSM en runtime (Doc 21 §10.5).

### Assumptions

* PB-P0-002 (scaffold backend Express + TypeScript + Prisma) está disponible y expone scripts `build` y `start` válidos.
* Prisma client se genera durante el build (no en runtime).
* Node.js LTS es la versión de referencia.
* La imagen no se publica a un registro público; ECR queda fuera de scope aquí.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* ADR-DEVOPS-001 — Use AWS for MVP Deployment (App Runner como runtime objetivo).
* Doc 21 §10 — Backend deployment design.

---

## ✅ PO/BA Decisions Applied

| Decisión                                                                                                                | Fuente                |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Backend se empaqueta como imagen Docker y se despliega en AWS App Runner (no Beanstalk en MVP).                          | ADR-DEVOPS-001, Doc 21 §10.1 |
| Imagen base `node:LTS-alpine` (o slim), multi-stage, sin dev-dependencies en runtime, sin secretos en la imagen.        | Doc 21 §10.2          |
| `.dockerignore` mínimo incluye `node_modules`, `.git`, `.github`, `.env`, `.env.*`, `*.log`, `coverage`, `dist`, `.husky`. | Doc 21 §10.3          |
| Endpoint de health: `GET /healthz` (consistente con PB-P0-015 Acceptance Summary).                                       | PB-P0-016 Acceptance, US-125 AC-02 |
| Esta historia entrega solo `Dockerfile` + `.dockerignore` + verificación de build local; ECR/App Runner se cubre en PB-P0-017 y PB-P2-023..026. | PB-P0-016 Notes, Doc 21 §10 |

---

## 🔗 Traceability

| Source                 | Reference                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| Backlog Item           | PB-P0-016 — Dockerfile Backend                                              |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR; habilita capacidad de deploy. |
| Use Case(s)            | Transversal — no implementa directamente un UC.                             |
| Business Rule(s)       | Transversal — no implementa BR directamente.                                |
| Permission Rule(s)     | No aplica — esta historia no introduce endpoints ni runtime authorization. |
| Data Entity / Entities | No aplica — esta historia no modifica el modelo de datos.                  |
| API Endpoint(s)        | Reutiliza `GET /healthz` (provisto por scaffold).                           |
| NFR Reference(s)       | NFR-PERF-API-001 (tamaño imagen / cold start razonable), NFR-OBS-001 (logs stdout legibles), NFR-SEC (no secretos en imagen) |
| Related ADR(s)         | ADR-DEVOPS-001 (AWS App Runner), ADR-TEST-001 (consistencia con tooling)    |
| Related Document(s)    | Doc 21 §§10.1–10.5, Doc 13 (System Architecture), Doc 14 (Backend Tech Design), Doc 19 (Security & Authorization) |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope (P0 Foundation DevOps).
* MVP Relevance: Must Have.

### Explicitly Out of Scope

* Push a Amazon ECR y configuración del repositorio ECR (cubierto por PB-P0-017 / PB-P2-023).
* Configuración del servicio AWS App Runner (PB-P2-023..026).
* GitHub Actions workflow (PB-P0-017).
* Dockerfile para el frontend (frontend va por Amplify, no requiere Docker en MVP — Doc 21 §10 y PB-P0-016 Notes).
* Orquestación local con `docker-compose` (puede vivir en otras historias DevOps).
* Imagen multi-arch (linux/amd64 es suficiente para App Runner en MVP).
* Distroless u optimizaciones avanzadas más allá de multi-stage + alpine/slim.
* Migraciones Prisma desde la imagen (PB-P0-018).
* Sidecars, service mesh, ECS/EKS/Lambda (Doc 21 §10.8 lo excluye explícitamente).

### Scope Notes

* La historia entrega artefactos textuales (`Dockerfile`, `.dockerignore`) y un smoke local: `docker build` exitoso + `docker run` que responde 200 en `GET /healthz`.
* No se introduce ningún cambio funcional en el backend.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Imagen multi-stage construye sin errores ni warnings

**Given** el repositorio backend con scaffold (PB-P0-002) disponible
**When** se ejecuta `docker build -t eventflow-backend:local .` en el paquete backend
**Then** la construcción completa sin errores ni warnings de Docker (build args/labels válidos, sin capas no usadas) y produce una imagen `eventflow-backend:local`.

### AC-02: Tamaño razonable y sin dev-dependencies

**Given** la imagen recién construida
**When** se ejecuta `docker image inspect eventflow-backend:local`
**Then** el tamaño total se mantiene en un rango razonable para Node LTS alpine/slim (orden de magnitud cientos de MB, no GB) y `node_modules` final solo contiene dependencias de producción (sin `vitest`, `playwright`, etc.).

### AC-03: Container arranca y responde `GET /healthz` con 200

**Given** la imagen `eventflow-backend:local`
**When** se ejecuta `docker run --rm -p 3000:3000 -e PORT=3000 eventflow-backend:local`
**Then** el contenedor arranca, expone el puerto declarado en `PORT`, y `curl http://localhost:3000/healthz` retorna `200 OK` con el envelope mínimo del scaffold dentro de un tiempo razonable (<10s).

### AC-04: Imagen corre como usuario no-root

**Given** un contenedor en ejecución a partir de la imagen
**When** se ejecuta `docker exec <id> id -u`
**Then** el UID retornado **no** es `0` (root). El `Dockerfile` declara un usuario no-root vía `USER` en la stage final.

### AC-05: Imagen no contiene secretos ni `.env`

**Given** la imagen construida
**When** se inspeccionan capas (`docker history`) y se buscan rutas `.env`, `.env.*`, credenciales o llaves
**Then** ninguna capa contiene archivos `.env*` ni claves; las variables se inyectan en runtime.

### AC-06: `.dockerignore` excluye artefactos no deseados

**Given** el repositorio backend
**When** se inspecciona `.dockerignore`
**Then** incluye como mínimo: `node_modules`, `.git`, `.github`, `.env`, `.env.*`, `*.log`, `coverage`, `dist`, `.husky` (Doc 21 §10.3) y excluye que esos paths terminen dentro de la imagen.

### AC-07: Build multi-stage con capas cacheables

**Given** un cambio que sólo modifica código fuente (no `package.json` ni `prisma/schema.prisma`)
**When** se reconstruye con cache (`docker build` posterior)
**Then** las capas de instalación de dependencias y de generación del Prisma client se reutilizan; sólo se reconstruyen las capas de copia de código y compilación.

### AC-08: Prisma client disponible en runtime

**Given** el contenedor en ejecución
**When** la aplicación intenta inicializar Prisma (sin conectarse a DB)
**Then** el cliente Prisma está presente en la imagen final, generado durante el build, y no se intenta `prisma generate` en runtime.

---

## ⚠️ Edge Cases

### EC-01: Variable `PORT` no definida

**Given** `docker run` sin `-e PORT=...`
**When** arranca el contenedor
**Then** la imagen aplica un default razonable (ej. `PORT=3000`) declarado en el `Dockerfile` (`ENV PORT=3000` + `EXPOSE 3000`) sin fallar; logs lo dejan claro.

#### Handling

* `ENV PORT=3000` por defecto; documentar override en `README`.

### EC-02: `DATABASE_URL` ausente al arrancar

**Given** el contenedor arranca sin `DATABASE_URL`
**When** la aplicación intenta inicializar Prisma para conectarse a la DB
**Then** el contenedor falla rápido con mensaje claro (no entra en loop) y `GET /healthz` sigue respondiendo 200 solo si el scaffold define `/healthz` como liveness sin DB (Doc 21 §10.4 distingue `/healthz` liveness vs `/readiness` con DB).

#### Handling

* Si el scaffold dependiera de DB para `/healthz`, ajustar a `/readiness` separado; esta historia documenta el comportamiento esperado, no introduce el endpoint.

### EC-03: Build falla por dependencia faltante (Alpine + native modules)

**Given** un módulo nativo (ej. `bcrypt`, `sharp`) requiere libs del sistema
**When** se ejecuta `docker build`
**Then** el `Dockerfile` instala las libs mínimas necesarias (ej. `apk add --no-cache python3 make g++` en stage de build y limpia en stage final), o documenta el motivo de usar `node:LTS-slim` (Debian) en lugar de Alpine.

#### Handling

* Si surge un módulo nativo problemático, preferir `node:LTS-slim` con justificación documentada.

### EC-04: Capas inflacionadas por `npm install` con cache

**Given** una capa final que conserva caches de npm/pnpm
**When** se inspecciona la imagen
**Then** la stage final no incluye `~/.npm`, `~/.pnpm-store`, `/tmp/*` o caches de pip; se usa `--no-cache` y `npm prune --production` cuando aplica.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                     | Message / Behavior                                              |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| VR-01 | `Dockerfile` debe usar build multi-stage (`FROM ... AS build` + stage final separada).                    | Si no, fail-fast en code review.                                |
| VR-02 | La stage final debe declarar `USER` con un usuario no-root.                                              | Fail-fast en revisión.                                          |
| VR-03 | `.dockerignore` debe existir y excluir como mínimo los paths de Doc 21 §10.3.                             | Fail-fast en revisión.                                          |
| VR-04 | La imagen no debe contener `.env*` ni credenciales.                                                       | Verificación con `docker history` / `docker run grep`.          |
| VR-05 | `PORT` debe estar declarado con `ENV` y `EXPOSE`.                                                        | App Runner depende de `PORT` (Doc 21 §10.2 / §10.5).            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Cumplir Doc 19 / Doc 21 §10.5: secretos en runtime vía Secrets Manager / SSM, nunca embebidos en la imagen.        |
| SEC-02 | Usuario no-root obligatorio en la stage final (Doc 21 §10.2 / principios de hardening).                            |
| SEC-03 | Sin secretos ni `.env*` en logs ni capas (`docker history` debe estar limpio).                                     |
| SEC-04 | Imagen base oficial y pinneada por versión (ej. `node:20-alpine`) — evitar `latest` sin versión.                   |
| SEC-05 | Build args no deben pasar secretos; usar `--secret` de BuildKit si fuera necesario (no aplicado en MVP).           |

### Negative Authorization Scenarios

* Si se detecta secreto en la imagen, en `docker history` o en una capa → bloqueo del PR.
* Si la imagen corre como root → bloqueo del PR.

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

No aplica — esta historia no introduce UI.

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
| Accessibility Notes | N/A   |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | N/A   |

---

## 🛠 Technical Notes

### Frontend

* No aplica — el frontend se despliega por Amplify, sin Dockerfile en MVP (Doc 21, PB-P0-016 Notes).

### Backend

* Use Case / Service: Capacidad técnica de empaquetado (no introduce dominio nuevo).
* Controller / Route: Reutiliza `GET /healthz` del scaffold.
* Authorization Policy: No aplica runtime.
* Validation: No aplica.
* Transaction Required: No.
* Setup esperado:
  * `Dockerfile` multi-stage:
    * Stage `deps`: instala todas las dependencias.
    * Stage `build`: compila TypeScript (`npm run build`) y ejecuta `prisma generate`.
    * Stage `runtime` (final): `FROM node:<lts>-alpine` (o slim), `USER node` (o usuario creado), copia `dist/`, `node_modules` productivas y el client Prisma; `ENV PORT=3000`; `EXPOSE 3000`; `CMD ["node", "dist/server.js"]` (o equivalente del scaffold).
  * `.dockerignore` con la lista mínima de Doc 21 §10.3.

### Database

* Main Tables: —
* Constraints: N/A.
* Index Considerations: N/A.
* Nota: El contenedor consume `DATABASE_URL` desde el entorno; no se ejecuta `prisma migrate` desde la imagen en esta historia (PB-P0-018 lo cubre).

### API

| Method | Endpoint   | Purpose                                                                                |
| ------ | ---------- | -------------------------------------------------------------------------------------- |
| GET    | /healthz   | Health check liviano consumido por App Runner y por el smoke local (provisto por scaffold). |

### Observability / Audit

* Correlation ID Required: No aplica directamente (la imagen no introduce lógica de logs).
* Log Event Required: La aplicación debe seguir emitiendo a `stdout`/`stderr` (App Runner los recoge en CloudWatch — Doc 21 §15). El `Dockerfile` no debe redirigir logs.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type             |
| ----- | --------------------------------------------------------------------------------- | ---------------- |
| TS-01 | `docker build` finaliza sin errores y produce imagen `eventflow-backend:local`.    | Build            |
| TS-02 | `docker run` arranca el contenedor y `GET /healthz` retorna 200.                   | Smoke            |
| TS-03 | `docker exec <id> id -u` retorna UID distinto de `0`.                              | Security smoke   |
| TS-04 | `docker history` no contiene rutas `.env*` ni credenciales.                        | Security smoke   |
| TS-05 | Reconstrucción con cache reutiliza capas de dependencias y Prisma generate.        | Cache validation |

### Negative Tests

| ID    | Scenario                                                                                     | Expected Result                                                       |
| ----- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| NT-01 | Build sin `package-lock.json` (o `pnpm-lock.yaml`).                                           | Fallar el build con mensaje claro.                                    |
| NT-02 | Variable `PORT` no definida en `docker run`.                                                  | El contenedor toma `PORT=3000` por defecto y arranca; logs lo indican. |
| NT-03 | `DATABASE_URL` ausente y la app intenta usar Prisma.                                          | Fallo rápido con mensaje claro; no loop de reintentos.                 |
| NT-04 | Intento de leer un `.env` dentro del contenedor.                                              | El archivo no existe; la app no debe depender de archivos `.env`.     |

### AI Tests

No aplica — esta historia no invoca IA directamente.

### Authorization Tests

| ID         | Scenario                                                          | Expected Result |
| ---------- | ----------------------------------------------------------------- | --------------- |
| AUTH-TS-01 | `docker exec` confirma que el proceso corre como usuario no-root. | Success         |

### Accessibility Tests

No aplica.

---

## 📊 Business Impact

| Field               | Value                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Time-to-deploy, reproducibilidad de builds, foundation DevOps.                                           |
| Expected Impact     | Habilita el pipeline CI/CD (PB-P0-017) y el deploy futuro a App Runner (PB-P2-023..026).                |
| Success Criteria    | Smoke local verde: build sin warnings + container arranca + `/healthz` 200 + no-root + sin secretos.    |
| Academic Demo Value | Foundation — evidencia de deploy reproducible alineado con ADR-DEVOPS-001 y Doc 21.                      |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica (frontend va por Amplify).

### Potential Backend Tasks

* Verificar que el scaffold expone scripts `build` y `start` válidos y que `app` Express arranca con `PORT`.
* Verificar que `prisma generate` está disponible en `package.json`.

### Potential Database Tasks

* No aplica directamente (PB-P0-018 cubre migraciones en pipeline).

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Smoke local de build + run + curl `/healthz`.
* Verificación de no-root y de ausencia de secretos en la imagen.
* Verificación de tamaño/capa razonable.

### Potential DevOps / Config Tasks

* Crear `Dockerfile` multi-stage.
* Crear `.dockerignore` con la lista mínima de Doc 21 §10.3.
* Documentar en `README` cómo construir y correr la imagen localmente y qué variables esperar.
* Definir base image pinneada (ej. `node:20-alpine`).
* Crear script npm opcional `docker:build` y `docker:run` para conveniencia local.

---

## ✅ Definition of Ready

* [x] Rol claro (System / DevOps).
* [x] Goal técnico claro y acotado al Dockerfile y `.dockerignore`.
* [x] Referencias a Docs (21 §10) y ADR-DEVOPS-001.
* [x] Permisos / Seguridad explicitados (SEC-01..05; no-root; sin secretos).
* [x] Entidades listadas (No aplica).
* [x] AC en GWT (8 AC específicos al Dockerfile).
* [x] Edge cases documentados (4).
* [x] Validación clara (5 reglas).
* [x] Out of Scope explícito (ECR, App Runner, CI, frontend, migraciones, multi-arch, distroless).
* [x] Dependencias conocidas (PB-P0-002, ADR-DEVOPS-001).
* [x] UX states marcados N/A.
* [x] API marcada (solo `/healthz` de smoke).
* [x] Tests definidos por verificación de build.
* [ ] Tech Lead validó (gate de aprobación formal).

---

## 🏁 Definition of Done

* [ ] `Dockerfile` multi-stage presente y construye sin warnings.
* [ ] `.dockerignore` presente con la lista mínima.
* [ ] `docker run` responde 200 en `GET /healthz`.
* [ ] Container corre como usuario no-root.
* [ ] Imagen no contiene `.env*` ni credenciales.
* [ ] Documentación en `README` actualizada (build/run/variables).
* [ ] PR revisado por Tech Lead y, si aplica, Security Lead.
* [ ] El pipeline CI (cuando PB-P0-017 esté disponible) puede invocar `docker build` sin cambios adicionales.

---

## 📝 Notes

* La referencia textual a "App Runner / Beanstalk" del borrador original se alinea con **App Runner** únicamente, conforme a ADR-DEVOPS-001 y Doc 21 §10.1; Beanstalk no es el runtime objetivo del MVP.
* El endpoint `/healthz` es el alineado con PB-P0-016 Acceptance Summary y con US-125 AC-02; Doc 21 §10.4 menciona `/health` como alternativa — alineamiento de documentación menor, no bloqueante.
* Si en implementación aparece un módulo nativo problemático en Alpine, preferir `node:LTS-slim` con justificación documentada (EC-03).
* Decisión técnica menor a confirmar con Tech Lead: nombre exacto del archivo de entrada (`dist/server.js`, `dist/main.js`, etc.) según el scaffold de PB-P0-002.
