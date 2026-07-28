# ✅ Checklist Pre-Demo — EventFlow (< 10 min)

> **User Story:** US-143 (PB-P3-004) · **Epic:** EPIC-DEMO-001 — Demo Readiness
> **Versión:** 1.0 · **Última actualización:** 2026-07-28
> **Propósito:** verificar las precondiciones del entorno **antes** de iniciar la demo guiada
> ([`Demo-Script.md`](./Demo-Script.md), US-142) para evitar incidentes durante la evaluación académica.
> **Ventana objetivo:** recorrido completo en **< 10 minutos** (NFR-DEMO-006).
> **Trazabilidad:** Doc 3 §14.4, Doc 21 §23.2–§23.3, NFR-TEST-006, NFR-TEST-004, NFR-I18N-004/006, SEED-DEMO-005, UC-DEMO-001.

> 🔒 **Seguridad documental (VR-05 / Doc 19).** Este checklist referencia variables de entorno **por
> nombre**, nunca por valor. **No** escribir aquí los valores de `CAPTCHA_SECRET`,
> `RECAPTCHA_SECRET_KEY`, `HCAPTCHA_SECRET_KEY` ni `OPENAI_API_KEY`.

> ⚠️ **Nota de alineación (variables reales vs. asumidas).** La User Story / Tech Spec citaban
> `CAPTCHA_DISABLED`, `CAPTCHA_SECRET_KEY` y `NEXT_PUBLIC_CAPTCHA_SITE_KEY`. La configuración **real**
> del código (`backend/src/config/env.ts`, `web/…/CaptchaWidget.tsx`) usa `CAPTCHA_PROVIDER`
> (`mock`/`recaptcha`/`hcaptcha`), `NEXT_PUBLIC_CAPTCHA_PROVIDER`, `CAPTCHA_SECRET` y las claves por
> proveedor `RECAPTCHA_SECRET_KEY`/`HCAPTCHA_SECRET_KEY`. **No existe `CAPTCHA_DISABLED`.** El "modo
> test" del captcha = `CAPTCHA_PROVIDER=mock`. Este checklist usa las **variables reales** para ser
> ejecutable (recomendado alinear la US/Tech Spec).

---

## 1. Checklist de 7 ítems obligatorios (a–g)

> Estado esperado ✅ = ítem en verde. Solo se declara **"listo para demo"** cuando **los 7 ítems
> están en verde** (EC-01).

| # | Ítem | Cómo se verifica | Estado esperado | Acción correctiva | Fuente |
|---|------|------------------|-----------------|-------------------|--------|
| **a** | **Seed cargado / reproducible** | Login por rol (`admin@seed.eventflow.test`, `organizer0@seed.eventflow.test`, `vendor0@seed.eventflow.test` / `Demo1234!`); en el panel admin verificar que existen eventos en `draft`/`active`/`completed`, ≥1 cotización `responded`, ≥1 `BookingIntent.confirmed_intent` y ≥1 reseña. | Datos seed clave presentes y reproducibles (SEED-USER-001/002/003, SEED-EVENT-001, SEED-QUOTE-001, SEED-BOOKING-001, SEED-REVIEW-001). | Re-aplicar el seed idempotente: `npm run seed` (backend), **o** panel `/admin/seed` → "Resetear datos demo" (US-140). Re-verificar. | Doc 11 (SEED-*), Doc 3 §14.4; seed PB-P0-014 |
| **b** | **Idioma del usuario/evento** | Con sesión iniciada, observar el idioma de la UI (selector en el header) y el `locale` del evento demo. | Idioma correcto según el escenario multi-idioma (`es-LATAM` por defecto; `es-ES` / `pt` / `en` disponibles). | Cambiar el idioma en el selector del header y/o abrir el evento demo con el `locale` correcto. | NFR-I18N-006, SEED-DEMO-005 |
| **c** | **Moneda del evento demo** | Abrir el detalle/presupuesto del evento demo y observar la moneda mostrada. | Moneda esperada del evento (p. ej. `GTQ`; también `USD`/`EUR` en escenarios), **sin conversión automática** (moneda inmutable, BR-EVENT-007). | Seleccionar el evento demo cuya moneda coincida con lo que se quiere mostrar (la moneda **no** se altera). | NFR-I18N-004, BR-EVENT-007 |
| **d** | **Captcha en modo test** | Backend: `CAPTCHA_PROVIDER=mock`. Frontend: `NEXT_PUBLIC_CAPTCHA_PROVIDER=mock`. Confirmar que el login demo **no** exige captcha real. | Captcha en **modo mock/stub determinista**; el login demo no se bloquea. | Ajustar `CAPTCHA_PROVIDER=mock` y `NEXT_PUBLIC_CAPTCHA_PROVIDER=mock` para el entorno demo y reiniciar los servicios. | NFR-TEST-006; Doc 21 (env vars captcha); `backend/src/config/env.ts` |
| **e** | **Smoke tests pasados** | Backend arriba: `GET /health` → `200`, `GET /health/ready` → `200`. Smoke E2E: `npm run test:e2e:smoke` (o `smoke.spec.ts` / `demo-organizer-smoke.spec.ts`) contra la Demo URL. | `/health` y `/health/ready` en `200`; smoke E2E **en verde** (login, dashboard, crear evento, ver sugerencia IA). | Revisar logs (CloudWatch, US-141), corregir la causa raíz y re-ejecutar el smoke (US-146 / PB-P3-007). | Doc 21 §23.3, NFR-TEST-004; `web/src/tests/e2e/smoke.spec.ts` |
| **f** | **Métricas admin visibles** | Sesión admin → abrir `/admin/metrics`; confirmar KPIs/metricas en pantalla. | Panel de métricas admin **visible** con datos (usuarios, vendors, eventos, etc.). | Verificar sesión admin y carga del panel; recargar el seed (ítem a) si faltan datos. | Doc 3 §14.4; ruta `/admin/metrics` |
| **g** | **Toggle Mock/OpenAI en estado deseado** | Confirmar en el entorno backend `LLM_PROVIDER` (`openai`/`mock`), `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`. | **Preferido:** `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true` (IA real con red de seguridad). **Contingencia:** `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true` (determinista). | Ajustar el toggle según el runbook (US-144 / PB-P3-005) y re-verificar; dejar constancia del estado elegido en el §3 run log. | Doc 21 §23.2 y tabla env vars; runbook US-144 |

---

## 2. Presupuesto de tiempo (AC-05 / VR-04)

| Ítem | Verificación | Estimación |
| ---- | ------------ | ---------: |
| a | Seed cargado/reproducible (login + revisión rápida en admin) | 2.0 min |
| b | Idioma del usuario/evento | 1.0 min |
| c | Moneda del evento demo | 1.0 min |
| d | Captcha en modo test (env vars + login demo) | 1.0 min |
| e | Smoke tests (`/health` + smoke E2E) | 2.0 min |
| f | Métricas admin visibles | 1.0 min |
| g | Toggle Mock/OpenAI | 1.0 min |
| **Total** | | **9.0 min** (< 10 ✅) |

> **Criterio "listo para demo":** solo cuando **los 7 ítems (a–g) están en verde**. Si el recorrido
> supera 10 min, priorizar los ítems bloqueantes (a, d, e, g) y diferir b/c/f a una verificación
> visual rápida durante el propio recorrido de la demo.

---

## 3. Registro de corrida (run log)

> Completar en cada verificación pre-demo. **Pendiente de ejecutar en vivo** sobre un entorno demo
> corriendo (backend + frontend + BD + seed). No se registran resultados inventados. **Sin valores de
> secretos** (solo estado verde/rojo por ítem).

### Corrida completa (DR-01)

| Fecha | Responsable | Entorno | a | b | c | d | e | f | g | Tiempo total | ¿< 10 min? | ¿Listo para demo? | Notas |
| ----- | ----------- | ------- |---|---|---|---|---|---|---| -----------: | ---------- | ----------------- | ----- |
| _(pendiente)_ | | | | | | | | | | | | | Ejecutar con el seed cargado |

### Prueba de acción correctiva (DR-02)

| Fecha | Responsable | Ítem forzado a fallo | Acción correctiva aplicada | ¿Pasó a verde? | Notas |
| ----- | ----------- | -------------------- | -------------------------- | -------------- | ----- |
| _(pendiente)_ | | p. ej. (g) `LLM_PROVIDER` en proveedor equivocado / caída de OpenAI (EC-02) | Conmutar a `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true` (runbook US-144) | | Registrar el estado deseado del toggle |

**Criterio de cierre (DoD):** DR-01 con los 7 ítems en verde y total < 10 min, y DR-02 confirmando
que una acción correctiva devuelve un ítem a verde.

---

## 4. Referencias

- **Guion de demo:** [`Demo-Script.md`](./Demo-Script.md) (US-142 / PB-P3-003) — el checklist se corre **antes** del guion.
- **Reset del entorno demo:** US-140 (`/admin/seed`) · seed idempotente `npm run seed` (PB-P0-014).
- **Toggle IA:** `LLM_PROVIDER` / `AI_DEMO_MODE` / `AI_USE_MOCK_FALLBACK` (`backend/src/config/env.ts`) · runbook US-144 (PB-P3-005) · NFR-AI-008.
- **Captcha:** `CAPTCHA_PROVIDER` / `NEXT_PUBLIC_CAPTCHA_PROVIDER` (modo `mock` en demo) · NFR-TEST-006.
- **Smoke:** `web/src/tests/e2e/smoke.spec.ts`, `demo-organizer-smoke.spec.ts` · `npm run test:e2e:smoke` · US-146 (PB-P3-007).
- **Observabilidad:** `/health`, `/health/ready` · CloudWatch (US-141) · métricas admin `/admin/metrics`.
- **Criterios de demo:** Doc 3 §14.4 · Doc 21 §23.2–§23.3 · NFR-DEMO-006.
