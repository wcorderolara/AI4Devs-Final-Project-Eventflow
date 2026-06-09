# EventFlow — Final Project Delivery

## Overview

EventFlow es un MVP de planificación de eventos asistida por IA y gestión simplificada de cotizaciones de proveedores, orientado inicialmente al mercado de Guatemala con visión futura hacia España y LATAM. La documentación disponible posiciona el producto como un workspace web responsive para organizadores, proveedores y administradores, con foco en plan, checklist, presupuesto y flujo estructurado de cotizaciones, evitando documentarlo como marketplace transaccional completo en v1.

Este repositorio contiene una entrega académica de **documentación y planificación técnica** del proyecto. La fase actual cubre, de extremo a extremo:

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

La entrega **no incluye** implementación funcional, despliegue en URL pública, capturas finales, PRs reales mergeados ni demos ejecutables. Todas esas secciones están explícitamente marcadas como pendientes en este README y en cada deliverable.

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

---

## Current Delivery Status

### Completed documentation

- Discovery, MVP scope, business rules, roles, domain data model.
- AI features, use cases, FRD, NFR, seed strategy.
- Architecture vision, system architecture (C4), backend technical design, frontend architecture, API design.
- AI architecture & PromptOps, database physical design.
- Security & authorization design, testing strategy, deployment & DevOps design.
- 46 ADRs formalizados en `/docs/22`.
- Paquete académico final en `/deliverables/0` a `/deliverables/7`.

### Pending implementation evidence

- No existe código fuente del backend Node.js + Express + TypeScript en este repositorio.
- No existe código fuente del frontend Next.js + App Router en este repositorio.
- No existe `prisma/schema.prisma`, migraciones ni scripts de seed implementados.
- No existen suites de pruebas ejecutables.

### Pending deployment evidence

- No existe URL pública desplegada (Amplify Hosting / App Runner) que demuestre la aplicación.
- No existen pipelines de GitHub Actions ejecutados.
- No existen recursos AWS provisionados (RDS, S3, Secrets Manager, CloudWatch).

### Pending pull request evidence

- No hay PRs reales mergeados que implementen los módulos descritos en `/deliverables/7-Pull-requests.md`.
- El documento de PRs funciona como **plan recomendado** y placeholder de evidencia futura.

### Pending visual/demo evidence

- No existen capturas, mockups ni video demo.
- No existen artefactos de Figma vinculados.
- No existe reporte de ejecución de tests ni cobertura.

Cualquier ítem marcado como pendiente en este README sólo debe declararse completado cuando exista evidencia verificable en el repositorio.
