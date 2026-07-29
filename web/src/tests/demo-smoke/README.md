# Smoke real-URL sobre la Demo — US-146 · PB-P3-007

Subconjunto de smoke E2E (Playwright) que ejerce los flujos **críticos** de la demo contra la
**URL pública Demo real** (frontend Amplify + backend App Runner), **sin mocks de frontend** y
**sin localhost** (AC-01). Complementa —no reemplaza— la E2E mocked-localhost de US-128
(`web/src/tests/e2e/**`).

> Documentación operativa completa (ejecución manual, workflow, precondiciones, interpretación):
> [`management/artifacts/Demo-URL-Smoke-Runbook.md`](../../../../management/artifacts/Demo-URL-Smoke-Runbook.md).

## TL;DR

```bash
# Exporta la configuración (o inyéctala por secretos en CI) y corre:
export DEMO_SMOKE_BASE_URL="https://<frontend-demo>"      # Amplify
export DEMO_SMOKE_API_URL="https://<backend-demo>"        # App Runner (para GET /health)
export DEMO_SMOKE_ORGANIZER_EMAIL="<usuario sembrado>"
export DEMO_SMOKE_ORGANIZER_PASSWORD="<secreto>"
npm run test:e2e:demo-smoke
```

Sin las variables `DEMO_SMOKE_*`, la suite **se salta limpiamente** (no falso verde, no falso rojo).

## Estructura

```
web/src/tests/demo-smoke/
├── README.md                 (este archivo)
├── demo-smoke-config.ts      (resolución/validación pura de config — VR-01/VR-02; unit-tested)
├── global-setup.ts           (precheck GET /health = 200 — VR-04/EC-01; fail-fast sin falso verde)
└── demo-url-smoke.spec.ts     (login → eventos → IA Mock → comparador — TS-01..04)
```

Config Playwright dedicada: [`web/playwright.demo-smoke.config.ts`](../../../playwright.demo-smoke.config.ts)
(sin `webServer`, `globalTimeout` 5 min — AC-04, evidencia `*-on-failure` — AC-06).
Unit test del resolvedor: `web/src/tests/unit/us146-demo-smoke-config.test.ts`.

## Variables de entorno (secretos — VR-02 · SEC-02)

| Variable | Rol |
|---|---|
| `DEMO_SMOKE_BASE_URL` | URL pública del frontend Demo (Amplify) — `baseURL` de Playwright. |
| `DEMO_SMOKE_API_URL` | URL pública del backend Demo (App Runner) — precheck `GET /health`. |
| `DEMO_SMOKE_ORGANIZER_EMAIL` | Email del usuario sembrado (organizer). |
| `DEMO_SMOKE_ORGANIZER_PASSWORD` | Password del usuario sembrado. |

Nunca se hardcodean: se inyectan por GitHub Actions secrets / Secrets Manager. Las URLs se
redactan a `protocol//host` en logs/evidencia (SEC-03).

## Precondiciones (fail-fast, sin falso verde)

1. **Config válida** (VR-01/VR-02): base URL pública (no localhost) + API URL + credenciales.
   Configuración inválida/incompleta → aborta con mensaje accionable (NT-02).
2. **`GET /health = 200`** en el backend Demo (VR-04). Si no responde 200 → aborta antes de los
   flujos (EC-01/NT-01) sugiriendo revisar el deploy o ejecutar el reset (US-140).
3. **IA en modo Mock** (`LLM_PROVIDER=mock` / `AI_USE_MOCK_FALLBACK=true`) en el entorno Demo, para
   determinismo del paso de IA (AC-03/EC-03 · runbook US-144). El frontend nunca llama directo al LLM.
4. **Seed reproducible** (usuarios, eventos, cotizaciones). Datos alterados → fallo controlado que
   sugiere el reset del entorno Demo (US-140 · EC-02/NT-03).

## CI — `smoke.yml` (post-deploy, no bloqueante)

`.github/workflows/smoke.yml` corre este subconjunto tras el deploy del backend y por disparo
manual (`workflow_dispatch`). No bloquea merge; ante fallo publica evidencia y notifica para
evaluar rollback manual (docs/21 §16.4).
