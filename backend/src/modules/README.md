# `src/modules/` — Bounded contexts (feature-first + Clean/Hex)

Estructura de módulos de dominio del monolito modular de EventFlow (US-090).
Fuentes de verdad: **ADR-ARCH-001** (Modular Monolith), **ADR-ARCH-002** (Clean/Hexagonal),
**Doc 14 §9** (lista de bounded contexts), **Doc 14 §24.1/§24.2** (folder structure + naming).

## Bounded contexts (16)

`identity-access`, `user-profile`, `event-planning`, `task-management`, `budget-management`,
`vendor-management`, `service-catalog`, `quote-flow`, `booking-intent`, `reviews-moderation`,
`notifications`, `ai-assistance`, `admin-governance`, `attachments`, `localization`, `seed-demo`.

> No se agregan ni eliminan módulos sin actualizar Doc 14 §9 y la ADR correspondiente.

## Capas por módulo (5)

Cada bounded context contiene exactamente estas 5 capas, con dependencia unidireccional:

```
interface/ → application/ → domain/ ← ports/ ← infrastructure/
```

| Capa | Responsabilidad | Puede depender de |
|---|---|---|
| `interface/` | Controllers, routes, DTOs HTTP | `application/` |
| `application/` | Use cases / application services | `domain/`, `ports/` |
| `domain/` | Entities, value objects, domain services, domain errors | **solo** `src/shared/domain/` |
| `ports/` | Interfaces (contratos abstractos) | `domain/` |
| `infrastructure/` | Adaptadores concretos (Prisma, SDKs) | `ports/` + frameworks/SDKs |

## Reglas de import boundary (enforced por ESLint)

- **Cross-module (ADR-ARCH-001):** un módulo **no** puede importar directamente de otro módulo.
  La comunicación entre bounded contexts ocurre solo vía barrels públicos. Regla:
  `boundaries/element-types`.
- **Domain sin infraestructura (ADR-ARCH-002):** `domain/` **no** puede importar `@prisma/client`,
  `express`, `openai`, ni otros SDKs. Regla: `no-restricted-imports`.

`npm run lint` falla ante cualquiera de estas dos violaciones.

## Convenciones de nombrado (Doc 14 §24.2)

| Tipo de archivo | Patrón de nombre | Ejemplo |
|---|---|---|
| Use case | `<verb>-<entity>.use-case.ts` | `register-user.use-case.ts` |
| Domain entity | `<entity>.entity.ts` | `event.entity.ts` |
| Value object | `<entity>.value-object.ts` | `money.value-object.ts` |
| Repository port | `<entity>.repository.ts` | `user.repository.ts` |
| Repository adapter | `prisma-<entity>.repository.ts` | `prisma-user.repository.ts` |
| Controller | `<feature>.controller.ts` | `identity-access.controller.ts` |
| Routes | `<feature>.routes.ts` | `identity-access.routes.ts` |

## Módulo de referencia

`identity-access/` contiene stubs con los nombres canónicos por capa como ejemplo:

```
identity-access/
├── interface/
│   ├── identity-access.controller.ts
│   └── identity-access.routes.ts
├── application/
│   └── register-user.use-case.ts
├── domain/
│   └── index.ts
├── ports/
│   └── user.repository.ts
└── infrastructure/
    └── prisma-user.repository.ts
```

Los otros 15 módulos contienen `index.ts` (`export {}`) por capa; su implementación pertenece a
cada feature story. El shared kernel transversal vive en `src/shared/` (no en un módulo).
