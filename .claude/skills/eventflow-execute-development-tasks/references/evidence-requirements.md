# Referencia — Requisitos de Evidencia y Validación por tipo de tarea

> Literales de resultado de validación permitidos: **`Passed` · `Failed` · `Not Run` · `Not Applicable`**.
> Para `Not Run` y `Not Applicable` incluye **siempre** una razón. **Nunca** escribas `Passed`
> si el comando falló o no se ejecutó.

---

## 1. Regla de oro: no inventes comandos

`DEVELOPMENT_CONVENTIONS.md` marca la mayoría de la tooling como **Target** (aún no existe en el
repo). Antes de correr cualquier comando de validación **verifica que existe**:

* ¿Existe `package.json`? ¿Contiene el script (`lint`, `typecheck`, `test`, `test:integration`,
  `test:e2e`, `seed`, `build`)?
* ¿Existe `prisma/schema.prisma` para comandos Prisma?
* ¿Existe `.github/workflows/` para validaciones de DevOps?

Si la herramienta/script **no** existe, la validación es `Not Run` (razón: "script/tooling no
existe aún en el repo — estado Current es documentación") o `Not Applicable`.

### Gestor de paquetes y comandos canónicos (Target, autoridad `docs/21`)

El gestor canónico es **npm** (pnpm es preferencia no adoptada hasta un ADR). Comandos Target:

```text
npm run lint
npm run typecheck            # tsc --noEmit
npm run test                 # Vitest unit + component
npm run test:integration     # Vitest + Postgres efímero
npm run test:e2e             # Playwright
npm run build                # next build (frontend)
npm run seed -- --dry-run    # validación de idempotencia de seed
npx prisma format
npx prisma validate
npx prisma migrate diff / validate
```

Detecta el gestor real (lockfile/`package.json`) y ajusta el prefijo (`npm run` / `pnpm`) al que
el repo use de verdad. **No** corras comandos destructivos de base de datos (`prisma migrate reset`,
drops) contra una BD desconocida o compartida — solo contra una BD de test claramente aislada.

---

## 2. Validación basada en riesgo (por tipo de tarea)

### Tarea solo documental

* Verificación de rutas.
* Revisión de contenido.
* Chequeo de Markdown/enlaces cuando exista tooling.
* Chequeo de convenciones (`DEVELOPMENT_CONVENTIONS.md`).

### Tarea TypeScript (genérica)

* Tests relevantes.
* Typecheck (`tsc --noEmit`).
* Lint.

### Tarea Backend

* Tests unit / de use-case.
* Tests de API (Supertest).
* Tests negativos de autorización.
* Envelope de error y comportamiento de correlación (`X-Correlation-Id`).
* Typecheck. Lint.

### Tarea Frontend

* Tests de componente/integración (Testing Library).
* Handlers MSW.
* Estados loading / empty / error.
* Accesibilidad (axe/jest-axe) e i18n (sin strings hardcodeados).
* Typecheck. Lint. Build (`next build`) donde sea relevante.

### Tarea Database

* `prisma format`, `prisma validate`.
* Inspección de migración; intención de índices.
* Tests de constraints (NOT NULL, CHECK, FK, enum, unicidad con soft delete, `is_seed`).
* Seguridad de migración (forward-only en prod). Impacto de seed.
* Tests de integración aislados.

### Tarea AI

* `MockAIProvider` determinista.
* Validación de schema de entrada/salida (Zod).
* Timeout, fallback, human-in-the-loop.
* Versión de prompt, redacción (redaction).
* Tests negativos orientados a inyección.

### Tarea DevOps

* Sintaxis de workflow.
* Build de Docker.
* Configuración no secreta / contrato de entorno (`.env.example`).
* Health check, artefacto de deploy, orden de migración, documentación de rollback.

---

## 3. Evidencia mínima por tarea (a registrar en el execution record)

* Archivos creados / modificados / eliminados.
* Migraciones creadas.
* Tests creados o modificados.
* Comandos ejecutados (verbatim) + exit status + resumen de salida relevante.
* Resultado de lint / typecheck / test / build / validación de BD / chequeos de seguridad
  (`Passed` / `Failed` / `Not Run` / `Not Applicable` + razón cuando aplique).
* Acceptance Criteria cubiertos.
* Convenciones verificadas.
* Desviaciones y deuda técnica.
* Referencia a commit/PR **solo** cuando exista realmente.

**Nunca** afirmes que un comando corrió si no corrió.
