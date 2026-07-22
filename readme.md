# EventFlow — Final Project Delivery

## Overview

EventFlow es un MVP de planificación de eventos asistida por IA y gestión simplificada de cotizaciones de proveedores, orientado inicialmente al mercado de Guatemala con visión futura hacia España y LATAM. La documentación disponible posiciona el producto como un workspace web responsive para organizadores, proveedores y administradores, con foco en plan, checklist, presupuesto y flujo estructurado de cotizaciones, evitando documentarlo como marketplace transaccional completo en v1.

Este repositorio contiene una entrega académica **con documentación técnica completa e implementación funcional en curso** del proyecto. La fase actual cubre, de extremo a extremo:

**Documentación (Entregable 1 — completada):**

- Descubrimiento de dominio y decisiones de producto.
- Definición del alcance MVP, reglas de negocio y matriz de roles/permisos.
- Modelo de dominio, casos de uso, FRD y NFR.
- Estrategia de datos semilla (seed) y demo readiness.
- Visión y principios arquitectónicos.
- Arquitectura del sistema (vistas C4).
- Diseño técnico de backend (Node.js + Express + TypeScript + Prisma + PostgreSQL).
- Arquitectura de frontend (Next.js + App Router + TypeScript + TanStack Query + Tailwind).
- Especificación de la API REST (`/api/v1`).
- Arquitectura de IA y PromptOps (`LLMProvider`, `OpenAIProvider`, `MockAIProvider`, `AnthropicProvider` stub).
- Diseño físico de base de datos (PostgreSQL + Prisma).
- Diseño de seguridad y autorización (RBAC + ownership + captcha + cookies HTTP-only).
- Estrategia de testing (Vitest + Supertest + MSW + Playwright + tests deterministas con `MockAIProvider`).
- Diseño de despliegue y DevOps (AWS Amplify + App Runner + RDS + S3 + GitHub Actions).
- Registro formal de 46 ADRs.
- UI/UX Foundations: Visual Language Reference, UI Foundations, Design Tokens y Component Foundations en [`docs/ux-ui/`](./docs/ux-ui/).

**Implementación (Entregable 2 — en curso, foundation P0 y MVP P1 mayoritariamente mergeados):**

- Backend Node.js + Express + TypeScript funcional bajo [`backend/`](./backend/) — bootstrap modular monolith, validación Zod, envelope de error unificado, cookies HTTP-only firmadas, captcha, rate limiting, RBAC + ownership + suite negativa, `LLMProvider` con adapters OpenAI/Mock/Anthropic-stub, PromptOps, seed demo, Docker multi-stage, snapshot OpenAPI 3.x determinista y ~50 endpoints REST bajo `/api/v1`.
- Frontend Next.js 14 App Router + TypeScript funcional bajo [`web/`](./web/) — i18n `next-intl` con 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`), route groups por rol (`(public)`, `(auth)`, `(app)`, `(admin)`), TanStack Query + `httpClient` + MSW, layouts autenticados, navegación, `<RoleGuard>` UX-only, features de dominio del organizer, vendor y admin.
- Prisma schema declarativo, migraciones baseline + índices críticos + constraints físicos, seed demo LATAM idempotente (`is_seed=true`) con reset quirúrgico.
- CI con GitHub Actions (lint, typecheck, unit, integration, e2e, drift de OpenAPI, drift de migraciones, seed idempotency).
- 49 pull requests reales mergeados a `main` (ver [Pull Requests](#pull-requests--historial-real-de-merges) más abajo).

**Pendiente en esta entrega académica:**

- Despliegue a URL pública AWS (Amplify + App Runner + RDS + S3) — provisioning y pipeline CD (PB-P0-017/018 y US-137/139).
- Video demo grabado end-to-end sobre entorno desplegado.
- Cierre de las user stories P1 restantes y del bloque P2/P3 completo.

---

## Local Setup — Cómo levantar el entorno para revisión

> **Guía crítica para el evaluador.** Estas instrucciones permiten levantar EventFlow (backend + base de datos + frontend) de forma local, sin depender de infraestructura desplegada. Todo el stack está en el repositorio y se ejecuta con Node.js + Docker.

### 0. Prerrequisitos

| Herramienta | Versión mínima | Notas |
| ----------- | -------------- | ----- |
| Node.js | **20 LTS** (frontend) · **22+** (backend) | Usar `nvm` para alternar (`.nvmrc` en cada carpeta). |
| npm | 10+ | Gestor canónico (Doc 21 §9.2). No usar pnpm ni yarn. |
| Docker | 24+ | Para PostgreSQL local aislado (opcional pero recomendado). |
| Git | 2.40+ | Para clonar el repositorio. |

Sistemas operativos verificados: macOS (Apple Silicon + Intel), Linux (Debian/Ubuntu). Windows via WSL2.

### 1. Clonar el repositorio

```bash
git clone https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow.git
cd AI4Devs-Final-Project-Eventflow
```

### 2. Levantar PostgreSQL local (Docker)

**Elige tu propia contraseña — nunca commitees credenciales reales.**

```bash
docker run -d --name ef-eventflow \
  -e POSTGRES_USER=AdminEF \
  -e POSTGRES_PASSWORD=<TU_PASSWORD_SEGURA> \
  -e POSTGRES_DB=eventflow \
  -p 5433:5432 postgres:16
```

> El puerto `5433` evita conflicto con un Postgres del host en `5432`. Si prefieres `5432`, ajústalo en el comando y en `DATABASE_URL` más abajo.

Para limpiar el contenedor al terminar: `docker rm -f ef-eventflow`.

### 3. Backend — instalar, migrar, sembrar y arrancar

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` y ajusta como mínimo:

```env
DATABASE_URL="postgresql://AdminEF:<TU_PASSWORD_SEGURA>@localhost:5433/eventflow?schema=public"
SESSION_SECRET="dev_session_secret_min_32_chars_change_me_please_ok"
JWT_SECRET="dev_jwt_secret_min_32_chars_change_me_please_ok_1234"
LLM_PROVIDER=mock            # sin costo de red, determinista
CAPTCHA_PROVIDER=mock        # token válido: '__test__'
SEED_DEMO_ENABLED=true
NODE_ENV=development
CORS_ORIGINS="http://localhost:3000"
```

Instalar dependencias, aplicar migraciones y sembrar datos demo:

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
SEED_DEMO_ENABLED=true LLM_PROVIDER=mock NODE_ENV=development npm run seed
```

Levantar el backend en `http://localhost:3000`:

```bash
npm run dev
# health check
curl http://localhost:3000/health   # → {"status":"ok"}
```

**Verificar** que todo pasa localmente:

```bash
npm test                       # unit + integration (los DB-gated se auto-omiten si no hay Postgres)
npm run typecheck              # strict TypeScript
npm run openapi:check          # el snapshot OpenAPI está actualizado
```

Guía operativa completa: [`backend/README.md`](./backend/README.md) — cubre Docker, migraciones, seed, endpoints AUTH/Event/Quote/AI y snapshot OpenAPI.

### 4. Frontend — instalar y arrancar

En otra terminal:

```bash
cd web
nvm use                        # selecciona Node 20 (ver .nvmrc)
cp .env.local.example .env.local
```

Edita `web/.env.local` y ajusta:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_API_MOCKING=disabled   # apuntar al backend real, no a MSW
```

> **Puerto del frontend.** Next.js por defecto usa `3000`, pero el backend también corre allí. Arranca Next en `3001` con `PORT=3001 npm run dev` (o cambia el puerto del backend en `backend/.env` a `PORT=3001` y deja Next en `3000`; recuerda ajustar `CORS_ORIGINS` y `NEXT_PUBLIC_API_BASE_URL` acordemente).

Instalar y arrancar:

```bash
npm ci
PORT=3001 npm run dev
# abrir http://localhost:3001
```

**Verificar** la suite del frontend:

```bash
npm run lint
npm run typecheck
npm test                        # unit + component (Vitest + Testing Library)
npm run test:e2e:install        # descarga chromium (una vez)
npm run test:e2e                # Playwright E2E
```

Guía completa: [`web/README.md`](./web/README.md).

### 5. Credenciales demo (post-seed)

Después de ejecutar `npm run seed`, la base contiene usuarios demo para probar cada rol. La convención de credenciales y la lista de cuentas están en [`docs/operations/seed.md`](./backend/docs/operations/seed.md) (`backend/docs/operations/seed.md`). Al iniciar sesión, el captcha en modo `mock` acepta el token literal `__test__`.

### 6. Troubleshooting rápido

| Síntoma | Causa probable | Solución |
| ------- | -------------- | -------- |
| `EADDRINUSE :3000` en Next | Backend usando el mismo puerto | Arrancar Next con `PORT=3001` (ver arriba). |
| Backend falla al boot con `SESSION_SECRET must be at least 32 chars` | Secret demasiado corto en `.env` | Usar cualquier string ≥ 32 caracteres. |
| `prisma migrate deploy` no conecta | `DATABASE_URL` apuntando al puerto/host equivocado | Verificar `docker ps` y que el contenedor `ef-eventflow` está `Up`. |
| Frontend muestra `401` en login válido | Cookies HTTP-only bloqueadas | Confirmar `CORS_CREDENTIALS=true` en backend y `CORS_ORIGINS=http://localhost:3001`. |
| `npm run seed` termina con exit `2` | Falta `SEED_DEMO_ENABLED=true` o hay drift de migraciones | Reejecutar con la variable + validar `npm run db:migrate:status`. |
| Tests E2E fallan con "browser not installed" | Playwright chromium no descargado | `npm run test:e2e:install`. |

### 7. Pipeline canónico local (todo en verde)

```bash
# Backend
cd backend && npm ci && npm run typecheck && npm test && npm run openapi:check

# Frontend
cd ../web && npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

Este es el mismo pipeline que corre en GitHub Actions en cada PR (Doc 21 §9.2). Si todo termina en verde localmente, el entorno está listo para revisar la aplicación en el browser.

---

## Evaluator Flows Guide — flujos principales por rol

Una vez el entorno local está arriba, la guía [`docs/Evaluator-Flows-Guide.md`](./docs/Evaluator-Flows-Guide.md) propone un **guion de pruebas paso a paso** para que el evaluador recorra las capacidades MVP sin tener que reconstruirlas desde el backlog. Contiene:

- Credenciales demo listas para usar (`admin@seed.eventflow.test`, `organizer0..5@seed.eventflow.test`, `vendor0..11@seed.eventflow.test`, contraseña compartida `Demo1234!`).
- **§1 Flujo público** — landing, directorio de vendors, SEO, locale switcher.
- **§2 Flujo Auth** — registro, login, logout, forgot/reset password, rate limits y captcha.
- **§3 Flujo Organizer** — crear evento → IA HITL (plan/checklist/presupuesto/categorías) → cotizaciones → comparador → aceptar Quote → BookingIntent → review verificado.
- **§4 Flujo Vendor** — onboarding, portafolio, servicios, AI bio, responder cotizaciones, confirmar/cancelar bookings.
- **§5 Flujo Admin** — moderación de vendors y reviews, CRUD de catálogos, vista read-only de eventos, dashboard de métricas, log de `AdminAction`, reset demo.
- **§6 Flujos negativos** — evidencia rápida de guardrails (401/403/404 masked/409/410/429/503) y drift gates.
- **§7 Verificación no-visual** — comandos exactos para correr las suites de pruebas (backend + frontend + E2E).
- **§8 Trazabilidad** — mapeo de cada flujo a las User Stories, Documentos y ADRs de origen.

Cada sección cierra con un checklist ✅ concreto que el evaluador puede marcar.

---

## Delivery Index

Paquete académico final disponible en `/deliverables`:

| # | Documento | Resumen ejecutivo | Documentos fuente principales | Link |
|---:|---|---|---|---|
| 0 | Ficha del proyecto | Identidad del proyecto, autor, descripción breve, estado de URL y repositorio. | Discovery, MVP Scope, Architecture Vision. | [Ver](./deliverables/0-Ficha-del-proyecto.md) |
| 1 | Descripción general del producto | Objetivo del MVP, módulos funcionales documentados, experiencia esperada por rol, instalación pendiente. | Discovery, MVP Scope, FRD, AI Features. | [Ver](./deliverables/1-Descripcion-general-del-producto.md) |
| 2 | Arquitectura del sistema | Estilo (Modular Monolith + Clean/Hex), C4 L1/L2/L3, componentes, seguridad y despliegue planeado. | Architecture Vision, System Architecture, Backend/Frontend Technical Design, DevOps. | [Ver](./deliverables/2-Arquitectura-del-sistema.md) |
| 3 | Modelo de datos | Entidades MVP, reglas clave de integridad y diagrama ER alineado con el diseño físico Prisma + PostgreSQL. | Domain Data Model, Database Physical Design, Seed Strategy, AI Architecture. | [Ver](./deliverables/3-Modelo-de-datos.md) |
| 4 | Especificación de la API | Principios REST, módulos del API, endpoints representativos y disposición para OpenAPI 3.1. | API Design Specification, Backend Technical Design, Security Design. | [Ver](./deliverables/4-Especificacion-de-la-API.md) |
| 5 | Historias de usuario | Backlog curado por épica, con criterios de aceptación y trazabilidad a FRD/Use Cases. | FRD, Use Cases, Business Rules, AI Features, Security Design. | [Ver](./deliverables/5-Historias-de-usuario.md) |
| 6 | Tickets de trabajo | Backlog técnico organizado por área (backend, frontend, DB, IA, seguridad, testing, DevOps, docs). | Backend/Frontend Technical Design, AI Architecture, Database Physical Design, Testing Strategy, DevOps Design. | [Ver](./deliverables/6-Tickets-de-trabajo.md) |
| 7 | Pull requests | Plan recomendado de PRs por fase de implementación con estado de evidencia. | Architecture, Backend, Frontend, DevOps, Testing. | [Ver](./deliverables/7-Pull-requests.md) |

---

## Project Documentation Index

Documentación completa del proyecto en `/docs`, en orden lógico de generación:

| # | Documento | Propósito | Link |
|---:|---|---|---|
| 1 | Domain Discovery Report | Define el problema, dominio, actores, oportunidades y recomendación estratégica inicial. | [Ver](./docs/1-Domain-Discovery-Report.md) |
| 2 | Product Owner Decisions | Consolida decisiones formales de producto que delimitan el MVP. | [Ver](./docs/2-Product-Owner-Decisions.md) |
| 3 | MVP Scope Definition | Define alcance MoSCoW, módulos incluidos/excluidos y criterios de éxito. | [Ver](./docs/3-MVP-Scope-Definition.md) |
| 4 | Business Rules Document | Cataloga las reglas BR-* enforced en backend, IA y base de datos. | [Ver](./docs/4-Business-Rules-Document.md) |
| 5 | User Roles & Permissions Matrix | Matriz RBAC + ownership por entidad para `organizer`, `vendor` y `admin`. | [Ver](./docs/5-User-Roles-Permissions-Matrix.md) |
| 6 | Domain Data Model | Entidades, relaciones, estados y reglas del dominio. | [Ver](./docs/6-Domain-Data-Model.md) |
| 7 | AI Features Specification | Capacidades IA aprobadas, abstracción `LLMProvider`, human-in-the-loop. | [Ver](./docs/7-AI-Features-Specification.md) |
| 8 | Use Cases Specification | Casos de uso por módulo, flujos críticos y validaciones. | [Ver](./docs/8-Use-Cases-Specification.md) |
| 8.1 | PO Decisions — Use Cases Addendum | 19 decisiones formales de PO sobre IA, captcha, currency, rating, validez y soft delete. | [Ver](./docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md) |
| 8.2 | Documentation Alignment Review | Validación de coherencia documental previa al FRD. | [Ver](./docs/8.2-Documentation-Alignment-Review-Before-FRD.md) |
| 9 | Functional Requirements Document | FR-* por módulo derivados de use cases y reglas de negocio. | [Ver](./docs/9-Functional-Requirements-Document.md) |
| 10 | Non-Functional Requirements | NFR de performance, seguridad, IA, i18n, accesibilidad, observabilidad y despliegue. | [Ver](./docs/10-Non-Functional-Requirements.md) |
| 11 | Data Seed Strategy | Estrategia seed reproducible para demo, QA y desarrollo (`is_seed`, reset surgical). | [Ver](./docs/11-Data-Seed-Strategy.md) |
| 12 | Architecture Vision & Principles | Decisión arquitectónica principal (Modular Monolith + Clean/Hex + REST + PostgreSQL + LLMProvider). | [Ver](./docs/12-Architecture-Vision-and-Principles.md) |
| 13 | System Architecture Document | Vistas C4 L1/L2/L3, contenedores, módulos backend, runtime flows. | [Ver](./docs/13-System-Architecture-Document.md) |
| 14 | Backend Technical Design | Capas (Interface/Application/Domain/Ports/Infrastructure), módulos, use cases, DTOs, errores, transacciones. | [Ver](./docs/14-Backend-Technical-Design.md) |
| 15 | Frontend Architecture Design | Next.js + App Router, feature-first, áreas autenticadas vs públicas SEO, integración REST y AI UX. | [Ver](./docs/15-Frontend-Architecture-Design.md) |
| 16 | API Design Specification | Contrato REST `/api/v1`, envelopes, errores, paginación, matriz de autorización por endpoint. | [Ver](./docs/16-API-Design-Specification.md) |
| 17 | AI Architecture & PromptOps Design | `LLMProvider`, adapters, prompt registry, JSON estricto, fallback, timeout 60s, demo mode. | [Ver](./docs/17-AI-Architecture-and-PromptOps-Design.md) |
| 18 | Database Physical Design | PostgreSQL 15+ con Prisma, UUID v4, enums nativos, JSONB acotado, índices query-driven. | [Ver](./docs/18-Database-Physical-Design.md) |
| 19 | Security & Authorization Design | Cookies HTTP-only, captcha, rate limit, RBAC + ownership + assignment, `AdminAction`. | [Ver](./docs/19-Security-and-Authorization-Design.md) |
| 20 | Testing Strategy | Pirámide de pruebas, Vitest + Supertest + MSW + Playwright + tests negativos de autorización. | [Ver](./docs/20-Testing-Strategy.md) |
| 21 | Deployment & DevOps Design | AWS (Amplify + App Runner + RDS + S3 + CloudWatch), Docker, GitHub Actions, entornos. | [Ver](./docs/21-Deployment-and-DevOps-Design.md) |
| 22 | Architecture Decision Records | 46 ADRs formales en 9 categorías (Architecture, Backend, Frontend, DB, AI, Security, API, Testing, DevOps). | [Ver](./docs/22-Architecture-Decision-Records.md) |

### UI/UX Foundations ([`docs/ux-ui/`](./docs/ux-ui/))

Fundamentos visuales y de interacción del MVP, derivados del análisis Figma referencial y trazables a Doc 15 (Frontend Architecture) y Doc 10 (NFR — accesibilidad WCAG 2.1 AA).

| # | Documento | Propósito | Link |
|---:|---|---|---|
| UX-0 | Visual Language Reference | Análisis del diseño Figma referencial (solo inspiración; nada de branding ni assets reutilizados). | [Ver](./docs/ux-ui/EventFlow-Visual-Language-Reference.md) |
| UX-1 | UI Foundations | Fundamentos visuales, de interacción, tono y personalidad UI del MVP (UI-DEC-001..UI-DEC-015). | [Ver](./docs/ux-ui/EventFlow-UI-Foundations.md) |
| UX-2 | Design Tokens | Tokens primitivos, semánticos y alias mínimo de componente (light theme MVP). | [Ver](./docs/ux-ui/EventFlow-Design-Tokens.md) |
| UX-3 | Component Foundations | Anatomía, variantes, estados, accesibilidad y binding de tokens de los componentes MVP. | [Ver](./docs/ux-ui/EventFlow-Component-Foundations.md) |

---

## Prompt Index

Prompts usados para generar y mantener la documentación, en `/prompts`:

| Prompt | Genera o actualiza | Técnica principal | Link |
|---|---|---|---|
| `0-system-prompt.md` | System prompt base reutilizable para el resto de prompts del proyecto. | Role-based prompting + traceability-first. | [Ver](./prompts/0-system-prompt.md) |
| `1-Domain-Discovery-Report.md` | Domain Discovery Report. | AAA prompting + role-based. | [Ver](./prompts/1-Domain-Discovery-Report.md) |
| `2-Generate-MVP-Scope-Definition.md` | MVP Scope Definition (MoSCoW). | AAA prompting + context-grounded generation. | [Ver](./prompts/2-Generate-MVP-Scope-Definition.md) |
| `3-Generate-Business-Rules.md` | Business Rules Document. | Context-grounded generation + traceability-first. | [Ver](./prompts/3-Generate-Business-Rules.md) |
| `4-User-Roles-Permissions-Matrix.md` | RBAC + ownership matrix. | Role-based prompting + matrix decomposition. | [Ver](./prompts/4-User-Roles-Permissions-Matrix.md) |
| `5-Generate-Domain-Data-Model.md` | Domain Data Model. | Context-grounded generation + traceability-first. | [Ver](./prompts/5-Generate-Domain-Data-Model.md) |
| `6-Generate-AI-features.md` | AI Features Specification. | AAA prompting + human-in-the-loop constraints. | [Ver](./prompts/6-Generate-AI-features.md) |
| `7-Generate-Use-Cases-Specification.md` | Use Cases Specification. | Context-grounded generation + traceability-first. | [Ver](./prompts/7-Generate-Use-Cases-Specification.md) |
| `7.1-Review-and-Update-Documentation-Before-FRD.md` | Coherence review previo al FRD. | Documentation alignment prompting. | [Ver](./prompts/7.1-Review-and-Update-Documentation-Before-FRD.md) |
| `8-Generate-Functional-Requirements-FRD.md` | Functional Requirements Document. | Implementation-ready technical design prompting. | [Ver](./prompts/8-Generate-Functional-Requirements-FRD.md) |
| `9-Generate-Non-Functional-Requirements.md` | Non-Functional Requirements. | AAA prompting + traceability-first. | [Ver](./prompts/9-Generate-Non-Functional-Requirements.md) |
| `11-Generate-Data-Seed-Strategy.md` | Data Seed Strategy. | Implementation-ready technical design prompting. | [Ver](./prompts/11-Generate-Data-Seed-Strategy.md) |
| `12-Generate-Architecture-Vision-and-Principles.md` | Architecture Vision & Principles. | Architecture decision prompting + role-based. | [Ver](./prompts/12-Generate-Architecture-Vision-and-Principles.md) |
| `13-Generate-System-Architecture.md` | System Architecture Document (C4). | Architecture decision prompting + C4 modeling. | [Ver](./prompts/13-Generate-System-Architecture.md) |
| `14-Generate-Backend-Technical-Design.md` | Backend Technical Design Document. | Implementation-ready technical design prompting. | [Ver](./prompts/14-Generate-Backend-Technical-Design.md) |
| `15-Frontend-Architecture-Design.md` | Frontend Architecture Design. | Implementation-ready technical design prompting. | [Ver](./prompts/15-Frontend-Architecture-Design.md) |
| `16-Generate-API-Design-Specification.md` | API Design Specification. | Implementation-ready technical design prompting. | [Ver](./prompts/16-Generate-API-Design-Specification.md) |
| `17-Generate-AI-Architecture-Prompts-Design.md` | AI Architecture & PromptOps Design. | Architecture decision prompting + PromptOps discipline. | [Ver](./prompts/17-Generate-AI-Architecture-Prompts-Design.md) |
| `18-Generate-Database-Physical-Design.md` | Database Physical Design. | Implementation-ready technical design prompting. | [Ver](./prompts/18-Generate-Database-Physical-Design.md) |
| `19-Generate-Security-Authorization-Design.md` | Security & Authorization Design. | Security review prompting + traceability-first. | [Ver](./prompts/19-Generate-Security-Authorization-Design.md) |
| `20-Generate-Testing-Strategy.md` | Testing Strategy. | Implementation-ready technical design prompting. | [Ver](./prompts/20-Generate-Testing-Strategy.md) |
| `21-Generate-Deployment-and-DevOps-Design.md` | Deployment & DevOps Design. | Architecture decision prompting + implementation-ready. | [Ver](./prompts/21-Generate-Deployment-and-DevOps-Design.md) |
| `22-Generate-ADR-Design.md` | Architecture Decision Records Log. | Architecture decision prompting + traceability-first. | [Ver](./prompts/22-Generate-ADR-Design.md) |
| `23-Generate-Epic-Map-Document.md` | EventFlow Epic Map. | AAA prompting + backlog engineering. | [Ver](./prompts/23-Generate-Epic-Map-Document.md) |
| `24-Generate-User-Stories.md` | Catálogo completo de User Stories MVP (150 historias). | AAA prompting + traceability-first. | [Ver](./prompts/24-Generate-User-Stories.md) |
| `25-Generate-Product-Backlog-Prioritized.md` | Product Backlog Prioritized (P0–P4). | AAA prompting + prioritization framework. | [Ver](./prompts/25-Generate-Product-Backlog-Prioritized.md) |
| `26-Generate-Development-Conventions.md` | `DEVELOPMENT_CONVENTIONS.md` root — contrato operativo de código. | AAA prompting + repo-grounded consolidation. | [Ver](./prompts/26-Generate-Development-Conventions.md) |
| `27-Create-Skill-Execute-Development.md` | Skill `.claude/skills/eventflow-execute-development-tasks/`. | Role-based prompting + skill design contract. | [Ver](./prompts/27-Create-Skill-Execute-Development.md) |
| `28-Create-ClaudeCode-Command.md` | Comando `/execute-development-tasks` en `.claude/commands/`. | Command-as-thin-wrapper prompting. | [Ver](./prompts/28-Create-ClaudeCode-Command.md) |
| `29-visual-analysis-figma-design.md` | Visual Language Reference (`docs/ux-ui/EventFlow-Visual-Language-Reference.md`) via Figma MCP. | MCP-grounded visual analysis. | [Ver](./prompts/29-visual-analysis-figma-design.md) |
| `30-Generate-UI-foundations-Artifact.md` | UI Foundations (`docs/ux-ui/EventFlow-UI-Foundations.md`). | Design decision prompting + traceability. | [Ver](./prompts/30-Generate-UI-foundations-Artifact.md) |
| `31-Generate-Design-Tokens.md` | Design Tokens (`docs/ux-ui/EventFlow-Design-Tokens.md`). | Token taxonomy prompting. | [Ver](./prompts/31-Generate-Design-Tokens.md) |
| `32-Generate-Component-Foundations.md` | Component Foundations (`docs/ux-ui/EventFlow-Component-Foundations.md`). | Component contract prompting. | [Ver](./prompts/32-Generate-Component-Foundations.md) |

> Catálogo ejecutivo complementario del autor: [`prompts/wacl-prompts.md`](./prompts/wacl-prompts.md).

### Prompts de management — User Story Lifecycle

Los prompts en [`/prompts/management/`](./prompts/management/) orquestan el ciclo de vida iterativo de cada User Story. Cada uno invoca una EventFlow Skill específica (ver siguiente sección):

| Prompt | Skill invocada | Output observado |
|---|---|---|
| [`1-User-Stories-Refinement.md`](./prompts/management/1-User-Stories-Refinement.md) | `eventflow-user-story-refinement` | Refina User Story + crea `refinement-reviews/` cuando hay blocking questions. |
| [`1.5-po-ba-decision-resolver.md`](./prompts/management/1.5-po-ba-decision-resolver.md) | `eventflow-po-ba-decision-resolver` | Resuelve preguntas pendientes + crea `decision-resolutions/`. |
| [`2-User-Story-Approval.md`](./prompts/management/2-User-Story-Approval.md) | `eventflow-user-story-approval` | Approval Gate formal (Status → Approved). |
| [`2.5-User-Story-Tech-Spec.md`](./prompts/management/2.5-User-Story-Tech-Spec.md) | `eventflow-user-story-technical-spec` | Genera Technical Specification bajo `technical-specs/<PRIORITY>/<BACKLOG_ID>/`. |
| [`3-User-Story-to-Development.md`](./prompts/management/3-User-Story-to-Development.md) | `eventflow-user-story-to-development-tasks` | Genera Development Tasks bajo `development-tasks/<PRIORITY>/<BACKLOG_ID>/`. |

Para el catálogo ejecutivo completo de prompts, ver [`prompts.md`](./prompts.md).

---

## Management Artifacts

La carpeta [`/management/`](./management/) contiene los artifacts de planning, backlog engineering y User Story lifecycle generados a partir de los prompts 23–25 y los prompts de management.

| Artifact o carpeta | Ubicación real | Propósito inferido desde su contenido | Estado |
| ------------------ | -------------- | ------------------------------------- | ------ |
| Epic Map | [`management/artifacts/1-EventFlow-Epic-Map.md`](./management/artifacts/1-EventFlow-Epic-Map.md) | Agrupa capacidades MVP en épicas trazables hacia FRD/UC/Entidades. | Existente |
| User Stories Coverage Matrix | [`management/artifacts/2-User-Stories-Coverage-Matrix.md`](./management/artifacts/2-User-Stories-Coverage-Matrix.md) | Matriz de cobertura US ↔ FRD/UC/BR/NFR. | Existente |
| Product Backlog Prioritization Input | [`management/artifacts/3-Product-Backlog-Prioritization-Input.md`](./management/artifacts/3-Product-Backlog-Prioritization-Input.md) | Insumos para priorización (valor, riesgo, dependencias). | Existente |
| Product Backlog Prioritized | [`management/artifacts/4-Product-Backlog-Prioritized.md`](./management/artifacts/4-Product-Backlog-Prioritized.md) | Backlog priorizado en P0–P4 con items `PB-P<priority>-<NNN>`. | Existente |
| User Story Template | [`management/templates/user-story.tpl.md`](./management/templates/user-story.tpl.md) | Plantilla canónica utilizada por las 150 User Stories. | Existente |
| User Stories (catálogo) | [`management/user-stories/`](./management/user-stories/) — `US-001-*.md` … `US-150-*.md` + [`README.md`](./management/user-stories/README.md) | 150 User Stories del MVP siguiendo la plantilla. | Existente — 150 historias archivadas |
| Refinement Reviews | [`management/user-stories/refinement-reviews/`](./management/user-stories/refinement-reviews/) | Artifacts generados por `eventflow-user-story-refinement` cuando existen blocking questions. | Existente — observado para `US-099`, `US-100` |
| Decision Resolutions | [`management/user-stories/decision-resolutions/`](./management/user-stories/decision-resolutions/) | Artifacts generados por `eventflow-po-ba-decision-resolver` con las decisiones PO/BA formalizadas. | Existente — observado para `US-099`, `US-100` |
| Technical Specifications | [`management/technical-specs/P0/PB-P0-001/`](./management/technical-specs/P0/PB-P0-001/) | Specs técnicas por User Story aprobada bajo `<PRIORITY>/<BACKLOG_ID>/`. | Existente — observado para `US-099`, `US-100` |
| Development Tasks | [`management/development-tasks/P0/PB-P0-001/`](./management/development-tasks/P0/PB-P0-001/) | Desglose de tareas por área (DB/BE/QA/SEC/OPS/DOC) listo para Sprint Planning. | Existente — observado para `US-099`, `US-100` |

> El flujo end-to-end (refinement → decision resolution → approval → technical spec → development tasks) está completo a la fecha para **US-099** y **US-100** dentro del backlog item `PB-P0-001`. Las 148 User Stories restantes existen archivadas pero no han recorrido el lifecycle completo todavía.

---

## EventFlow Skills

La carpeta [`/.skills/`](./.skills/) contiene las EventFlow Skills reutilizables que encapsulan la lógica invocada por los prompts. Cada skill vive en su propio directorio con un `SKILL.md` que define propósito, inputs/outputs y reglas.

| Skill | Ubicación real | Propósito | Cuándo usarla | Output esperado |
| ----- | -------------- | --------- | ------------- | --------------- |
| `eventflow-domain-discovery` | [`.skills/eventflow-domain-discovery/SKILL.md`](./.skills/eventflow-domain-discovery/SKILL.md) | Define dominio de negocio, alcance MVP, oportunidades IA, journeys, entidades, reglas, riesgos y recomendación estratégica. | Discovery / product definition / domain analysis / MVP planning. | Insumos para el Domain Discovery Report (`docs/1`). |
| `eventflow-user-story-refinement` | [`.skills/eventflow-user-story-refinement/SKILL.md`](./.skills/eventflow-user-story-refinement/SKILL.md) | Refinement & PO/BA review de User Stories. Determina si la historia es clara, valiosa, testable, trazable y MVP-safe. | Después de generar una User Story, antes del Approval Gate. | Update in-place + opcional `refinement-reviews/US-<id>-refinement-review.md`. |
| `eventflow-po-ba-decision-resolver` | [`.skills/eventflow-po-ba-decision-resolver/SKILL.md`](./.skills/eventflow-po-ba-decision-resolver/SKILL.md) | Resuelve preguntas pendientes PO/BA, formaliza decisiones y crea Decision Resolution artifact. | Cuando el refinement retorna `Needs Refinement` con blocking questions. | Update User Story + `decision-resolutions/US-<id>-decision-resolution.md`. |
| `eventflow-user-story-approval` | [`.skills/eventflow-user-story-approval/SKILL.md`](./.skills/eventflow-user-story-approval/SKILL.md) | Approval Gate formal PO/BA contra Definition of Ready. | Después del refinement (y decision resolution si aplica), antes de generar Technical Spec. | Status → Approved / Needs Changes / Blocked / Split Required. |
| `eventflow-user-story-technical-spec` | [`.skills/eventflow-user-story-technical-spec/SKILL.md`](./.skills/eventflow-user-story-technical-spec/SKILL.md) | Technical Specification de la User Story aprobada. No genera código. | Después del Approval Gate, antes del desglose de tareas. | `management/technical-specs/<PRIORITY>/<BACKLOG_ID>/US-<id>-technical-spec.md`. |
| `eventflow-user-story-to-development-tasks` | [`.skills/eventflow-user-story-to-development-tasks/SKILL.md`](./.skills/eventflow-user-story-to-development-tasks/SKILL.md) | Desglose en Development Tasks listas para Sprint Planning. | Después de la Technical Specification. | `management/development-tasks/<PRIORITY>/<BACKLOG_ID>/US-<id>-development-tasks.md`. |
| `eventflow-user-story-delivery-workflow` | [`.skills/eventflow-user-story-delivery-workflow/SKILL.md`](./.skills/eventflow-user-story-delivery-workflow/SKILL.md) | Orquesta el ciclo de vida completo end-to-end (refinement → decision resolution → approval → tech spec → dev tasks). | Cuando se quiere procesar una User Story de punta a punta sin invocar cada skill manualmente. | Encadenamiento de artifacts de las skills anteriores. |
| `eventflow-execute-development-tasks` | [`.claude/skills/eventflow-execute-development-tasks/SKILL.md`](./.claude/skills/eventflow-execute-development-tasks/SKILL.md) — **project-scoped** | Ejecuta las Development Tasks reales sobre el código (backend + frontend), con execution records reanudables, validation gates y actualización del índice global. | Después de tener Tech Spec + Dev Tasks aprobadas, para materializar la User Story en el repositorio. | `management/workflows/development-execution/<PRIORITY>/<BACKLOG_ID>/US-<id>-execution.md` + cambios reales en `backend/`, `web/`, `prisma/`, `tests/`. |

---

## Claude Code Commands

Los comandos en [`.claude/commands/`](./.claude/commands/) son puntos de entrada cortos que invocan las EventFlow Skills. Todos son **user-invocable** vía `/nombre-comando`.

| Comando | Skill invocada | Argumentos | Propósito |
| ------- | -------------- | ---------- | --------- |
| [`/refine-user-story`](./.claude/commands/refine-user-story.md) | `eventflow-user-story-refinement` | `<user-story-path>` | Refina una User Story y (si aplica) genera un `refinement-review`. |
| [`/resolve-user-story-decisions`](./.claude/commands/resolve-user-story-decisions.md) | `eventflow-po-ba-decision-resolver` | `<user-story-path>` | Resuelve blocking questions y produce `decision-resolutions/`. |
| [`/approve-user-story`](./.claude/commands/approve-user-story.md) | `eventflow-user-story-approval` | `<user-story-path>` | Approval Gate formal (Status → Approved / Needs Changes / Blocked / Split Required). |
| [`/generate-technical-spec`](./.claude/commands/generate-technical-spec.md) | `eventflow-user-story-technical-spec` | `<user-story-path>` | Genera la Technical Specification. |
| [`/generate-development-tasks`](./.claude/commands/generate-development-tasks.md) | `eventflow-user-story-to-development-tasks` | `<user-story-path>` `<tech-spec-path>` | Desglosa la US aprobada en tasks por área. |
| [`/execute-development-tasks`](./.claude/commands/execute-development-tasks.md) | `eventflow-execute-development-tasks` | `<user-story-path>` `<tech-spec-path>` `<tasks-path>` | Ejecuta las Development Tasks reales sobre el repositorio con execution records reanudables. |
| [`/process-user-story`](./.claude/commands/process-user-story.md) | `eventflow-user-story-delivery-workflow` | `<user-story-path>` | Ejecuta el ciclo completo refinement → approval → tech spec → dev tasks. |

---

## Recommended Workflow

La estructura real del repositorio permite deducir el siguiente flujo end-to-end:

### Fase 1 — Documentación SDLC (prompts 0–22)

Generación secuencial de `/docs/1` a `/docs/22` siguiendo el orden numérico de los prompts. La cadena documental está descrita en detalle en [`prompts.md`](./prompts.md) §7. Esta fase está **completa**.

### Fase 2 — Backlog engineering (prompts 23–25)

1. Prompt `23-Generate-Epic-Map-Document.md` → `management/artifacts/1-EventFlow-Epic-Map.md`.
2. Prompt `24-Generate-User-Stories.md` → 150 archivos `US-001-*.md` … `US-150-*.md` + `management/artifacts/2-User-Stories-Coverage-Matrix.md`.
3. Prompt `25-Generate-Product-Backlog-Prioritized.md` → `management/artifacts/3-Product-Backlog-Prioritization-Input.md` + `management/artifacts/4-Product-Backlog-Prioritized.md`.

Esta fase está **completa**.

### Fase 3 — User Story Lifecycle (prompts de management, iterativo por historia)

Para cada User Story:

```text
1. prompts/management/1-User-Stories-Refinement.md
   → invoca eventflow-user-story-refinement
2. prompts/management/1.5-po-ba-decision-resolver.md (si hay blocking questions)
   → invoca eventflow-po-ba-decision-resolver
3. prompts/management/1-User-Stories-Refinement.md (segunda pasada opcional de validación)
4. prompts/management/2-User-Story-Approval.md
   → invoca eventflow-user-story-approval (Status → Approved)
5. prompts/management/2.5-User-Story-Tech-Spec.md
   → invoca eventflow-user-story-technical-spec
6. prompts/management/3-User-Story-to-Development.md
   → invoca eventflow-user-story-to-development-tasks
```

Esta fase está **completa a nivel de artifacts** (refinement → decision resolution → approval → tech spec → dev tasks) para las **150 User Stories** distribuidas en `PB-P0-*`, `PB-P1-*`, `PB-P2-*` y `PB-P3-*` (PRs #3, #4, #5, #6). La ejecución de código posterior — invocada con `/execute-development-tasks` y la skill `eventflow-execute-development-tasks` — está mergeada para todo el bloque P0 (PRs [#7](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/7)–[#16](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/16)) y la mayor parte del bloque P1 (PRs [#17](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/17)–[#49](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/49)). P2 y P3 tienen tech specs + dev tasks listos y ejecución pendiente.

### Workflow observations

- El orden Fase 1 → Fase 2 → Fase 3 se deduce de la numeración de prompts y de la cadena de dependencias declarada en los propios archivos.
- El orden dentro de la Fase 3 se confirma por las invocaciones explícitas de skills en cada prompt de management.
- La prioridad y orden de ejecución de las User Stories **no** sigue la numeración `US-<id>`, sino el `Backlog Execution Order` definido en `management/artifacts/4-Product-Backlog-Prioritized.md` (regla explicitada por el skill `eventflow-user-story-to-development-tasks`).

---

## Traceability

El proyecto conecta cinco capas mediante referencias verificables en archivos reales:

```text
Prompts (/prompts/, /prompts/management/)
   ↓ generan
Documentation (/docs/1 … /docs/22)
   ↓ alimenta
Management artifacts (/management/artifacts/, /management/templates/)
   ↓ derivan
User Stories (/management/user-stories/US-001..US-150)
   ↓ procesadas vía
EventFlow Skills (/.skills/)
   ↓ producen
Development outputs (/management/technical-specs/, /management/development-tasks/)
```

Cada User Story refinada contiene referencias `Traceability` hacia FRD, Use Cases, Business Rules, NFRs y ADRs reales en `/docs/`. Cada Technical Spec y cada Development Tasks file mapea cada AC a un section del spec y cada task a ≥1 AC + ≥1 section del Technical Spec.

---

## Academic / Portfolio Readiness

Este repositorio está organizado para:

- **Evaluación académica:** documentación SDLC completa, trazabilidad explícita, decisiones formalizadas y deliverables empaquetados.
- **Trazabilidad documental:** cada artifact referencia explícitamente sus fuentes (Discovery → MVP Scope → Business Rules → … → ADRs → Epic Map → User Stories → Technical Spec → Development Tasks).
- **Generación asistida por IA:** todo prompt está versionado en `/prompts/` y cada skill EventFlow en `/.skills/` con su `SKILL.md` documentado.
- **Planificación de desarrollo:** Product Backlog Prioritized + 150 User Stories + Technical Specs + Development Tasks listos para Sprint Planning.
- **Evidencia de prompts:** [`prompts.md`](./prompts.md) actúa como catálogo ejecutivo con técnica de prompting, inputs y outputs reales.
- **Evidencia de arquitectura:** 46 ADRs formales en [`docs/22-Architecture-Decision-Records.md`](./docs/22-Architecture-Decision-Records.md) + decisiones PO/BA en `decision-resolutions/`.
- **Preparación para implementación:** Technical Specs y Development Tasks para `US-099` y `US-100` (`PB-P0-001`) listos para Sprint Planning; el resto del catálogo aguarda procesamiento iterativo.

---

## Pull Requests — historial real de merges

Fuente autoritativa: [https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pulls?state=all](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pulls?state=all). A la fecha de esta actualización hay **49 PRs** (48 mergeados a `main`, 1 cerrado sin merge, 0 abiertos). El plan de PRs recomendado sigue en [`deliverables/7-Pull-requests.md`](./deliverables/7-Pull-requests.md); los merges reales siguieron el `Backlog Execution Order` de `management/artifacts/4-Product-Backlog-Prioritized.md`.

### Entregables académicos y foundation de management

| PR | Título | Rama | Estado |
|---:|---|---|---|
| [#1](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/1) | Entregable 1 — Documentación base SDLC | `feature/Entregable1-WACL` | Merged |
| [#2](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/2) | Entregable 2 — Documentación, backlog y workflow de management | `feature/Entregable2-WACL` | Merged |
| [#3](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/3) | P1 complete lifecycle — 49 PBIs (PB-P1-001..049) ready for sprint planning | `management/refinement-PB-01-documentation` | Merged |
| [#4](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/4) | P2 backlog lifecycle for PB-P2-001..026 (29 user stories) | `management/refinement-PB-02-documentation` | Merged |
| [#5](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/5) | P3 delivery lifecycle for demo & academic stories (US-140..146, US-150) | `management/refinement-PB-03-documentation` | Merged |
| [#6](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/6) | `eventflow-execute-development-tasks` skill + `/execute-development-tasks` command | `management/development_conventions` | Merged |

### Foundation P0 — infraestructura, contratos y quality gates (PRs #7 – #16)

| PR | Backlog Items | Rama | Contenido |
|---:|---|---|---|
| [#7](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/7) | PB-P0-001 (US-099..102) | `foundation/PB-P0-001` | Prisma schema, migrations baseline, índices críticos, constraints físicos |
| [#8](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/8) | PB-P0-002 (US-089/090/091) | `foundation/PB-P0-002` | Backend Modular Monolith Bootstrap |
| [#9](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/9) | PB-P0-003 (US-092/093) | `foundation/PB-P0-003` | Validación Zod + Error Envelope unificado |
| [#10](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/10) | PB-P0-004 (US-094..097) | `foundation/PB-P0-004` | REST endpoints foundation AUTH/EVENT/QUOTE/AI |
| [#11](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/11) | PB-P0-005 (US-098) | `foundation/PB-P0-005` | Snapshot OpenAPI 3.x determinista desde Zod + gate CI |
| [#12](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/12) | PB-P0-006 (US-108/109) | `foundation/PB-P0-006` | Cookies HTTP-only firmadas + captcha en auth |
| [#13](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/13) | PB-P0-007/008 (US-110..112) | `foundation/PB-P0-007_PB-P0-008` | Rate limiting + middleware chain order + suite negativa RBAC |
| [#14](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/14) | PB-P0-009 (US-117..120) | `foundation/PB-P0-009` | `LLMProvider` port + adapters (OpenAI + Mock + Anthropic stub) |
| [#15](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/15) | PB-P0-010/011 (US-121..124) | `foundation/PB-P0-010_PB-P0-011` | PromptOps, persistencia IA, timeout/fallback y validación JSON |
| [#16](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/16) | PB-P0-012..018 | `foundation/PB-PO-012_PB-P0-013_PB-P0-014` | Frontend bootstrap, seed demo, QA tooling, Docker, CI, Prisma migrations |

### MVP P1 — features de dominio (PRs #17 – #49)

| PR | Backlog Items | Contenido |
|---:|---|---|
| [#17](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/17) | PB-P1-001..004 (US-001..005) | Registro, login, logout y recuperación de contraseña |
| [#18](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/18) | PB-P1-005..008 (US-006..007, US-009..014) | Perfil, idioma y ciclo de vida de eventos |
| [#19](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/19) | PB-P1-009/010 | Auto-complete event + admin read-only view |
| [#21](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/21) | PB-P1-011..020 (US-013..036) | IA HITL + task management + gestión de presupuesto |
| [#22](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/22) | PB-P1-021 (US-037) | Cierre PB-P1-020 fase 2 |
| [#23](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/23) | PB-P1-022 (US-038) | Warning con delta + badges per-item de presupuesto |
| [#24](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/24) | PB-P1-023 (US-039) | Sync atómico `BudgetItem.committed` por BookingIntent |
| [#25](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/25) | PB-P1-024 (US-040/041) | VendorProfile CRUD (crear + editar + soft-delete) |
| [#26](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/26) | PB-P1-025 (US-042) | Cambio de categorías del vendor con tope acumulado |
| [#27](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/27) | PB-P1-026 (US-043/048) | Portafolio del vendor (upload + soft delete) |
| [#28](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/28) | PB-P1-027 (US-044) | CRUD VendorService (paquetes del vendor) |
| [#29](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/29) | PB-P1-028 (US-045) | Directorio autenticado de vendors con cursor pagination |
| [#30](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/30) | PB-P1-029 (US-046) | Perfil público SEO del vendor (SSR + ISR + JSON-LD) |
| [#31](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/31) | PB-P1-030 (US-049/050) | QuoteRequest atómica + límite BR-QUOTE-009 con UX preventiva |
| [#32](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/32) | PB-P1-031 (US-051..053) | Vendor visualiza y responde Quote |
| [#33](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/33) | PB-P1-032 (US-054) | Reject quote transaccional + QuoteNotificationService |
| [#34](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/34) | PB-P1-033 (US-055) | `ExpireQuoteRequestsJob` + ClockPort + reconciliación cron 01:00 UTC |
| [#35](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/35) | PB-P1-034 (US-056) | Cancel QuoteRequest transaccional + `QuoteEventNotificationService` |
| [#36](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/36) | PB-P1-035 (US-057/058) | Comparador Quotes lado a lado + toggle `Quote.is_preferred` |
| [#37](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/37) | PB-P1-036 (US-060..062) | BookingIntent lifecycle (create/confirm/cancel bilateral) |
| [#38](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/38) | PB-P1-037 (US-063/064) | BookingDisclaimer bilateral + BudgetSummary cross-domain refresh |
| [#39](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/39) | PB-P1-038 (US-065) | Create Verified Review + denormalize atómico + service común 9 eventos |
| [#40](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/40) | PB-P1-039 (US-066) | GET vendor reviews · cursor keyset + anonimato + admin sees-all |
| [#41](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/41) | PB-P1-040 (US-067/077) | Reviews admin moderation — endpoint atómico + panel global |
| [#42](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/42) | PB-P1-041 (US-047/074) | Admin moderation of VendorProfile |
| [#43](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/43) | PB-P1-042 (US-075) | Admin CRUD ServiceCategory + jerarquía 2 niveles + i18n + AdminAction |
| [#44](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/44) | PB-P1-043 (US-076) | Admin CRUD EventType + público (soft delete guard EXISTS events) |
| [#45](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/45) | PB-P1-044 (US-078) | Admin events read-only — list + detail counts + UI panel |
| [#46](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/46) | PB-P1-045 (US-079) | Admin operational metrics dashboard |
| [#47](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/47) | PB-P1-046 (US-080) | Admin AdminAction log viewer (cierra EPIC-ADM-001) |
| [#48](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/48) | PB-P1-047 (US-081/082) | Selector de idioma y configuración del evento |
| [#49](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/49) | PB-P1-048/049 (US-083/084) | Currency display consistente + AI locale enforcement — cierre EPIC-I18N-001 |

> PR [#20](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/20) fue **cerrado sin merge** (revisión R1 sustituida por PR #21 consolidado — trazabilidad honesta del proceso).

---

## Current Delivery Status

### Completed documentation

- Discovery, MVP scope, business rules, roles, domain data model.
- AI features, use cases, FRD, NFR, seed strategy.
- Architecture vision, system architecture (C4), backend technical design, frontend architecture, API design.
- AI architecture & PromptOps, database physical design.
- Security & authorization design, testing strategy, deployment & DevOps design.
- 46 ADRs formalizados en `/docs/22`.
- UI/UX Foundations (Visual Language Reference, UI Foundations, Design Tokens, Component Foundations) en [`docs/ux-ui/`](./docs/ux-ui/).
- Paquete académico final en `/deliverables/0` a `/deliverables/7`.
- `DEVELOPMENT_CONVENTIONS.md` root — contrato operativo de código consumido por skills y coding agents.

### Completed backlog engineering

- Epic Map en `management/artifacts/1-EventFlow-Epic-Map.md`.
- 150 User Stories archivadas siguiendo `management/templates/user-story.tpl.md`.
- User Stories Coverage Matrix.
- Product Backlog Prioritized (P0–P4).
- User Story lifecycle **completo end-to-end para los 4 niveles de priorización (P0–P3 + P4 demo)** — refinement, decision resolution, approval, technical specs y development tasks para las 150 US archivadas (PRs #3, #4, #5).

### Completed implementation (P0 foundation + P1 MVP)

Materializado en el repositorio y verificable con el pipeline canónico (§ [Local Setup](#local-setup--cómo-levantar-el-entorno-para-revisión)):

- **Foundation P0** — Prisma schema + migrations + índices + constraints + seed demo LATAM idempotente + backend modular monolith + validación Zod + error envelope + endpoints AUTH/Event/Quote/AI + snapshot OpenAPI + cookies HTTP-only firmadas + captcha + rate limiting + middleware chain order + RBAC + suite negativa + `LLMProvider` con adapters OpenAI/Mock/Anthropic stub + PromptOps + persistencia IA + timeout/fallback + validación JSON + frontend bootstrap + QA tooling + Docker + CI. Backing PRs: [#7](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/7)–[#16](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/16).
- **MVP P1** — Auth end-to-end, ciclo de vida de eventos, IA HITL, task management, presupuesto, Vendor CRUD + portafolio + servicios + directorio + perfil público SEO, flujo Quote/BookingIntent bilateral + jobs de expiración, Reviews con moderación admin, Admin CRUD ServiceCategory/EventType + panel de eventos read-only + metrics dashboard + AdminAction log viewer, i18n con 4 locales + configuración de idioma por evento + currency display consistente + AI locale enforcement. Backing PRs: [#17](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/17)–[#49](https://github.com/wcorderolara/AI4Devs-Final-Project-Eventflow/pull/49).
- **Suites de pruebas ejecutables** — Vitest (unit + integration) + Supertest (API) + MSW + Playwright (E2E). Se auto-omiten los tests DB-gated si no hay Postgres; en CI corre Postgres efímero.
- **49 PRs reales** mergeados o cerrados con trazabilidad en GitHub (ver § anterior).

### Pending deployment evidence

- No existe URL pública desplegada (Amplify Hosting / App Runner) que demuestre la aplicación. La revisión de esta entrega se hace **levantando el entorno localmente** (ver § [Local Setup](#local-setup--cómo-levantar-el-entorno-para-revisión)).
- No existen recursos AWS provisionados (RDS, S3, Secrets Manager, CloudWatch) — corresponden a **US-137/PB-P0-017** y **US-139/PB-P0-018** (pipeline CD), pendientes en esta entrega.
- El pipeline CI en GitHub Actions **sí** está ejecutándose por PR (lint + typecheck + tests + build + drift OpenAPI + drift migraciones + seed idempotency).

### Pending user stories

- Bloque P2 (US-095..130 remanentes) y P3 (US-140..150) — refinement/tech specs/dev tasks completadas; ejecución de código pendiente.
- Backlog remanente P1 (algunas US como US-068..073 y otras trazadas al Epic Map) — ver `management/artifacts/4-Product-Backlog-Prioritized.md`.

### Pending visual/demo evidence

- No existe video demo grabado end-to-end.
- Las capturas del producto real quedan como evidencia complementaria a producir tras el despliegue AWS.

Cualquier ítem marcado como pendiente en este README sólo debe declararse completado cuando exista evidencia verificable en el repositorio o en GitHub.
