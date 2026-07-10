<!-- US-139 (PB-P0-018) — Plantilla de PR. Completa las secciones aplicables. -->

## Resumen

<!-- Qué cambia y por qué. Enlaza la User Story / backlog item. -->

## Tipo de cambio

- [ ] Feature
- [ ] Fix
- [ ] Refactor / chore
- [ ] Docs
- [ ] CI / DevOps

## Checklist general

- [ ] `npm run lint` y `npm run typecheck` verdes (backend y/o frontend).
- [ ] `npm test` verde.
- [ ] Sin secretos ni credenciales en el diff.

## ¿Modifica `prisma/` (schema o migraciones)? — Checklist Doc 18 §28.5

> Marca esta sección **solo** si el PR toca `backend/prisma/schema.prisma` o `backend/prisma/migrations/`.

- [ ] Se generó la migración con `npx prisma migrate dev` (no edición manual del schema sin migración).
- [ ] La migración es **forward-only** (no se usa `prisma migrate reset` en CI/QA/Demo).
- [ ] **Backward-compatible**: el cambio no rompe la versión de la app actualmente desplegada
      (deploy y migración pueden desfasarse).
- [ ] **Backfill**: si se agregan columnas con datos requeridos, hay estrategia de backfill.
- [ ] **Constraints sobre datos existentes** (NOT NULL, UNIQUE, CHECK): aplicados en **multi-step**
      (agregar nullable → backfill → constraint) cuando haya datos.
- [ ] **Índices grandes**: creados con `CONCURRENTLY` o fuera de la ventana de migración si aplica.
- [ ] Tests de integración cubren el cambio de schema.
- [ ] Documentación actualizada (`README`/`CONTRIBUTING`, Doc 18 si corresponde).

## Notas para el revisor

<!-- Riesgos, decisiones, pasos de validación manual. -->
