# Technical Specification — US-090: Carpetas por módulo de dominio (feature-first + Clean/Hex)

## 1. Metadata

| Campo | Valor |
|---|---|
| User Story ID | US-090 |
| Source User Story | `management/user-stories/US-090-feature-first-domain-modules.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-090-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-002 |
| Backlog Title | Inicializar backend Node + Express + TypeScript con arquitectura Clean/Hexagonal |
| Backlog Execution Order | 2 (segundo ítem P0; dependencia: US-089 debe estar completa) |
| User Story Position in Backlog Item | 2 de 3 (US-089 → **US-090** → US-091) |
| Related User Stories in Backlog Item | US-089, US-090, US-091 |
| Epic | EPIC-BE-001 — Backend Modular Monolith |
| Backlog Item Dependencies | US-089 completada (proyecto compilable) |
| Feature | Estructura feature-first |
| Module / Domain | Platform/BE |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-11 |
| Last Updated | 2026-06-11 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-002 — Backend Modular Monolith Bootstrap**

Bootstrap del servidor Express, estructura feature-first con capas `Interface/Application/Domain/Ports/Infrastructure`, configuración por env vars, shared kernel y pipeline base de middlewares.

US-090 es la segunda US del item. Depende de que US-089 esté completada (servidor compilable con `tsconfig.json` strict mode activo). US-091 depende de US-090 (requiere `src/shared/interface/middlewares/` creado aquí).

### Execution Order Rationale

US-090 es desbloqueada por US-089. Su propósito es establecer la convención de carpetas que todas las feature stories del MVP usarán. Sin esta estructura, los developers de US-091 y de todas las feature stories subsecuentes no tienen un lugar canónico donde colocar el código. Debe completarse antes de que cualquier módulo de dominio sea implementado.

```
US-089 (bootstrap) → US-090 (esta US) → US-091 (middlewares)
```

### Related User Stories in Same Backlog Item

| User Story | Rol en el Backlog Item | Orden sugerido |
|---|---|---|
| US-089 | Servidor Express compilable, config Zod, `GET /health` | 1 — prerequisito bloqueante |
| **US-090** (esta US) | 16 módulos con 5 capas + shared kernel + ESLint import boundaries | 2 |
| US-091 | Pipeline de 14 middlewares transversales de seguridad | 3 — depende de `src/shared/interface/middlewares/` de esta US |

---

## 3. Executive Technical Summary

US-090 establece la **convención arquitectónica de carpetas** sobre la que todos los módulos de dominio del MVP de EventFlow se construirán. Su resultado es un árbol de directorios vacíos (o con stubs mínimos compilables) que:

1. Crea los 16 bounded contexts canónicos bajo `src/modules/`, cada uno con 5 capas: `interface/`, `application/`, `domain/`, `ports/`, `infrastructure/`.
2. Inicializa el shared kernel en `src/shared/` con los tipos transversales base: `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort`, `AppError`, `ValidationError`, `AuthorizationError`.
3. Configura ESLint con reglas de import boundaries que convierten las restricciones arquitectónicas de ADR-ARCH-001 y ADR-ARCH-002 en errores de lint automáticamente verificables — no solo guías en documentación.
4. Garantiza que `tsc --noEmit` pase sobre toda la estructura `src/` incluyendo los nuevos archivos.
5. Establece las convenciones de nombrado de Doc 14 §24.2 en los archivos placeholder desde el inicio.

Ningún archivo creado en esta US contiene lógica de negocio. La implementación real pertenece a las feature stories de cada bounded context.

---

## 4. Scope Boundary

### In Scope

- Creación de los 16 directorios de bounded context con 5 sub-capas cada uno bajo `src/modules/`.
- Creación de `src/shared/domain/` con stubs tipados de `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort`, `AppError`, `ValidationError`, `AuthorizationError`.
- Creación de `src/shared/application/` con ports stub: `transaction-manager.port.ts`, `notification-sender.port.ts`.
- Creación de `src/shared/infrastructure/` con placeholder de Prisma client (`prisma.client.ts` stub) y `logger/` placeholder.
- Creación de `src/shared/interface/middlewares/` con archivos placeholder para los **14 middlewares** de Doc 14 §8.2 y §16 (implementación en US-091).
- Configuración de ESLint con regla de import boundaries (`import/no-restricted-paths` o `eslint-plugin-boundaries`).
- Verificación de que `tsc --noEmit` pasa sobre toda la estructura.
- Convenciones de nombrado per Doc 14 §24.2 aplicadas en todos los placeholders.
- Documentación mínima en `src/modules/README.md` referenciando Doc 14 §24.2.

### Out of Scope

- Implementación de lógica de dominio, use cases, repositorios o controllers (pertenece a feature stories de cada bounded context).
- Pipeline de middlewares completo (US-091).
- Migraciones de base de datos (PB-P0-001).
- Configuración de Prisma schema (PB-P0-001).
- Endpoints de API funcionales (feature stories subsecuentes).
- Microservicios, Kubernetes, brokers.

### Explicit Non-Goals

- No implementar ningún use case real en ningún módulo.
- No conectar la capa domain a Express o Prisma (eso viola ADR-ARCH-002).
- No crear entidades de dominio con lógica en el shared kernel (solo tipos utilitarios).
- No añadir módulos adicionales a los 16 canónicos de Doc 14 §9.

---

## 5. Architecture Alignment

### Backend Architecture

**Modular Monolith (ADR-ARCH-001)** — un único deployable con fronteras lógicas por bounded context. La estructura de carpetas materializa este principio: cada bounded context es un directorio autocontenido bajo `src/modules/`. La comunicación entre módulos solo puede ocurrir a través de barrel públicos (`index.ts`) — nunca mediante imports directos entre capas internas de módulos distintos.

**Clean/Hexagonal Architecture (ADR-ARCH-002)** — dentro de cada módulo las 5 capas tienen restricciones de dependencia unidireccional:

```
interface/ → application/ → domain/ ← ports/ ← infrastructure/
```

- `domain/`: solo depende de `src/shared/domain/`. **Nunca** de Express, Prisma, ni SDKs externos.
- `ports/`: define interfaces (contratos abstractos). Solo depende de `domain/`.
- `application/`: implementa use cases. Depende de `domain/` y `ports/`.
- `infrastructure/`: implementa adaptadores concretos. Depende de `ports/` e imports de frameworks/SDKs.
- `interface/`: controllers, routes, DTOs HTTP. Depende de `application/`.

**Shared kernel (Doc 14 §7.1, §24.1)** — `src/shared/domain/` provee tipos transversales que cualquier módulo puede importar. No contiene lógica de feature.

**ESLint import boundaries** — la herramienta de enforcement es obligatoria. No es suficiente documentar las restricciones en el ADR; deben convertirse en errores de lint detectables en CI.

### Frontend Architecture

No aplica — US-090 es exclusivamente backend.

### Database Architecture

No aplica directamente. Se crea `src/shared/infrastructure/prisma/prisma.client.ts` como stub del Prisma Client singleton. No se crea schema ni migraciones.

### API Architecture

No aplica. US-090 no crea endpoints.

### AI / PromptOps Architecture

No aplica directamente. El directorio `src/modules/ai-assistance/` se crea como estructura vacía. La implementación del `LLMProvider` pertenece a PB-P0-009.

### Security Architecture

La seguridad arquitectónica relevante en esta US es el enforcement de import boundaries:
- **ADR-ARCH-002**: `domain/` no importa Express, Prisma ni SDKs — verificado por ESLint (NT-01).
- **ADR-ARCH-001**: no hay imports cruzados directos entre módulos — verificado por ESLint (NT-02).

Estas dos reglas son los controles de seguridad arquitectónica más importantes de esta US: sin ellos, el código de dominio puede acoplarse a la infraestructura y comprometer la testabilidad y la separación de concerns.

### Testing Architecture

- **tsc**: verifica tipos en toda la estructura (`tsc --noEmit`).
- **ESLint**: verifica import boundaries (reglas configuradas en esta US).
- **CI script**: verifica que los 16 módulos con 5 sub-capas existen como artefacto de estructura.
- **Vitest**: no se requieren tests unitarios complejos para esta US — los placeholders son stubs; los tests son estáticos/estructurales.

---

## 6. Functional Interpretation

| Acceptance Criterion | Interpretación Técnica | Capa(s) Impactada(s) |
|---|---|---|
| **AC-01**: 16 bounded contexts con 5 sub-directorios en `src/modules/` | Crear 16 × 5 = 80 directorios. Cada directorio puede contener un `index.ts` vacío o stub para que `tsc` los reconozca. El CI script valida la existencia de cada directorio esperado. | `src/modules/` (filesystem) |
| **AC-02**: Shared kernel en `src/shared/` con tipos base | `src/shared/domain/` contiene 7 archivos tipados: `result.ts`, `id.ts`, `correlation-id.ts`, `clock.port.ts`, `errors/app.error.ts`, `errors/validation.error.ts`, `errors/authorization.error.ts`. Compilables con `tsc --noEmit`. | `src/shared/domain/` |
| **AC-03**: Regla ESLint de import boundaries configurada | `.eslintrc.js` o `eslint.config.ts` con `import/no-restricted-paths` o `eslint-plugin-boundaries`. La regla debe detectar imports cross-module como error (`NT-02`) y detectar imports de infraestructura en domain como error (`NT-01`). Smoke test: crear un archivo de prueba con import inválido, verificar que `eslint` falla. | `.eslintrc.js`, `package.json` (devDependency) |
| **AC-04**: `tsc --noEmit` sin errores en toda la estructura | Todos los stubs tipados deben compilar. Los archivos vacíos (`index.ts` con `export {}`) son suficientes. No debe haber errores de tipo en `src/shared/domain/` ni en ningún placeholder. | Toda la estructura `src/` |
| **AC-05**: Convenciones de nombrado per Doc 14 §24.2 | Los archivos placeholder siguen: `<verb>-<entity>.use-case.ts`, `<entity>.repository.ts`, `prisma-<entity>.repository.ts`, `<feature>.controller.ts`, `<feature>.routes.ts`. Al menos un módulo representativo (e.g., `identity-access`) debe tener un stub por capa con el nombre correcto. | `src/modules/*/` (naming) |
| **EC-01**: Cross-module import detectado por ESLint | Archivo de prueba con `import { X } from '../../quote-flow/domain/...'` desde `event-planning/domain/` → ESLint reporta error de lint. | `.eslintrc.js` (lint rule) |
| **EC-02**: Domain importa infraestructura detectado por ESLint | Archivo de prueba con `import { PrismaClient } from '@prisma/client'` en `event-planning/domain/` → ESLint reporta error de lint. | `.eslintrc.js` (lint rule) |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

**Los 16 bounded contexts canónicos** (Doc 14 §9) — ninguno puede añadirse ni eliminarse en esta US:

```
src/modules/
├── identity-access/
├── user-profile/
├── event-planning/
├── task-management/
├── budget-management/
├── vendor-management/
├── service-catalog/
├── quote-flow/
├── booking-intent/
├── reviews-moderation/
├── notifications/
├── ai-assistance/
├── admin-governance/
├── attachments/
├── localization/
└── seed-demo/
```

**Estructura interna de cada módulo** (5 capas):

```
<bounded-context>/
├── interface/          # Controllers, routes, DTOs HTTP, request handlers
├── application/        # Use cases / application services
├── domain/             # Entities, value objects, domain services, domain errors
├── ports/              # Repository interfaces, port definitions (abstracciones)
└── infrastructure/     # Adapters: Prisma repositories, SDK clients, email senders
```

Cada capa puede contener un `index.ts` con `export {}` para que TypeScript reconozca el directorio.

### Use Cases / Application Services

No aplica — los archivos de use case en esta US son stubs vacíos. Ejemplo para `identity-access`:

```
identity-access/application/
└── register-user.use-case.ts    # export class RegisterUserUseCase {}
```

La implementación real pertenece a la feature story de auth.

### Controllers / Routes

No aplica — stubs vacíos. Ejemplo para `identity-access`:

```
identity-access/interface/
├── identity-access.controller.ts    # export class IdentityAccessController {}
└── identity-access.routes.ts        # export const identityAccessRouter = Router()
```

### DTOs / Schemas

No aplica en esta US. Los Zod DTOs de request/response pertenecen a PB-P0-003 y a las feature stories.

### Repository / Persistence

**Ports (interfaces)**:

```
<module>/ports/
└── <entity>.repository.ts    # export interface UserRepository {}
```

**Infrastructure adapters (stubs)**:

```
<module>/infrastructure/
└── prisma-<entity>.repository.ts    # export class PrismaUserRepository implements UserRepository {}
```

Los métodos de los repositorios quedan vacíos o como `throw new Error('Not implemented')` en esta US.

### Shared Kernel — Diseño detallado

**`src/shared/domain/result.ts`**

Tipo funcional para operaciones falibles sin excepciones:

```typescript
// Esquema de tipos — no producción:
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

**`src/shared/domain/id.ts`**

Value object para identidades UUID:

```typescript
export type Id = string & { readonly _brand: 'Id' };
export const Id = {
  from: (value: string): Id => value as Id,
  generate: (): Id => crypto.randomUUID() as Id,
};
```

**`src/shared/domain/correlation-id.ts`**

Análogo a `Id` pero para trazabilidad de solicitudes:

```typescript
export type CorrelationId = string & { readonly _brand: 'CorrelationId' };
```

**`src/shared/domain/clock.port.ts`**

Port inyectable para el tiempo — permite tests deterministas sin `Date.now()`:

```typescript
export interface ClockPort {
  now(): Date;
}
```

**`src/shared/domain/errors/app.error.ts`**

Error base del dominio:

```typescript
export abstract class AppError extends Error {
  abstract readonly code: string;
  constructor(message: string) { super(message); this.name = this.constructor.name; }
}
```

**`src/shared/domain/errors/validation.error.ts`**

```typescript
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  constructor(
    message: string,
    public readonly details?: Array<{ field: string; message: string }>
  ) { super(message); }
}
```

**`src/shared/domain/errors/authorization.error.ts`**

```typescript
export class AuthorizationError extends AppError {
  readonly code = 'AUTHORIZATION_ERROR';
}
```

**`src/shared/application/`** — ports stub:

```
transaction-manager.port.ts    # export interface TransactionManagerPort {}
notification-sender.port.ts    # export interface NotificationSenderPort {}
```

**`src/shared/infrastructure/prisma/prisma.client.ts`** — singleton stub:

```typescript
// stub: la implementación real se completa cuando el schema Prisma esté disponible (PB-P0-001)
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

**`src/shared/interface/middlewares/`** — 14 archivos placeholder (implementación en US-091):

```
correlation-id.middleware.ts
request-logger.middleware.ts
json-body-parser.middleware.ts
cors.middleware.ts
helmet.middleware.ts
rate-limit.middleware.ts
auth.middleware.ts
captcha-verification.middleware.ts
role.middleware.ts
ownership.middleware.ts
validate-request.middleware.ts
file-upload.middleware.ts
not-found.middleware.ts
error-handler.middleware.ts
```

Cada archivo exporta un stub: `export const middlewareName = () => {}` o `export const middlewareName: RequestHandler = (_req, _res, next) => next()`.

### ESLint Import Boundary Rules

La configuración ESLint debe cubrir dos tipos de restricciones:

**Tipo 1 — Cross-module imports** (ADR-ARCH-001):

Prohibir imports directos entre `src/modules/<modulo-A>/` y `src/modules/<modulo-B>/`. Opciones de implementación:

- `import/no-restricted-paths` (de `eslint-plugin-import`): requiere reglas explícitas por par de módulos.
- `eslint-plugin-boundaries`: más expresivo; permite definir tipos de módulos y restricciones globales.

**Configuración esquemática con `eslint-plugin-boundaries`**:

```javascript
// .eslintrc.js (esquema — no producción):
{
  settings: {
    'boundaries/elements': [
      { type: 'module', pattern: 'src/modules/*' },
      { type: 'shared', pattern: 'src/shared/*' },
    ]
  },
  rules: {
    'boundaries/element-types': [2, {
      default: 'disallow',
      rules: [
        { from: 'module', allow: ['shared'] },  // módulos pueden importar shared
        // no se permite import de module a module directamente
      ]
    }]
  }
}
```

**Tipo 2 — Domain no importa infraestructura** (ADR-ARCH-002):

Prohibir imports de `@prisma/client`, `express`, `openai` y otros SDKs dentro de `src/modules/*/domain/` y `src/shared/domain/`:

```javascript
// .eslintrc.js — regla adicional para domain layer:
{
  overrides: [{
    files: ['src/modules/*/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [2, {
        patterns: ['@prisma/client', 'express', 'openai', 'aws-sdk', 'multer']
      }]
    }
  }]
}
```

La elección entre `import/no-restricted-paths` y `eslint-plugin-boundaries` se deja al Tech Lead — ambas son aceptables. La condición es que NT-01 y NT-02 fallen con `eslint src/`.

### Validation Rules

No hay validaciones de runtime en esta US. Las validaciones son estáticas:

| Regla | Herramienta | Verifica |
|---|---|---|
| VR-01: 16 módulos con 5 sub-capas | CI script (fs) | `find src/modules -mindepth 2 -maxdepth 2 -type d` — debe retornar exactamente 80 directorios |
| VR-02: Sin cross-module imports | ESLint | `eslint src/` falla ante import entre módulos |
| VR-03: Domain sin dependencias de infra | ESLint | `eslint src/` falla ante import de SDK en domain layer |

### Error Handling

No aplica en esta US — no hay runtime. Los errores del shared kernel son tipos de dominio (no Express errors).

### Transactions

No aplica.

### Observability

No aplica en esta US — no hay requests de runtime.

---

## 8. Frontend Technical Design

No aplica — US-090 es exclusivamente backend.

---

## 9. API Contract Design

No aplica — US-090 no crea endpoints.

---

## 10. Database / Prisma Design

No aplica directamente.

**Nota**: Se crea `src/shared/infrastructure/prisma/prisma.client.ts` como stub singleton. No se define ningún modelo Prisma (eso pertenece a PB-P0-001). El placeholder puede usar el `PrismaClient` importado de `@prisma/client`, que ya fue instalado en US-089.

---

## 11. AI / PromptOps Design

No aplica — US-090 no invoca IA.

El directorio `src/modules/ai-assistance/` se crea con la estructura de 5 capas vacías. La implementación del `LLMProvider` port y sus adaptadores pertenece a PB-P0-009.

---

## 12. Security & Authorization Design

### Authentication

No aplica — no hay endpoints de runtime en esta US.

### Authorization

No aplica directamente. El `authMiddleware`, `roleMiddleware` y `ownershipMiddleware` son stubs en `src/shared/interface/middlewares/`; su implementación es US-091.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

No aplica para runtime. Los escenarios negativos relevantes son arquitectónicos:

| Escenario | Herramienta de detección |
|---|---|
| Import directo de `src/modules/event-planning/domain/` a `src/modules/quote-flow/domain/` | ESLint (NT-02) — debe reportar error |
| Import de `@prisma/client` dentro de `src/modules/event-planning/domain/` | ESLint (NT-01) — debe reportar error |

### Audit Requirements

No aplica.

### Sensitive Data Handling

No aplica — los stubs no contienen datos sensibles ni secretos.

---

## 13. Testing Strategy

### Unit Tests

No se requieren tests unitarios complejos para esta US. Los tipos del shared kernel son compilables; su corrección se verifica con `tsc --noEmit`.

**Excepción**: si se implementa `Result<T,E>` con funciones factory (`ok()`, `err()`), se puede agregar un test básico para verificar el comportamiento de las funciones helper — pero esto es opcional en esta US.

### Integration Tests

No aplica — no hay runtime requests.

### API Tests

No aplica.

### E2E Tests

No aplica.

### Security Tests

| ID | Escenario | Herramienta |
|---|---|---|
| NT-01 | Archivo en `src/modules/<module>/domain/` importa `@prisma/client` → ESLint error | ESLint |
| NT-02 | Import directo entre `src/modules/event-planning/` y `src/modules/quote-flow/` → ESLint error | ESLint |

**Implementación de smoke tests de ESLint**: crear archivos temporales de test o usar un fixture dedicado que ESLint evalúe como parte del lint check. Alternativamente, los tests NT-01 y NT-02 pueden verificarse manualmente en PR review y documentarse como tests de lint.

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

| Check | Comando | Pasa si |
|---|---|---|
| Estructura de 16 módulos × 5 capas | Script CI (`find src/modules -mindepth 2 -maxdepth 2 -type d \| wc -l`) | Retorna 80 |
| Shared kernel compila | `tsc --noEmit` | Sin errores en `src/shared/domain/` |
| ESLint import boundaries activo | `eslint src/` con archivo fixture de violación | Retorna exit code ≠ 0 |
| Toda la estructura compila | `tsc --noEmit` | Sin errores en toda la estructura `src/` |

---

## 14. Observability & Audit

No aplica — US-090 no genera runtime events ni requests.

---

## 15. Seed / Demo Data Impact

No aplica — US-090 no crea ni modifica datos de seed.

---

## 16. Documentation Alignment Required

No documentation alignment issues detected para US-090.

La estructura de módulos, el shared kernel y las convenciones de nombrado están consistentemente documentados en Doc 14 §7.1, §9, §24.1 y §24.2.

**Nota de minor note del Approval Gate**: el Technical Notes de US-090 menciona "11 middlewares de Doc 14 §8.2" cuando el número correcto es **14** (per US-091). El archivo placeholder en `src/shared/interface/middlewares/` debe contener 14 archivos, no 11. Este spec usa el número correcto (14) como fuente de verdad.

---

## 17. Technical Risks & Mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| ESLint import boundary no configurado correctamente — reglas no detectan todas las violaciones | Alto — sin enforcement, el código de dominio se acopla a infraestructura | Incluir NT-01 y NT-02 como casos de smoke test obligatorios en PR review; verificar que el exit code de ESLint es ≠ 0 ante las violaciones |
| Stubs con tipos incorrectos o incompatibles propagados a US-091 y feature stories | Medio — deuda técnica en el contrato de interfaces | Verificar con `tsc --noEmit` después de crear cada archivo; la compilación limpia es AC-04 |
| Directorio `src/shared/` nombrado incorrectamente (`src/shared-kernel/`) | Medio — inconsistencia con Doc 14 §24.1; todos los imports subsecuentes serían erróneos | Decisión formalizada en PO/BA Decisions Applied: `src/shared/` es el nombre canónico |
| Módulo adicional creado más allá de los 16 canónicos | Bajo — scope creep | CI script que verifica que `find src/modules -mindepth 1 -maxdepth 1 -type d \| wc -l` = 16 |
| Shared kernel incluye entidades de dominio de un bounded context específico | Medio — acoplamiento entre módulos vía shared kernel | Revisión en PR: el shared kernel solo debe contener tipos genéricos reutilizables; no `UserEntity`, `EventEntity`, etc. |
| Archivos placeholder con nombres incorrectos obligan renombrado masivo en feature stories | Bajo | Verificar naming conventions per Doc 14 §24.2 en code review de esta US antes de que las feature stories generen más archivos |

---

## 18. Implementation Guidance for Coding Agents

### Árbol de archivos a crear

```
src/
├── modules/
│   ├── identity-access/
│   │   ├── interface/
│   │   │   ├── identity-access.controller.ts     # stub
│   │   │   └── identity-access.routes.ts         # stub
│   │   ├── application/
│   │   │   └── register-user.use-case.ts         # stub
│   │   ├── domain/
│   │   │   └── index.ts                          # export {}
│   │   ├── ports/
│   │   │   └── user.repository.ts                # interface stub
│   │   └── infrastructure/
│   │       └── prisma-user.repository.ts         # class stub
│   ├── user-profile/  [misma estructura]
│   ├── event-planning/  [misma estructura]
│   ├── task-management/  [misma estructura]
│   ├── budget-management/  [misma estructura]
│   ├── vendor-management/  [misma estructura]
│   ├── service-catalog/  [misma estructura]
│   ├── quote-flow/  [misma estructura]
│   ├── booking-intent/  [misma estructura]
│   ├── reviews-moderation/  [misma estructura]
│   ├── notifications/  [misma estructura]
│   ├── ai-assistance/  [misma estructura]
│   ├── admin-governance/  [misma estructura]
│   ├── attachments/  [misma estructura]
│   ├── localization/  [misma estructura]
│   └── seed-demo/  [misma estructura]
├── shared/
│   ├── domain/
│   │   ├── result.ts
│   │   ├── id.ts
│   │   ├── correlation-id.ts
│   │   ├── clock.port.ts
│   │   └── errors/
│   │       ├── app.error.ts
│   │       ├── validation.error.ts
│   │       └── authorization.error.ts
│   ├── application/
│   │   ├── transaction-manager.port.ts
│   │   └── notification-sender.port.ts
│   ├── infrastructure/
│   │   ├── prisma/
│   │   │   └── prisma.client.ts
│   │   └── logger/
│   │       └── index.ts
│   └── interface/
│       └── middlewares/
│           ├── correlation-id.middleware.ts
│           ├── request-logger.middleware.ts
│           ├── json-body-parser.middleware.ts
│           ├── cors.middleware.ts
│           ├── helmet.middleware.ts
│           ├── rate-limit.middleware.ts
│           ├── auth.middleware.ts
│           ├── captcha-verification.middleware.ts
│           ├── role.middleware.ts
│           ├── ownership.middleware.ts
│           ├── validate-request.middleware.ts
│           ├── file-upload.middleware.ts
│           ├── not-found.middleware.ts
│           └── error-handler.middleware.ts
└── modules/
    └── README.md    # Convenciones de nombrado per Doc 14 §24.2
```

### Orden de implementación recomendado

1. **Shared kernel domain types** — `result.ts`, `id.ts`, `correlation-id.ts`, `clock.port.ts` (sin dependencias externas, compilables de inmediato).
2. **Shared kernel errors** — `app.error.ts`, `validation.error.ts`, `authorization.error.ts` (dependen solo del anterior).
3. **Shared kernel application ports** — stubs de interfaces.
4. **Shared kernel infrastructure** — `prisma.client.ts` stub.
5. **Shared kernel middleware placeholders** — 14 archivos stub en `src/shared/interface/middlewares/`.
6. **Verificar `tsc --noEmit`** sobre `src/shared/` — debe pasar limpio.
7. **Estructura de 16 módulos** — crear directorios con stubs representativos (al menos `identity-access` con un archivo por capa siguiendo naming conventions; los demás pueden ser `index.ts` vacíos).
8. **ESLint import boundary rules** — configurar `.eslintrc.js`; verificar con archivos de fixture.
9. **Smoke test ESLint** — crear archivo temporal con import inválido, verificar exit code ≠ 0, eliminar el archivo.
10. **CI script de estructura** — script que verifica los 16 módulos × 5 capas.
11. **`tsc --noEmit` full** — verificar que toda la estructura `src/` compila limpia.
12. **`src/modules/README.md`** — documentar naming conventions.

### Decisiones que no deben reabrirse

| Decisión | Resolución formal |
|---|---|
| Lista de 16 bounded contexts | Doc 14 §9 es la fuente de verdad; no se crean módulos adicionales |
| Nombre del directorio shared kernel | `src/shared/` (no `src/shared-kernel/`) per Doc 14 §24.1 |
| Contenido del shared kernel | Solo tipos transversales: `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort`, `AppError`, `ValidationError`, `AuthorizationError`; sin entidades de dominio ni lógica de feature |
| ESLint como enforcement obligatorio | No es opcional — la regla de import boundary debe generar error de lint, no warning |
| Número de placeholders de middlewares | 14 (per Doc 14 §16 y US-091), no 11 |
| Naming conventions | Doc 14 §24.2 es la fuente de verdad |

### Lo que NO debe implementarse en esta US

- Ningún método de repositorio funcional (solo interfaces vacías o stubs).
- Ningún use case con lógica de negocio.
- Ningún controller que procese requests reales.
- Ningún schema Prisma ni migración.
- Implementación de los 14 middlewares (US-091).
- Path aliases en `tsconfig.json` — si se desean (`@shared/*`, `@modules/*`), pueden añadirse ahora o en US-089 post-facto; no bloquean.

### Supuestos a preservar

- `src/shared/domain/` es la única dependencia permitida para la capa `domain/` de cualquier módulo.
- Los stubs deben ser compilables (no se aceptan archivos vacíos sin `export {}` o una exportación válida).
- Los 16 módulos deben estar exactamente nombrados como en Doc 14 §9 (kebab-case).

---

## 19. Task Generation Notes

### Grupos de tareas sugeridos

**Grupo 1 — Shared kernel (prerequisito para todos los módulos)**
- Crear `src/shared/domain/` con los 7 tipos base.
- Crear `src/shared/application/` con ports stub.
- Crear `src/shared/infrastructure/prisma/prisma.client.ts` stub.
- Verificar `tsc --noEmit` sobre `src/shared/`.

**Grupo 2 — Middleware placeholders (prerequisito para US-091)**
- Crear los 14 archivos stub en `src/shared/interface/middlewares/`.
- Verificar que todos son stubs `RequestHandler` válidos compilables.

**Grupo 3 — Estructura de 16 módulos**
- Crear los 80 directorios (16 × 5 capas).
- Crear stubs representativos para `identity-access/` siguiendo naming conventions.
- Crear `index.ts` con `export {}` en el resto de módulos para compilabilidad.
- Verificar `tsc --noEmit` sobre `src/modules/`.

**Grupo 4 — ESLint import boundaries**
- Instalar `eslint-plugin-boundaries` o `eslint-plugin-import` como devDependency.
- Configurar `.eslintrc.js` con reglas de cross-module y domain-no-infra.
- Smoke test NT-01 y NT-02.
- CI check: `eslint src/` debe pasar sin errores en la estructura final.

**Grupo 5 — CI y documentación**
- Script CI para verificar 16 módulos × 5 capas.
- `src/modules/README.md` con naming conventions.
- Verificación final `tsc --noEmit` sobre toda la estructura `src/`.

### Tareas QA requeridas

- `tsc --noEmit` en toda la estructura `src/` (TS-03).
- Smoke test ESLint con fixture de cross-module import (NT-02).
- Smoke test ESLint con fixture de domain importa infra (NT-01).
- CI script: count de directorios (TS-01) — 80 sub-capas.
- Inspección de naming conventions en `identity-access/` (TS-04 / AC-05).

### Tareas de seguridad requeridas

- Verificar que `eslint src/` falla con exit code ≠ 0 ante las dos categorías de violaciones arquitectónicas.
- PR review: confirmar que `src/shared/domain/` no contiene ninguna entidad de dominio de bounded context específico.

### Tareas de seed/demo

No aplica.

### Tareas de documentación

- `src/modules/README.md` con tabla de naming conventions per Doc 14 §24.2.
- Actualizar el número de middlewares en Technical Notes de US-090 (11 → 14) antes del cierre del sprint.

### Dependencias entre tareas

```
Grupo 1 (shared kernel) → Grupo 2 (middleware stubs)
                        ↘
Grupo 1              → Grupo 3 (módulos) → Grupo 4 (ESLint) → Grupo 5 (CI + docs)
```

Grupos 1 y 2 pueden ejecutarse en paralelo internamente. Grupo 4 requiere que Grupo 3 esté completo (para poder ejecutar ESLint sobre los módulos).

### Consolidación del backlog item

Al completarse US-089, US-090 y US-091, se recomienda generar un `PB-P0-002-tasks.md` consolidado que incluya:
- Verificación de que el servidor arranca con los 14 middlewares activos.
- `GET /health` operativo con correlation ID propagado.
- `tsc --noEmit` limpio en toda la estructura.
- Todos los tests de US-089, US-090 y US-091 verdes en CI.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story aprobada o explícitamente habilitada para draft spec | Pass — Approved with Minor Notes |
| Product Backlog mapping encontrado | Pass — PB-P0-002, US-090 posición 2 de 3 |
| Decision Resolution revisado si presente | Pass — 6 decisiones formalizadas; ninguna bloqueante |
| Scope claro | Pass — estructura de directorios + shared kernel + ESLint; sin lógica de feature |
| Architecture alignment claro | Pass — ADR-ARCH-001 (modular monolith), ADR-ARCH-002 (Clean/Hex), enforce via ESLint |
| API impact claro | N/A — no hay endpoints |
| DB impact claro | Pass — solo stub de Prisma client; sin schema ni migraciones |
| AI impact claro | N/A — no invoca IA |
| Security impact claro | Pass — ESLint boundaries son el control de seguridad arquitectónica; sin runtime auth |
| Testing strategy clara | Pass — tsc + ESLint + CI script estructural; sin tests unitarios complejos |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown**

US-090 tiene scope perfectamente delimitado: crear la estructura de carpetas, los tipos del shared kernel y la configuración de ESLint. Las 6 decisiones PO/BA formalizadas (lista de 16 módulos, contenido del shared kernel, nombre del directorio, enforcement ESLint obligatorio, naming conventions, número de placeholders de middlewares) eliminan todas las ambigüedades que podrían surgir durante la implementación.

El único item que requiere atención durante el sprint: corregir la mención de "11 middlewares" a "14 middlewares" en el archivo de US-090 y crear 14 archivos placeholder (no 11) en `src/shared/interface/middlewares/`. Este spec ya usa el número correcto.

El resultado entregable es un árbol de directorios compilable con `tsc --noEmit`, ESLint con import boundaries operativo, y los tipos del shared kernel listos para ser importados por US-091 y todas las feature stories subsecuentes.
