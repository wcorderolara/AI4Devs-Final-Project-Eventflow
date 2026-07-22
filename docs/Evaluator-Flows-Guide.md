# EventFlow — Guía de flujos para el evaluador

> **Audiencia:** revisor académico. **Objetivo:** validar que las capacidades MVP de EventFlow funcionan realmente en un entorno local.
>
> **Prerrequisito:** haber completado el [`Local Setup`](../readme.md#local-setup--cómo-levantar-el-entorno-para-revisión) del `readme.md` principal. Backend en `http://localhost:3000`, frontend en `http://localhost:3001`, base de datos Postgres corriendo, seed demo cargado.

Este documento propone un guion de pruebas paso a paso, organizado por rol, para recorrer los flujos principales de EventFlow. Cada flujo se puede ejecutar en orden o de forma independiente, y termina con un checklist de "qué esperar" para que el evaluador pueda marcar el flujo como validado.

---

## 0. Preparación — credenciales demo

Tras correr `npm run seed` en el backend, la base contiene los siguientes usuarios reales (contraseña compartida para los tres roles):

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@seed.eventflow.test` | `Demo1234!` |
| Organizer (6 disponibles) | `organizer0@seed.eventflow.test` … `organizer5@seed.eventflow.test` | `Demo1234!` |
| Vendor (12 disponibles) | `vendor0@seed.eventflow.test` … `vendor11@seed.eventflow.test` | `Demo1234!` |

- El captcha en modo `mock` (`CAPTCHA_PROVIDER=mock` en `backend/.env`) acepta el token literal `__test__`. El widget del frontend en modo mock lo envía automáticamente.
- Todas las entidades sembradas tienen la marca `is_seed=true`. El reset quirúrgico (endpoint admin) solo borra estas filas — nunca datos creados por el evaluador.
- El proveedor IA por defecto es `mock` (determinista, sin costo de red). Los outputs son estables y reproducibles.

**Cambio de idioma.** Cualquier usuario puede alternar entre los 4 locales soportados (`es-LATAM`, `es-ES`, `pt`, `en`) usando el switcher del topbar. La cookie `eventflow_locale` persiste la preferencia.

---

## 1. Flujo público — landing + directorio de vendors

**URL de entrada:** `http://localhost:3001/`

1. Abrir la landing pública. Ver la propuesta de valor, logo y navegación a "Directorio", "Iniciar sesión" y "Registrarse".
2. Cambiar el idioma con el switcher del topbar (probar `es-LATAM → en → pt → es-ES`). Toda la copy debe traducirse; los segmentos de URL permanecen en inglés (Doc 15 §17).
3. Ir a `/vendors` (directorio público). Ver el listado paginado de vendors publicados, con filtros por categoría y ciudad.
4. Abrir el perfil público de cualquier vendor (`/vendors/<slug>`). Verificar que es SEO-friendly (SSR + ISR, JSON-LD renderizado en `<head>`). Los datos del vendor, categorías, portfolio y reseñas verificadas se muestran; los datos de contacto directo no aparecen (política MVP — el contacto va por Quote Request).
5. Probar `/robots.txt` y `/sitemap.xml` — deben devolver contenido válido.

**Checklist ✅**

- [ ] Landing renderiza sin errores.
- [ ] Locale switcher cambia el idioma en cliente y persiste (recargar mantiene el locale elegido).
- [ ] Directorio `/vendors` pagina correctamente.
- [ ] Perfil de vendor es indexable (ver `<title>`, `<meta description>` y JSON-LD en el HTML fuente).

---

## 2. Flujo Auth — registro, login, logout, recuperación de contraseña

**URLs de entrada:** `/register`, `/login`, `/forgot-password`.

1. Ir a `/register`. Crear un usuario `organizer` propio (por ejemplo `evaluator@example.com` / `Evaluator1!`). El captcha mock se auto-completa. Al enviar, quedas logueado y redirigido a `/organizer`.
2. Cerrar sesión con el menú de usuario en el topbar → volver a `/login`.
3. Volver a iniciar sesión con las credenciales recién creadas. La cookie `eventflow_session` (HTTP-only) se emite y se ve solo en devtools → Application → Cookies (no en `document.cookie` porque es HttpOnly).
4. Cerrar sesión y probar el flujo de recuperación:
   - Ir a `/forgot-password`. Introducir el email registrado. La respuesta siempre es `202` genérica (anti-enumeración).
   - En modo demo, el enlace de reset se emite en los logs del backend. Buscar en la consola del backend el evento `password.reset.requested` → contiene la URL con token.
   - Abrir esa URL (por ejemplo `/reset-password?token=...`). Establecer nueva contraseña → redirige a `/login` para autenticarse con la nueva credencial.
5. Probar los negativos:
   - Login con contraseña incorrecta 3 veces seguidas → el frontend empieza a exigir captcha visible (`AUTH_LOGIN_CAPTCHA_THRESHOLD=3`).
   - Superar 10 intentos en 10 minutos → `429 RATE_LIMIT_EXCEEDED` con header `Retry-After` (US-110).

**Checklist ✅**

- [ ] Registro crea usuario y auto-loguea.
- [ ] Login/logout emite y limpia `eventflow_session`.
- [ ] Forgot password responde `202` sin filtrar existencia del email.
- [ ] Reset con token válido cambia la contraseña; token expirado/consumido → `401` genérico.
- [ ] Rate limit `429` aplica en `/auth/login` tras el umbral.

---

## 3. Flujo Organizer — evento end-to-end (plan → checklist → presupuesto → cotizaciones → booking)

**Usuario:** `organizer0@seed.eventflow.test` / `Demo1234!` — o el usuario recién creado en §2.

### 3.1 Crear evento

1. Login como organizer → landing `/organizer` (dashboard con eventos propios).
2. `Nuevo evento` (`/organizer/events/new`). Rellenar: nombre, tipo de evento (dropdown de EventType público), fecha, ubicación, moneda (inmutable tras crear), idioma del evento (heredado del usuario, cambiable solo en creación).
3. Guardar → redirige al detalle `/organizer/events/<eventId>`. Estado inicial: `draft`.
4. `Activar` el evento → estado `active`. Solo desde `draft`; volver a activar es `422 BUSINESS_RULE_VIOLATION`.

### 3.2 Generar plan e ítems con IA (HITL)

Todas las capacidades IA aplican **human-in-the-loop**: la IA genera → el organizer revisa → aplica o descarta.

1. Desde el detalle del evento → `IA > Plan de evento` (`/organizer/events/<eventId>/ai/plan`). Generar → `MockAIProvider` responde en ~500ms con un plan estructurado. Estado `pending`.
2. `Aplicar` → el plan queda `accepted` (marca temporal MVP; la materialización de dominio por tipo llega en features específicas).
3. `IA > Checklist` → generar checklist. Aplicar los ítems que interesen; ver que se convierten en tareas visibles en `/organizer/events/<eventId>/tasks`.
4. `IA > Presupuesto sugerido` → propone `BudgetItem`s. Aplicar → aparecen en `/organizer/events/<eventId>/budget` con `committed=0`.
5. `IA > Categorías de vendors sugeridas` → sugiere las 3–5 categorías más relevantes para el tipo de evento.
6. Probar el error controlado: en cualquier generación IA, mantener el campo `input` con la palabra clave `__simulate:timeout` → el backend responde `503 AI_PROVIDER_TIMEOUT` sin crashear.

### 3.3 Cotizaciones (Quote Requests)

1. Ir a `/organizer/vendors` (directorio autenticado) → filtrar vendors por categoría.
2. Desde el detalle del evento → `Nueva solicitud de cotización` (`/organizer/events/<eventId>/quotes/new`). Elegir 2–3 vendors + categoría + brief. Enviar.
3. Verificar el límite: intentar crear una **6ta** QR activa en la misma categoría/evento → `409 MAX_QUOTE_REQUESTS_EXCEEDED` (BR-QUOTE-009).
4. Volver al detalle del evento — las QR aparecen como `sent`.

### 3.4 Ver Quote recibida y comparar

*(Este paso requiere que el vendor responda — ver §4.2. Puedes hacerlo en pestañas paralelas.)*

1. Cuando el vendor envía la Quote, refrescar el detalle de la QR — el estado pasa a `quoted`.
2. `/organizer/events/<eventId>/quotes/compare` → comparador lado a lado de las Quotes recibidas.
3. Marcar una Quote como **preferred** (`Quote.is_preferred=true`).
4. `Aceptar` una Quote → estado `accepted`. Las demás Quotes activas se `rejected` automáticamente.
5. `Crear BookingIntent` desde la Quote aceptada. Rellenar disclaimer bilateral (BookingDisclaimer). Estado `pending_confirmation`.

### 3.5 Confirmar / cancelar BookingIntent

- Confirmar BookingIntent → es rol **vendor** (ver §4.3). Como organizer solo lo creas.
- Cancelar BookingIntent → el organizer puede cancelar; se exige `cancellationReason` no vacío.

### 3.6 Review verificado

1. Con un BookingIntent `confirmed` (o el evento en estado `completed`), aparecerá la opción de dejar review verificado (`/organizer/events/<eventId>` sección Reviews).
2. Rating 1–5, comentario opcional. El review se denormaliza atómicamente en el `VendorProfile` (rating promedio + `reviewCount`).

**Checklist ✅**

- [ ] Evento creado en `draft`, activado a `active`.
- [ ] Al menos 3 generaciones IA con status `pending` → 1 `accepted` y 1 `discarded`.
- [ ] BudgetItems aplicados y visibles.
- [ ] QR enviada a ≥ 2 vendors; el 6to intento en la misma categoría rebota con `409`.
- [ ] Quote comparada, marcada preferred y aceptada; las otras se rechazan.
- [ ] BookingIntent creado con disclaimer y confirmado por el vendor (§4.3).
- [ ] Review verificado impacta el rating promedio en el perfil público del vendor.

---

## 4. Flujo Vendor — onboarding, portafolio, cotizar y confirmar booking

**Usuario:** `vendor0@seed.eventflow.test` / `Demo1234!` — o un usuario `vendor` recién registrado.

### 4.1 Onboarding y perfil

1. Login como vendor → si no hay perfil aún, redirige a `/vendor/onboarding`. Crear el `VendorProfile`: business name, bio, contacto, ciudad.
2. Al guardar → estado `pending_moderation`. El admin debe aprobarlo (§5.1) para que aparezca en el directorio público. Los perfiles seed ya están en `active`.
3. Editar el perfil (`/vendor/profile/edit`): cambios visibles inmediatamente en el directorio autenticado; los cambios de datos críticos (business name) requieren re-moderación.
4. Cambiar categorías (`/vendor/profile/edit/categories`): máximo 5 categorías acumuladas activas (US-042).

### 4.2 Portafolio y servicios

1. `/vendor/portfolio` → subir hasta 12 imágenes por trabajo (`Attachment`, formato ≤ 5 MB). Ordenar con drag.
2. `/vendor/services` → CRUD de paquetes (`VendorService`): nombre, descripción, precio base, moneda, categoría. Activar/desactivar.
3. `IA > Generar bio` (`/vendor/profile` → botón AI bio). El `MockAIProvider` propone un texto en el idioma del vendor; aplicar o descartar (HITL).

### 4.3 Responder cotizaciones

1. `/vendor/quotes` → lista de QuoteRequests asignadas al vendor. Estados: `sent | viewed | quoted | expired | cancelled`.
2. Abrir una QR `sent` → automáticamente pasa a `viewed`.
3. `Responder` (`/vendor/quotes/<id>/respond`) → completar `amount`, `currency` (debe coincidir con la del evento), `breakdown` JSON opcional, `conditions`, `validUntil`. Al enviar (`send`) el estado pasa a `sent` y `validUntil` se fija en `createdAt + 15 días` si no se especificó.
4. Editar la Quote solo en estado `draft`.
5. **Reject** una QR → transacción atómica + notificación al organizer.
6. **Confirmar BookingIntent** cuando el organizer lo crea desde una Quote aceptada → estado del BookingIntent pasa a `confirmed`. El vendor también puede cancelar bilateralmente.

### 4.4 Ver reviews recibidos

1. `/vendor/reviews` → lista de reviews verificados (anónimos según política MVP: nombre del organizer redactado, texto público).
2. El rating promedio se actualiza en el perfil público.

### 4.5 Jobs automáticos observables

- El `ExpireQuoteRequestsJob` corre a las 01:00 UTC diario y expira QRs con `sent_at < now - 30 días`. En local se puede forzar reduciendo `QR_EXPIRATION_DAYS=0` en `backend/.env` y reiniciando.
- El `ExpireQuotesJob` corre en la misma ventana y expira Quotes `sent` con `validUntil < today`.

**Checklist ✅**

- [ ] Perfil creado (o editado) y visible en `/vendors` público.
- [ ] Portafolio con al menos 3 imágenes; soft delete recupera el orden.
- [ ] Al menos 1 servicio activo publicado.
- [ ] AI bio generada + aplicada.
- [ ] QR respondida con Quote; una segunda rechazada.
- [ ] BookingIntent confirmado bilateralmente.
- [ ] Reviews recibidos visibles con rating actualizado.

---

## 5. Flujo Admin — moderación, catálogos, métricas y auditoría

**Usuario:** `admin@seed.eventflow.test` / `Demo1234!`.

### 5.1 Moderación de VendorProfiles

1. Login como admin → `/admin` (dashboard).
2. `/admin/vendors` → lista de perfiles con filtros por estado. Perfiles `pending_moderation` en la parte superior.
3. Abrir uno → **Aprobar** o **Rechazar** con motivo (requerido en rechazo). La acción se registra en `AdminAction` (auditoría).
4. Aprobar un vendor recién creado (por ejemplo el que hiciste en §4.1) → verificar que ahora aparece en `/vendors` público.

### 5.2 Moderación de Reviews

1. `/admin/reviews` → panel global de todos los reviews. El admin ve el nombre del autor (los usuarios finales lo ven anónimo).
2. Ocultar un review con motivo → el review se marca `hidden`, deja de contar en el rating agregado y se registra un `AdminAction`.

### 5.3 Catálogos maestros

1. `/admin/categories` → CRUD `ServiceCategory` con jerarquía de 2 niveles. Al soft-deletar una categoría que tiene VendorProfiles activos → bloqueo con mensaje (guard EXISTS).
2. `/admin/event-types` → CRUD `EventType`. Al soft-deletar un tipo con eventos vinculados → bloqueo similar.
3. Todos los cambios se propagan en tiempo real al frontend público (i18n multi-locale por `code`).

### 5.4 Vista read-only de eventos

1. `/admin/events` → lista paginada de todos los eventos con conteos por estado.
2. `/admin/events/<id>` → detalle read-only (no puede editar). Muestra el organizer, QRs, Quotes, BookingIntents y Reviews vinculados.

### 5.5 Métricas operativas

1. `/admin/metrics` → dashboard con métricas MVP:
   - Usuarios activos por rol.
   - Eventos por estado.
   - QRs / Quotes / BookingIntents por estado.
   - Generaciones IA por tipo, con % `accepted / discarded / pending`.
   - Latencia mediana y P95 del `LLMProvider`.
2. Los valores refrescan al navegar entre pestañas.

### 5.6 Log de acciones administrativas

1. `/admin/admin-actions` → tabla de `AdminAction` con quién, cuándo, qué recurso, motivo y correlationId.
2. Filtrar por tipo (`vendor_profile.approved`, `review.hidden`, `service_category.deleted`, etc.).

### 5.7 Reset del seed demo

1. `/admin/seed` → botón `Reset demo`. Solo funciona si `SEED_DEMO_ENABLED=true` en el backend. La acción borra **solo** filas con `is_seed=true` y vuelve a ejecutar el seed.
2. Datos creados por el evaluador (no seed) se preservan.

**Checklist ✅**

- [ ] Perfil de vendor `pending_moderation` aprobado y visible en directorio público.
- [ ] Review ocultado con motivo → deja de aparecer y afecta el rating.
- [ ] Categoría creada, editada y su soft-delete bloqueado por vendors activos.
- [ ] EventType creado, editado y su soft-delete bloqueado por eventos activos.
- [ ] Dashboard de métricas muestra valores coherentes con las operaciones anteriores.
- [ ] `AdminAction` registra todas las moderaciones ejecutadas.
- [ ] Reset del seed regenera datos demo sin borrar creados por el evaluador.

---

## 6. Flujos negativos rápidos — evidencia de guardrails

Recomendados para demostrar que las políticas de seguridad y negocio están enforced.

| Escenario | Cómo probarlo | Resultado esperado |
|---|---|---|
| Acceso anónimo a recurso privado | Curl `curl -i http://localhost:3000/api/v1/events` sin cookie | `401 AUTHENTICATION_REQUIRED` |
| Rol equivocado | Login como vendor → intentar abrir `/organizer/events/new` | Redirección UX + backend `403` en API |
| Ownership cruzado | Login como `organizer0` → intentar abrir `/organizer/events/<id de organizer1>` | `404 RESOURCE_NOT_FOUND` (masked) |
| Rate limit auth | 11 intentos de login en < 10 min | `429 RATE_LIMIT_EXCEEDED` + `Retry-After` |
| IA sin captcha en flujo público | Curl a `/api/v1/auth/register` sin `captchaToken` | `400 CAPTCHA_REQUIRED` |
| Currency inmutable | PATCH `/api/v1/events/<id>` con `currencyCode` distinto | `409 CURRENCY_IMMUTABLE` |
| Quote expirado en booking | Aceptar una Quote con `validUntil < today` | `410 QUOTE_EXPIRED` |
| Reset demo en producción | `NODE_ENV=production` + `SEED_DEMO_ENABLED=true` → boot | Backend falla en fail-fast |
| OpenAPI drift | Modificar un DTO Zod sin regenerar snapshot → `npm run openapi:check` | `Exit ≠ 0` con diff |
| Migration drift | Modificar `schema.prisma` sin generar migración → `npm run db:migrate:diff` | Exit 2 con reporte de drift |

---

## 7. Verificación no-visual (suite de pruebas)

Además de los flujos UI, el evaluador puede correr la suite completa para evidencia numérica:

```bash
# Backend
cd backend
npm test                     # unit + integration
npm run openapi:check        # snapshot OpenAPI actualizado
npm run db:migrate:status    # migraciones aplicadas

# Frontend
cd ../web
npm run lint
npm run typecheck
npm test                     # Vitest unit + component
npm run test:e2e             # Playwright E2E chromium
```

Los reportes de cobertura quedan en `backend/coverage/` y `web/coverage/`. Los E2E capturan screenshots + video en `web/test-results/` cuando fallan (útil para el evaluador).

---

## 8. Trazabilidad de cada flujo a la documentación

Cada flujo de esta guía se apoya en artefactos formales del repositorio. Referencias rápidas:

| Flujo | User Stories | Documentos base |
|---|---|---|
| §1 Público | US-045, US-046 | `docs/9`, `docs/15` §19, `docs/16` §Vendors |
| §2 Auth | US-001..005, US-108, US-109 | `docs/19` §Auth, `docs/16` §Auth |
| §3 Organizer | US-006..049, US-057..067 | `docs/8` UC-EVT-*, `docs/4` BR-EVENT-*, `docs/7` §AI, `docs/16` §Events/Quotes |
| §4 Vendor | US-040..058, US-060..067 | `docs/8` UC-VND-*, `docs/4` BR-VENDOR-*, `docs/16` §Vendors/Quotes/Booking |
| §5 Admin | US-047, US-074..080 | `docs/8` UC-ADM-*, `docs/5`, `docs/16` §Admin |
| §6 Negativos | US-091, US-108..112 | `docs/19` completo, `docs/22` ADR-SEC-*, ADR-API-* |

Los execution records (traza de cada implementación) viven bajo `management/workflows/development-execution/<PRIORITY>/<BACKLOG_ID>/US-<id>-execution.md`.

---

> **Sugerencia final para el evaluador:** ejecuta §2 (Auth) y §3 (Organizer) primero — cubren el 70% del valor MVP. §4 y §5 se pueden hacer en pestañas paralelas si quieres ver el flujo bilateral organizer↔vendor. §6 y §7 son opcionales pero rápidos y demuestran que las salvaguardas están enforced, no solo documentadas.
