# Technical Specification — US-133: Dockerfile multi-stage para backend

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-133 |
| Source User Story | `management/user-stories/US-133-backend-dockerfile.md` |
| Decision Resolution Artifact | No existe — decisiones formalizadas en ADR-DEVOPS-001 y Doc 21 §10 |
| Priority | P0 |
| Backlog ID | PB-P0-016 |
| Backlog Title | Dockerfile Backend |
| Backlog Execution Order | 16 (P0) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-133 |
| Epic | EPIC-OPS-001 — Deployment & DevOps on AWS |
| Backlog Item Dependencies | PB-P0-002 (Backend Modular Monolith Bootstrap) |
| Feature | Dockerfile multi-stage (foundation deploy) |
| Module / Domain | DevOps |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P0-016 — Dockerfile Backend` entrega el `Dockerfile` multi-stage del backend Node + Express con build optimizado, capas cacheables, usuario no-root y health check. Acceptance Summary: imagen construye sin warnings; tamaño razonable; container arranca con `/healthz` OK; sin secrets en la imagen. Dependencia única: PB-P0-002.

### Execution Order Rationale

US-133 ocupa la posición 16 dentro de P0 según `4-Product-Backlog-Prioritized.md`. Debe completarse después del scaffold backend (PB-P0-002) y antes de PB-P0-017 (CI), que dependerá de un `docker build` reproducible. PB-P2-023..026 (deploy a App Runner) depende también de este artefacto.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-133 | Dockerfile + `.dockerignore` + smoke local | 1 |

---

## 3. Executive Technical Summary

Crear el `Dockerfile` multi-stage del backend (Node LTS + Express + Prisma) con tres stages (`deps`, `build`, `runtime`), imagen base `node:<lts>-alpine` (fallback `slim` si surgen módulos nativos), usuario no-root, `EXPOSE`/`ENV PORT`, copia exclusiva de artefactos productivos (`dist/`, `node_modules` de producción, Prisma client) y health check vía `GET /healthz` consumido por App Runner en runtime. Acompañar con `.dockerignore` según Doc 21 §10.3. Verificación local: `docker build` sin warnings, `docker run` arranca y responde `/healthz` 200, contenedor corre como no-root, `docker history` sin secretos.

---

## 4. Scope Boundary

### In Scope

* `Dockerfile` multi-stage en el paquete backend.
* `.dockerignore` mínimo (Doc 21 §10.3).
* Default `ENV PORT=3000` + `EXPOSE 3000`.
* `USER` no-root en la stage final.
* `prisma generate` durante el build (no en runtime).
* Scripts npm opcionales `docker:build` y `docker:run` para conveniencia local.
* Documentación en `README` (build, run, variables, troubleshooting Alpine/native).

### Out of Scope

* Push a Amazon ECR y configuración del repositorio (PB-P0-017 / PB-P2-023).
* Configuración del servicio AWS App Runner (PB-P2-023..026).
* GitHub Actions workflow (PB-P0-017).
* Dockerfile para el frontend (Amplify; sin Docker en MVP).
* `docker-compose` u orquestación local.
* Imágenes multi-arch (linux/amd64 cubre App Runner MVP).
* Distroless / optimizaciones avanzadas.
* `prisma migrate deploy` desde la imagen (PB-P0-018).
* Sidecars, service mesh, ECS/EKS/Lambda (Doc 21 §10.8).

### Explicit Non-Goals

* No introducir endpoints nuevos (reutiliza `/healthz` del scaffold).
* No introducir nuevos secretos en el repo.
* No reescribir la app por la imagen.

---

## 5. Architecture Alignment

### Backend Architecture

* Mantiene el modular monolith (Doc 13/14). La imagen solo empaqueta `dist/` compilado + `node_modules` productivos + Prisma client.

### Frontend Architecture

No aplica (frontend va por Amplify).

### Database Architecture

No modifica esquema. La imagen no ejecuta migraciones; consume `DATABASE_URL` en runtime para inicializar Prisma.

### API Architecture

No introduce endpoints. Reutiliza `GET /healthz`.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* USER no-root obligatorio.
* Secretos vía Secrets Manager / SSM en runtime (Doc 21 §10.5).
* Base image pinneada por versión (`node:20-alpine` o equivalente LTS al momento del PR).
* Sin `.env*` ni credenciales en capas.

### Testing Architecture

* Smoke local: `docker build` + `docker run` + `curl /healthz` + `id -u` + `docker history | grep -i 'env\|secret'`.
* Las suites Vitest/Supertest/Playwright (US-125) corren fuera de la imagen.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Build sin warnings | `Dockerfile` multi-stage limpio; sin `ADD` deprecado, sin capas innecesarias; build args válidos. | DevOps |
| AC-02: Tamaño razonable, sin dev-deps | Stage final sólo copia `node_modules` instalado con `npm ci --omit=dev` (o `pnpm install --prod`). | DevOps |
| AC-03: `/healthz` 200 al arrancar | `CMD ["node", "dist/server.js"]` arranca app que ya expone `/healthz` (scaffold); `EXPOSE 3000`. | DevOps, Backend |
| AC-04: Usuario no-root | `USER node` (Alpine ya provee user `node`) o `RUN addgroup -S app && adduser -S app -G app && USER app`. | DevOps / Security |
| AC-05: Sin secretos en imagen | `.dockerignore` excluye `.env*`; no se usan `ARG` con secretos; `docker history` limpio. | DevOps / Security |
| AC-06: `.dockerignore` mínimo | Archivo con la lista de Doc 21 §10.3. | DevOps |
| AC-07: Cacheabilidad | Copiar `package*.json` y `prisma/schema.prisma` antes que el resto del código; `npm ci` antes de copiar `src/`. | DevOps |
| AC-08: Prisma client en runtime | `RUN npx prisma generate` en stage `build`; copiar `node_modules/.prisma` y `node_modules/@prisma/client` a stage final. | DevOps, Backend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Tooling transversal de empaquetado. No introduce módulos de dominio.

### Use Cases / Application Services

No aplica.

### Controllers / Routes

No aplica — reutiliza `GET /healthz`.

### DTOs / Schemas

No aplica.

### Repository / Persistence

* La imagen contiene el Prisma client generado; no ejecuta migraciones.

### Validation Rules

No aplica runtime.

### Error Handling

* App fallará rápido si `DATABASE_URL` no está definida en el momento de inicializar Prisma — responsabilidad del scaffold, documentada como EC-02.

### Transactions

No aplica.

### Observability

* La app debe seguir emitiendo logs a stdout/stderr (App Runner los recoge en CloudWatch — Doc 21 §15). El `Dockerfile` no debe redirigir logs.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

| Method | Endpoint   | Purpose                                                              | Auth Required | Request | Response                             | Error Cases |
|--------|------------|----------------------------------------------------------------------|---------------|---------|--------------------------------------|-------------|
| GET    | `/healthz` | Health check liviano consumido por App Runner y por el smoke local.  | No            | —       | `200 { status: 'ok' }` (según scaffold) | N/A         |

No se introducen endpoints nuevos.

---

## 10. Database / Prisma Design

* Models Impacted: ninguno.
* Migrations Impact: ninguno.
* Seed Impact: ninguno.
* Notas: `prisma generate` se ejecuta en la stage `build`; `prisma migrate deploy` se ejecuta en pipeline (PB-P0-018), no en la imagen.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No aplica runtime.

### Authorization

No aplica runtime.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

* Imagen corre como root → bloqueo PR.
* Imagen contiene `.env*` o credenciales → bloqueo PR.

### Audit Requirements

No aplica.

### Sensitive Data Handling

* Secretos solo en runtime vía Secrets Manager / SSM (Doc 21 §10.5).
* `.gitignore` y `.dockerignore` deben cubrir `.env*`.
* No usar `ARG` para secretos; si fuera necesario, BuildKit `--secret` (no aplicado en MVP).

---

## 13. Testing Strategy

### Unit Tests

No aplica para el Dockerfile (los tests unit los cubre US-125).

### Integration Tests

No aplica.

### API Tests

No aplica (el smoke en runtime es manual con `curl`).

### E2E Tests

No aplica.

### Security Tests

* `id -u` dentro del contenedor → UID distinto de 0.
* `docker history --no-trunc <image>` y `docker run --rm <image> sh -c 'ls -la /; find / -name ".env*" 2>/dev/null'` → sin hallazgos.
* (Opcional, no obligatorio MVP) `trivy` o equivalente para scan de vulnerabilidades.

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

* En PB-P0-017 el pipeline invocará `docker build` y, opcionalmente, smoke local. Esta historia solo entrega el artefacto.

---

## 14. Observability & Audit

* Logs: la app sigue emitiendo a stdout/stderr; el `Dockerfile` no redirige.
* Correlation ID: N/A en la imagen.
* AdminAction: No.
* Error Tracking: N/A.
* Metrics: N/A en esta historia.

---

## 15. Seed / Demo Data Impact

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 21 §10.4 vs PB-P0-016 / US-125 | Doc 21 §10.4 usa `/health`; el resto usa `/healthz`. | `/healthz`. | Actualizar Doc 21 §10.4 o documentar alias. | No |
| PB-P0-016 vs ADR-DEVOPS-001 | PB-P0-016 menciona "App Runner / Elastic Beanstalk"; ADR-DEVOPS-001 fija App Runner. | App Runner único en MVP. | Actualizar redacción del backlog item (cosmético). | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Módulos nativos no compilan en Alpine | Build falla / runtime quiebra | Plan A: instalar libs build mínimas y limpiar en stage final. Plan B: cambiar a `node:LTS-slim` (Debian) con justificación documentada. |
| Cache de `npm`/`pnpm` infla la imagen | Mayor tamaño y descarga lenta en App Runner | `npm ci --no-audit --no-fund` + limpieza explícita; usar `npm prune --production` si aplica. |
| Pinning de imagen base con `latest` o tag flotante | Builds no reproducibles | Pinnear a `node:20-alpine` (LTS) por SHA si Tech Lead lo requiere. |
| `prisma generate` necesita acceso a internet para descargar engines | Build falla en CI offline | Documentar acceso de red en build; usar variable `PRISMA_CLI_BINARY_TARGETS` si aplica. |
| Scaffold no expone entrypoint `dist/server.js` con ese nombre exacto | `CMD` apunta a archivo inexistente | Confirmar entrypoint del scaffold antes del PR; usar variable o `package.json` `start`. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* `apps/backend/Dockerfile` (nuevo) — o `Dockerfile` en la raíz del paquete según convención del scaffold.
* `apps/backend/.dockerignore` (nuevo).
* `apps/backend/package.json` (scripts `docker:build`, `docker:run` opcionales).
* `apps/backend/README.md` y/o `README.md` raíz (sección "Build & Run con Docker").

### Recommended order of implementation

1. Crear `.dockerignore` con la lista de Doc 21 §10.3.
2. Esqueleto `Dockerfile` multi-stage (`deps`, `build`, `runtime`).
3. Stage `deps` y `build`: `npm ci`, `npx prisma generate`, `npm run build`.
4. Stage `runtime`: copia `dist/`, `node_modules` productivas, Prisma client; declarar `USER`, `ENV PORT`, `EXPOSE`, `CMD`.
5. Scripts npm opcionales (`docker:build`, `docker:run`).
6. Documentación `README`.
7. Smoke local AC-01..AC-08.

### Decisions that must not be reopened

* App Runner es el runtime objetivo (ADR-DEVOPS-001).
* Multi-stage con base alpine (o slim si justificado).
* USER no-root obligatorio.
* `/healthz` es el endpoint del health check para esta historia.
* Sin secretos en la imagen; secretos en runtime via Secrets Manager / SSM.

### What must not be implemented

* Push a ECR, configuración App Runner, GitHub Actions, multi-arch, distroless.
* Dockerfile para el frontend.
* `docker-compose` u orquestación local.
* `prisma migrate deploy` en la imagen.

### Assumptions to preserve

* PB-P0-002 expone `npm run build` y `npm start` válidos.
* Prisma schema en `prisma/schema.prisma` con `prisma generate` funcional.
* `/healthz` ya existe en el scaffold y responde sin requerir DB (Doc 21 §10.4 separa `/healthz` liveness y `/readiness` con DB).

---

## 19. Task Generation Notes

### Suggested task groups

* DevOps: crear `Dockerfile`, `.dockerignore`, scripts npm `docker:build`/`docker:run`, base image pinneada.
* Backend (apoyo): verificar entrypoint y `package.json` (`build`, `start`).
* Security: confirmar USER no-root, ausencia de secretos en capas, base image pinneada.
* QA: smoke local AC-01..AC-08 documentado en el PR.
* Documentation: sección "Docker" en `README` con build, run, variables y troubleshooting (Alpine/native).

### Required QA tasks

* `docker build` sin warnings.
* `docker run` + `curl /healthz` 200.
* `docker exec id -u` distinto de 0.
* `docker history` sin secretos.
* Verificación de tamaño orden de magnitud "cientos de MB".

### Required security tasks

* Confirmar USER no-root.
* Confirmar `.dockerignore` excluye `.env*`.
* Confirmar base image pinneada por versión.
* (Recomendación) Scan de vulnerabilidades opcional.

### Required seed/demo tasks

Ninguna.

### Required documentation tasks

* Sección "Docker" en `README` raíz y/o por paquete.

### Dependencies between tasks

* `.dockerignore` antes del `Dockerfile` final (evita filtrar archivos).
* Entrypoint backend confirmado antes del `CMD` del Dockerfile.
* Smoke local solo después de tener Dockerfile + `.dockerignore` + scripts.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

PB-P0-016 contiene una sola User Story (US-133), por lo que un `tasks.md` consolidado es opcional.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La especificación traduce los 8 AC y 4 EC en pasos técnicos concretos, mantiene el alcance "foundation only" definido por la User Story, no introduce decisiones nuevas y se apoya en ADR-DEVOPS-001 y Doc 21 §10. Próximo paso: invocar `eventflow-user-story-to-development-tasks` sobre este archivo.
