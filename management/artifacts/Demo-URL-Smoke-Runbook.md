# Runbook — Smoke automatizado sobre la URL de Demo

> **User Story:** US-146 (PB-P3-007) · **Epic:** EPIC-DEMO-001 — Demo Readiness
> **Versión:** 1.0 · **Última actualización:** 2026-07-29
> **Propósito:** procedimiento operativo, versionado y reproducible para ejecutar el **smoke E2E
> mínimo** (login, listado de eventos, generación IA con Mock, comparador) contra la **URL pública
> Demo** (frontend Amplify + backend App Runner), **manualmente** y por **workflow post-deploy**
> (`smoke.yml`), interpretar su resultado y actuar ante un fallo.
> **Naturaleza:** smoke E2E + documentación operativa. **No** modifica backend, frontend ni BD;
> **ejerce** flujos ya implementados sobre el entorno desplegado y **consume** el seed existente.

> 🔒 **Seguridad documental (SEC-02 / SEC-03 / VR-02 · Doc 19).** Este runbook referencia las
> variables/secretos **por nombre**, nunca por valor. Las credenciales del usuario demo y las URLs
> se inyectan por **GitHub Actions secrets / AWS Secrets Manager**, nunca en el repositorio ni en la
> suite. Las URLs se redactan a `protocol//host` en logs y evidencia.

---

## 0. Qué valida (y qué no)

Valida los **4 flujos indispensables** de la demo de extremo a extremo contra el entorno público:

1. **Login** con un usuario sembrado (flujo real, cookies HTTP-only) — TS-01 / AC-02.
2. **Listado de eventos** visible tras el login — TS-02 / AC-02.
3. **Generación IA con Mock** determinista (recomendación revisable) — TS-03 / AC-02 / AC-03.
4. **Comparador de cotizaciones** con datos sembrados — TS-04 / AC-02.

**No** es la suite E2E completa (propiedad de US-128), **no** crea/modifica seed ni el reset
(US-140), **no** implementa el healthcheck (US-116, solo lo observa) y **no** usa OpenAI real.

---

## 1. Precondiciones (antes de correr — verificación automática con fail-fast)

| # | Precondición | Cómo se garantiza | Si falla |
|---|---|---|---|
| 1 | Entorno Demo desplegado y con **seed reproducible** (usuarios, eventos, cotizaciones) | `npm run seed` (US-085) / reset del entorno Demo (US-140) | El comparador/eventos fallan de forma controlada (NT-03/EC-02) → ejecutar reset US-140 y reintentar |
| 2 | **IA en modo Mock** (`LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`) | Runbook del toggle US-144 (`AI-Provider-Toggle-Runbook.md`) | El paso de IA se vuelve no determinista (EC-03/NT-04) → forzar Mock antes del smoke |
| 3 | **`GET /health = 200`** en el backend Demo | Healthcheck US-116; el smoke lo prechequea en `globalSetup` | Aborta antes de los flujos (fail-fast, EC-01/NT-01) → revisar deploy o reset |
| 4 | **Secretos configurados** (base URL, API URL, credenciales) | GitHub Actions secrets / Secrets Manager | Aborta con mensaje de configuración inválida (NT-02, VR-01/VR-02) |

---

## 2. Variables / secretos (por nombre — nunca por valor)

| Variable | Rol |
|---|---|
| `DEMO_SMOKE_BASE_URL` | URL pública del **frontend** Demo (Amplify) — `baseURL` de Playwright (VR-01, nunca localhost). |
| `DEMO_SMOKE_API_URL` | URL pública del **backend** Demo (App Runner) — precheck `GET /health` (VR-04). |
| `DEMO_SMOKE_ORGANIZER_EMAIL` | Email del usuario sembrado (organizer). |
| `DEMO_SMOKE_ORGANIZER_PASSWORD` | Password del usuario sembrado (solo secreto/env). |

---

## 3. Ejecución manual (AC-05)

Desde `web/` (requiere el navegador Playwright: `npm run test:e2e:install`):

```bash
export DEMO_SMOKE_BASE_URL="https://<frontend-demo>"
export DEMO_SMOKE_API_URL="https://<backend-demo>"
export DEMO_SMOKE_ORGANIZER_EMAIL="<usuario sembrado>"
export DEMO_SMOKE_ORGANIZER_PASSWORD="<secreto>"   # nunca commitear

npm run test:e2e:demo-smoke
```

- **Sin** las variables `DEMO_SMOKE_*`, la suite **se salta limpiamente** (0 fallos) — útil para no
  romper corridas locales; no produce un falso verde.
- El reporte HTML queda en `web/playwright-report-demo-smoke/`; la evidencia de fallo (screenshots,
  trazas, video) en `web/test-results/`.

---

## 4. Ejecución por workflow post-deploy (`smoke.yml`)

`.github/workflows/smoke.yml`:

- **Disparadores:** `workflow_dispatch` (manual, desde la pestaña *Actions*) y `workflow_run` tras
  completar `deploy-backend` (post-deploy). Corre solo si el deploy terminó en éxito.
- **Secrets:** inyecta `DEMO_SMOKE_*` desde GitHub Actions secrets (VR-02/SEC-02).
- **Evidencia:** ante fallo sube `demo-smoke-report-*` (reporte + trazas + screenshots) con
  retención de 7 días (AC-06).
- **No bloqueante:** es post-deploy; su fallo **no** bloquea merge. Ante rojo, emite una anotación
  de error para **evaluar rollback manual** (docs/21 §16.4) o **reset del entorno Demo** (US-140).

> Nota: el frontend Demo se despliega vía **Amplify** (fuera de GitHub Actions). El disparo
> `workflow_run` sobre `deploy-backend` es la señal post-deploy disponible dentro de Actions; para
> validar tras un deploy de frontend, usar el disparo **manual** (`workflow_dispatch`).

---

## 5. Interpretación de resultados

| Resultado | Significado | Acción |
|---|---|---|
| **Verde** (todos pasan) | Los 4 flujos críticos funcionan en la Demo URL; `/health = 200` | Marcar el ítem de smoke en el [Pre-Demo-Checklist](Pre-Demo-Checklist.md) (US-143) |
| **Skipped** (sin config) | No hay `DEMO_SMOKE_*`; el smoke no corrió | Configurar los secretos/variables y reintentar (no es un verde válido) |
| **Rojo en `globalSetup`** (health/config) | Entorno no disponible o mal configurado (EC-01/NT-01/NT-02) | Revisar deploy / `/health`; ejecutar reset (US-140); verificar secretos |
| **Rojo en un flujo** | Regresión funcional o seed alterado (EC-02/NT-03) | Revisar la evidencia adjunta; ejecutar reset (US-140) y reintentar; si persiste, evaluar rollback (docs/21 §16.4) |

**Trazabilidad (OBS-001):** la corrida propaga un `x-correlation-id` (`e2e-demo-smoke-<run>`) en
cada request al backend y registra inicio/fin/resultado en consola, sin secretos — permite cruzar
el smoke con los logs del backend en CloudWatch.

---

## 6. Referencias

- User Story: `management/user-stories/US-146-demo-url-smoke.md`
- Tech Spec: `management/technical-specs/P3/PB-P3-007/US-146-technical-spec.md`
- Suite: `web/src/tests/demo-smoke/` · Config: `web/playwright.demo-smoke.config.ts`
- Workflow: `.github/workflows/smoke.yml`
- Precondición IA Mock: `management/artifacts/AI-Provider-Toggle-Runbook.md` (US-144)
- Reset del entorno Demo: US-140 (PB-P3-001) · Checklist pre-demo: `Pre-Demo-Checklist.md` (US-143)
- docs/20 §6.6, §21, §25.1, §25.4 · docs/21 §16.1, §16.4, §23.3, §25 · ADR-TEST-001 · ADR-DEVOPS-001
