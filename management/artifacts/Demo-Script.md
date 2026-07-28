# 🎬 Guion de Demo Guiada — EventFlow (10–15 min)

> **User Story:** US-142 (PB-P3-003) · **Epic:** EPIC-DEMO-001 — Demo Readiness
> **Versión:** 1.0 · **Última actualización:** 2026-07-28
> **Dependencia:** PB-P0-014 (Seed Script Idempotente + Datos Demo) — el guion **consume** el seed, no lo crea.
> **Ventana objetivo:** 10–15 minutos (NFR-DEMO-006) · **Trazabilidad:** Doc 3 §14.4, UC-DEMO-001, NFR-AI-008, NFR-PERF-005.

Guion narrativo paso a paso para la demo guiada del MVP de EventFlow ante la evaluación académica
(Trabajo Final de Máster). Cubre los **5 flujos clave** —organizador, cotización, proveedor, admin e
IA— de forma **determinista y reproducible** sobre los datos seed. Cualquier presentador debe poder
ejecutar el recorrido end-to-end sin improvisación.

> ⚠️ **Nota de datos seed (importante).** Las credenciales reales del seed idempotente
> (`backend/src/modules/seed-demo/…`) son `*@seed.eventflow.test` con contraseña **`Demo1234!`**
> (bcrypt cost=12, pública e intencional solo para entornos demo). La User Story / Tech Spec citaban
> `*@eventflow.demo`; este guion usa las **credenciales reales del código** para garantizar
> reproducibilidad (VR-04). Los IDs `SEED-USER-001…`, `SEED-DEMO-001…` son etiquetas **conceptuales**
> del Doc 11; entre paréntesis se mapean a la identidad real.

---

## 0. Pre-flight (antes de iniciar — no cuenta en la ventana de 10–15 min)

Ejecutar **antes** de comenzar la demo, con tiempo de sobra (EC-02, DR-01 pre-flight):

1. **Cargar / verificar el seed reproducible** (PB-P0-014). Es idempotente (N ejecuciones no duplican):
   ```bash
   # Backend (raíz backend/): siembra determinista de datos demo LATAM.
   npm run seed
   ```
   Alternativa desde el panel admin (US-140, solo entorno Demo con `SEED_DEMO_ENABLED=true`):
   `/admin/seed` → botón **"Resetear datos demo"** (escribir `RESET`) → repobla + reporte.
2. **Confirmar las cuentas seed** (contraseña común **`Demo1234!`**):
   | Rol | Email real | Nombre | Notas |
   | --- | --- | --- | --- |
   | Admin (SEED-USER-001) | `admin@seed.eventflow.test` | Admin Demo | rol `admin`, `es_LATAM` |
   | Organizador (SEED-USER-002) | `organizer0@seed.eventflow.test` | María Fernanda López | rol `organizer` |
   | Proveedor/vendor (SEED-USER-003) | `vendor0@seed.eventflow.test` | Contacto Banquetes El Quetzal | rol `vendor`, perfil `approved`, `categoryChangeCount=4` (demo del límite) |
3. **Confirmar el toggle de IA** (variables de entorno del backend):
   - `LLM_PROVIDER=openai` (IA real) **o** `LLM_PROVIDER=mock` (determinista) · `AI_DEMO_MODE=true` en demo.
   - Tener listo el fallback: si `OpenAIProvider` falla/timeout → cambiar a `LLM_PROVIDER=mock` (§Contingencia).
4. **Abrir dos sesiones/navegadores** (o ventanas incógnito) para alternar rápido entre roles
   (organizador ↔ vendor ↔ admin) sin re-login constante.
5. **Verificar salud del backend:** `GET /health` → `200`; `GET /health/ready` → `200` (DB + AI OK).

> Si el seed no está cargado o luce vacío/desactualizado → **detener** y re-ejecutar `npm run seed`
> antes de comenzar (RISK-SEED-001).

---

## 1. Presupuesto de tiempo (AC-03 / VR-03)

| # | Flujo | Escenario seed | Timing | Ruta principal |
| - | ----- | -------------- | -----: | -------------- |
| 1 | Organizador (crea evento con IA) | SEED-DEMO-001 | **3.5 min** | `/organizer/events/new` |
| 2 | Cotización (solicitar / comparar / aceptar) | SEED-DEMO-002 | **3.0 min** | `/organizer/events/[id]/quotes/*` |
| 3 | Proveedor / vendor (responde cotización) | SEED-DEMO-003 | **2.0 min** | `/vendor/quotes/[id]/respond` |
| 4 | Admin (gobierna la plataforma) | SEED-DEMO-004 | **2.5 min** | `/admin/*` |
| 5 | IA (determinista / multi-idioma) | SEED-DEMO-005 | **2.0 min** | `/organizer/events/[id]/ai/*` |
| — | **Total** | — | **13.0 min** | dentro de 10–15 ✅ |

> Holgura: 13 min deja ~2 min de margen para preguntas/transiciones sin exceder 15 min. Si en el
> ensayo cronometrado (§Bitácora) el total sube de 15, recortar primero el Flujo 4 (admin) y el
> Flujo 5 (multi-idioma), que son los más comprimibles.

---

## 2. Flujo 1 — Organizador: crear evento con IA (SEED-DEMO-001) · 3.5 min

**Actor:** organizador `organizer0@seed.eventflow.test` (María Fernanda López) · **Datos:** SEED-USER-002, SEED-EVENTTYPE-001, SEED-CATEGORY-001, SEED-AI-001/002 (AI-001..004).

| Paso | Acción | Ruta / UI | Resultado esperado |
| ---: | ------ | --------- | ------------------ |
| 1.1 | Login como organizador | `/login` → `organizer0@seed.eventflow.test` / `Demo1234!` | Redirección a `/organizer` (dashboard con eventos seed) |
| 1.2 | Crear evento nuevo | `/organizer/events/new` | Formulario: tipo de evento, fecha, invitados, ubicación, presupuesto |
| 1.3 | Generar **plan con IA** (AI-001) | `/organizer/events/[id]/ai/plan` | Plan sugerido; **human-in-the-loop**: el organizador revisa y **acepta** |
| 1.4 | Generar **checklist con IA** (AI-002) | `/organizer/events/[id]/ai/checklist` | Tareas propuestas; se confirman → aparecen en `/tasks` (incluye "Confirmar proveedores") |
| 1.5 | Ver **presupuesto sugerido** (AI-003) | `/organizer/events/[id]/ai/budget` | Desglose de presupuesto por categoría (moneda GTQ) |
| 1.6 | Revisar el evento | `/organizer/events/[id]` | Evento pasa de `draft` → `active`; muestra plan aceptado, checklist y presupuesto |

**Puntos a destacar en vivo:** la IA es **asistiva, no autónoma** (human-in-the-loop: el organizador
aprueba); los datos son deterministas (mismo resultado en cada ensayo con `MockAIProvider`).

---

## 3. Flujo 2 — Cotización: solicitar, comparar y aceptar (SEED-DEMO-002) · 3.0 min

**Actor:** mismo organizador · **Datos:** SEED-EVENT-001 (`active`), SEED-VENDOR-001/002 (aprobados), SEED-QUOTE-001 (`responded`), SEED-AI-001 (AI-005/006), SEED-BOOKING-001 (`confirmed_intent`).

| Paso | Acción | Ruta / UI | Resultado esperado |
| ---: | ------ | --------- | ------------------ |
| 2.1 | Abrir un evento `active` | `/organizer/events` → seleccionar uno `active` (hay 5 en el seed) | Detalle del evento |
| 2.2 | Solicitar cotización | `/organizer/events/[id]/quotes/new` | Se crea un `QuoteRequest` a proveedores aprobados |
| 2.3 | (Opcional) **Quote brief con IA** (AI-005) | `/organizer/events/[id]/ai/quote-brief` | Resumen del brief generado para el proveedor |
| 2.4 | **Comparar cotizaciones** (AI-006) | `/organizer/events/[id]/quotes/compare` | Comparación lado a lado; resumen IA; el organizador marca la **preferida** |
| 2.5 | Aceptar y confirmar intención de reserva | acción "Aceptar" en la comparación | `BookingIntent` en `confirmed_intent` (SEED-BOOKING-001) |

**Puntos a destacar:** la cotización usa datos seed en `responded`, así la comparación tiene contenido
real sin esperar a un proveedor en vivo; el `BookingIntent` es la conversión clave del MVP.

---

## 4. Flujo 3 — Proveedor / vendor: responder una cotización (SEED-DEMO-003) · 2.0 min

**Actor:** vendor `vendor0@seed.eventflow.test` (Banquetes El Quetzal, `approved`) · **Datos:** SEED-USER-003, SEED-VENDOR-001, SEED-QUOTE-001 (`sent`/`viewed`), SEED-NOTIF-001.

| Paso | Acción | Ruta / UI | Resultado esperado |
| ---: | ------ | --------- | ------------------ |
| 4.1 | Cambiar a la sesión del vendor (2º navegador) | `/login` → `vendor0@seed.eventflow.test` / `Demo1234!` | Dashboard `/vendor` |
| 4.2 | Ver **notificación in-app** | `/vendor/notifications` | Notificación de nueva solicitud de cotización (SEED-NOTIF-001) |
| 4.3 | Abrir la solicitud | `/vendor/quotes` → `/vendor/quotes/[id]` | Detalle del `QuoteRequest` (marca como `viewed`) |
| 4.4 | **Enviar la cotización** | `/vendor/quotes/[id]/respond` | Se crea la `Quote`; el organizador la verá en su comparación (cierra el círculo con el Flujo 2) |

**Puntos a destacar:** ciclo bidireccional organizador ↔ proveedor; notificaciones in-app; el vendor
`Banquetes El Quetzal` tiene `categoryChangeCount=4` sembrado para demostrar el bloqueo `409` del
límite de cambio de categoría (opcional, si sobra tiempo, en `/vendor/profile/edit/categories`).

---

## 5. Flujo 4 — Admin: gobernar la plataforma (SEED-DEMO-004) · 2.5 min

**Actor:** `admin@seed.eventflow.test` (Admin Demo) · **Datos:** SEED-USER-001, SEED-VENDOR-001 (`pending`/`rejected`), SEED-REVIEW-001 (con caso a moderar), SEED-EVENTTYPE-001, SEED-CATEGORY-001, SEED-ADMIN-001.

| Paso | Acción | Ruta / UI | Resultado esperado |
| ---: | ------ | --------- | ------------------ |
| 5.1 | Login como admin (3ª sesión) | `/login` → `admin@seed.eventflow.test` / `Demo1234!` | Dashboard `/admin` |
| 5.2 | **Aprobar / revisar proveedores** | `/admin/vendors` | Aprobar un vendor `pending` (hay un `hidden`/pendiente sembrado) |
| 5.3 | **Moderar una reseña** | `/admin/reviews` | Ocultar/eliminar la reseña con caso a moderar (SEED-REVIEW-001) |
| 5.4 | **Gestionar catálogo** | `/admin/event-types` · `/admin/categories` | Alta/edición de tipo de evento o categoría |
| 5.5 | **Consultar métricas y bitácora** | `/admin/metrics` · `/admin/admin-actions` | KPIs de la plataforma + registro de `AdminAction` (auditoría de las acciones 5.2–5.4) |

**Puntos a destacar:** RBAC (solo `admin` accede); **toda acción admin queda auditada** en
`AdminAction` con `correlationId` (observabilidad NFR-OBS-001); reset del entorno demo disponible en
`/admin/seed` (US-140) para reiniciar entre ensayos.

---

## 6. Flujo 5 — IA determinista y multi-idioma (SEED-DEMO-005) · 2.0 min

**Datos:** SEED-I18N-001/002, SEED-EVENT-001 (GTQ/USD/EUR; es-LATAM/es-ES/pt/en), SEED-AI-001 (respuestas IA por idioma).

| Paso | Acción | Ruta / UI | Resultado esperado |
| ---: | ------ | --------- | ------------------ |
| 6.1 | Mostrar el **toggle de proveedor IA** | Config backend: `LLM_PROVIDER=openai` ↔ `mock` (`AI_DEMO_MODE=true`) | Se explica que la demo puede usar IA real o mock **determinista** (NFR-AI-008) |
| 6.2 | Regenerar un artefacto IA con `mock` | `/organizer/events/[id]/ai/plan` (con `LLM_PROVIDER=mock`) | Misma salida reproducible en cada ejecución (clave para evaluación académica) |
| 6.3 | **Cambiar de idioma** | Selector de idioma (header) → `es-LATAM` / `es-ES` / `pt` / `en` | La UI cambia de idioma; las respuestas IA se muestran en el idioma del evento |
| 6.4 | Mostrar **moneda por evento** | `/organizer/events/[id]` con distintos eventos seed | Eventos muestran GTQ / USD / EUR según configuración |

**Puntos a destacar:** determinismo (mock) → la evaluación es repetible; abstracción de proveedor
(ADR-AI-001) → intercambiable sin cambiar el producto; i18n en 4 locales.

> El "flujo IA" también se demuestra **dentro** del Flujo 1 (plan/checklist). Este bloque enfatiza el
> **determinismo** (toggle mock) y el **multi-idioma**, que son el diferenciador de reproducibilidad.

---

## 7. Contingencia (EC-01 / EC-02) — qué hacer si algo falla en vivo

| Situación | Acción de contingencia |
| --------- | ---------------------- |
| **`OpenAIProvider` falla o excede timeout** (flujo IA) | Cambiar a `LLM_PROVIDER=mock` (+ `AI_DEMO_MODE=true`), reiniciar el backend y regenerar el artefacto IA. El `MockAIProvider` es **determinista** (NFR-AI-008) y no depende de red. |
| **Un flujo específico falla / dato inesperado** | Continuar con el **orden alternativo**: si falla Cotización, saltar a Admin (Flujo 4) o IA (Flujo 5) y retomar Cotización al final. Ningún flujo bloquea a los demás. |
| **El seed luce vacío / inconsistente** | Recargar el seed: `npm run seed` (idempotente) **o** panel `/admin/seed` → "Resetear datos demo". No altera datos no-seed (`is_seed=false`). |
| **Sesión caída / 401** | Re-login con las credenciales seed (`Demo1234!`). Tener las 3 sesiones pre-abiertas (pre-flight #4) reduce este riesgo. |
| **Backend no responde** | Verificar `GET /health` y `GET /health/ready`; revisar logs (CloudWatch, US-141). |

**Orden alternativo recomendado si hay poco tiempo:** Organizador (1) → Cotización (2) → Admin (4) →
IA (5) → Proveedor (3, opcional). Prioriza mostrar la conversión (BookingIntent) y el gobierno admin.

---

## 8. Bitácora de ensayo (dry-run) — AC-05 / DR-01 / DR-02

> Registrar aquí la evidencia de cada ensayo cronometrado. **Pendiente de completar durante el ensayo
> en vivo** sobre un entorno con el seed cargado (requiere backend + frontend + BD corriendo; no se
> ejecuta en el pipeline). No se registran timings inventados: las filas se llenan al ensayar.

### DR-01 — Recorrido completo cronometrado

| Fecha | Presentador | Entorno | F1 Org | F2 Cotiz | F3 Vendor | F4 Admin | F5 IA | **Total** | ¿10–15 min? | Resultado / Notas |
| ----- | ----------- | ------- | -----: | -------: | --------: | -------: | ----: | --------: | ----------- | ----------------- |
| _(pendiente)_ | | | | | | | | | | Ejecutar tras cargar seed |

### DR-02 — Fallback de contingencia (toggle `MockAIProvider`)

| Fecha | Presentador | Escenario simulado | ¿Demo continuó sin bloqueo? | Resultado / Notas |
| ----- | ----------- | ------------------ | --------------------------- | ----------------- |
| _(pendiente)_ | | Fallo de `OpenAIProvider` → `LLM_PROVIDER=mock` | | Ejecutar tras DR-01 |

**Criterio de cierre (DoD):** DR-01 con total dentro de 10–15 min y DR-02 confirmando que el fallback
determinista permite continuar. Si DR-01 excede 15 min, reajustar el §1 Presupuesto de tiempo y
reensayar.

---

## 9. Referencias

- **Datos seed reales:** `backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts`,
  `backend/src/modules/seed-demo/infrastructure/data/latam-data.ts` (nombres LATAM, negocios vendor).
- **Reset del entorno demo:** US-140 (`/admin/seed`) · seed idempotente US-085/US-086 (PB-P0-014).
- **Toggle IA:** `backend/src/config/env.ts` (`LLM_PROVIDER`, `AI_DEMO_MODE`) · NFR-AI-008 · ADR-AI-001.
- **Criterio de demo:** Doc 3 §14.4 · UC-DEMO-001 (Doc 8) · NFR-DEMO-006 (Doc 10) · Doc 11 §12/§27.
- **Guardrail de alcance:** este guion es documentación; la automatización E2E es US-128 (PB-P2-016).
