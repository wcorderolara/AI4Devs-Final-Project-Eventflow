# EventFlow — API Design Specification

> Versión: 1.0
> Estado: Draft académico final
> Idioma: Español LATAM neutral
> Fecha: 2026-06-08
> Autor: Equipo EventFlow

---

## 1. Propósito del documento

Este documento define el **contrato REST oficial** del backend de **EventFlow** para el MVP académico. Su propósito es traducir la documentación funcional, arquitectónica, de dominio, de IA, de seguridad y no funcional previamente aprobada en un **contrato implementable y verificable** entre el frontend Next.js y el backend Node.js + Express + Prisma + PostgreSQL.

El documento sirve como **fuente única de verdad** para:

- Backend Engineers que implementan controladores Express y casos de uso.
- Frontend Engineers que consumen el API desde Server Components, Client Components y TanStack Query.
- QA Engineers que diseñan pruebas Supertest, MSW, contract tests y casos negativos.
- Software Architect que valida adherencia a los principios arquitectónicos.
- Product Owner que valida cobertura funcional respecto al MVP.
- AI coding agents que generan código alineado a los DTOs y reglas de negocio.
- Evaluadores académicos del Master en AI for Developers.
- Mantenedores futuros del proyecto.

El documento es **deliberadamente prescriptivo** sobre convenciones, naming, autorización, formato de error, observabilidad y reglas de negocio aplicadas. No incluye implementación de código.

---

## 2. Alcance del documento

### 2.1 Incluye

1. Principios y convenciones REST de EventFlow.
2. Estrategia de versionado y base URL.
3. Convenciones de naming de recursos, query params y headers.
4. Estrategia de autenticación basada en sesión/cookie HTTP-only.
5. Modelo de autorización **RBAC + ownership** verificado en backend.
6. Convenciones estándar de request y response (envelopes).
7. Modelo unificado de errores y catálogo de códigos.
8. Códigos HTTP usados por el API y cuándo aplicarlos.
9. Paginación, filtrado, ordenamiento y búsqueda.
10. Estrategia de validación de DTOs con Zod.
11. Seguridad del API: rate limit, captcha, CORS, límites de payload, MIME.
12. Observabilidad: correlation ID, logging estructurado, métricas.
13. Catálogo completo de **módulos** del API y sus endpoints.
14. DTOs principales por endpoint.
15. Reglas de negocio enforced por endpoint.
16. Endpoints de IA con flujo **human-in-the-loop**.
17. Endpoints de adjuntos, notificaciones y gobernanza admin.
18. Endpoints de seed/demo.
19. Matriz de autorización por endpoint.
20. Estrategia de pruebas del API.
21. Estrategia de generación de OpenAPI a partir de este documento.
22. Consideraciones para consumo desde Next.js (App Router + TanStack Query).
23. Límites explícitos del MVP y endpoints futuros fuera de alcance.

### 2.2 No incluye

- Implementación concreta de controladores Express, esquemas Prisma o casos de uso.
- Especificación OpenAPI YAML (se incluye **guía de preparación**, no el archivo).
- Diseño UI/UX detallado (cubierto en [`/docs/15-Frontend-Architecture-Design.md`](15-Frontend-Architecture-Design.md)).
- Esquemas SQL o migraciones Prisma (cubierto en [`/docs/6-Domain-Data-Model.md`](6-Domain-Data-Model.md) y [`/docs/14-Backend-Technical-Design.md`](14-Backend-Technical-Design.md)).
- Endpoints de pagos reales, contratos digitales, chat en tiempo real, WhatsApp, SMS, push notifications, calendario.
- APIs GraphQL, gRPC, tRPC, Server Actions o WebSockets.
- Endpoints de administración multi-tenant, federación, SSO empresarial.
- Cualquier endpoint de IA con comportamiento autónomo o sin confirmación humana.

---

## 3. Fuentes utilizadas

Este documento se alinea estrictamente con:

| Documento | Uso principal |
| --- | --- |
| [`/docs/1-Domain-Discovery-Report.md`](1-Domain-Discovery-Report.md) | Lenguaje ubicuo, actores, problemas. |
| [`/docs/2-Product-Owner-Decisions.md`](2-Product-Owner-Decisions.md) | Decisiones de producto inmutables. |
| [`/docs/3-MVP-Scope-Definition.md`](3-MVP-Scope-Definition.md) | Qué entra y qué queda fuera del MVP. |
| [`/docs/4-Business-Rules-Document.md`](4-Business-Rules-Document.md) | Reglas BR-* enforced por API. |
| [`/docs/5-User-Roles-Permissions-Matrix.md`](5-User-Roles-Permissions-Matrix.md) | RBAC + ownership por entidad. |
| [`/docs/6-Domain-Data-Model.md`](6-Domain-Data-Model.md) | Entidades, enums, atributos. |
| [`/docs/7-AI-Features-Specification.md`](7-AI-Features-Specification.md) | AI endpoints, DTOs, fallback. |
| [`/docs/8-Use-Cases-Specification.md`](8-Use-Cases-Specification.md) | Casos de uso por módulo. |
| [`/docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md`](8.1-Product-Owner-Decisions-Use-Cases-Addendum.md) | Aclaraciones de PO. |
| [`/docs/8.2-Documentation-Alignment-Review-Before-FRD.md`](8.2-Documentation-Alignment-Review-Before-FRD.md) | Coherencia documental. |
| [`/docs/9-Functional-Requirements-Document.md`](9-Functional-Requirements-Document.md) | Requerimientos funcionales numerados. |
| [`/docs/10-Non-Functional-Requirements.md`](10-Non-Functional-Requirements.md) | Seguridad, performance, accesibilidad. |
| [`/docs/11-Data-Seed-Strategy.md`](11-Data-Seed-Strategy.md) | Seed/demo flow. |
| [`/docs/12-Architecture-Vision-and-Principles.md`](12-Architecture-Vision-and-Principles.md) | Principios arquitectónicos. |
| [`/docs/13-System-Architecture-Document.md`](13-System-Architecture-Document.md) | Vista de sistema. |
| [`/docs/14-Backend-Technical-Design.md`](14-Backend-Technical-Design.md) | Módulos, capas, repository ports, DTOs. |
| [`/docs/15-Frontend-Architecture-Design.md`](15-Frontend-Architecture-Design.md) | Consumo desde App Router + TanStack Query. |

Toda regla de negocio referenciada como `BR-XXX-###` proviene de [`4-Business-Rules-Document.md`](4-Business-Rules-Document.md).

---

## 4. Resumen ejecutivo del API

EventFlow expone un **único API REST JSON** versionado en `/api/v1` servido por un monolito modular Node.js + Express. El API atiende a tres roles —`organizer`, `vendor`, `admin`— y un consumidor anónimo público (directorio de vendors y SEO).

Características principales:

- **REST clásico**: recursos en plural, verbos HTTP estándar, status codes semánticos.
- **JSON only** (excepto endpoints de adjuntos: `multipart/form-data`).
- **Versionado por URL**: `/api/v1`.
- **Autenticación por cookie HTTP-only** emitida por backend (no se almacena token en `localStorage`).
- **Autorización en backend**: RBAC + ownership. Frontend solo provee UX guards.
- **Validación obligatoria con Zod** en el límite del controlador (request DTO).
- **Sobre estándar** de response (`data`, `pagination`, `meta`) y de error (`error`, `meta`).
- **Correlation ID obligatorio** en cada request/response (`X-Correlation-Id`).
- **Human-in-the-loop estricto** para todas las salidas de IA.
- **Sin chat en tiempo real, sin pagos reales, sin contratos digitales**.
- **Health check público** en `/health`.

El API está diseñado para ser **directamente convertible a OpenAPI 3.1** mediante anotación de schemas Zod (ver §43).

---

## 5. Principios de diseño del API

| Principio | Descripción |
| --- | --- |
| **P-API-01** Contrato es la verdad | El contrato definido aquí precede a cualquier implementación. Cualquier desviación requiere actualización de este documento. |
| **P-API-02** REST sin sobre-ingeniería | REST clásico. No HATEOAS, no JSON:API, no GraphQL. |
| **P-API-03** Coherencia sobre creatividad | Un patrón se decide una vez y se aplica en todo el API. |
| **P-API-04** Backend es fuente de verdad de seguridad | Frontend nunca decide autorización: solo mejora UX. |
| **P-API-05** Reglas de negocio enforced en backend | Aunque el frontend valide, el backend re-valida y rechaza. |
| **P-API-06** DTOs explícitos | No se exponen entidades de dominio crudas. Se exponen DTOs específicos por caso de uso. |
| **P-API-07** Errores expresivos pero seguros | Mensajes claros para clientes; sin stack traces, sin datos internos. |
| **P-API-08** IA siempre human-in-the-loop | Ningún output de IA toma efecto sin confirmación humana explícita. |
| **P-API-09** Trazabilidad obligatoria | Todo request lleva `X-Correlation-Id`. Acciones admin se registran en `AdminAction`. |
| **P-API-10** Listo para OpenAPI | DTOs son convertibles a JSON Schema sin reescribirlos. |
| **P-API-11** No filtración de proveedor IA | El frontend nunca habla directo con OpenAI/Anthropic. Las llaves nunca salen del backend. |
| **P-API-12** Idempotencia donde corresponde | Operaciones de creación críticas (intentos de booking, recomendaciones IA confirmadas) son idempotentes cuando se justifica. |
| **P-API-13** Backward compatibility en la versión | Cambios incompatibles requieren `/api/v2`. |
| **P-API-14** Soft delete por defecto | Recursos sensibles (reviews, adjuntos, categorías) usan soft delete. |
| **P-API-15** Datos seed marcados | Cuando aplica, los DTOs exponen `isSeed` para depuración y demo. |

---

## 6. Estilo de API y convenciones REST

EventFlow sigue REST clásico:

- **Verbos HTTP** mapean a operaciones CRUD:
  - `GET` → leer
  - `POST` → crear, ejecutar acciones de negocio
  - `PATCH` → actualización parcial
  - `PUT` → reemplazo total (raro; solo donde aplica)
  - `DELETE` → eliminar (soft delete cuando aplica)
- **Recursos** se nombran con sustantivos en **plural**.
- **Acciones no-CRUD** (aceptar quote, cancelar booking) se modelan como sub-recursos verbo: `/quotes/:id/accept`.
- **Idempotencia**: `GET`, `PUT`, `DELETE`, y las acciones de transición de estado idempotentes (ej. `confirm`) son seguras para reintento.
- **Stateless**: cada request es independiente; el estado de sesión vive en cookie firmada por backend.

No se usan en este MVP:

- HATEOAS.
- Hypermedia links en respuestas.
- JSON:API spec.
- Convenciones GraphQL embebidas en REST.

---

## 7. Versionado del API

| Aspecto | Decisión |
| --- | --- |
| Estrategia | Versionado por **URL prefix**. |
| Base | `/api/v1` |
| Cambios menores | Aditivos (nuevos campos opcionales en response, nuevos endpoints) **no** suben versión. |
| Cambios mayores | Eliminar campos, renombrar paths, cambiar semántica → `/api/v2`. |
| Convivencia | `v1` y `v2` pueden coexistir temporalmente durante migración. |
| Header alterno | No se usa `Accept-Version` ni media-type versioning para el MVP. |

Los endpoints públicos SEO también se versionan: `/api/v1/public/...`.

El health check no se versiona: `GET /health`.

---

## 8. Base URL y ambientes

| Ambiente | Base URL backend | Notas |
| --- | --- | --- |
| Local | `http://localhost:3000/api/v1` | Backend Express en `:3000`. Frontend Next.js en `:4000`. |
| Demo académico | `https://api.eventflow.demo/api/v1` | URL ilustrativa. |
| Producción académica | `https://api.eventflow.app/api/v1` | URL ilustrativa. |

Health check: `GET /health` retorna `200 OK` con `{ status: "ok", version, uptimeMs }`.

---

## 9. Convenciones de naming

### 9.1 Recursos (paths)

- Sustantivos en **plural** y **kebab-case**: `/events`, `/quote-requests`, `/booking-intents`, `/service-categories`.
- Subrecursos cuando expresan composición clara:
  - `GET /events/:eventId/tasks`
  - `POST /events/:eventId/tasks`
  - `GET /events/:eventId/budget`
  - `POST /vendors/:vendorProfileId/services` (admin/owner-only)
- Acciones verbo siempre sobre recurso:
  - `POST /quotes/:quoteId/accept`
  - `POST /quotes/:quoteId/reject`
  - `POST /booking-intents/:bookingIntentId/confirm`
  - `POST /booking-intents/:bookingIntentId/cancel`
  - `POST /ai-recommendations/:aiRecommendationId/apply`
  - `POST /ai-recommendations/:aiRecommendationId/discard`
- Profundidad máxima de anidamiento: **2 niveles** (`/events/:id/tasks/:taskId`).

### 9.2 Identificadores en path

- Siempre **UUID v4** en formato string. Ejemplo: `/events/3f9a8b51-...`
- Slugs públicos para directorios SEO: `/api/v1/public/vendors/:vendorSlug`.

### 9.3 Query parameters

- `camelCase`: `?pageSize=20&languageCode=es-LATAM&sort=createdAt:desc`.

### 9.4 Body JSON

- Claves en `camelCase`.
- Enums en `snake_case` o `kebab-case` según definición canónica de [`6-Domain-Data-Model.md`](6-Domain-Data-Model.md) (ej. `event_plan`, `quote_brief`, `booking_intent`).
- Fechas en **ISO 8601 UTC**: `2026-07-01T00:00:00.000Z`.
- Fechas sin hora en formato `YYYY-MM-DD`.
- Decimales como strings cuando representan dinero: `"total_planned": "12500.00"`.

### 9.5 DTO naming (TypeScript)

- Request DTO: `Create<Recurso>RequestDto`, `Update<Recurso>RequestDto`, `<Accion><Recurso>RequestDto`.
- Response DTO: `<Recurso>ResponseDto`, `<Recurso>ListResponseDto`, `<Recurso>SummaryDto`.
- DTOs de IA: `<Feature>InputDto`, `<Feature>OutputDto`, `AIRecommendationResponseDto`.

### 9.6 Headers

| Header | Dirección | Uso |
| --- | --- | --- |
| `Accept` | request | siempre `application/json` (excepto adjuntos). |
| `Content-Type` | request | `application/json` o `multipart/form-data`. |
| `Accept-Language` | request | `es-LATAM` (default), `es-ES`, `pt`, `en`. Determina el idioma del payload de IA y catálogos. |
| `Cookie` | request | Session cookie HTTP-only emitida por backend. |
| `X-Correlation-Id` | request/response | UUID propagado en logs y respuestas. Si no se envía, backend lo genera. |
| `X-RateLimit-Limit` | response | límite del bucket. |
| `X-RateLimit-Remaining` | response | requests restantes. |
| `Retry-After` | response | segundos a esperar tras `429`. |

---

## 10. Autenticación

### 10.1 Decisión

- **Estrategia**: autenticación basada en **session cookie HTTP-only firmada** emitida por el backend tras `POST /auth/login`.
- **Atributos cookie**: `HttpOnly; Secure; SameSite=Lax; Path=/`.
- **Hashing de contraseña**: `bcrypt` o `argon2` (recomendado argon2id).
- **Captcha** obligatorio en `/auth/register` y `/auth/login` (BR-AUTH-011) usando reCAPTCHA o hCaptcha.
- **No** se almacenan tokens en `localStorage` ni `sessionStorage`.
- **JWT** como alternativa solo si el deploy elegido lo justifica (cookie firmada lleva el JWT como contenido opaco, nunca expuesta a JS).

### 10.2 Endpoints de auth (catálogo resumen)

| Método | Path | Público | Captcha | Propósito |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Sí | Sí | Crea `organizer` o `vendor`. |
| POST | `/auth/login` | Sí | Sí | Inicia sesión. Emite cookie. |
| POST | `/auth/logout` | Auth | No | Invalida sesión. |
| POST | `/auth/password/reset-request` | Sí | Sí | Solicita correo de reseteo. |
| POST | `/auth/password/reset` | Sí | No | Aplica reseteo con token de un solo uso. |
| GET | `/me` | Auth | No | Retorna usuario actual y rol. |

Detalles completos en §22.

### 10.3 Flujo de autenticación

```mermaid
sequenceDiagram
    participant FE as Next.js Client
    participant BE as Express API
    participant DB as PostgreSQL

    FE->>BE: POST /auth/login (email, password, captchaToken)
    BE->>BE: Valida captcha + DTO
    BE->>DB: Busca usuario, verifica hash
    DB-->>BE: User + role
    BE-->>FE: 200 OK + Set-Cookie session
    FE->>BE: GET /me (cookie)
    BE-->>FE: 200 OK + user DTO
```

### 10.4 Rate limit en auth

- `/auth/login`: máx 10 intentos / IP / 10 min, luego `429`.
- `/auth/register`: máx 5 / IP / 10 min.
- `/auth/password/reset-request`: máx 3 / email / 1 h.

---

## 11. Autorización: RBAC + ownership

EventFlow combina **RBAC** y **ownership**:

- **RBAC**: cada endpoint declara roles permitidos (`organizer`, `vendor`, `admin`, `anonymous`).
- **Ownership**: para recursos de usuario (`event`, `vendor_profile`, `vendor_service`, etc.), el backend valida que el `userId` de la sesión sea propietario.
- **Assignment-based**: vendor solo ve `QuoteRequest` asignadas a su `VendorProfile`.

### 11.1 Cadena de middlewares

```text
correlationId
→ securityHeaders
→ cors
→ rateLimit (en rutas sensibles)
→ bodyParser (con límite)
→ authMiddleware              // verifica cookie/session
→ roleMiddleware([roles])     // verifica role del usuario
→ ownershipMiddleware(opts)   // verifica propiedad del recurso
→ validateRequestMiddleware(zodSchema)  // valida body/params/query
→ controller
→ errorMiddleware
```

### 11.2 Reglas

- Si la sesión no es válida → `401 UNAUTHENTICATED`.
- Si el rol no coincide → `403 FORBIDDEN`.
- Si el recurso no es del usuario (y no es admin) → `403 FORBIDDEN`.
- Si el recurso no existe → `404 NOT_FOUND` (independiente de propiedad para no filtrar existencia salvo en admin).
- **No se filtra** información de recurso pertenecientes a otros usuarios.
- Admin puede leer todo (con excepciones); cualquier acción admin se registra en `AdminAction` (BR-ADMIN-004).

### 11.3 Resumen por rol

| Rol | Características |
| --- | --- |
| `anonymous` | Solo accede a `/health`, `/auth/*`, `/api/v1/public/*`, `/api/v1/event-types`, `/api/v1/service-categories` (read-only). |
| `organizer` | Gestiona sus eventos, tasks, budgets, quote requests, booking intents, reviews, IA, notifications. |
| `vendor` | Gestiona su `VendorProfile`, sus `VendorService`, su portfolio, sus quote requests asignadas, responde quotes, ve sus reviews. |
| `admin` | Aprueba/rechaza vendors, modera reviews, gestiona catálogos (EventType, ServiceCategory), ve métricas, lee eventos en read-only, ejecuta seed/demo. |

---

## 12. Convenciones de request

### 12.1 Content-Type

- `application/json` por defecto.
- `multipart/form-data` solo para `/attachments` y portafolio de vendor.

### 12.2 Body

- JSON UTF-8.
- Tamaño máximo por defecto: **1 MB** (configurable).
- Estricto: campos desconocidos son rechazados con `VALIDATION_ERROR`.

### 12.3 Query

- `camelCase`.
- Parámetros booleanos: `true` / `false` literales.
- Parámetros de enum: valor canónico (ej. `status=active`).

### 12.4 Path

- UUID v4 o slug. Validados por Zod.

### 12.5 Headers obligatorios

- `Accept: application/json`.
- `Accept-Language: es-LATAM` o variantes.
- `X-Correlation-Id` (opcional; backend genera si falta).

### 12.6 Idempotencia

- Para operaciones de creación que pueden reintentar el cliente (ej. `POST /booking-intents`), se acepta `Idempotency-Key` en header como **mejora futura** (no obligatorio en MVP).

---

## 13. Convenciones de response

### 13.1 Sobre éxito (recurso único)

```json
{
  "data": {
    "id": "3f9a8b51-...",
    "title": "Boda Ana y Luis",
    "status": "active",
    "...": "..."
  },
  "meta": {
    "correlationId": "req_3f9a...",
    "timestamp": "2026-06-08T18:30:00.000Z"
  }
}
```

### 13.2 Sobre éxito (lista paginada)

```json
{
  "data": [
    { "id": "...", "title": "...", "status": "active" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 100,
    "totalPages": 5
  },
  "meta": {
    "correlationId": "req_3f9a...",
    "timestamp": "2026-06-08T18:30:00.000Z"
  }
}
```

### 13.3 Sobre éxito sin contenido

- `204 No Content` con cuerpo vacío. El header `X-Correlation-Id` siempre se devuelve.

### 13.4 Convenciones generales

- Toda respuesta incluye `meta.correlationId` y `meta.timestamp` (ISO 8601 UTC).
- Toda respuesta lista incluye `pagination`.
- Toda respuesta de IA incluye `aiMeta` con `provider`, `promptVersion`, `latencyMs`, `fallbackUsed`, `languageCode`, `recommendationId`.
- Decimales monetarios como strings.
- Fechas como ISO 8601 strings.
- Enums siempre como string lowercase canónica.

### 13.5 Cacheability

- `GET` públicos (`/api/v1/public/*`) pueden incluir `Cache-Control: public, max-age=300`.
- Endpoints autenticados: `Cache-Control: no-store`.

---

## 14. Modelo estándar de errores

### 14.1 Sobre

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Uno o más campos son inválidos.",
    "details": [
      { "field": "eventDate", "message": "eventDate debe ser una fecha futura." },
      { "field": "currency", "message": "currency debe ser GTQ o USD." }
    ]
  },
  "meta": {
    "correlationId": "req_3f9a...",
    "timestamp": "2026-06-08T18:30:00.000Z"
  }
}
```

### 14.2 Catálogo de códigos

| Código | HTTP | Categoría | Uso |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 / 422 | Validación | Input rechazado por Zod. |
| `INVALID_REQUEST` | 400 | Validación | Body malformado o JSON inválido. |
| `MISSING_INPUT` | 400 | Validación | Campo obligatorio ausente en endpoint IA. |
| `AUTHENTICATION_REQUIRED` | 401 | Auth | Sesión faltante o inválida. |
| `FORBIDDEN` | 403 | Authz | Rol no autorizado o no es owner. |
| `RESOURCE_NOT_FOUND` | 404 | Recurso | Recurso solicitado no existe o no es accesible. |
| `CONFLICT` | 409 | Estado | Conflicto de estado (ej. email tomado). |
| `BUSINESS_RULE_VIOLATION` | 422 | Reglas | Regla de negocio rechazó la operación. |
| `CURRENCY_IMMUTABLE` | 409 | Reglas | Intento de cambiar moneda de evento. |
| `MAX_QUOTE_REQUESTS_EXCEEDED` | 409 | Reglas | >5 QuoteRequest activas por categoría/evento. |
| `MAX_PORTFOLIO_IMAGES_EXCEEDED` | 409 | Reglas | >10 imágenes por work/event del portafolio. |
| `MAX_CATEGORY_CHANGES_EXCEEDED` | 409 | Reglas | >5 cambios de categoría del vendor. |
| `DUPLICATE_REVIEW` | 409 | Reglas | Review ya existe para `(event, vendor)`. |
| `DUPLICATE_QUOTE_REQUEST_ACTIVE` | 409 | Reglas | QuoteRequest activa duplicada. |
| `QUOTE_EXPIRED` | 410 | Estado | Quote expirada al intentar aceptar. |
| `EVENT_TYPE_HAS_EVENTS` | 409 | Reglas | Intento de borrar EventType con eventos asociados. |
| `CATEGORY_DEPTH_EXCEEDED` | 409 | Reglas | ServiceCategory excede profundidad máxima (2). |
| `RATE_LIMIT_EXCEEDED` | 429 | Anti-abuso | Límite de requests excedido. |
| `EMAIL_TAKEN` | 409 | Estado | Email ya registrado en `/auth/register` (mensaje neutro anti-enumeración). |
| `CAPTCHA_REQUIRED` | 400 | Anti-abuso | Token de captcha ausente en endpoint protegido por captcha. |
| `CAPTCHA_INVALID` | 400 | Anti-abuso | Token de captcha inválido/expirado (causa exacta nunca se revela). |
| `ALREADY_AUTHENTICATED` | 409 | Estado | Sesión activa invocando un endpoint solo-anónimo (register/login). |
| `AI_PROVIDER_TIMEOUT` | 504 / 503 | IA | Timeout >60s del proveedor LLM. |
| `AI_PROVIDER_UNAVAILABLE` | 503 | IA | LLM no disponible y fallback agotado. |
| `AI_INVALID_OUTPUT` | 422 | IA | Output del LLM no pasó validación JSON Schema. |
| `FILE_UPLOAD_ERROR` | 400 / 413 | Adjuntos | MIME inválido, tamaño excedido, etc. |
| `INTERNAL_ERROR` | 500 | Sistema | Falla inesperada. Detalle solo en logs. |

> **Nota de catálogo (2026-07-10, US-001 / DOC-001):** se formalizan `EMAIL_TAKEN`,
> `CAPTCHA_REQUIRED`, `CAPTCHA_INVALID` y `ALREADY_AUTHENTICATED`, códigos estables ya entregados
> por PB-P0-004/PB-P0-006 (US-094/US-109) y referenciados por las decisiones PO de US-003/US-004.
> El caso "captcha inválido" usa código dedicado en lugar de `VALIDATION_ERROR` genérico.

### 14.3 Reglas

- `message` es **siempre** legible para humanos y traducible (Accept-Language).
- `details` es opcional pero **obligatorio** en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION` con `details[].field`.
- **Nunca** se exponen stack traces ni nombres de archivo internos.
- **Nunca** se exponen IDs internos de proveedor LLM, llaves, etc.
- Errores `500` siempre incluyen `correlationId` para soporte.

### 14.4 Diagrama de manejo

```mermaid
flowchart TD
    A[Request entra] --> B{Auth OK?}
    B -- No --> R401[401 AUTHENTICATION_REQUIRED]
    B -- Sí --> C{Role OK?}
    C -- No --> R403[403 FORBIDDEN]
    C -- Sí --> D{Recurso existe?}
    D -- No --> R404[404 RESOURCE_NOT_FOUND]
    D -- Sí --> E{Ownership OK?}
    E -- No --> R403B[403 FORBIDDEN]
    E -- Sí --> F{DTO válido?}
    F -- No --> R422[422 VALIDATION_ERROR]
    F -- Sí --> G[Use case]
    G --> H{Regla negocio?}
    H -- Falla --> R422B[422 BUSINESS_RULE_VIOLATION]
    H -- OK --> R200[200/201/204]
```

---

## 15. Códigos HTTP

| Código | Significado | Cuándo |
| --- | --- | --- |
| `200 OK` | Éxito lectura/acción | `GET`, `PATCH`, acciones. |
| `201 Created` | Recurso creado | `POST` que crea recurso. Incluye `Location`. |
| `202 Accepted` | Procesamiento aceptado | Operación asíncrona (no usado en MVP, reservado). |
| `204 No Content` | Éxito sin cuerpo | `DELETE`, `mark-as-read`, `logout`. |
| `400 Bad Request` | Solicitud malformada | JSON inválido, body ausente, query inválido. |
| `401 Unauthorized` | Sin sesión válida | Cookie ausente, expirada o firma inválida. |
| `403 Forbidden` | Sin permisos | Rol no autorizado o no es owner. |
| `404 Not Found` | Recurso no existe | Recurso no encontrado o no accesible. |
| `409 Conflict` | Conflicto de estado | Email tomado, currency inmutable, duplicado, excede límites. |
| `410 Gone` | Recurso expirado | `Quote` expirada al aceptar. |
| `413 Payload Too Large` | Tamaño excedido | Adjunto demasiado grande. |
| `415 Unsupported Media Type` | Content-Type no soportado | MIME inválido. |
| `422 Unprocessable Entity` | Validación o regla | Zod rechazó input válido en formato pero inválido semánticamente, o BR violada. |
| `429 Too Many Requests` | Rate limit | Captcha, login, AI. |
| `500 Internal Server Error` | Falla inesperada | Bug, excepción no manejada. |
| `503 Service Unavailable` | Dependencia fuera | LLM no disponible. |
| `504 Gateway Timeout` | Timeout dependencia | Opcional para AI timeout (alternativa a `503 + AI_PROVIDER_TIMEOUT`). |

---

## 16. Paginación, filtros, ordenamiento y búsqueda

### 16.1 Paginación

- Esquema: **page-based**.
- Parámetros: `?page=1&pageSize=20`.
- Default `page=1`, `pageSize=20`.
- Máximo `pageSize=100`.
- Respuesta incluye objeto `pagination` con `page`, `pageSize`, `totalItems`, `totalPages`.

### 16.2 Filtrado

- Filtros por igualdad: `?status=active&type=wedding&city=guatemala`.
- Filtros de rango (eventos por fecha): `?eventDateFrom=2026-07-01&eventDateTo=2026-12-31`.
- Filtros booleanos: `?isPreferred=true`.
- Cada endpoint declara los filtros válidos.

### 16.3 Ordenamiento

- Sintaxis: `?sort=campo:asc|desc`.
- Múltiples campos: `?sort=createdAt:desc,title:asc`.
- Default por endpoint (típicamente `createdAt:desc`).

### 16.4 Búsqueda

- Parámetro `?q=texto`.
- Aplica a campos definidos por endpoint (ej. directorio público de vendors busca en `business_name` y `bio`).
- Búsqueda case-insensitive y normalizada (sin acentos en MVP cuando sea pragmático).

### 16.5 Selección de campos

- No soportada en MVP. Todos los endpoints retornan el DTO completo de su recurso.

---

## 17. Validación de DTOs

- Toda request se valida con **Zod** en el límite del controlador (`validateRequestMiddleware`).
- Validación cubre `body`, `params`, `query`.
- Respuestas no se validan en runtime, pero los DTOs de response están definidos como tipos TypeScript estrictos para coherencia OpenAPI.
- Campos desconocidos en body son **rechazados** (`.strict()` en Zod).
- Coerción de fechas: las strings ISO se convierten a `Date` solo después de validar formato.

### 17.1 Reglas comunes

| Tipo | Regla |
| --- | --- |
| Email | lowercase, regex RFC 5322 simplificada. |
| UUID | v4. |
| Date | ISO 8601 UTC para timestamps, `YYYY-MM-DD` para fechas. |
| Decimal monetario | string con dos decimales, ≥ 0. |
| Strings | `trim`, longitud máxima por campo. |
| Enums | unión cerrada con valores canónicos. |
| Arrays | `minItems`/`maxItems` cuando aplica. |

### 17.2 Validaciones cross-field

Se aplican en el caso de uso (capa Application), por ejemplo:

- `Event.eventDate` debe ser futura al crear.
- `Quote.validUntil` debe ser posterior a `Quote.createdAt`.
- `BudgetItem.committed >= 0`.
- `Review.rating` entero 1–5.

---

## 18. Seguridad del API

### 18.1 Constraints obligatorias

| # | Constraint |
| --- | --- |
| S-01 | HTTPS obligatorio en demo/prod (TLS terminado en LB o app). |
| S-02 | `helmet` para headers de seguridad. |
| S-03 | CORS restringido a origins conocidos (`FRONTEND_URL`). |
| S-04 | Cookies HTTP-only, `Secure`, `SameSite=Lax`. |
| S-05 | No tokens de auth en `localStorage`. |
| S-06 | `bcrypt`/`argon2` para hash de password. |
| S-07 | Captcha en `/auth/register` y `/auth/login` (BR-AUTH-011). |
| S-08 | Rate limit en auth, IA y operaciones costosas. |
| S-09 | Validación estricta de Zod (`.strict()`). |
| S-10 | No filtrar stack traces ni mensajes internos en errores. |
| S-11 | Body limit 1 MB JSON; adjuntos limitados por endpoint (típico 5 MB por archivo, 10 imágenes por trabajo). |
| S-12 | MIME allow-list para adjuntos (`image/jpeg`, `image/png`, `image/webp`). |
| S-13 | Frontend nunca consume llaves de OpenAI/Anthropic. |
| S-14 | Frontend nunca decide autorización: backend re-verifica. |
| S-15 | Logging estructurado **sin** PII más allá de email/role mínimo. |
| S-16 | `AdminAction` registra toda acción admin sensible. |
| S-17 | Soft delete para reviews, attachments, service categories, vendor profiles. |
| S-18 | Email reset token: único uso, expiración corta (15 min). |
| S-19 | Sesión expira (configurable: 24 h por defecto). |
| S-20 | Cookies invalidadas en `/auth/logout`. |

### 18.2 Anti-abuso

- Captcha obligatorio en endpoints públicos sensibles.
- Rate limit por IP y por usuario en endpoints IA.
- Detección básica de inputs maliciosos por longitud y carácter.

---

## 19. Observabilidad y correlation IDs

### 19.1 Correlation ID

- Header `X-Correlation-Id` aceptado en request.
- Si no se envía, backend genera un UUID v4 con prefijo `req_`.
- Se propaga en:
  - logs (`pino` con `correlationId` en cada line).
  - respuesta (`meta.correlationId`).
  - errores (`meta.correlationId`).
  - llamadas al LLM (registrado en `AIRecommendation`).

### 19.2 Logging

- `pino` con redacción de campos sensibles (passwords, tokens, captcha).
- Niveles: `info` (default), `warn`, `error`.
- Cada request se loguea con: método, path, status, duración, correlationId, userId, role.

### 19.3 Métricas

- Latencia por endpoint.
- Conteo de errores por código.
- Conteo de timeouts del LLM.
- Tasa de fallback IA.
- Estado de jobs (auto-complete events, expire quotes).

---

## 20. Catálogo de módulos del API

El backend está dividido en módulos. Cada módulo expone un conjunto de endpoints. Esta sección lista los módulos; las siguientes secciones (§21–§39) definen endpoints, DTOs y reglas.

| # | Módulo | Path raíz típico | Sección |
| --- | --- | --- | --- |
| M01 | Health | `/health` | §21 |
| M02 | Auth | `/auth` | §22 |
| M03 | User / Profile | `/me`, `/users` | §23 |
| M04 | Events | `/events` | §24 |
| M05 | Event Tasks | `/events/:id/tasks` | §25 |
| M06 | Budget | `/events/:id/budget` | §26 |
| M07 | Vendor Profiles | `/vendors` | §27 |
| M08 | Vendor Services | `/vendors/:id/services` | §28 |
| M09 | Service Categories | `/service-categories` | §29 |
| M10 | Quote Requests | `/events/:id/quote-requests`, `/quote-requests` | §30 |
| M11 | Quotes | `/quotes` | §31 |
| M12 | Booking Intents | `/booking-intents` | §32 |
| M13 | Reviews | `/reviews` | §33 |
| M14 | Notifications | `/notifications` | §34 |
| M15 | AI Assistance | varios | §35 |
| M16 | Attachments | `/attachments` | §36 |
| M17 | Admin Governance | `/admin/*` | §37 |
| M18 | Localization / Currency | `/i18n`, `/currencies` | §38 |
| M19 | Seed / Demo | `/admin/seed/*` | §39 |

---

## 21. Health API

### 21.1 Propósito

Verificación de disponibilidad del backend, útil para healthchecks de plataforma y para probes manuales.

### 21.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | No | anonymous | Healthcheck del backend. | 200 | 500 |
| GET | `/health/ready` | No | anonymous | Readiness (DB conectada). | 200 / 503 | 503 |

### 21.3 Response DTO

```ts
type HealthResponseDto = {
  status: "ok" | "degraded" | "error";
  version: string;
  uptimeMs: number;
  timestamp: string; // ISO
};
```

`/health/ready` agrega:

```ts
type ReadyResponseDto = HealthResponseDto & {
  dependencies: {
    postgres: "ok" | "down";
    aiProvider: "ok" | "mock" | "down";
  };
};
```

### 21.4 Notas

- No requiere `X-Correlation-Id` ni sesión.
- No expone configuración interna.

---

## 22. Auth API

### 22.1 Propósito

Registro, autenticación, cierre de sesión y recuperación de contraseña.

### 22.2 Actores

- `anonymous` para todas excepto `/auth/logout` y `/me`.

### 22.3 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/register` | No | anonymous | Crea `organizer` o `vendor`. | 201 | 400, 409 (EMAIL_TAKEN), 422, 429 |
| POST | `/auth/login` | No | anonymous | Inicia sesión. | 200 + Set-Cookie | 400, 401, 422, 429 |
| POST | `/auth/logout` | Sí | organizer, vendor, admin | Cierra sesión. | 204 | 401 |
| POST | `/auth/password/reset-request` | No | anonymous | Solicita reset por email. | 202 | 400, 429 |
| POST | `/auth/password/reset` | No | anonymous | Aplica reset con token. | 204 | 400, 401, 410 (token expirado), 422 |

### 22.4 DTOs

```ts
type RegisterRequestDto = {
  email: string;
  password: string;
  name: string;
  role: "organizer" | "vendor";
  preferredLanguage: "es-LATAM" | "es-ES" | "pt" | "en";
  captchaToken: string;
};

type LoginRequestDto = {
  email: string;
  password: string;
  captchaToken: string;
};

type PasswordResetRequestDto = {
  email: string;
  captchaToken: string;
};

type PasswordResetDto = {
  token: string;
  newPassword: string;
};

type AuthUserResponseDto = {
  id: string;
  email: string;
  name: string;
  role: "organizer" | "vendor" | "admin";
  preferredLanguage: "es-LATAM" | "es-ES" | "pt" | "en";
  status: "active" | "suspended";
};
```

### 22.5 Reglas de negocio enforced

- **BR-AUTH-002**: registro solo crea `organizer` o `vendor`. Intento de `role=admin` → `403 FORBIDDEN`.
- **BR-AUTH-005**: mono-rol; no se permite alternar rol.
- **BR-AUTH-011**: captcha obligatorio en register y login.
- **BR-USER-002**: email único (case-insensitive). Conflicto → `409 EMAIL_TAKEN`.
- Hash con bcrypt/argon2; nunca devolver hash.

### 22.6 Errores y notas

- Respuesta de login con credenciales incorrectas: `401 AUTHENTICATION_REQUIRED` con mensaje genérico ("credenciales inválidas") para no filtrar existencia de usuario.
- Después de 10 intentos fallidos / IP / 10 min → `429`.
- `/auth/password/reset-request` retorna `202` aun cuando el email no exista, para evitar enumeración.

---

## 23. User / Profile API

### 23.1 Propósito

Lectura y actualización del perfil del usuario autenticado.

> **Nota (US-003 / API-001, 2026-07-10):** el path canónico del perfil propio es `GET /api/v1/users/me` (decisión US-094: recurso plural `users`, sin alias `/me` en la raíz). Las referencias a `GET /me` en este documento deben leerse como `GET /api/v1/users/me`; el frontend consume este path para la hidratación de sesión y el ruteo por rol.

### 23.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/me` | Sí | organizer, vendor, admin | Retorna usuario actual. | 200 | 401 |
| PATCH | `/me` | Sí | organizer, vendor, admin | Actualiza nombre, teléfono, idioma. | 200 | 401, 422 |
| PATCH | `/me/preferred-language` | Sí | organizer, vendor, admin | Actualiza idioma preferido. | 200 | 401, 422 |
| POST | `/me/change-password` | Sí | organizer, vendor, admin | Cambia contraseña. | 204 | 401, 422 |

### 23.3 DTOs

```ts
type UpdateProfileRequestDto = {
  name?: string;
  phone?: string;
  preferredLanguage?: "es-LATAM" | "es-ES" | "pt" | "en";
};

type ChangePasswordRequestDto = {
  currentPassword: string;
  newPassword: string;
};

type UserProfileResponseDto = AuthUserResponseDto & {
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 23.4 Reglas

- `BR-USER-006`: idioma preferido configurable y respetado.
- Cambio de email no permitido en MVP.

---

## 24. Events API

### 24.1 Propósito

Crear y administrar eventos del `organizer`. Lectura controlada por admin.

### 24.2 Actores

- `organizer` (CRUD, own).
- `admin` (read-only, todos).

### 24.3 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/events` | Sí | organizer | Crea evento. | 201 | 400, 401, 403, 422 |
| GET | `/events` | Sí | organizer | Lista eventos propios. | 200 | 401, 403 |
| GET | `/events/:eventId` | Sí | organizer, admin | Detalle de evento. | 200 | 401, 403, 404 |
| PATCH | `/events/:eventId` | Sí | organizer | Actualiza evento (no currency). | 200 | 401, 403, 404, 409 (CURRENCY_IMMUTABLE), 422 |
| POST | `/events/:eventId/activate` | Sí | organizer | Pasa `draft → active`. | 200 | 401, 403, 404, 422 |
| POST | `/events/:eventId/cancel` | Sí | organizer | Pasa estado a `cancelled`. | 200 | 401, 403, 404, 422 |
| GET | `/admin/events` | Sí | admin | Lista eventos read-only. | 200 | 401, 403 |

### 24.4 DTOs

```ts
type CreateEventRequestDto = {
  eventTypeCode: "wedding" | "xv" | "baptism" | "baby_shower" | "birthday" | "corporate";
  name?: string;
  eventDate: string;       // YYYY-MM-DD
  guestsCount: number;
  locationId: string;
  estimatedBudget: string; // decimal as string
  currencyCode: "GTQ" | "EUR" | "MXN" | "COP" | "USD";
  languageCode: "es-LATAM" | "es-ES" | "pt" | "en";
  notes?: string;
};

type UpdateEventRequestDto = Omit<CreateEventRequestDto, "currencyCode"> & {
  // currencyCode is forbidden
};

type EventResponseDto = {
  id: string;
  ownerId: string;
  eventType: { code: string; displayName: string };
  name: string | null;
  eventDate: string;
  guestsCount: number;
  location: { id: string; city: string; countryCode: string };
  estimatedBudget: string;
  currencyCode: string;
  languageCode: string;
  status: "draft" | "active" | "completed" | "cancelled";
  completedAt: string | null;
  autoCompleted: boolean;
  notes: string | null;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 24.5 Filtros y ordenamiento

- `GET /events`: `?status=&eventTypeCode=&eventDateFrom=&eventDateTo=&page=&pageSize=&sort=`.
- Default sort: `eventDate:asc`.

### 24.6 Reglas enforced

- **BR-EVENT-001/002**: ownership.
- **BR-EVENT-005**: transiciones válidas.
- **BR-EVENT-006**: solo `active` permite QuoteRequest.
- **BR-EVENT-007**: `currencyCode` inmutable post-creación.
- **BR-EVENT-013**: job de auto-complete corre como job interno (no endpoint).
- **BR-EVENT-014**: admin read-only; cualquier operación admin se registra en `AdminAction`.

### 24.7 Errores

- `409 CURRENCY_IMMUTABLE` si se intenta enviar `currencyCode` en PATCH.
- `422 BUSINESS_RULE_VIOLATION` si la transición de estado es inválida.

---

## 25. Event Tasks API

### 25.1 Propósito

Administrar tareas de un evento, manuales o generadas por IA.

### 25.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/events/:eventId/tasks` | Sí | organizer | Lista tareas. | 200 | 401, 403, 404 |
| POST | `/events/:eventId/tasks` | Sí | organizer | Crea tarea manual. | 201 | 401, 403, 404, 422 |
| PATCH | `/events/:eventId/tasks/:taskId` | Sí | organizer | Actualiza tarea. | 200 | 401, 403, 404, 422 |
| PATCH | `/events/:eventId/tasks/:taskId/status` | Sí | organizer | Cambia estado. | 200 | 401, 403, 404, 422 |
| DELETE | `/events/:eventId/tasks/:taskId` | Sí | organizer | Elimina tarea. | 204 | 401, 403, 404 |

### 25.3 DTOs

```ts
type CreateTaskRequestDto = {
  title: string;
  description?: string;
  dueDate?: string;
  categoryHint?: string;
};

type UpdateTaskRequestDto = Partial<CreateTaskRequestDto>;

type UpdateTaskStatusRequestDto = {
  status: "pending" | "in_progress" | "done" | "skipped";
};

type EventTaskResponseDto = {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: "pending" | "in_progress" | "done" | "skipped";
  aiGenerated: boolean;
  aiRecommendationId: string | null;
  categoryHint: string | null;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 25.4 Reglas enforced

- **BR-TASK-003**: tareas creadas por IA inician `pending`.
- **BR-TASK-004**: transiciones válidas.
- Solo el owner del evento gestiona sus tasks.

### 25.5 Agregados aditivos del list endpoint (US-032, US-033)

`GET /events/:eventId/tasks` acepta query params aditivos y expone campos aditivos en el response
sin romper compatibilidad con consumidores previos.

**Query params (US-032)**:

| Param | Enum | Default | Semántica |
| --- | --- | --- | --- |
| `range` | `all` \| `today` \| `week` \| `overdue` \| `t_minus_7` \| `t_minus_30` | `all` | Filtro temporal server-side (comparación por midnight UTC). Valores fuera del enum se descartan silenciosamente y se registran en `tasks.list.requested.range_dropped` (US-032 tolerancia). |

**Campos aditivos en items (US-032)**:

- `overdue: boolean` — `due_date < today` **AND** `status != done`.
- `is_t_minus_7: boolean` — `due_date <= today + 7 days` **AND** `status != done`.

**Campo aditivo en el envelope (US-033)**:

```ts
type TaskProgressDto = {
  percentage: number;      // int [0, 100]; ROUND server-side
  done: number;            // count(status='done')
  total_countable: number; // count(status IN ('pending','active','in_progress','done'))
  skipped: number;         // count(status='skipped')
};

type ListEventTasksResponse = {
  data: TaskListItem[];
  pagination: { page, pageSize, total, totalPages };
  progress: TaskProgressDto;  // US-033: independiente de range/page/pageSize
  meta: { correlationId, timestamp };
};
```

Predicado `total_countable`: excluye explícitamente `skipped` (formalizado en `docs/4 §BR-TASK-009`).
`percentage = 0` cuando `total_countable = 0` (empty state).

---

## 26. Budget API

### 26.1 Propósito

Gestionar el presupuesto y sus ítems de un evento.

### 26.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/events/:eventId/budget` | Sí | organizer | Obtiene budget. | 200 | 401, 403, 404 |
| GET | `/events/:eventId/budget/items` | Sí | organizer | Lista budget items. | 200 | 401, 403, 404 |
| POST | `/events/:eventId/budget/items` | Sí | organizer | Crea budget item. | 201 | 401, 403, 404, 422 |
| PATCH | `/events/:eventId/budget/items/:itemId` | Sí | organizer | Actualiza item. | 200 | 401, 403, 404, 422 |
| DELETE | `/events/:eventId/budget/items/:itemId` | Sí | organizer | Elimina item. | 204 | 401, 403, 404 |

### 26.3 DTOs

> **US-035/US-036/US-037 Documentation Alignment (2026-07-14)**: el shape efectivo de MVP R1 se
> simplificó respecto al draft original. `paid` y `serviceCategoryId` (FK) NO existen en R1;
> `aiGenerated` se deriva implícitamente de `aiRecommendationId != null` (US-037). Ver §26.3.a.

```ts
type CreateBudgetItemRequestDto = {
  serviceCategoryId: string;
  label?: string;
  planned: string;     // decimal
  committed?: string;  // decimal default "0"
  paid?: string;       // decimal default "0"
};

type BudgetResponseDto = {
  id: string;
  eventId: string;
  totalPlanned: string;
  totalCommitted: string;
  currencyCode: string;
  items: BudgetItemResponseDto[];
  createdAt: string;
  updatedAt: string;
};

type BudgetItemResponseDto = {
  id: string;
  budgetId: string;
  serviceCategory: { id: string; code: string; displayName: string };
  label: string | null;
  planned: string;
  committed: string;
  paid: string;
  aiGenerated: boolean;
  aiRecommendationId: string | null;
};
```

#### 26.3.a Shape MVP R1 efectivo (US-035/US-036/US-037)

Diferencias con el draft §26.3:

- `BudgetItem` NO declara `paid` (BR-BUDGET-002 se aplica sin la columna; US-035 D3 diferida).
- `BudgetItem` NO declara FK `service_category_id`; `category_code` es string libre validado por
  whitelist activa (`ServiceCategory.code WHERE is_active=true AND deleted_at IS NULL`).
- `BudgetItem` NO declara `ai_generated` — se deriva vía `aiRecommendationId IS NOT NULL`
  (US-037 SEED-001 y política D2).
- Hard delete conservado (ADR-DB-004); no hay `deleted_at`.

Respuesta canónica:

```ts
// GET /events/:eventId/budget  (US-035, extendido por US-038)
// US-038 (PB-P1-022) — extensión forward-compat del contrato: campos siempre presentes;
// clientes de US-035 que ignoran los campos nuevos siguen funcionales.
type GetBudgetResponse = {
  data: {
    summary: {
      currency_code: string;
      total_planned: number;
      total_committed: number;
      over_committed: boolean; // committed > planned (estricto)
      overcommitted_amount: number; // US-038 AC-01: max(0, total_committed - total_planned)
    };
    items: Array<{
      id: string;
      label: string;
      category_code: string | null;
      amount_planned: number;
      amount_committed: number;
      over_committed: boolean; // US-038 AC-03/D4: (committed - planned) > tolerance
      overcommitted_amount: number; // US-038 AC-03/VR-03: max(0, committed - planned)
    }>;
  };
  meta: { correlationId: string; timestamp: string };
};

// US-038 D3 — tolerance adaptativa: `10^(-currency.decimal_places)`. Monedas del enum MVP
// (GTQ/EUR/MXN/COP/USD) ⇒ 0.01. Fallback defensivo `decimal_places = 2` si el código no
// está catalogado (log `currency.decimal_places.missing`).

// POST /events/:eventId/budget/items         (US-036, extendido por US-038)
// PATCH /events/:eventId/budget/items/:itemId (US-036, extendido por US-038)
type CreateBudgetItemBody = {
  label: string;
  category_code?: string | null;
  amount_planned: number;
};
type UpdateBudgetItemBody = Partial<CreateBudgetItemBody>;
type BudgetItemResponse = {
  id: string;
  label: string;
  category_code: string | null;
  amount_planned: number;
  amount_committed: number;
  over_committed: boolean; // US-038 (BE-003) forward-compat
  overcommitted_amount: number; // US-038 (BE-003) forward-compat
};

// DELETE /events/:eventId/budget/items/:itemId → 204
```

**Errores específicos (US-036)**:

| Error code | Status | Origen |
| --- | --- | --- |
| `INVALID_CATEGORY_CODE` | 400 | `category_code` fuera de la whitelist activa (VR-03) |
| `ITEM_HAS_COMMITMENT` | 409 | DELETE bloqueado por `amount_committed > 0` (AC-04) |
| `ITEM_HAS_PENDING_INTENT` | 409 | DELETE bloqueado por `BookingIntent.pending` (AC-05) |
| `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED` | 409 | PATCH cambia `category_code` con `committed > 0` (AC-02) |
| `EVENT_NOT_EDITABLE` | 409 | mutación en evento `cancelled`/`completed` (D3) |

### 26.4 Reglas enforced

- **BR-BUDGET-003**: totales = SUM(items.planned/committed).
- **BR-BUDGET-004**: si `committed > totalPlanned`, **warning** en response (campo `warnings: ["committed_exceeds_planned"]`), pero **no** se rechaza.
- **BR-BUDGET-006/007**: moneda fijada por evento; **sin** conversión.
- Decimales ≥ 0.

---

## 27. Vendor Profiles API

### 27.1 Propósito

Gestionar el perfil del proveedor, aprobación admin, directorio público.

### 27.2 Actores

- `vendor` (CRUD propio).
- `admin` (aprobación, moderación).
- `anonymous` (lectura del directorio público).

### 27.3 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/vendors/me` | Sí | vendor | Obtiene perfil propio. | 200 | 401, 403, 404 |
| POST | `/vendors/me` | Sí | vendor | Crea perfil (primera vez). | 201 | 401, 403, 409, 422 |
| PATCH | `/vendors/me` | Sí | vendor | Actualiza perfil (sin `categories` — ver `POST /vendors/me/categories`). | 200 | 401, 403, 409 `PROFILE_REJECTED`/`PROFILE_HIDDEN`, 400 `VALIDATION_ERROR` |
| DELETE | `/vendors/me` | Sí | vendor | Soft delete del perfil propio. | 204 | 401, 403, 409 `PROFILE_HIDDEN`/`PROFILE_DELETED` |
| POST | `/vendors/me/categories` | Sí | vendor | Cambia el set de categorías (tope acumulado 5). | 200 | 400 `INVALID_CATEGORIES`/`INVALID_CATEGORY`, 401, 403, 404 `PROFILE_NOT_FOUND`, 409 `CATEGORY_CHANGE_LIMIT`/`PROFILE_HIDDEN` |
| POST | `/vendors/me/portfolio/works/:workLabel/images` | Sí | vendor | Sube una imagen al `work_label` del portafolio (US-043). | 201 | 400 `INVALID_MIME`/`INVALID_WORK_LABEL`/`INVALID_IMAGE`, 401, 403, 404 `PROFILE_NOT_FOUND`, 409 `IMAGE_LIMIT_REACHED`/`WORK_LABEL_LIMIT_REACHED`/`PROFILE_HIDDEN`, 413 `FILE_TOO_LARGE` |
| DELETE | `/vendors/me/portfolio/images/:imageId` | Sí | vendor | Soft delete del attachment del portafolio (US-048). Body opcional `{ deletion_reason? }`. | 204 | 400 `VALIDATION_ERROR`/`INVALID_DELETION_REASON`, 401, 403, 404 `ATTACHMENT_NOT_FOUND`/`PROFILE_NOT_FOUND`, 409 `PROFILE_HIDDEN` |
| POST | `/vendors/me/submit-approval` | Sí | vendor | Envía perfil a admin. | 200 | 401, 403, 422 |
| GET | `/vendors` | Sí | organizer, vendor, admin | Directorio autenticado con filtros + cursor pagination (US-045). | 200 | 400 `VALIDATION_ERROR`/`INVALID_FILTERS`/`INVALID_CURSOR`, 401 |
| GET | `/vendors/:vendorProfileId` | No (público si approved) | anonymous, organizer, admin | Detalle público. | 200 | 404 |
| GET | `/api/v1/public/vendors` | No | anonymous | Directorio público. | 200 | — |
| GET | `/api/v1/public/vendors/:vendorSlug` | No | anonymous | Perfil público SEO del vendor por slug (US-046). Whitelist explícita (D1). Cache-Control `public, max-age=60, stale-while-revalidate=300` (D4). Rate limit 60 req/min por IP (D7). | 200 | 400 `VALIDATION_ERROR`, 404 `VENDOR_NOT_FOUND` (uniforme D6), 429 `RATE_LIMIT_EXCEEDED` |
| GET | `/api/v1/public/vendors/:vendorSlug/portfolio` | No | anonymous | Portafolio público. | 200 | 404 |

### 27.4 DTOs

```ts
// US-040 (PB-P1-024): shape implementado del body con snake_case (Zod .strict rechaza extras).
// El endpoint `POST /vendors/me` valida cap 1-3 categorías (D2), bio 50-1000 (D4) y genera slug
// server-side desde `business_name` con desambiguación numérica (D5).
type CreateVendorProfileRequestDto = {
  business_name: string;                 // 2-150 chars (VR-01)
  bio: string;                           // 50-1000 chars (VR-02, D4)
  location_id: string;                   // UUID de Location activa (VR-04)
  languages_supported: ("es-LATAM" | "es-ES" | "pt" | "en")[]; // ≥1 (VR-05)
  categories: string[];                  // UUIDs de ServiceCategory activas, cap 1-3 (VR-03, D2)
};

// La response usa el shape canónico documentado abajo (`VendorProfileResponseDto`) con snake_case
// y campos: `id`, `vendor_user_id`, `business_name`, `bio`, `location_id`,
// `languages_supported`, `categories: [{id, name}]`, `slug`, `status`, `created_at`.

// US-041 (PB-P1-024): edición y soft-delete del VendorProfile.
// - `PATCH /vendors/me`: body con campos opcionales `business_name`, `bio`, `location_id`,
//   `languages_supported`. Zod `.strict()` + `.refine` (body no vacío). Rechaza `slug`, `status`,
//   `categories`, `vendor_user_id`, `category_change_count` → 400 `VALIDATION_ERROR`.
//   Response: `{ profile: VendorProfileResponseDto, repending: boolean }`.
//   D1 (campos mayores) + D2 (re-pending automático): si `business_name` o `location_id` están
//   en el body y `status='approved'`, la transacción cambia `status→'pending'` e inserta un
//   `AdminAction(action='vendor_pending_after_major_edit', target_entity='VendorProfile',
//   actor_user_id=currentUser.id, actor_role='vendor', correlation_id)`. `repending=true` en la
//   response para que la UI muestre el banner.
//
// - `DELETE /vendors/me`: soft delete. Setea `deleted_at=NOW()` y `deleted_by=currentUser.id`.
//   Response 204. Bloqueado si `status='hidden'` (409 `PROFILE_HIDDEN`) o si ya está soft-deleted
//   (409 `PROFILE_DELETED`).
//
// - `GET /vendors/me` (EMERGENT US-041): lectura del perfil activo del vendor autenticado.
//   Response `VendorProfileResponseDto` con shape canónico snake_case.
//
// Códigos de error nuevos consumidos por el frontend / MSW:
//   - 404 `PROFILE_NOT_FOUND`   — vendor autenticado sin perfil activo.
//   - 409 `PROFILE_REJECTED`    — PATCH bloqueado en `status='rejected'`.
//   - 409 `PROFILE_HIDDEN`      — PATCH/DELETE bloqueado en `status='hidden'`.
//   - 409 `PROFILE_DELETED`     — DELETE sobre perfil ya soft-deleted.
//
// US-042 (PB-P1-025): cambio del set de categorías del vendor.
// - `POST /vendors/me/categories`:
//     Body: `{ service_category_ids: string[] }` — Zod `.strict()`, 1..5 UUIDs distintos.
//     Response 200:
//       `{ profile: VendorProfileResponseDto,
//          repending: boolean,          // true si transicionó approved|rejected → pending
//          noop: boolean,               // true si el set coincide con el actual (sin side-effects)
//          category_change_count: number, // contador tras la mutación (o el actual si noop)
//          requires_admin_review: boolean, // true tras cualquier mutación aplicada
//          status: 'pending'|'approved'|'rejected'|'hidden',
//          last_category_change_at: string | null }`.
//     Semántica del use case (D1..D6):
//       * D1: `category_change_count >= 5` → 409 `CATEGORY_CHANGE_LIMIT` (código canónico —
//         reemplaza los mencionados 422 / 400 / `MAX_CATEGORY_CHANGES_EXCEEDED` de versiones
//         previas).
//       * D2: toda mutación aplicada (no noop) marca `requires_admin_review=true` e inserta
//         `AdminAction(action='vendor_category_change', target_entity='VendorProfile',
//         actor_user_id=currentUser.id, actor_role='vendor', correlation_id)` dentro de la
//         misma `prisma.$transaction`.
//       * D3: si `status ∈ {approved, rejected}` la mutación transiciona a `pending` en la
//         misma transacción (`repending=true`).
//       * D4: `status='hidden'` → 409 `PROFILE_HIDDEN`; soft-deleted → 404 `PROFILE_NOT_FOUND`.
//       * D5: comparación por `Set` (orden y duplicados normalizados). `noop=true` no cuenta
//         cambios, no persiste AdminAction ni cambia `last_category_change_at`.
//       * D6: cardinalidad 1..5; cualquier categoría inexistente/inactiva → 400
//         `INVALID_CATEGORY` con `details: [{ field: 'service_category_ids', message: <uuid> }]`.
//     Errores de forma: cardinalidad fuera de 1..5, duplicados o UUID inválido → 400
//     `VALIDATION_ERROR` (rechazado por Zod antes de invocar el use case).
//
// Adicionalmente `GET /vendors/me` incluye a partir de US-042 los campos opcionales
// `category_change_count`, `requires_admin_review` y `last_category_change_at` — el editor
// de categorías los usa para hidratar el contador antes de la primera mutación de la sesión.

// US-043 (PB-P1-026): upload de imágenes al portafolio del vendor.
// - `POST /vendors/me/portfolio/works/:workLabel/images`:
//     Content-Type: `multipart/form-data` con un único campo `file`.
//     Path param `:workLabel` — matchea `^[a-zA-Z0-9\-_ ]{1,80}$` (D5). Se compara entre
//     grupos por `LOWER(work_label)`; la persistencia preserva el display original.
//     Middleware multer memoryStorage con `fileSize=FILE_SIZE_LIMIT` (5 MB por defecto — D2).
//     Pipeline server-side (Tech Spec US-043 §7):
//       1) Allowlist MIME por header + magic-bytes (`image/jpeg|png|webp`, D3 / SEC-02).
//       2) Resolve `vendor_profile` activo por sesión; null/deleted → 404 `PROFILE_NOT_FOUND`;
//          `status='hidden'` → 409 `PROFILE_HIDDEN` (D3).
//       3) `COUNT(*) < 10` para `(owner_id, LOWER(work_label), status='active')` — VR-03/C-022.
//       4) Si el label es nuevo, `COUNT(DISTINCT LOWER(work_label)) < 20` — VR-04/D6.
//       5) Resize con `sharp` (long-edge ≤ 2048 px, JPEG quality 80, aspect ratio preservado — D4).
//       6) `FileStoragePort.save` escribe `<yyyy>/<mm>/<uuid>.jpg` fuera del web root (SEC-03/06).
//       7) `attachments.create(...)` con `uploaded_by=currentUser.id`; falla ⇒ eliminar binario
//          (compensación §17 R3) y re-throw.
//     Response 201:
//       `{ id, owner_type: 'vendor_work', owner_id, work_label, mime: 'image/jpeg',
//          size_bytes, storage_url, status: 'active', created_at, dimensions: { width, height } }`.
//       `storage_url` es RELATIVO al `FILE_STORAGE_PATH` — no expuesto como URL descargable
//       directa; una US futura entrega el endpoint autenticado de descarga (SEC-03).
//     Errores:
//       - 400 `INVALID_MIME` — allowlist / magic-bytes (EC-01, NT-07).
//       - 400 `INVALID_IMAGE` — `sharp` no puede decodificar el binario.
//       - 400 `INVALID_WORK_LABEL` — path param fuera del regex (EC-05).
//       - 401 sesión ausente; 403 rol distinto de vendor (AUTH-TS-06/07 / SEC-01).
//       - 404 `PROFILE_NOT_FOUND` — vendor sin perfil activo o soft-deleted (EC-04).
//       - 409 `IMAGE_LIMIT_REACHED` — 10 activos en el grupo (AC-02).
//       - 409 `WORK_LABEL_LIMIT_REACHED` — 20 work_labels activos distintos (EC-06).
//       - 409 `PROFILE_HIDDEN` — `status='hidden'` (EC-03).
//       - 413 `FILE_TOO_LARGE` — `size_bytes > FILE_SIZE_LIMIT` (EC-02).
//     Observability: log `vendor.portfolio.uploaded` (info) con `vendor_profile_id`, `work_label`,
//     `attachment_id`, `mime='image/jpeg'`, `size_bytes`, `dimensions`, `correlation_id`; error
//     4xx/5xx → `vendor.portfolio.upload_failed` (warn) con `phase` y `code`.
//
// US-048 (PB-P1-026): soft delete vendor-driven del attachment del portafolio.
// - `DELETE /vendors/me/portfolio/images/:imageId`:
//     Path param `:imageId` — UUID (Zod). Body opcional `application/json`:
//       `{ "deletion_reason"?: string }` con `1..500` chars (D2 / EC-05); ausente ⇒ persiste
//       `null`. Extras rechazados por Zod `.strict()`.
//     Backend:
//       1) Resolve `vendor_profile` por sesión; null/deleted → 404 (D3 EC-04); `status='hidden'`
//          → 409 `PROFILE_HIDDEN` (D3 EC-03).
//       2) Repository filtra por `id`, `owner_id=vendor_profile.id`, `owner_type='vendor_work'`
//          y `status='active'`. Si no encuentra → 404 `ATTACHMENT_NOT_FOUND` (D4: uniforme
//          para ajeno / inexistente / ya soft-deleted; anti information-leakage / SEC-03).
//       3) `UPDATE attachments SET status='deleted', deleted_at=NOW(), deleted_by=$actor,
//          deletion_reason=$reason WHERE id=$id AND owner_id=$owner AND status='active'`.
//          El guard `status='active'` en el WHERE es TOCTOU-safe: dos DELETE concurrentes
//          resultan en un solo side-effect + un `404 ATTACHMENT_NOT_FOUND` para el segundo.
//     Response: `204 No Content` (sin body).
//     Errores:
//       - 400 `VALIDATION_ERROR` — `:imageId` no es UUID.
//       - 400 `INVALID_DELETION_REASON` — body con `deletion_reason` fuera de 1..500.
//       - 401 sesión ausente; 403 rol distinto de vendor.
//       - 404 `PROFILE_NOT_FOUND` — vendor sin perfil activo o soft-deleted.
//       - 404 `ATTACHMENT_NOT_FOUND` — attachment ajeno / inexistente / ya soft-deleted.
//       - 409 `PROFILE_HIDDEN` — `status='hidden'`.
//     Observability: log `vendor.portfolio.deleted` (info) con `vendor_profile_id`,
//     `attachment_id`, `work_label`, `deletion_reason` (o `null`), `correlation_id`.
//     Sin `AdminAction` (SEC-05: acción vendor-driven; los flujos admin `hide_attachment` /
//     `remove_attachment` viven en historias futuras). El binario físico se preserva para
//     auditoría; el lifecycle policy de purga vive fuera del MVP.

type UpdateVendorProfileRequestDto = Partial<CreateVendorProfileRequestDto> & {
  availabilitySummary?: string;
};

type VendorProfileResponseDto = {
  id: string;
  userId: string;
  businessName: string;
  bio: string;
  location: { id: string; city: string; countryCode: string };
  languagesSupported: string[];
  status: "pending" | "approved" | "rejected" | "hidden";
  subscriptionStatus: "active" | "inactive";
  availabilitySummary: string | null;
  ratingAvg: number | null;
  reviewsCount: number;
  aiGeneratedBio: boolean;
  approvedAt: string | null;
  categoryChangeCount: number;
  requiresAdminReview: boolean;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 27.5 Reglas enforced

- **BR-VENDOR-001**: solo `approved` aparece en directorio público.
- **BR-VENDOR-004**: máximo **5 cambios acumulados** de categorías, enforced por `POST /vendors/me/categories` (US-042 D1). Excedido → `409 CATEGORY_CHANGE_LIMIT` (código canónico; deprecado `MAX_CATEGORY_CHANGES_EXCEEDED` mencionado en versiones previas).
- **Toda mutación aplicada** de categorías (US-042 D2) marca `requiresAdminReview=true` y persiste `AdminAction(action='vendor_category_change')`; `noop` (mismo set) no cuenta.
- Vendors no pueden auto-aprobarse.

### 27.6 Directorio autenticado — `GET /vendors` (US-045)

Directorio server-side con filtros básicos + cursor pagination estable. Devuelve **sólo** vendors con `status='approved'` y `deletedAt IS NULL` (BR-VENDOR-001). Los vendors autenticados **no** se ven a sí mismos (SEC-03).

#### Query params

| Param | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryCode` | slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, 1–64) | No | `service_categories.code`; debe existir y estar activa. |
| `locationCode` | slug (mismo regex) | No | `locations.code`; ej. `GT-GUA`, `MX-CDMX`, `CO-ANT`. |
| `priceMin` | string decimal `^\d+(\.\d{1,2})?$` | No (requiere `currency`) | ≥ 0, ≤ 12 dígitos enteros. |
| `priceMax` | string decimal | No (requiere `currency`) | ≥ `priceMin`. |
| `currency` | enum `GTQ`\|`EUR`\|`MXN`\|`COP`\|`USD` | Sí si hay `priceMin` o `priceMax` | Sin conversión automática (BR-BUDGET-007). |
| `cursor` | base64url opaque | No | `{ ratingAvg, createdAt, id }` codificado por el server (D1). |
| `limit` | int | No | 1..50, default 20. |

#### Response

```json
{
  "data": {
    "items": [
      {
        "id": "11111111-2222-3333-4444-555555555555",
        "slug": "banquetes-el-quetzal",
        "businessName": "Banquetes El Quetzal",
        "locationCode": "GT-GUA",
        "categories": ["catering"],
        "ratingAvg": 4.60,
        "reviewsCount": 24,
        "priceRange": { "min": "150.00", "max": "450.00", "currency": "GTQ" },
        "thumbnailUrl": null
      }
    ],
    "page": { "cursor": "eyJyIjo0LjYs...", "limit": 20, "hasNext": true }
  },
  "meta": { "correlationId": "…", "timestamp": "…" }
}
```

- `priceRange` es `null` cuando la búsqueda no incluye `currency` (no se puede agregar sin conversión).
- `thumbnailUrl` es `null` en MVP; se cubre en US-046 (versión pública).
- Orden estable: `rating_avg DESC NULLS LAST, created_at DESC, id DESC`.

#### Errores

| Código HTTP | `error.code` | Cuando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod: `limit` fuera de rango, `priceMin > priceMax`, `currency_required_with_price`, slug regex, campos extra. |
| 400 | `INVALID_FILTERS` | Slugs (`categoryCode` / `locationCode`) que no existen en catálogo activo. `details` enumera los inválidos. |
| 400 | `INVALID_CURSOR` | Cursor que no decodifica base64 válido o cuyo payload no es `{ ratingAvg, createdAt, id }` bien formado. |
| 401 | `AUTHENTICATION_REQUIRED` | Sin sesión válida. |

#### Notas

- El endpoint reutiliza los índices `idx_vendor_profiles_status_location` + `idx_vendor_services_active` y agrega `idx_vendor_profiles_directory (rating_avg DESC NULLS LAST, created_at DESC, id DESC) WHERE status='approved' AND deleted_at IS NULL` para keyset (US-045 / DB-001).
- El cursor es opaco: **no** exponer al cliente ninguna dependencia sobre su forma interna.
- `ratingAvg` / `reviewsCount` viven denormalizados en `vendor_profiles` y se recomputan por US-088 (publicar/moderar review) o por el batch del seed demo (`seed-demo-data.use-case.ts`).

### 27.7 Perfil público SEO — `GET /public/vendors/:slug` (US-046)

Endpoint público (sin auth) del perfil SEO de un vendor. Alimenta el Server Component `app/vendors/[slug]/page.tsx` (Next.js App Router + ISR). Devuelve **sólo** vendors con `status='approved'` y `deletedAt IS NULL` (BR-VENDOR-001, D6). Cualquier otro estado (pending / rejected / hidden / soft-deleted) o slug inexistente ⇒ `404 VENDOR_NOT_FOUND` uniforme — sin distinción para evitar information leakage.

#### Path param

| Param | Tipo | Notas |
| --- | --- | --- |
| `slug` | string `^[a-z0-9-]+$`, longitud `[1..200]` | `vendor_profiles.slug` UNIQUE (D5 US-040). Formato inválido ⇒ `400 VALIDATION_ERROR`. |

#### Headers de response

| Header | Valor | Nota |
| --- | --- | --- |
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | Solo en 200 (D4). El `404` no se cachea para evitar propagar desapariciones. |

#### Rate limit

- Key: `public:vendor_profile`
- Ventana: `60 s`, tope `60 req/min` por IP (D7).
- Excedido ⇒ `429 RATE_LIMIT_EXCEEDED` con `Retry-After`.

#### Response (200) — whitelist explícita (D1)

```json
{
  "data": {
    "slug": "banquetes-el-quetzal",
    "businessName": "Banquetes El Quetzal",
    "bio": "Servicio premium con 20 años de experiencia.",
    "location": { "display": "Ciudad de Guatemala, Guatemala", "code": "GT-GUA" },
    "categories": [{ "code": "catering", "name": "Catering" }],
    "ratingAvg": 4.8,
    "reviewsCount": 24,
    "reviewsTotalPublished": 24,
    "packages": [
      {
        "packageName": "Menú clásico",
        "basePrice": "250.00",
        "currencyCode": "GTQ",
        "description": "Menú de 3 tiempos.",
        "serviceCategoryCode": "catering"
      }
    ],
    "portfolio": [
      { "workLabel": "boda-clasica", "thumbnails": ["https://cdn/1.jpg", "https://cdn/2.jpg"] }
    ],
    "reviews": [
      { "rating": 5, "comment": "Excelente", "createdAt": "2026-06-15T10:00:00.000Z", "reviewerDisplayName": "Juan P." }
    ]
  },
  "meta": { "correlationId": "…", "timestamp": "…" }
}
```

#### Errores

- `400 VALIDATION_ERROR` — slug fuera del alfabeto o longitud.
- `404 VENDOR_NOT_FOUND` — slug inexistente **o** vendor no `approved` (uniforme por D6).
- `429 RATE_LIMIT_EXCEEDED` — supera 60 req/min/IP.

#### Notas

- **Whitelist explícita (D1)**: no se emite `email`, `phone`, IDs internos, `deleted_*`, ni packages `is_active=false`. El mapper `PublicVendorMapper` es la única frontera confiable.
- **Reviews**: se emiten a lo sumo las 10 `published` más recientes; `reviewsTotalPublished` contiene el total. Paginación adicional queda como Future (D5).
- **Portfolio**: los attachments `owner_type='vendor_work' AND status='active' AND deleted_at IS NULL` se agrupan por `work_label` preservando el orden natural `created_at ASC`.
- **`reviewer_display_name`**: pseudonimizado (`Juan P.`) desde `users.full_name`; fallback `Anónimo`.
- **XSS**: la `bio` viaja como string; Next.js aplica auto-escape en el renderer. La API no permite HTML en el input (BR US-041).
- **ISR**: la página cachea el resultado por 300 s. Invalidación on-demand queda como Future.

---

## 28. Vendor Services API

### 28.1 Propósito

Gestionar servicios/paquetes ofrecidos por un vendor.

### 28.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/vendors/me/services` | Sí | vendor | Lista servicios propios (activos + inactivos, `created_at desc`, US-044 D3). | 200 | 401, 403, 404 `PROFILE_NOT_FOUND`, 409 `PROFILE_HIDDEN` |
| POST | `/vendors/me/services` | Sí | vendor | Crea servicio (US-044 AC-01a). Body `{ package_name, description, base_price, currency_code, service_category_id }`. Máx 50 activos (D5). | 201 | 400 `INVALID_PACKAGE_NAME`/`INVALID_PRICE`/`INVALID_CURRENCY`/`INVALID_DESCRIPTION`/`INVALID_CATEGORY`, 401, 403, 404, 409 `PROFILE_HIDDEN`/`SERVICE_LIMIT_REACHED` |
| PATCH | `/vendors/me/services/:serviceId` | Sí | vendor | Actualiza servicio (US-044 AC-01b). Cualquier subset opcional; `is_active=true` reactiva (recheck del tope). | 200 | 400 `INVALID_*`, 401, 403, 404 `SERVICE_NOT_FOUND`/`PROFILE_NOT_FOUND`, 409 `PROFILE_HIDDEN`/`SERVICE_LIMIT_REACHED` |
| DELETE | `/vendors/me/services/:serviceId` | Sí | vendor | Soft delete via `is_active=false` (US-044 AC-01c, D2). Idempotente EC-09 (204 aunque ya esté inactivo). | 204 | 401, 403, 404 `SERVICE_NOT_FOUND`/`PROFILE_NOT_FOUND`, 409 `PROFILE_HIDDEN` |
| GET | `/vendors/:vendorProfileId/services` | Mixto | anonymous (si approved), organizer, admin | Lista pública (US-045/US-047). | 200 | 404 |

### 28.3 DTOs

```ts
type CreateVendorServiceRequestDto = {
  serviceCategoryId: string;
  packageName: string;
  description: string;
  basePrice: string;          // decimal
  currencyCode: "GTQ" | "EUR" | "MXN" | "COP" | "USD";
};

type VendorServiceResponseDto = {
  id: string;
  vendorProfileId: string;
  serviceCategory: { id: string; code: string; displayName: string };
  packageName: string;
  description: string;
  basePrice: string;
  currencyCode: string;
  aiGeneratedDescription: boolean;
  isActive: boolean;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 28.4 Reglas

- Solo vendor dueño del perfil gestiona sus servicios.
- Vendors `pending`/`rejected`/`hidden` pueden tener servicios pero no aparecen en directorio público.

---

## 29. Service Categories API

### 29.1 Propósito

Catálogo de categorías de servicio jerárquico (máx 2 niveles).

### 29.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/service-categories` | No | anonymous | Lista activas con jerarquía. | 200 | — |
| GET | `/service-categories/:id` | No | anonymous | Detalle. | 200 | 404 |
| POST | `/admin/service-categories` | Sí | admin | Crea categoría. | 201 | 401, 403, 409 (CATEGORY_DEPTH_EXCEEDED), 422 |
| PATCH | `/admin/service-categories/:id` | Sí | admin | Actualiza categoría. | 200 | 401, 403, 404, 422 |
| DELETE | `/admin/service-categories/:id` | Sí | admin | Soft delete (`isActive=false`). | 204 | 401, 403, 404 |

### 29.3 DTOs

```ts
type ServiceCategoryResponseDto = {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
  parentId: string | null;
  depthLevel: 1 | 2;
  isActive: boolean;
  sortOrder: number | null;
  isSeed: boolean;
};

type CreateServiceCategoryRequestDto = {
  code: string;
  displayName: { "es-LATAM": string; "es-ES"?: string; "pt"?: string; "en"?: string };
  description?: string;
  parentId?: string;
  sortOrder?: number;
};
```

### 29.4 Reglas

- **BR-SERVICE-005**: profundidad máxima **2**. `parentId` cuyo padre tenga `parentId != null` → `409 CATEGORY_DEPTH_EXCEEDED`.
- **BR-SERVICE-007**: soft delete obligatorio.

---

## 30. Quote Requests API

### 30.1 Propósito

Organizer solicita cotización a vendor sobre una categoría de servicio dentro de un evento `active`.

### 30.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/events/:eventId/quote-requests` | Sí | organizer | Lista quote requests del evento. | 200 | 401, 403, 404 |
| POST | `/events/:eventId/quote-requests` | Sí | organizer | Crea quote request. | 201 | 401, 403, 404, 409 (MAX_QUOTE_REQUESTS_EXCEEDED), 422 |
| GET | `/quote-requests/:quoteRequestId` | Sí | organizer, vendor (asignado), admin | Detalle. | 200 | 401, 403, 404 |
| PATCH | `/quote-requests/:quoteRequestId/cancel` | Sí | organizer | Cancela. | 200 | 401, 403, 404, 422 |
| GET | `/vendors/me/quote-requests` | Sí | vendor | Lista asignadas al vendor. | 200 | 401, 403 |
| PATCH | `/quote-requests/:quoteRequestId/viewed` | Sí | vendor | Marca como vista. | 204 | 401, 403, 404 |

### 30.3 DTOs

```ts
type CreateQuoteRequestRequestDto = {
  vendorProfileId: string;
  serviceCategoryId: string;
  brief: {
    summary: string;
    requirements: string[];
    questions: string[];
    constraints?: string[];
  };
  aiRecommendationId?: string; // si proviene de IA-005
};

type QuoteRequestResponseDto = {
  id: string;
  eventId: string;
  vendorProfileId: string;
  serviceCategoryId: string;
  brief: {
    summary: string;
    requirements: string[];
    questions: string[];
    constraints: string[];
  };
  aiGeneratedBrief: boolean;
  status: "sent" | "viewed" | "responded" | "expired" | "cancelled";
  viewedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 30.4 Reglas enforced

- **BR-QUOTE-001**: solo organizer crea, evento debe estar `active`.
- **BR-QUOTE-004 / BR-QUOTE-009**: máximo **5 quote requests activas por categoría/evento**. Estados activos: `sent`, `viewed`, `responded`. Excedido → `409 MAX_QUOTE_REQUESTS_EXCEEDED`.
- **BR-QUOTE-006**: vendor solo ve quote requests asignadas.

### 30.5 US-049 · `POST /api/v1/quote-requests` (endpoint canónico organizer-driven)

Coexiste con `POST /events/:eventId/quote-requests` (US-096 bilateral). El endpoint US-049 espera `event_id` en el body, hereda `currency_code` del evento y persiste dos notificaciones atómicas (`in_app` + `email_simulated`) en la misma transacción que el `QuoteRequest`.

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/quote-requests` | Sí (cookie de sesión) | organizer | Crea `QuoteRequest` + 2 `Notification` rows atómicas. Rate limit `10 req/min` por usuario. | 201 | 400 (`INVALID_BRIEF`, `INVALID_CATEGORY`, `VENDOR_NOT_AVAILABLE`), 401, 403, 404 (`EVENT_NOT_FOUND` uniforme), 409 (`EVENT_NOT_ACTIVE`, `QR_ALREADY_ACTIVE`, `QR_CATEGORY_LIMIT_REACHED`), 429 (`RATE_LIMIT_EXCEEDED`) |

```ts
// Request body (US-049)
type CreateQuoteRequestUs049Body = {
  event_id: string;             // uuid
  vendor_profile_id: string;    // uuid
  service_category_id: string;  // uuid
  brief: {
    budget: string;             // decimal(14,2) como string, p. ej. "5000.00"
    message: string;            // 0..5000 chars
  };
  source?: 'manual' | 'ai_generated'; // default 'manual'; setea ai_generated_brief
};

// Response 201
type CreateQuoteRequestUs049Response = {
  id: string;
  status: 'sent';
  sent_at: string;              // ISO-8601 UTC
  event_id: string;
  vendor_profile_id: string;
  service_category_id: string;
  ai_generated_brief: boolean;  // derivado de source
  brief: {
    budget: string;
    currency_code: string;      // heredado del evento (inmutable)
    message: string;
  };
  event_snapshot: {
    event_type_id: string;
    event_date: string | null;
    location_id: string | null;
    guests_count: number | null;
  };
};
```

Detalles de errores (envelope estándar `{ error: { code, message, correlationId, details? } }`):

| Código | HTTP | `details` | Trigger |
| --- | ---: | --- | --- |
| `EVENT_NOT_FOUND` | 404 | — | Evento inexistente o de otro organizer (SEC-05 uniforme). |
| `EVENT_NOT_ACTIVE` | 409 | `[{ field: 'status', message: <status> }]` | Evento en `draft`/`completed`/`cancelled`. |
| `VENDOR_NOT_AVAILABLE` | 400 | — | Vendor no `approved`, soft-deleted o UUID inexistente (SEC-06 uniforme). |
| `INVALID_BRIEF` | 400 | `[{ field: 'budget' | 'message', message: 'invalid' }]` | `budget<0` o `message>5000`. |
| `INVALID_CATEGORY` | 400 | `[{ field: 'service_category_id', message: 'not_available' }]` | Categoría inexistente o `is_active=false`. |
| `QR_ALREADY_ACTIVE` | 409 | `[{ field: 'existing_quote_request_id', message: <uuid> }]` | Ya existe QR activa (`sent/viewed/responded`) para el par (event, vendor) — BR-QUOTE-004. |
| `QR_CATEGORY_LIMIT_REACHED` | 409 | `[{ field: 'active_count', message: '5' }]` | ≥ 5 QRs activas en (event, category) — BR-QUOTE-009. |
| `RATE_LIMIT_EXCEEDED` | 429 | — (incluye header `Retry-After`) | > 10 req/min por usuario. |

Observabilidad: log estructurado `quote_request.created` con `{ correlationId, actorId, quoteRequestId }` (sin brief ni PII — SEC-09). Notificaciones persistidas: `type='quote_request.created'`; `payload` incluye `{ channel, deliveryStatus, event, quote_request_id, event_id, service_category_id }` (ver DEV-02 de `management/workflows/development-execution/P1/PB-P1-030/US-049-execution.md`).

### 30.6 US-050 · `GET /api/v1/quote-requests/active-count` (pre-check del límite)

Pre-check UX del límite BR-QUOTE-009 (5 QRs activas por `(event, service_category)`). Alimenta el badge `QRLimitBadge` del form de US-049 y deshabilita el CTA cuando `available_slots = 0`. El backend re-valida en el `POST` (defense in depth).

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/quote-requests/active-count?event_id=<uuid>&service_category_id=<uuid>` | Sí (cookie de sesión) | organizer | Conteo lazy de QRs activas en `(event, category)`. | 200 | 400 (`INVALID_CATEGORY`), 401, 403, 404 (`EVENT_NOT_FOUND` uniforme) |

```ts
// Query params
type ActiveQrCountQuery = {
  event_id: string;             // uuid; ownership del organizer autenticado
  service_category_id: string;  // uuid; is_active=true
};

// Response 200 (envelope { data, correlationId })
type ActiveQrCountResponse = {
  active_count: number;          // QRs activas actualmente
  limit: 5;                       // BR-QUOTE-009 / C-016
  available_slots: number;        // max(0, limit - active_count)
  statuses_counted: ['sent', 'viewed', 'responded']; // DEV-02 US-050
};
```

Semántica del conteo (Tech Spec §7 / EC-01, execution record DEV-01):

- `status ∈ ('sent','viewed','responded')` — alineado con el enum físico `QuoteRequestStatus`.
- `expires_at IS NULL OR expires_at > NOW()` — conteo lazy sobre la columna `expires_at` (agregada por la migración `20260716140000_us050_quote_request_expires_at`).
- Una QR con `expires_at < NOW()` no cuenta aunque su `status` siga siendo activo — la transición formal a `status='expired'` la asume un job batch futuro (BR-QUOTE-005).

Errores (envelope estándar):

| Código | HTTP | `details` | Trigger |
| --- | ---: | --- | --- |
| `EVENT_NOT_FOUND` | 404 | — | Evento inexistente o ajeno (SEC-05 uniforme; hereda de US-049). |
| `INVALID_CATEGORY` | 400 | `[{ field: 'service_category_id', message: 'not_available' }]` | Categoría inexistente o `is_active=false`. |
| `AUTHENTICATION_REQUIRED` | 401 | — | Sin sesión. |
| `FORBIDDEN` | 403 | — | Rol distinto de `organizer`. |

Observabilidad: sin log de dominio dedicado en el GET (queda cubierto por el request log estándar). Cuando el `POST /quote-requests` retorna `409 QR_CATEGORY_LIMIT_REACHED`, el UC de US-049 emite el evento `quote_request.limit_reached` (warn) con `{ correlationId, actorId, eventId, serviceCategoryId, activeCount, limit }` — ver DEV-04 de `management/workflows/development-execution/P1/PB-P1-030/US-050-execution.md`.

### 30.7 US-051 · `GET`/`POST /api/v1/vendor/quote-requests/:id` (detalle + mark-viewed transaccional)

Endpoints vendor-scoped que separan la lectura del detalle (safe + idempotent) de la transición `sent → viewed` (POST idempotente). Frontend orquesta: la página `app/(app)/vendor/quotes/[id]/page.tsx` hace el `GET` al montar y dispara el `POST` sólo si `status === 'sent'`. Uniformidad SEC (D4): QR inexistente, ajena, vendor con `status='hidden'` o soft-deleted ⇒ `404 QR_NOT_FOUND`.

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/vendor/quote-requests/:id` | Sí (cookie de sesión) | vendor | Detalle sin side-effect. | 200 | 400 (`INVALID_UUID`), 401, 403, 404 (`QR_NOT_FOUND`) |
| POST | `/api/v1/vendor/quote-requests/:id/mark-viewed` | Sí | vendor | Transición idempotente `sent → viewed`. | 200 | 400 (`INVALID_UUID`), 401, 403, 404 (`QR_NOT_FOUND`) |

```ts
// Response 200 (ambos endpoints, envelope { data, correlationId })
type VendorQuoteRequestResponse = {
  id: string;                          // uuid
  eventId: string;                     // uuid
  serviceCategoryId: string;           // uuid
  vendorProfileId: string | null;
  status: 'sent' | 'viewed' | 'responded' | 'expired' | 'cancelled';
  brief: object | null;                // shape depende del origen (US-049 canónico o US-096 legado)
  aiRecommendationId: string | null;
  viewedAt: string | null;             // ISO-8601
  viewedBy: string | null;             // uuid del usuario del vendor que disparó la transición
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Semántica del POST (Tech Spec §7 / execution record DEV-01/DEV-02):

- Se ejecuta dentro de `prisma.$transaction` con `SELECT ... FOR UPDATE` sobre `quote_requests` para prevenir doble Notification en carreras (§17 riesgo #1).
- Transición sólo desde `status='sent'`. Cualquier otro estado (`viewed`, `responded`, `expired`, `cancelled`) devuelve el estado actual (AC-03/AC-04) sin insertar Notification ni loguear.
- Filtro lazy de expiración (EC-01): si `expires_at IS NOT NULL AND expires_at <= NOW()` el POST devuelve el QR actual sin transicionar.
- Persistencia atómica del par `(status='viewed', viewed_at, viewed_by)` — la columna `viewed_by` la agrega la migración `20260716180000_us051_quote_request_viewed_by` (US-051 DB-001).
- Al transicionar exitosamente, INSERT `notifications(user_id=organizer, type='quote_request.viewed', payload={channel:'in_app', deliveryStatus:'delivered', event, quote_request_id, vendor_profile_id, viewed_at})` en la misma `prisma.$transaction` (D5).

Errores (envelope estándar):

| Código | HTTP | `details` | Trigger |
| --- | ---: | --- | --- |
| `INVALID_UUID` | 400 | `[{ field: 'id', message: 'invalid' }]` | Path param no es UUID (Zod). |
| `AUTHENTICATION_REQUIRED` | 401 | — | Sin sesión. |
| `FORBIDDEN` | 403 | — | Rol distinto de `vendor`. |
| `QR_NOT_FOUND` | 404 | — | QR inexistente, ajena, vendor con `status='hidden'` o soft-deleted (uniforme; SEC-05). |

Observabilidad: log estructurado `quote_request.viewed` (`info`) con `{ correlationId, actorId, quoteRequestId }` — se emite **sólo** cuando ocurre transición real. Los no-ops idempotentes no loguean.

Compatibilidad con la ruta legado `PATCH /quote-requests/:quoteRequestId/viewed` (US-096): se preserva por consumidores existentes. El nuevo endpoint POST bajo `vendor/` es el canónico para MVP y el único que persiste `viewed_by` + Notification atómica al organizer.

### 30.8 US-052 · `POST /api/v1/vendor/quote-requests/:id/respond` (respuesta single-shot con Quote)

Respuesta atómica del vendor a un `QuoteRequest`. En una única transacción:

1. `SELECT ... FOR UPDATE` sobre `quote_requests` filtrado por `vendor_profile_id` (assignment).
2. Guard `status ∈ {sent, viewed}` + filtro lazy de expiración (`expires_at ≤ NOW()`).
3. Recheck contra `uq_quotes_request_active`: existente ⇒ `409 QUOTE_ALREADY_EXISTS`.
4. INSERT `quotes(status='sent', ...)` — la `currency_code` se hereda del `event.currency` (**el `currency_code` del body es ignorado — SEC-04 defense-in-depth**).
5. UPDATE `quote_requests.status='responded'`.
6. INSERT 2 `notifications(type='quote.sent')` al organizador (in_app delivered + email_simulated simulated).
7. Log estructurado `quote.sent` con `{correlationId, actorId, quoteId, quoteRequestId}`.

Un error en cualquier paso revierte la transacción completa. Uniformidad SEC (D4): QR inexistente, ajena, vendor con `status='hidden'` o soft-deleted ⇒ `404 QR_NOT_FOUND`.

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/vendor/quote-requests/:id/respond` | Sí (cookie de sesión) | vendor | Crear Quote `sent` + 2 notifications atómicas. | 201 | 400 (`INVALID_UUID`, `INVALID_TOTAL`, `INVALID_BREAKDOWN`, `INVALID_BREAKDOWN_ITEM`, `INVALID_BREAKDOWN_SUM`, `INVALID_VALID_UNTIL`), 401, 403, 404 (`QR_NOT_FOUND`), 409 (`QR_NOT_RESPONDABLE`, `QUOTE_ALREADY_EXISTS`) |

```ts
// Request body (envelope no-anidado)
type RespondQuoteRequestBody = {
  total_price: string;                             // decimal > 0, hasta 2 decimales
  breakdown: Array<{                                // 1..20 items
    label: string;                                  // 1..150
    amount: string;                                 // decimal >= 0, hasta 2 decimales
  }>;
  conditions?: string;                              // <= 2000
  valid_until?: string;                             // YYYY-MM-DD; rango today..today+90 (default +15)
  currency_code?: string;                           // aceptado por el DTO PERO IGNORADO server-side (SEC-04)
};

// Response 201 (envelope { data, correlationId })
type QuoteResponse = {
  id: string;                                       // uuid del Quote creado
  quoteRequestId: string;                           // uuid del QR
  vendorProfileId: string;                          // uuid del vendor
  status: 'sent';
  totalPrice: string;                               // decimal string (2 decimales)
  currencyCode: 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD'; // heredada del evento (event.currency)
  breakdown: Array<{ label: string; amount: string }>;
  conditions: string | null;
  validUntil: string;                               // ISO-8601, 23:59:59 UTC del día especificado
  sentAt: string;
  createdAt: string;
  updatedAt: string;
};
```

Semántica de `valid_until`:

- Formato del body: `YYYY-MM-DD` (día calendario UTC). El backend lo materializa a `23:59:59 UTC` del día.
- Ausente ⇒ default `clock.now() + 15 días @ 23:59:59 UTC` (BR-QUOTE-015 / C-031).
- Fuera del rango `today..today+90` (comparado a `23:59:59 UTC`) ⇒ `400 INVALID_VALID_UNTIL`.

Errores (envelope estándar):

| Código | HTTP | `details` | Trigger |
| --- | ---: | --- | --- |
| `INVALID_UUID` | 400 | `[{ field: 'id', message: 'invalid' }]` | Path param no es UUID (Zod). |
| `INVALID_TOTAL` | 400 | Zod refines. | `total_price` ≤ 0 o formato inválido (EC-03). |
| `INVALID_BREAKDOWN` | 400 | Zod refines. | Cardinalidad fuera de 1..20 (EC-04). |
| `INVALID_BREAKDOWN_ITEM` | 400 | Zod refines. | `label` 1..150 / `amount` ≥ 0 (EC-05). |
| `INVALID_BREAKDOWN_SUM` | 400 | Zod refine con tolerancia ±0.01. | `|Σ items.amount − total_price| > 0.01` (AC-04). |
| `INVALID_VALID_UNTIL` | 400 | `[{ field: 'valid_until', message: 'out_of_range' }]` | Fuera de `today..today+90` (EC-06). |
| `AUTHENTICATION_REQUIRED` | 401 | — | Sin sesión. |
| `FORBIDDEN` | 403 | — | Rol distinto de `vendor`. |
| `QR_NOT_FOUND` | 404 | — | QR inexistente, ajena, vendor con `status='hidden'` o soft-deleted (uniforme; SEC-05). |
| `QR_NOT_RESPONDABLE` | 409 | `[{ field: 'status'|'expired', message: <detalle> }]` | QR ∉ {sent, viewed} o `expires_at ≤ NOW()` (EC-01/02). |
| `QUOTE_ALREADY_EXISTS` | 409 | `[{ field: 'existing_quote_id', message: <uuid> }]` | Respeta `uq_quotes_request_active` (BR-QUOTE-013). |

Observabilidad: log estructurado `quote.sent` (`info`) con `{correlationId, actorId, quoteId, quoteRequestId}`. Notificaciones persistidas: `type='quote.sent'`; `payload` incluye `{channel, deliveryStatus, event, quote_id, quote_request_id, vendor_profile_id, total_price, currency_code, valid_until}`.

---

## 31. Quotes API

### 31.1 Propósito

Vendor responde a un quote request creando una `Quote`. Organizer la acepta, rechaza o marca como preferida.

### 31.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/quote-requests/:quoteRequestId/quote` | Sí | organizer, vendor (asignado), admin | Obtiene quote vigente. | 200 | 401, 403, 404 |
| POST | `/quote-requests/:quoteRequestId/quote` | Sí | vendor | Crea draft. | 201 | 401, 403, 404, 422 |
| PATCH | `/quotes/:quoteId` | Sí | vendor | Edita draft. | 200 | 401, 403, 404, 422 |
| POST | `/quotes/:quoteId/send` | Sí | vendor | Envía al organizer. | 200 | 401, 403, 404, 422 |
| POST | `/quotes/:quoteId/accept` | Sí | organizer | Acepta. | 200 | 401, 403, 404, 410 (QUOTE_EXPIRED), 422 |
| POST | `/quotes/:quoteId/reject` | Sí | organizer | Rechaza y emite 2 Notifications al vendor atómicamente. Body opcional `{ reason?: string [0..500] }`. | 200 | 400 (INVALID_REJECTION_REASON), 401, 403, 404 (QUOTE_NOT_FOUND), 409 (QUOTE_NOT_REJECTABLE), 422 |
| POST | `/quotes/:quoteId/prefer` | Sí | organizer | Marca preferida. | 200 | 401, 403, 404, 422 |

### 31.3 DTOs

```ts
type CreateQuoteRequestDto = {
  totalPrice: string;
  breakdown: { label: string; amount: string }[];
  conditions: string;
  validUntil?: string; // YYYY-MM-DD; default created_at + 15 días
  currencyCode: "GTQ" | "EUR" | "MXN" | "COP" | "USD";
};

type QuoteResponseDto = {
  id: string;
  quoteRequestId: string;
  vendorProfileId: string;
  totalPrice: string;
  breakdown: { label: string; amount: string }[];
  conditions: string;
  validUntil: string;
  currencyCode: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  isPreferred: boolean;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null; // US-054 (PB-P1-032): motivo opcional del rechazo (0..500).
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// US-054 (PB-P1-032): body opcional del endpoint `POST /quotes/:quoteId/reject`.
// Longitud validada server-side: > 500 chars ⇒ 400 INVALID_REJECTION_REASON.
type RejectQuoteBodyDto = {
  reason?: string; // opcional, 0..500 chars; string vacío se persiste como null.
};
```

**US-054 (PB-P1-032) — reject transaccional.** Dentro de un único `prisma.$transaction` el
backend hace `SELECT ... FOR UPDATE` de la Quote, verifica ownership del evento (colapsa a
`404 QUOTE_NOT_FOUND` uniforme si el organizer no es dueño — SEC-03), aplica el guard
`status='sent'` (`409 QUOTE_NOT_REJECTABLE` en cualquier otro estado, incluido re-rechazo —
EC-05), persiste `status='rejected' + rejected_at=NOW() + rejection_reason?`, y delega en
`QuoteNotificationService.emitQuoteStateChange({ eventName: 'quote.rejected', tx })` la
inserción de las 2 Notifications al vendor (`in_app` delivered + `email_simulated` simulated —
BR-NOTIF-003). Un fallo en cualquier INSERT revierte la transición completa. El mismo servicio
lo consume `ExpireQuotesUs053UseCase` (US-053) para emitir `quote.expired` con el mismo
patrón atómico.

### 31.4 Reglas enforced

- **BR-QUOTE-013**: una `Quote` vigente por `quoteRequestId`.
- **BR-QUOTE-015**: si `validUntil` se omite, default `createdAt + 15 días calendario`.
- **BR-QUOTE-016**: job de expiración corre periódicamente y mueve a `expired`.
- **BR-QUOTE-017**: solo `draft` editable.
- Aceptar quote expirada → `410 QUOTE_EXPIRED`.

---

## 32. Booking Intents API

### 32.1 Propósito

Simular la intención de contratar al vendor con una `Quote` aceptada. **Sin pagos reales, sin contratos digitales**.

### 32.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/booking-intents` | Sí | organizer | Crea intent desde quote aceptada. | 201 | 401, 403, 404, 422 |
| GET | `/booking-intents/:bookingIntentId` | Sí | organizer, vendor (asignado), admin | Detalle. | 200 | 401, 403, 404 |
| POST | `/booking-intents/:bookingIntentId/confirm` | Sí | vendor | Confirma la intención. | 200 | 401, 403, 404, 422 |
| POST | `/booking-intents/:bookingIntentId/cancel` | Sí | organizer, vendor | Cancela. | 200 | 401, 403, 404, 422 |

### 32.3 DTOs

```ts
type CreateBookingIntentRequestDto = {
  quoteId: string;
};

type CancelBookingIntentRequestDto = {
  cancellationReason: string;
};

type BookingIntentResponseDto = {
  id: string;
  quoteId: string;
  eventId: string;
  vendorProfileId: string;
  status: "pending" | "confirmed_intent" | "cancelled";
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 32.4 Reglas enforced

- **BR-BOOKING-001**: solo desde quote aceptada y vigente.
- **BR-BOOKING-002**: confirmación bilateral (organizer crea, vendor confirma).
- **BR-BOOKING-004**: NO se procesa pago real.
- **BR-BOOKING-009**: cancelable incluso desde `confirmed_intent` sin penalización. Requiere `cancellationReason`.

### 32.5 Structured logs — sync `BudgetItem.committed` (US-039 / PB-P1-023)

Emitidos por el handler `UpdateCommittedFromBookingIntent` durante `POST /booking-intents/:id/confirm` y `POST /booking-intents/:id/cancel` (participa en la `prisma.$transaction` del invocador). Todos sin PII: solo IDs, montos, códigos.

| Event | Level | Trigger | Payload keys |
| --- | --- | --- | --- |
| `budget.committed.synced` | info | `applyOnConfirm` / `revertOnCancel` exitoso | `action` (`apply`/`revert`), `bookingIntentId`, `budgetItemId`, `eventId`, `serviceCategoryCode`, `amount`, `correlationId`, `durationMs` |
| `budget.committed.skipped_already_synced` | info | Segundo `applyOnConfirm` sobre intent ya sincronizado (D1 idempotencia) | `bookingIntentId`, `correlationId` |
| `budget.committed.skipped_nothing_to_revert` | info | `revertOnCancel` sobre intent con `committed_synced_at IS NULL` | `bookingIntentId`, `correlationId` |
| `budget.committed.skipped_zero_amount` | info | `applyOnConfirm` con `quote.amount = 0` (D3) | `bookingIntentId`, `correlationId` |
| `budget.item.auto_created_by_booking` | warn | `applyOnConfirm` sin BudgetItem previo para la categoría (D2 auto-create) | `bookingIntentId`, `newBudgetItemId`, `eventId`, `serviceCategoryCode`, `correlationId` |
| `budget.committed.currency_mismatch` | error | `quote.currency` distinto de `event.currency` (defensa profunda AC-05) — rollback total | `bookingIntentId`, `eventId`, `intentCurrency`, `eventCurrency`, `correlationId` |

Fuente: `backend/src/shared/logging/budget-sync-events.ts`.

---

## 33. Reviews API

### 33.1 Propósito

Organizer publica una review tras `BookingIntent.confirmed_intent`.

### 33.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/reviews` | Sí | organizer | Crea review. | 201 | 401, 403, 409 (DUPLICATE_REVIEW), 422 |
| GET | `/vendors/:vendorProfileId/reviews` | No | anonymous, organizer, vendor, admin | Lista pública. | 200 | 404 |
| GET | `/vendors/me/reviews` | Sí | vendor | Reviews recibidas. | 200 | 401, 403 |
| POST | `/admin/reviews/:reviewId/hide` | Sí | admin | Oculta review. | 200 | 401, 403, 404 |
| DELETE | `/admin/reviews/:reviewId` | Sí | admin | Soft delete. | 204 | 401, 403, 404 |

### 33.3 DTOs

```ts
type CreateReviewRequestDto = {
  eventId: string;
  vendorProfileId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
};

type ReviewResponseDto = {
  id: string;
  eventId: string;
  vendorProfileId: string;
  authorUserId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  status: "published" | "hidden" | "removed";
  hiddenAt: string | null;
  isSeed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 33.4 Reglas enforced

- **BR-REVIEW-001**: requiere `BookingIntent.confirmed_intent` para `(event, vendor)`.
- **BR-REVIEW-002**: única por `(eventId, vendorProfileId)`. Duplicado → `409 DUPLICATE_REVIEW`.
- **BR-REVIEW-003**: rating entero **1 a 5**.
- **BR-REVIEW-005**: ocultamiento por admin con auditoría en `AdminAction`.

---

## 34. Notifications API

### 34.1 Propósito

Centralizar notificaciones in-app del usuario. **No** envía SMS, push, WhatsApp ni email real (BR-INFRA-*).

### 34.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/notifications` | Sí | organizer, vendor, admin | Lista paginada. | 200 | 401 |
| PATCH | `/notifications/:notificationId/read` | Sí | organizer, vendor, admin | Marca como leída. | 204 | 401, 403, 404 |
| POST | `/notifications/mark-all-read` | Sí | organizer, vendor, admin | Marca todas. | 204 | 401 |

### 34.3 DTOs

```ts
type NotificationResponseDto = {
  id: string;
  userId: string;
  type:
    | "quote_request_received"
    | "quote_received"
    | "quote_rejected"
    | "quote_expired"
    | "booking_confirmed"
    | "task_due"
    | "vendor_approved"
    | "vendor_rejected"
    | "review_received";
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  emailSimulated: boolean;
  createdAt: string;
};
```

### 34.4 Reglas

- `emailSimulated=true` indica que en demo se simula un envío de email (no se envía realmente).
- Endpoints de creación de notificaciones son **internos** (disparados por casos de uso, no expuestos al cliente).

---

## 35. AI Assistance API

### 35.1 Propósito

Endpoints de generación asistida por LLM. **Todas las salidas requieren confirmación humana**. Todo se persiste como `AIRecommendation` y queda `pending` hasta que el usuario las aplique o descarte.

### 35.2 Principios

- **Human-in-the-loop estricto** (BR-AI-001).
- **Timeout 60 s** (BR-AI-009). Si excede:
  - Modo demo (`AI_DEMO_MODE=true`): degrada a `MockAIProvider`.
  - Modo producción-académica: retorna `503 AI_PROVIDER_TIMEOUT`.
- Cada respuesta incluye `aiMeta` con `provider`, `promptVersion`, `latencyMs`, `fallbackUsed`, `languageCode`, `recommendationId`.
- Validación de salida con JSON Schema. Falla → `422 AI_INVALID_OUTPUT`.
- LLM API keys jamás salen del backend.

### 35.3 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/events/:eventId/ai/event-plan` | Sí | organizer | AI-001: plan de evento. | 200 | 401, 403, 404, 422, 503 |
| POST | `/events/:eventId/ai/checklist` | Sí | organizer | AI-002: checklist. | 200 | 401, 403, 404, 422, 503 |
| POST | `/events/:eventId/ai/budget-suggestion` | Sí | organizer | AI-003: budget. | 200 | 401, 403, 404, 422, 503 |
| POST | `/events/:eventId/ai/vendor-categories` | Sí | organizer | AI-004: categorías. | 200 | 401, 403, 404, 422, 503 |
| POST | `/events/:eventId/ai/quote-brief` | Sí | organizer | AI-005: brief. | 200 | 401, 403, 404, 422, 503 |
| POST | `/quote-requests/:quoteRequestId/ai/comparison-summary` | Sí | organizer | AI-006: comparación. | 200 | 401, 403, 404, 422, 503 |
| POST | `/vendors/me/ai/bio` | Sí | vendor | AI-007: bio. | 200 | 401, 403, 422, 503 |
| POST | `/events/:eventId/ai/task-prioritization` | Sí | organizer | AI-008: prioridades. | 200 | 401, 403, 404, 422, 503 |
| GET | `/ai-recommendations/:aiRecommendationId` | Sí | organizer/vendor (own) | Obtiene recomendación. | 200 | 401, 403, 404 |
| POST | `/ai-recommendations/:aiRecommendationId/apply` | Sí | organizer/vendor (own) | Aplica (acepta). | 200 | 400, 401, 403, 404, 409, 422 |
| POST | `/ai-recommendations/:aiRecommendationId/discard` | Sí | organizer/vendor (own) | Descarta. | 204 | 401, 403, 404 |

#### 35.3.a Catálogo de errores del `/apply` por type (US-037 y siguientes)

El error handler central mapea cada `error_code` a un HTTP status estable. Códigos comunes a **todos** los types:

| Error code | Status | Origen |
| --- | --- | --- |
| `AUTHENTICATION_REQUIRED` | 401 | sesión ausente/expirada |
| `FORBIDDEN` | 403 | rol admin (excluido del HITL) |
| `RESOURCE_NOT_FOUND` | 404 | recomendación ajena/inexistente (no-revelación) |
| `RECOMMENDATION_NOT_PENDING` | 409 | status != 'pending' (US-025 EC-01/07) |
| `EDITED_PAYLOAD_INVALID` | 400 | `editedPayload` no cumple `OUTPUT_SCHEMAS.<type>` (US-025 EC-03) |
| `SIDE_EFFECT_FAILED` | 500 | fallo en la strategy → rollback (US-025 EC-04) |

Códigos **específicos por type** aplicables cuando `type === 'budget_suggestion'` (US-037 D5/D6/AC-08):

| Error code | Status | Origen | Details |
| --- | --- | --- | --- |
| `EVENT_NOT_EDITABLE` | 409 | evento en `cancelled`/`completed` (D5) | `event_status` |
| `CATEGORY_INACTIVE` | 409 | alguna `service_category` referenciada tiene `is_active=false` (D6) | `inactive_categories[]` con `<code>:<name>` |
| `CURRENCY_MISMATCH` | 409 | `recommendation.output.currencyCode != event.currency` (AC-08 defensa profunda) | `recommendation_currency`, `event_currency` |
| `INVALID_VALUE` | 400 | `editedPayload.items[].category` no está en el payload original, o lista vacía (VR-03/VR-05) | `editedPayload` |
| `PAYLOAD_INVALID` | 422 | `AIRecommendation.output` corrupto/no compatible con `OUTPUT_SCHEMAS.budget_suggestion` (defensa profunda) | `output_payload` |

Body del `/apply`: `{ editedPayload?: unknown, editedOutput?: unknown }` — `editedOutput` es alias legacy (US-097 borrador); el controller normaliza a `editedPayload`. Snapshot OpenAPI regenerado por US-098.

### 35.4 DTOs base

```ts
type AIBaseRequestDto<TInput> = {
  input: TInput;
  languageCode?: "es-LATAM" | "es-ES" | "pt" | "en"; // default: organizer/vendor preferred
  preferMock?: boolean;  // demo only
};

type AIRecommendationResponseDto<TOutput> = {
  recommendationId: string;
  type:
    | "event_plan"
    | "checklist"
    | "budget_suggestion"
    | "vendor_categories"
    | "quote_brief"
    | "quote_comparison"
    | "vendor_bio"
    | "task_prioritization";
  output: TOutput;
  aiMeta: {
    provider: "openai" | "anthropic" | "mock";
    promptVersion: string;
    latencyMs: number;
    fallbackUsed: boolean;
    languageCode: "es-LATAM" | "es-ES" | "pt" | "en";
  };
  status: "pending";
  createdAt: string;
};
```

### 35.5 Outputs por feature (resumen)

```ts
type EventPlanOutputDto = {
  summary: string;
  phases: { name: string; description: string; relativeStart: string }[];
  recommendedVendorCategories: string[];
  warnings: string[];
};

type ChecklistOutputDto = {
  tasks: {
    title: string;
    description: string;
    category: string;
    relativeDueDate: string;
    priority: "low" | "medium" | "high";
    source: "ai";
  }[];
};

type BudgetSuggestionOutputDto = {
  currency: string;
  totalBudget: string;
  items: {
    category: string;
    suggestedAmount: string;
    percentage: number;
    priority: "low" | "medium" | "high";
    reason: string;
  }[];
  warnings: string[];
};

type VendorCategoriesOutputDto = {
  categories: {
    category: string;
    priority: "low" | "medium" | "high";
    required: boolean;
    reason: string;
  }[];
};

type QuoteBriefOutputDto = {
  brief: string;
  requirements: string[];
  questions: string[];
  constraints: string[];
};

type QuoteComparisonOutputDto = {
  summary: string;
  quotes: {
    quoteId: string;
    strengths: string[];
    risks: string[];
    missingInformation: string[];
  }[];
  nonBindingRecommendation: string;
};
```

### 35.6 Flujo human-in-the-loop

```mermaid
flowchart LR
    A[Organizer hace POST /events/:id/ai/event-plan] --> B[Use case llama LLMProvider]
    B --> C{Output válido?}
    C -- No --> E1[422 AI_INVALID_OUTPUT]
    C -- Sí --> D[Persiste AIRecommendation status=pending]
    D --> R[200 con recommendationId + output + status=pending]
    R --> U{Organizer decide}
    U -- Apply --> P1[POST /ai-recommendations/:id/apply]
    U -- Discard --> P2[POST /ai-recommendations/:id/discard]
    P1 --> X[Aplica al recurso destino tasks/budget/brief]
    P2 --> Y[Marca discarded]
```

### 35.7 Errores específicos

- `503 AI_PROVIDER_UNAVAILABLE`: LLM caído sin fallback.
- `503 AI_PROVIDER_TIMEOUT`: timeout >60s en modo producción-académica.
- `422 AI_INVALID_OUTPUT`: LLM devolvió JSON inválido.
- `400 MISSING_INPUT`: input incompleto para el feature.
- `422 UNSUPPORTED_LANGUAGE`: idioma fuera del set soportado.

### 35.8 Notas para frontend

- Cliente debe mostrar **estado `pending`** y opciones **Aplicar / Editar / Descartar**.
- Cliente nunca debe asumir que la IA modifica datos sin confirmación.
- `recommendationId` debe enviarse al crear `QuoteRequest`, `EventTask` o `BudgetItem` derivado para trazabilidad.

---

## 36. Attachments API

### 36.1 Propósito

Subida y administración de adjuntos: portafolio de vendor y archivos de brief de cotización.

### 36.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/attachments` | Sí | organizer, vendor | Sube adjunto (multipart). | 201 | 401, 403, 413, 415, 422 |
| GET | `/attachments/:attachmentId` | Sí | owner, admin | Detalle. | 200 | 401, 403, 404 |
| DELETE | `/attachments/:attachmentId` | Sí | owner, admin | Soft delete. | 204 | 401, 403, 404 |
| GET | `/vendors/me/portfolio` | Sí | vendor | Lista portfolio. | 200 | 401, 403 |
| POST | `/vendors/me/portfolio` | Sí | vendor | Sube imagen a portfolio. | 201 | 401, 403, 409 (MAX_PORTFOLIO_IMAGES_EXCEEDED), 422 |

### 36.3 DTOs

```ts
// Multipart fields:
type UploadAttachmentRequestDto = {
  ownerEntityType: "vendor_portfolio" | "quote_brief";
  ownerEntityId: string;
  workGroupId?: string; // para portafolio
  file: File;           // multipart
};

type AttachmentResponseDto = {
  id: string;
  ownerUserId: string;
  ownerEntityType: "vendor_portfolio" | "quote_brief";
  ownerEntityId: string;
  workGroupId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  deletedAt: string | null;
  createdAt: string;
};
```

### 36.4 Reglas

- MIME allow-list: `image/jpeg`, `image/png`, `image/webp` (portafolio); `application/pdf`, imágenes (brief).
- Tamaño máximo por archivo: **5 MB**.
- **BR-VENDOR-005**: máximo **10 imágenes por `workGroupId`** del portafolio.
- Soft delete obligatorio.

---

## 37. Admin Governance API

### 37.1 Propósito

Aprobaciones, moderación, catálogos y métricas administrativas.

### 37.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/admin/vendors` | Sí | admin | Lista con filtros (status). | 200 | 401, 403 |
| POST | `/admin/vendors/:vendorProfileId/approve` | Sí | admin | Aprueba vendor. | 200 | 401, 403, 404, 422 |
| POST | `/admin/vendors/:vendorProfileId/reject` | Sí | admin | Rechaza con motivo. | 200 | 401, 403, 404, 422 |
| POST | `/admin/vendors/:vendorProfileId/hide` | Sí | admin | Oculta vendor. | 200 | 401, 403, 404, 422 |
| GET | `/admin/event-types` | Sí | admin | Lista catálogo completo. | 200 | 401, 403 |
| POST | `/admin/event-types` | Sí | admin | Crea event type. | 201 | 401, 403, 422 |
| PATCH | `/admin/event-types/:code` | Sí | admin | Actualiza event type. | 200 | 401, 403, 404, 422 |
| POST | `/admin/event-types/:code/deactivate` | Sí | admin | Desactiva event type. | 200 | 401, 403, 404, 409 (EVENT_TYPE_HAS_EVENTS), 422 |
| GET | `/admin/metrics` | Sí | admin | Métricas agregadas. | 200 | 401, 403 |
| GET | `/admin/admin-actions` | Sí | admin | Audit log. | 200 | 401, 403 |

### 37.3 DTOs

```ts
type AdminApproveVendorRequestDto = {
  notes?: string;
};

type AdminRejectVendorRequestDto = {
  reason: string;
};

type AdminMetricsResponseDto = {
  usersByRole: { organizer: number; vendor: number; admin: number };
  vendorsByStatus: { pending: number; approved: number; rejected: number; hidden: number };
  activeEvents: number;
  quoteRequestsLast7Days: number;
  bookingIntentsLast7Days: number;
  aiRecommendationsLast7Days: number;
};

type AdminActionResponseDto = {
  id: string;
  adminUserId: string;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
```

### 37.4 Reglas

- **BR-ADMIN-004**: toda acción admin se registra automáticamente en `AdminAction`.
- **BR-EVENTTYPE-007**: no hard-delete con eventos asociados.
- Admin **no** edita perfiles ajenos (solo lee).
- Cuando un admin "hide" un review, se invoca `/admin/reviews/:id/hide` (ver §33).

---

## 38. Localization / Currency API

### 38.1 Propósito

Listar idiomas y monedas soportadas, para selección en formularios.

### 38.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/i18n/languages` | No | anonymous | Idiomas soportados. | 200 | — |
| GET | `/i18n/event-types` | No | anonymous | Catálogo público de event types activos. | 200 | — |
| GET | `/currencies` | No | anonymous | Monedas permitidas (sin conversión). | 200 | — |

### 38.3 DTOs

```ts
type LanguageResponseDto = {
  code: "es-LATAM" | "es-ES" | "pt" | "en";
  displayName: string;
};

type CurrencyResponseDto = {
  code: "GTQ" | "EUR" | "MXN" | "COP" | "USD";
  symbol: string;
  displayName: string;
};

type EventTypeResponseDto = {
  code: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
};
```

### 38.4 Reglas

- **BR-BUDGET-007**: no se realiza conversión de moneda.
- Los displayNames respetan `Accept-Language` cuando se envía.

---

## 39. Seed / Demo API

### 39.1 Propósito

Cargar y reiniciar datos de demostración. Solo admin.

### 39.2 Endpoints

| Método | Path | Auth | Roles | Propósito | Success | Errores |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/admin/seed/run` | Sí | admin | Ejecuta seed completo. | 202 | 401, 403, 422 |
| POST | `/admin/seed/reset` | Sí | admin | Resetea datos seed. | 202 | 401, 403, 422 |
| GET | `/admin/seed/status` | Sí | admin | Estado del seed. | 200 | 401, 403 |

### 39.3 DTOs

```ts
type SeedRunRequestDto = {
  preset: "minimal" | "full";
  resetBefore?: boolean;
  language?: "es-LATAM" | "es-ES" | "pt" | "en";
};

type SeedStatusResponseDto = {
  lastRunAt: string | null;
  preset: "minimal" | "full" | null;
  recordCount: Record<string, number>;
};
```

### 39.4 Reglas

- Solo entidades con `isSeed=true` son eliminadas por `reset`.
- Las acciones quedan registradas en `AdminAction`.
- En entornos de demostración el admin tiene capacidad de **idempotencia**: re-ejecutar `run` no duplica datos seed.

---

## 40. Matriz de autorización por endpoint

> Leyenda: ✅ permitido, ⚠️ permitido con ownership/assignment, ❌ denegado.

| Endpoint | anonymous | organizer | vendor | admin |
| --- | --- | --- | --- | --- |
| `GET /health` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/register` | ✅ | ❌ | ❌ | ❌ |
| `POST /auth/login` | ✅ | ❌ | ❌ | ❌ |
| `POST /auth/logout` | ❌ | ✅ | ✅ | ✅ |
| `GET /me` | ❌ | ✅ | ✅ | ✅ |
| `POST /events` | ❌ | ✅ | ❌ | ❌ |
| `GET /events/:id` | ❌ | ⚠️ own | ❌ | ✅ |
| `PATCH /events/:id` | ❌ | ⚠️ own | ❌ | ❌ |
| `POST /events/:id/quote-requests` | ❌ | ⚠️ own | ❌ | ❌ |
| `GET /quote-requests/:id` | ❌ | ⚠️ own | ⚠️ assigned | ✅ |
| `POST /quote-requests/:id/quote` | ❌ | ❌ | ⚠️ assigned | ❌ |
| `POST /quotes/:id/accept` | ❌ | ⚠️ own event | ❌ | ❌ |
| `POST /booking-intents` | ❌ | ⚠️ own | ❌ | ❌ |
| `POST /booking-intents/:id/confirm` | ❌ | ❌ | ⚠️ assigned | ❌ |
| `POST /reviews` | ❌ | ⚠️ own | ❌ | ❌ |
| `POST /admin/vendors/:id/approve` | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/reviews/:id/hide` | ❌ | ❌ | ❌ | ✅ |
| `POST /events/:id/ai/*` | ❌ | ⚠️ own | ❌ | ❌ |
| `POST /vendors/me/ai/bio` | ❌ | ❌ | ✅ | ❌ |
| `GET /api/v1/public/vendors` | ✅ | ✅ | ✅ | ✅ |
| `POST /admin/seed/run` | ❌ | ❌ | ❌ | ✅ |

---

## 41. Matriz de reglas de negocio por endpoint

| Regla | Endpoint donde se enforce |
| --- | --- |
| BR-AUTH-002 | `POST /auth/register` |
| BR-AUTH-005 | `POST /auth/register`, `PATCH /me` |
| BR-AUTH-011 | `POST /auth/register`, `POST /auth/login` |
| BR-USER-002 | `POST /auth/register`, `PATCH /me` |
| BR-EVENT-001 / 002 | `*/events/*` ownership middleware |
| BR-EVENT-005 | `POST /events/:id/activate`, `POST /events/:id/cancel`, `PATCH /events/:id` |
| BR-EVENT-006 | `POST /events/:id/quote-requests` |
| BR-EVENT-007 | `PATCH /events/:id` (rechaza currencyCode) |
| BR-EVENT-013 | Job interno (no endpoint) |
| BR-EVENT-014 | `GET /admin/events` (read-only); `AdminAction` log |
| BR-TASK-003 / 004 | `POST /events/:id/tasks`, `PATCH /events/:id/tasks/:taskId/status` |
| BR-BUDGET-003 / 004 / 006 / 007 | Endpoints de budget |
| BR-VENDOR-001 | Directorio público filtra por `status=approved` |
| BR-VENDOR-004 | `PATCH /vendors/me` |
| BR-VENDOR-005 | `POST /vendors/me/portfolio` |
| BR-SERVICE-005 / 007 | `/admin/service-categories` |
| BR-QUOTE-001 / 004 / 006 / 009 / 013 / 015 / 016 / 017 | Endpoints de quotes |
| BR-BOOKING-001 / 002 / 004 / 009 | Endpoints de booking-intents |
| BR-REVIEW-001 / 002 / 003 / 005 | `POST /reviews`, `/admin/reviews/*` |
| BR-AI-001 / 005 / 007 / 009 / 010 / 011 | Endpoints `/ai/*` y `/ai-recommendations/*` |
| BR-ADMIN-004 | Middleware admin → registra `AdminAction` |
| BR-EVENTTYPE-007 | `POST /admin/event-types/:code/deactivate` |

---

## 42. Contratos críticos de DTOs

Esta sección lista DTOs **críticos** que el frontend y backend deben mantener sincronizados.

### 42.1 EventResponseDto

Ver §24.4. Notar que `currencyCode` jamás cambia, `autoCompleted` es solo lectura, y `eventType` viene anidado con `displayName` localizado.

### 42.2 QuoteResponseDto

Ver §31.3. `validUntil` es siempre devuelto (default calculado backend).

### 42.3 AIRecommendationResponseDto<TOutput>

Ver §35.4. Es **genérico**; el cliente debe deserializar `output` según `type`.

### 42.4 ErrorEnvelope

Ver §14.1. Cliente debe siempre leer `error.code` para lógica programática y `error.message` para UI.

### 42.5 ListResponse<T>

```ts
type ListResponse<T> = {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  meta: { correlationId: string; timestamp: string };
};
```

### 42.6 EventTaskResponseDto

Ver §25.3.

### 42.7 NotificationResponseDto

Ver §34.3.

---

## 43. Estrategia OpenAPI

Este documento es **OpenAPI-ready**. La conversión a OpenAPI 3.1 se planifica así:

1. **Zod schemas como fuente**: los schemas de Zod del backend serán anotados con `.openapi(...)` mediante `zod-to-openapi` o `@asteasolutions/zod-to-openapi`.
2. **Tags por módulo**: cada sección (§21–§39) corresponde a un `tag` OpenAPI con `description` y `externalDocs`.
3. **Security schemes**: una `cookieAuth` (`type: apiKey, in: cookie, name: <SESSION_COOKIE_NAME>`).
4. **Responses comunes**: definir componentes para `ErrorEnvelope`, `ListResponse`, `Pagination`.
5. **Operación por endpoint**: `operationId` con convención `verbResource` (`getEvent`, `createEvent`, `applyAiRecommendation`).
6. **Versionado**: servidor base `https://api.eventflow.demo/api/v1`.
7. **Generación**: archivo `openapi.yaml` derivado en `/api/openapi.yaml`. Sirve para SDKs y para frontend.
8. **Validación CI**: workflow GitHub Actions ejecuta `redocly lint`.

**Importante**: este documento debe mantenerse como fuente normativa **hasta** que OpenAPI esté autogenerado y validado. A partir de ese punto, OpenAPI YAML pasa a ser fuente y este documento se convierte en su **complemento narrativo**.

---

## 44. Estrategia de pruebas del API

### 44.1 Niveles

| Nivel | Herramienta | Cobertura |
| --- | --- | --- |
| Unit (use cases) | Vitest | Reglas de negocio, mocks de puertos. |
| Integration (API) | Vitest + Supertest | Endpoint con DB real (Testcontainers PostgreSQL). |
| Contract | Vitest + zod-to-openapi | DTOs request/response coinciden con schema. |
| E2E (smoke) | Playwright | Login + crear evento + IA mock. |
| AI mock | MockAIProvider | Determinismo de respuestas. |

### 44.2 Casos mínimos por endpoint

Para cada endpoint el set mínimo de pruebas incluye:

1. **Happy path**: 200/201 con DTO esperado.
2. **Auth**: 401 sin sesión.
3. **Authz por rol**: 403 con rol incorrecto.
4. **Ownership**: 403 al acceder a recurso ajeno.
5. **Validación**: 422 con campos inválidos.
6. **Reglas de negocio**: caso explícito de cada regla aplicable.
7. **Edge cases**: paginación con `pageSize=0` rechazado, `page` fuera de rango, fecha pasada, etc.

### 44.3 MSW en frontend

- Endpoints mockeados en frontend mediante **MSW** usando los mismos DTOs.
- `OpenAPI YAML` (futuro) genera mocks automáticamente.

### 44.4 Datos seed para pruebas

- Set de datos seed reproducible (BR-INFRA-XX) usado en integration y E2E.
- `is_seed=true` para limpieza rápida.

---

## 45. Consideraciones para frontend Next.js

### 45.1 Capa de cliente HTTP

- Cliente HTTP centralizado (`apiClient`) con:
  - `baseUrl` desde env (`NEXT_PUBLIC_API_URL`).
  - Inyección automática de `Accept-Language`, `X-Correlation-Id`.
  - Manejo de cookie HTTP-only (browser maneja automáticamente con `credentials: "include"`).
  - Normalización de errores (extrae `error.code` y `error.message`).

### 45.2 TanStack Query

- Llaves de query consistentes:
  - `["events"]`, `["events", eventId]`, `["events", eventId, "tasks"]`.
  - `["vendors", "me"]`, `["vendors", "me", "services"]`.
  - `["ai-recommendations", recommendationId]`.
- Invalidaciones tras mutaciones (ej. `POST /events/:id/tasks` invalida `["events", eventId, "tasks"]`).
- Reintentos: solo en `GET`, máximo 1 reintento en errores `>=500`.
- Sin reintentos en `POST/PATCH/DELETE`.

### 45.3 Hidratación SSR

- Server Components pueden hacer fetch al backend con cookies forward (helper `serverFetch`).
- Endpoints de IA siempre Client Components con `mutation`.

### 45.4 Formularios

- React Hook Form + Zod schemas **compartidos** con backend (o derivados del mismo contrato).
- Validación client-side es UX; backend re-valida.

### 45.5 Manejo de IA

- Componente `<AIRecommendationCard>` con estados: `idle`, `loading`, `pending`, `applied`, `discarded`.
- Botones de **Aplicar / Editar / Descartar** llaman a `/ai-recommendations/:id/apply`/`/discard`.
- Editar antes de aplicar: el cliente puede modificar `output` y llamar `apply` con el body editado (cuando aplica).

### 45.6 Manejo de errores en UI

- Toasts para errores no críticos.
- Form-level errors mapeados por `details[].field`.
- Página de error global para `500`.

### 45.7 Internacionalización

- Frontend declara idioma en `Accept-Language`.
- Mensajes de error provienen del backend en el idioma solicitado.
- Catálogos (`/i18n/event-types`, etc.) ya vienen localizados.

---

## 46. Límites explícitos del MVP

### 46.1 No incluido en el API del MVP

- **Pagos reales** (Stripe, PayPal, transferencias).
- **Contratos digitales** (firma electrónica).
- **Chat en tiempo real** (WebSockets, Pusher, Ably).
- **WhatsApp Business**.
- **SMS** (Twilio, etc.).
- **Push notifications**.
- **Sincronización de calendario** (Google Calendar, iCal).
- **Conversión automática de moneda**.
- **APIs autónomas de IA** (sin confirmación humana).
- **Moderación automática por IA**.
- **Sentiment analysis**.
- **Generación de imágenes por IA**.
- **Multi-user event collaboration**.
- **Multi-tenant enterprise**.
- **APIs GraphQL, gRPC, tRPC, Server Actions, WebSockets**.
- **Endpoints específicos para apps móviles nativas**.
- **Webhooks externos**.

### 46.2 Endpoints futuros previstos (fuera de alcance MVP)

| Tema | Endpoint futuro previsto |
| --- | --- |
| Pagos | `POST /payments/intents`, `POST /payments/webhooks` |
| Contratos | `POST /contracts`, `POST /contracts/:id/sign` |
| Chat | `POST /threads`, WebSocket `/realtime/...` |
| Push | `POST /devices/register` |
| Calendario | `POST /calendars/sync` |
| Multi-tenant | `GET /organizations`, etc. |

---

## 47. Riesgos del diseño API y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Frontend evoluciona y rompe DTOs | Alto | DTOs versionados; contract tests; OpenAPI generado. |
| Fugas de PII en logs | Alto | Redacción `pino`; revisión de logs. |
| LLM no devuelve JSON válido | Medio | Validación JSON Schema; fallback Mock; reintento limitado. |
| Abuso de endpoints IA | Medio | Rate limit por usuario; demo-mode con MockAIProvider. |
| Ownership mal aplicado | Alto | Tests unitarios + integración por endpoint sensible. |
| Currency inmutable filtrado por frontend | Bajo | Backend valida y rechaza con `409 CURRENCY_IMMUTABLE`. |
| Endpoint admin sin auditoría | Alto | Middleware admin registra `AdminAction` automáticamente. |
| Paginación inconsistente | Bajo | Helper único de paginación reutilizado. |
| Errores inconsistentes | Medio | Middleware error central con catálogo único de códigos. |
| Tokens auth en `localStorage` accidental | Alto | Code review + ESLint rule; cookie HTTP-only obligatorio. |

---

## 48. Checklist de readiness del API

| # | Item | Estado |
| --- | --- | --- |
| 1 | Convenciones de naming definidas | ✅ |
| 2 | Versionado URL definido | ✅ |
| 3 | Sobre estándar de éxito y error | ✅ |
| 4 | Catálogo de códigos de error | ✅ |
| 5 | Códigos HTTP definidos | ✅ |
| 6 | Paginación / filtro / sort / búsqueda | ✅ |
| 7 | Validación Zod | ✅ |
| 8 | Autenticación cookie HTTP-only | ✅ |
| 9 | Autorización RBAC + ownership | ✅ |
| 10 | Endpoints módulo a módulo | ✅ |
| 11 | DTOs request/response | ✅ |
| 12 | Endpoints IA con human-in-the-loop | ✅ |
| 13 | Endpoints admin con auditoría | ✅ |
| 14 | Endpoints públicos SEO | ✅ |
| 15 | Endpoints adjuntos multipart | ✅ |
| 16 | Matriz de autorización | ✅ |
| 17 | Matriz de reglas de negocio | ✅ |
| 18 | OpenAPI readiness | ✅ |
| 19 | Estrategia de pruebas | ✅ |
| 20 | Consideraciones Next.js | ✅ |
| 21 | Límites MVP explícitos | ✅ |
| 22 | Riesgos y mitigaciones | ✅ |

---

## 49. Trazabilidad a documentos fuente

| Sección | Documento(s) fuente |
| --- | --- |
| §5 Principios | 12-Architecture-Vision-and-Principles, 13-System-Architecture-Document |
| §10 Auth | 4-Business-Rules-Document (BR-AUTH-*), 10-Non-Functional-Requirements |
| §11 RBAC + Ownership | 5-User-Roles-Permissions-Matrix |
| §17 Validación | 14-Backend-Technical-Design (§14 DTOs) |
| §24 Events | 4-Business-Rules-Document (BR-EVENT-*), 6-Domain-Data-Model |
| §27 Vendor | 4-Business-Rules-Document (BR-VENDOR-*), 6-Domain-Data-Model |
| §30/§31 Quotes | 4-Business-Rules-Document (BR-QUOTE-*), 8-Use-Cases-Specification |
| §32 Booking Intents | 4-Business-Rules-Document (BR-BOOKING-*), 8.1 Addendum |
| §33 Reviews | 4-Business-Rules-Document (BR-REVIEW-*) |
| §35 AI | 7-AI-Features-Specification, BR-AI-* |
| §37 Admin | 5-User-Roles-Permissions-Matrix, BR-ADMIN-*, BR-EVENTTYPE-007 |
| §39 Seed | 11-Data-Seed-Strategy |
| §45 Frontend | 15-Frontend-Architecture-Design |
| §46 Límites MVP | 3-MVP-Scope-Definition, 2-Product-Owner-Decisions |

---

## 50. Conclusión

Este documento provee el **contrato REST oficial** de EventFlow para el MVP académico. Su adopción asegura:

1. Un **contrato único de comunicación** entre frontend Next.js y backend Express.
2. **Consistencia** en naming, errores, autorización y observabilidad.
3. **Trazabilidad** a reglas de negocio, casos de uso y entidades de dominio.
4. **Seguridad por defecto**: backend como fuente de verdad, sin tokens en `localStorage`, captcha, rate limit.
5. **IA controlada**: ninguna decisión autónoma; siempre confirmación humana.
6. **Listo para OpenAPI**: los DTOs y reglas aquí descritos se convierten a OpenAPI sin reinventar el contrato.
7. **MVP enfocado**: ninguna funcionalidad fuera del alcance aprobado.

Cualquier endpoint, DTO o regla añadida en el futuro debe pasar por **actualización de este documento** o por la generación auto-mantenida de OpenAPI a partir de los schemas Zod del backend.

> Próximos artefactos esperados después de este documento:
> - `/api/openapi.yaml` generado desde Zod.
> - Casos Supertest por endpoint.
> - Mocks MSW de frontend.
> - User stories y development tasks ordenadas por módulo.

---

**Fin del documento — `/docs/16-API-Design-Specification.md`**
