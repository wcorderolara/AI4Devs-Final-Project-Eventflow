# 🔒 Mapeo de Demo Readiness — Garantía verificada del vendor demo principal

> **User Story:** US-145 (PB-P3-006) · **Epic:** EPIC-DEMO-001 / EPIC-SEED-001 — Demo Readiness
> **Versión:** 1.0 · **Última actualización:** 2026-07-28
> **Dependencia dura:** PB-P0-014 (US-085 runner · US-086 reset · US-087 evento · US-088 fixtures) — US-145 **verifica**, no crea.
> **Trazabilidad:** AC-04 / TS-03 · BR-SEED-006/007 · BR-REVIEW-001/003 · NFR-DEMO-006 · NFR-TEST-002/004 · ADR-TEST-001.

Este documento es la **referencia estable** que mapea los dos registros demo-críticos garantizados
por la guardia de demo readiness (US-145) —un `BookingIntent.confirmed_intent` y una reseña
verificada del **vendor demo principal**— a las etiquetas conceptuales del seed
(**SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003**) y al **guion de demo (US-142)**.

Es enlazable desde el material de demo readiness:
[Demo-Script.md](Demo-Script.md) (US-142 / PB-P3-003) y
[Pre-Demo-Checklist.md](Pre-Demo-Checklist.md) (US-143 / PB-P3-004).

---

## 1. Qué garantiza US-145 (y qué no)

US-145 aporta una **verificación automatizada post-seed** (suite de integración Vitest) que **falla
en rojo, sin falso verde** si el vendor demo principal no queda ligado a las dos invariantes
demo-críticas. No reimplementa fixtures (propiedad de US-088), no crea UI/endpoints/schema.

| Invariante | Regla | Business Rule |
|---|---|---|
| VR-01 | ≥1 `BookingIntent` `status='confirmed_intent'`, `is_seed=true`, `is_simulated=true` del vendor demo principal | BR-SEED-006 |
| VR-02 | ≥1 `Review` `status='published'`, `is_seed=true`, `rating ∈ 1..5`, `booking_intent_id` → un `confirmed_intent` del mismo vendor | BR-REVIEW-001 / BR-REVIEW-003 / BR-SEED-007 |
| VR-03 | Verde **sólo** si VR-01 **y** VR-02 se cumplen; fallo ⇒ exit code ≠ 0 con mensaje accionable | AC-03 / EC-01 |

---

## 2. Referencia estable — registros garantizados

> Los IDs `SEED-*` son **etiquetas conceptuales** del [Doc 11](../../docs/11-Data-Seed-Strategy.md).
> El "ancla real" es la identidad determinista del seed idempotente (sin UUID hardcodeado): el
> **primer vendor `approved`**, resuelto por su email de seed. Ver
> [seed-key.ts](../../backend/src/modules/seed-demo/domain/seed-key.ts) y
> [seed-demo-data.use-case.ts](../../backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts).

| Concepto | Etiqueta conceptual (Doc 11) | Ancla real (determinista) | Cómo lo resuelve la verificación |
|---|---|---|---|
| Vendor demo principal | **SEED-USER-003** / SEED-VENDOR-001 (`approved`) | `VendorProfile` de `user.email = vendor0@seed.eventflow.test` (`seedEmail('vendor', 0)`) | `resolveDemoVendorProfileId()` — `vendorProfile.findFirst({ isSeed, user.email = ancla })` |
| Booking confirmado | **SEED-BOOKING-001** (§21 Doc 11) | `BookingIntent` `confirmed_intent` del quote índice 0 (evento demo, `is_seed` + `is_simulated`) | `checkDemoReadiness().confirmedIntentCount ≥ 1` |
| Reseña verificada | **SEED-REVIEW-001** (§22 Doc 11) | `Review` `published` ligada a ese `confirmed_intent` (ratings 1..5) | `checkDemoReadiness().verifiedReviewCount ≥ 1` |
| Evento ancla | **SEED-EVENT-001** | Evento demo del seed (US-087) | Contexto (no verificado directamente por US-145) |

**Determinismo del pinning:** en `seedBookingsAndReviews`, el `confirmed_intent` del quote índice 0
pertenece a `vendors[0]` (el vendor demo principal), y las reseñas `published` (i = 0, 5, 10, 15) se
asocian a ese booking. Por construcción, el vendor demo principal **siempre** satisface VR-01 y VR-02
tras `npm run seed`. La guardia de US-145 lo **evidencia** de forma ejecutable.

---

## 3. Artefactos de código

| Artefacto | Ruta |
|---|---|
| Dominio puro (predicado + aserción sin falso verde) | [demo-readiness.ts](../../backend/src/modules/seed-demo/domain/demo-readiness.ts) |
| Lectura post-seed (solo lectura) | [check-demo-readiness.ts](../../backend/src/modules/seed-demo/application/check-demo-readiness.ts) |
| Suite de verificación (positivos + negativos) | [us145-demo-readiness.integration.spec.ts](../../backend/tests/integration/us145-demo-readiness.integration.spec.ts) |
| Script npm | `npm run test:demo-readiness` |
| Quality gate CI (post-seed) | Job `demo-readiness-gate` en [pr.yml](../../.github/workflows/pr.yml) |

**Mensajes de fallo estables (logs/CI):** `demo_readiness_missing_confirmed_intent` ·
`demo_readiness_missing_verified_review` — identifican la condición ausente y sugieren re-ejecutar
el seed (US-085) o revisar el pinning del vendor demo (US-088).

---

## 4. Mapeo al guion de demo (US-142 / PB-P3-003)

El [guion de demo](Demo-Script.md) evidencia el **cierre del flujo** (booking confirmado + reseña
verificada visibles en el perfil del vendor demo principal) dentro de la ventana de 10–15 min
(NFR-DEMO-006). US-145 es la **precondición ejecutable** de esa escena:

- **Flujo Proveedor / Reseñas** del guion → visibiliza la reseña `published` del vendor demo (SEED-REVIEW-001).
- **Cierre del flujo (confirmed_intent)** → respaldado por SEED-BOOKING-001.
- El [Pre-Demo-Checklist](Pre-Demo-Checklist.md) puede referenciar `npm run test:demo-readiness`
  como chequeo verde/rojo antes de presentar (guardia contra "falso verde").

---

## 5. Coordinación con US-088 (pinning mínimo — DOC-002, no bloqueante)

> **Estado actual (verificado 2026-07-28):** la guardia de US-145 corre **verde** contra el seed
> vigente. **No se requiere pinning adicional** en US-088 hoy: el vendor demo principal (`vendors[0]`)
> ya recibe, de forma determinista, el `confirmed_intent` del quote índice 0 y sus reseñas `published`
> en `seedBookingsAndReviews`.

Esta nota es de **coordinación documental** y **no reabre** decisiones de US-088 (distribución de
fixtures, unicidad `(event, category)`, coherencia presupuestal — Doc 11 §21/§22):

- La matriz general de US-088 garantiza volúmenes **globales** (≥3 `confirmed_intent`, 20–40 reseñas
  con ~70% `published`), pero no fija **explícitamente** por contrato que el vendor demo principal
  específico quede ligado a un `confirmed_intent` + reseña `published`.
- Esa garantía **por vendor** hoy emerge del **orden determinista** del seed (índice 0 → `vendors[0]`).
  Si una futura refactorización de US-088 alterara ese orden (p. ej. cambiara qué índice de quote se
  confirma, o el reparto de reseñas), la guardia de US-145 **fallaría en rojo** con un mensaje
  accionable — y **ése es el mecanismo** que haría explícita la necesidad de un pinning mínimo.
- **Pinning mínimo recomendado (si algún día la guardia falla):** en la matriz de US-088, anclar de
  forma explícita al **primer vendor `approved`** (ancla `vendor0@seed.eventflow.test`) al menos un
  `confirmed_intent` (`is_seed` + `is_simulated`) y una reseña `published` (`rating 1..5`) ligada a
  ese intent. Sin duplicar fixtures: es una restricción de asignación, no un fixture nuevo.

En resumen: **la verificación red/green de US-145 es la fuente de verdad**; el pinning explícito en
US-088 sólo se materializa si/ cuando la guardia lo evidencie.
