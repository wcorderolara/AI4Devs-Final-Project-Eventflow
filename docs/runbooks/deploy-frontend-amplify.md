# Runbook — Deploy del frontend Next.js en AWS Amplify Hosting (US-135 / PB-P2-021)

> Cómo conectar, configurar, desplegar, verificar (smoke) y revertir (rollback) el frontend
> Next.js (App Router) en **AWS Amplify Hosting**.
> Fuente de verdad de diseño: `docs/21-Deployment-and-DevOps-Design.md` §9 · ADR-DEVOPS-001.
> Artefacto versionado del build: [`amplify.yml`](../../amplify.yml) (raíz del repo, monorepo `appRoot: web`).

## Estado actual del despliegue (2026-07-24)

| Dato | Valor |
| --- | --- |
| App Amplify | `d2jh1ql4whmeue` (región `us-east-1`, plataforma WEB_COMPUTE) |
| Demo (`main`) | https://main.d2jh1ql4whmeue.amplifyapp.com — build `SUCCEED`, HTTP 200 |
| QA (`staging`) | https://staging.d2jh1ql4whmeue.amplifyapp.com — build `SUCCEED`, HTTP 200 |
| `NEXT_PUBLIC_API_BASE_URL` | **placeholder** — actualizar cuando PB-P2-022 (App Runner) publique las URLs reales |

> El frontend carga y se sirve públicamente. Las llamadas al backend (login, datos) quedarán
> operativas cuando exista PB-P2-022 y se actualice `NEXT_PUBLIC_API_BASE_URL` (ver §4) + redeploy.

## TL;DR

| Paso | Qué | Dónde | Versionable |
| --- | --- | --- | --- |
| 1 | Conectar Amplify ↔ GitHub | AWS CLI (`infra/amplify/provision-amplify.sh`) / consola | **Sí** (script CLI) |
| 2 | Branch mappings (`main`→Demo, `staging`→QA) | Script CLI / consola | Documentado |
| 3 | Build settings (`npm ci`→check-env→lint→typecheck→test→build) | [`amplify.yml`](../../amplify.yml) | **Sí** |
| 4 | Env vars públicas por ambiente | Consola Amplify | No (matriz aquí) |
| 5 | Cookies/CORS Amplify ↔ App Runner | Doc 21 §9.5/§19/§20 | Documentado |
| 6 | Smoke de la URL pública | Post-deploy | Suite E2E `@smoke` |
| 7 | Rollback a build previo | Consola Amplify | Documentado |

---

## 1. Conectar Amplify al repositorio (OPS-001 · AC-01)

### 1.a Vía AWS CLI (recomendado — un comando)

Script versionado: [`infra/amplify/provision-amplify.sh`](../../infra/amplify/provision-amplify.sh).
Crea la app (monorepo `appRoot=web`, plataforma `WEB_COMPUTE` para SSR del App Router), conecta el
repo GitHub, crea las ramas `main`→Demo y `staging`→QA con sus env vars públicas, y dispara el
primer build. Idempotente (reutiliza app/ramas existentes).

Prerrequisitos: `aws` CLI v2 + credenciales válidas, `AWS_REGION`, un **GitHub PAT** (scope `repo`)
para que Amplify conecte el repositorio.

```bash
AWS_REGION=us-east-1 \
REPO_URL=https://github.com/<org>/<repo> \
GITHUB_ACCESS_TOKEN=ghp_xxx \
# opcional cuando existan (PB-P2-022):
# API_BASE_URL_DEMO=https://<app-runner-demo>/api/v1 API_BASE_URL_QA=https://<app-runner-qa>/api/v1 \
bash infra/amplify/provision-amplify.sh
```

El script hace fail-fast si falta `aws`, credenciales, `AWS_REGION`, `REPO_URL` o el PAT.

### 1.b Vía consola (alternativa manual)

1. AWS Console → **Amplify** → **Create new app** → **Host web app** → proveedor **GitHub**.
2. Repo del monorepo; marcar **monorepo** con **app root = `web`** (coincide con `appRoot: web`).
3. Amplify detecta `amplify.yml` en la raíz y usa sus fases (no editar el build en consola).
4. Rol IAM con permisos mínimos de Amplify Hosting; **OIDC** recomendado (SEC-02); sin claves largas en el repo.

**DoD:** app de Amplify creada y conectada al repo; un push a una rama mapeada dispara un build.

---

## 2. Branch mappings por ambiente (OPS-001 · AC-01)

Vía AWS CLI (`infra/amplify/provision-amplify.sh`, §1) o consola Amplify → **Branch settings**,
conectar las ramas y su ambiente lógico:

| Rama Git | Ambiente | `NEXT_PUBLIC_APP_ENV` | URL pública |
| --- | --- | --- | --- |
| `main` | **Demo** | `demo` | `https://main.<app-id>.amplifyapp.com` |
| `staging` | **QA** | `qa` | `https://staging.<app-id>.amplifyapp.com` |

> **Nota de branch (Doc Alignment — resuelto):** la rama de QA es **`staging`** (decisión Tech Lead,
> 2026-07-24). El script y `amplify.yml` ya reflejan `main`→Demo y `staging`→QA.

Cada push a una rama mapeada dispara el pipeline de [`amplify.yml`](../../amplify.yml). Ramas no
mapeadas no despliegan.

---

## 3. Build settings (OPS-002 · AC-02 · VR-02 · EC-01)

Versionado en [`amplify.yml`](../../amplify.yml). Fases (Doc 21 §9.2):

```text
preBuild:  npm ci
           npm run check-public-env      # fail-fast env (VR-01/VR-03/VR-04/EC-02)
build:     npm run lint
           npm run typecheck
           npm run test
           npm run build                 # next build (App Router)
           npm run check-no-msw-in-prod  # SEC-07/VR-05
artifacts: baseDirectory: .next
```

- **Deploy sólo si el build es verde** (VR-02). Cualquier fase con exit ≠ 0 aborta el build.
- **Build fallido no se promueve** (EC-01 / NT-01): Amplify conserva el build anterior sirviendo.
- Cache de `node_modules` y `.next/cache` para acelerar builds sucesivos.

**Validación local del pipeline (evidencia):** ejecutado en `web/` con
`NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_APP_ENV` seteadas →
`check-public-env` ✓ · `lint` ✓ · `typecheck` ✓ · `test` (828 passed / 1 skipped) ✓ ·
`build` ✓ · `check-no-msw-in-prod` ✓.

---

## 4. Variables de entorno públicas por ambiente (OPS-003 · AC-03 · AC-04)

> Sólo variables `NEXT_PUBLIC_*` (Doc 21 §9.3/§9.8). Las **sensibles NUNCA** se configuran en el
> frontend ni en Amplify env; van por **Secrets Manager** (SEC-02/SEC-03). El guard
> `check-public-env` bloquea el build si falta una requerida o si una `NEXT_PUBLIC_*` expone un
> aspecto sensible (VR-01/VR-03/VR-04).

Consola Amplify → **Environment variables** (por rama/ambiente):

| Variable | Demo (`main`) | QA (`staging`) | Requerida | Notas |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<app-runner-demo>/api/v1` | `https://<app-runner-qa>/api/v1` | **Sí** (VR-04) | URL del backend App Runner por ambiente. **Depende de PB-P2-022** — usar placeholder hasta que exista. |
| `NEXT_PUBLIC_APP_ENV` | `demo` | `qa` | **Sí** | Ambiente lógico. |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | `recaptcha`/`hcaptcha` (o `mock` en QA) | `mock` | No | Si ≠ `mock`, el site key pasa a requerido. |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | site key real | (vacío si `mock`) | Condicional | Requerida sólo si el provider ≠ `mock` (VR-03). |
| `NEXT_PUBLIC_SITE_URL` | URL pública Demo | URL pública QA | No | Base para robots.txt/sitemap (US-105). |

**Placeholder de `NEXT_PUBLIC_API_BASE_URL`:** hasta que PB-P2-022 publique las URLs de App
Runner, dejar un valor http(s) sintáctico válido documentado y **actualizarlo** antes del primer
smoke real. El guard exige forma de URL válida, no que resuelva.

**DoD:** variables públicas por ambiente definidas; `NEXT_PUBLIC_API_BASE_URL` apunta al backend
correcto; ninguna variable sensible expuesta al cliente.

---

## 5. Cookies y CORS — Amplify ↔ App Runner (SEC-001 · AC-04)

Amplify (frontend) y App Runner (backend) viven en **orígenes distintos**. Para que la sesión
funcione cross-domain (Doc 21 §9.5/§19/§20):

- El **backend** emite cookies HTTP-only con **`SameSite=None; Secure`** (config de PB-P2-022, fuera
  de esta historia). HTTPS es obligatorio en ambos extremos (Amplify termina TLS por defecto).
- El **backend** habilita **CORS con `credentials: true`** y `Access-Control-Allow-Origin` = dominio
  exacto de Amplify por ambiente (no `*` cuando hay credenciales).
- El **frontend** ya envía las peticiones con las cookies del navegador; **no** manipula tokens
  (Doc 21 §9.5). No requiere cambios de código en esta historia.

**No exposición de secretos (SEC-03/VR-01):**
- Sólo `NEXT_PUBLIC_*` llega al cliente. Verificado en build por `check-public-env` (rechaza
  `NEXT_PUBLIC_*` con nombre sensible) y por `check-no-msw-in-prod`.
- Sin secretos en logs de build: el guard nunca imprime valores de variables.
- El frontend no accede directo a OpenAI/RDS/S3/Secrets Manager (Doc 21 §9.8).

**DoD:** asunción de cookies/CORS documentada (arriba); sin variables sensibles ni secretos
expuestos.

---

## 6. Smoke de la URL pública (QA-001 · AC-02)

Tras cada deploy, contra la URL pública del ambiente:

1. **Smoke manual mínimo:** abrir la URL → carga la home; navegar a `/vendors` y una página
   pública de proveedor (SEO-friendly, Doc 21 §9.6); verificar HTTPS y que no hay errores 5xx.
2. **Smoke automatizado (reutilizable):** la suite E2E `@smoke` existente
   (`web/src/tests/e2e/demo-organizer-smoke.spec.ts`, US-128) se ejecuta con
   `npm run test:e2e:smoke` apuntando `PLAYWRIGHT_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` al ambiente
   desplegado.

> La verificación **en vivo** requiere una URL pública desplegada y credenciales AWS; se ejecuta
> como acción de operador tras el deploy real (no realizable desde el entorno de desarrollo local).

**DoD:** smoke de la URL pública verde en Demo/QA.

---

## 7. Rollback (QA-001 · AC-05)

Ante un build problemático (Doc 21 §9.7/§24):

- **Opción A — rollback en consola:** Amplify → Branch → historial de builds → seleccionar un
  build anterior verde → **Redeploy this version**. Vuelve a servir la versión previa en segundos.
- **Opción B — revertir el commit:** `git revert` en la rama mapeada y push → dispara un build
  nuevo con el estado previo.

Amplify **retiene builds anteriores**, por lo que el rollback no requiere reconstruir. El rollback
es manual (Doc 21 §26: sin automatización de rollback en MVP).

**DoD:** rollback a un build anterior verificado (o commit revertido dispara build sano).

---

## 8. Documentation Alignment (DOC-001)

- **Prioridad P0 → P2:** la metadata original de la US marcaba `Must Have (P0)`; el Product Backlog
  ubica esta historia en **PB-P2-021 (P2)**. Fuente autoritativa: Product Backlog Prioritized →
  se alinea a **P2** (ya reconciliado en la US §Notes).
- **Nombres de rama por ambiente:** resuelto — rama de QA = **`staging`** (decisión Tech Lead
  2026-07-24). `amplify.yml`, el script CLI y §2 ya lo reflejan.
- **URLs de backend por ambiente:** dependen de PB-P2-022 (App Runner). Configurar
  `NEXT_PUBLIC_API_BASE_URL` real cuando esas URLs existan; placeholder documentado hasta entonces (§4).

---

## 9. Checklist de deploy (operador)

- [ ] App de Amplify conectada al repo (monorepo, appRoot `web`).
- [ ] Branch mappings `main`→Demo, `staging`→QA configurados.
- [ ] Env vars públicas por ambiente definidas; `NEXT_PUBLIC_API_BASE_URL` correcto.
- [ ] Ninguna variable sensible en Amplify env del frontend.
- [ ] Build verde por push publica la URL pública.
- [ ] Cookies `SameSite=None; Secure` + CORS `credentials: true` en el backend (PB-P2-022).
- [ ] Smoke de la URL pública verde.
- [ ] Rollback a build previo probado.
