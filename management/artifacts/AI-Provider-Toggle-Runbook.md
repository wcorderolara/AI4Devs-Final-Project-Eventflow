# Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`

> **User Story:** US-144 (PB-P3-005) · **Epic:** EPIC-DEMO-001 — Demo Readiness
> **Versión:** 1.0 · **Última actualización:** 2026-07-28
> **Propósito:** procedimiento operativo, versionado y reproducible para **alternar el proveedor IA**
> entre `OpenAIProvider` y `MockAIProvider` mediante variables de entorno, **activar el modo demo
> seguro**, **verificar** el cambio y **revertirlo** en el entorno Demo, sin exponer secretos.
> **Naturaleza:** documentación operativa (runbook). **No** implementa software: el mecanismo de
> selección de proveedor y el fallback son propiedad de la fundación IA (PB-P0-009..011) y el
> despliegue es propiedad de PB-P2-022. Aquí sólo se documenta y opera lo existente.

> 🔒 **Seguridad documental (SEC-01 / VR-02 / Doc 19).** Este runbook referencia variables de entorno
> **por nombre**, nunca por valor. **No** escribir aquí los valores de `OPENAI_API_KEY` ni de ningún
> otro secreto. `OPENAI_API_KEY` se gestiona como secreto en **AWS Secrets Manager** y **nunca** se
> entrega al frontend (SEC-02/SEC-03, Doc 21 §13.2, §10.5).

> ⚠️ **Nota de alineación (comportamiento real vs. asumido).** El entregable de la fundación IA impone
> una restricción de arranque que el operador debe conocer **antes** de tocar el toggle: la validación
> de configuración (`backend/src/config/env.ts`) hace **fail-fast** y **rechaza el boot** si, con
> `NODE_ENV=production`, se activan `AI_USE_MOCK_FALLBACK=true`, `AI_DEMO_MODE=true` o
> `CAPTCHA_PROVIDER=mock`. Por lo tanto la configuración "Demo" de Doc 21 §13.2
> (`openai` + `AI_USE_MOCK_FALLBACK=true`, o `mock` + `AI_DEMO_MODE=true`) **sólo es arrancable si el
> servicio Demo corre con `NODE_ENV` distinto de `production`** (p. ej. `development`). Ver
> [§7 Contingencias](#7-escenarios-de-contingencia). Esto se documenta como hallazgo de alineación no
> bloqueante (recomendado alinear Doc 21 §13.2 / la definición de entorno Demo).

---

## Índice

1. [Referencia de variables de entorno IA](#1-referencia-de-variables-de-entorno-ia)
2. [Procedimiento de toggle `openai` ↔ `mock` paso a paso](#2-procedimiento-de-toggle-openai--mock-paso-a-paso)
3. [Configuración del modo demo seguro](#3-configuración-del-modo-demo-seguro)
4. [Verificación del cambio](#4-verificación-del-cambio)
5. [Procedimiento de reversión](#5-procedimiento-de-reversión)
6. [Escenarios de contingencia](#6-escenarios-de-contingencia)
7. [Registro del dry-run](#7-registro-del-dry-run)
8. [Referencias](#8-referencias)

---

## 1. Referencia de variables de entorno IA

Variables autoritativas según **Doc 21 §13.1** (§513–§518) y verificadas contra el esquema real de
configuración `backend/src/config/env.ts`. Se listan **sólo nombres**, nunca valores de secretos.

| Variable | Valores admitidos | Uso |
|---|---|---|
| `LLM_PROVIDER` | `openai` / `mock` / `anthropic` | Selecciona el adaptador del puerto `LLMProvider`. En MVP se opera **`openai`** y **`mock`**; **`anthropic` es stub/futuro no funcional** (ADR-AI-004): resuelve a un provider que **falla explícitamente**, no hace fallback silencioso. |
| `OPENAI_API_KEY` | **Secreto** (por nombre) | Requerida sólo si `LLM_PROVIDER=openai`. Gestionada en **AWS Secrets Manager**; **nunca** al frontend (SEC-02/SEC-03). Su ausencia con `openai` produce error de configuración (`AIProviderNotConfiguredError`). |
| `OPENAI_MODEL` | String | Modelo OpenAI configurado para Demo (definido por PromptOps). Opcional a nivel env; se valida cuando `LLM_PROVIDER=openai`. |
| `AI_TIMEOUT_MS` | Entero positivo (default `60000`) | Timeout de las llamadas al LLM (BR-AI-009, política oficial 60 s). |
| `AI_DEMO_MODE` | `true` / `false` (default `false`) | Marca interna de flujos demo deterministas. Con `true`, la selección de provider resuelve a `MockAIProvider` **aunque** `LLM_PROVIDER=openai`. **Prohibida en `NODE_ENV=production`** (fail-fast). |
| `AI_USE_MOCK_FALLBACK` | `true` / `false` (default `false`) | Si OpenAI falla/timeout, **degrada a `MockAIProvider`** (BR-AI-009). **Prohibida en `NODE_ENV=production`** (el fallback no puede ser silencioso — fail-fast). |

> **Nota (VR-01).** `LLM_PROVIDER` sólo admite `openai`, `mock` o `anthropic`; cualquier otro valor es
> rechazado por el esquema Zod en el arranque (fail-fast). `anthropic` no se promueve en este runbook.

> **Nota (comportamiento real).** La selección de proveedor es la función pura
> `selectProvider(providerId, demoMode)` en
> `backend/src/modules/ai-assistance/infrastructure/llm-provider.factory.ts`:
> `mock` **o** `AI_DEMO_MODE=true` → `MockAIProvider`; `openai` → `OpenAIProvider`; `anthropic` → stub
> que falla explícitamente. Por eso `AI_DEMO_MODE=true` fuerza Mock con independencia de `LLM_PROVIDER`.

---

## 2. Procedimiento de toggle `openai` ↔ `mock` paso a paso

El toggle se realiza **a nivel del servicio** (variables de entorno del servicio Demo), no en la
imagen ni en el código. Un cambio de variables de entorno **requiere reiniciar / redeploy** del
servicio para tomar efecto, porque la configuración se valida y congela en el arranque
(`backend/src/config/env.ts` se evalúa antes de montar rutas).

> Los pasos usan nomenclatura de plataforma gestionada (App Runner, PB-P2-022). Si el entorno Demo se
> opera sobre otra plataforma (p. ej. EC2, ver ADR-DEVOPS-008), aplica el equivalente: editar las env
> vars del servicio y redeployar/reiniciar el contenedor.

### 2.1 Toggle `openai` → `mock` (forzar Mock determinista)

1. **Anotar el estado previo** de las variables IA (para poder revertir — ver [§5](#5-procedimiento-de-reversión)): `LLM_PROVIDER`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`. **Sin** anotar valores de secretos.
2. En la configuración de env vars del servicio Demo, establecer `LLM_PROVIDER=mock`.
3. (Opcional, recomendado para demo determinista) establecer `AI_DEMO_MODE=true`. Con `mock` no es imprescindible, pero deja explícita la intención de flujo demo.
4. `OPENAI_API_KEY`, `OPENAI_MODEL` **pueden permanecer configuradas**: con `LLM_PROVIDER=mock` no se usan (el `MockAIProvider` no llama a OpenAI). No es necesario borrar el secreto para conmutar a Mock.
5. Aplicar el cambio y **reiniciar / redeployar** el servicio para que la nueva configuración se cargue.
6. **Verificar** el cambio según [§4](#4-verificación-del-cambio) (esperado: `provider=mock` en logs; `/health/ready` con AI provider `mock`).

### 2.2 Toggle `mock` → `openai` (volver a IA real)

1. **Prerrequisito de secreto:** confirmar que `OPENAI_API_KEY` está presente en Secrets Manager y referenciada por el servicio, y que `OPENAI_MODEL` está configurada. Sin la key, el arranque con `openai` produce `AIProviderNotConfiguredError` (ver [§6.2](#62-ec-02--nt-01-variable-de-entorno-mal-configurada)).
2. Establecer `LLM_PROVIDER=openai`.
3. Asegurar que `AI_DEMO_MODE=false` (si estaba en `true`, seguiría forzando Mock — ver [§1](#1-referencia-de-variables-de-entorno-ia), nota de comportamiento real).
4. Para demo con red de seguridad, mantener/establecer `AI_USE_MOCK_FALLBACK=true` **sólo si el servicio Demo no corre con `NODE_ENV=production`** (ver [§3](#3-configuración-del-modo-demo-seguro) y la nota de alineación de la cabecera).
5. Aplicar el cambio y **reiniciar / redeployar** el servicio.
6. **Verificar** según [§4](#4-verificación-del-cambio) (esperado: `provider=openai`; `/health/ready` con AI provider `ok`).

> **Orden de aplicación.** Cambiar primero `LLM_PROVIDER`/`AI_DEMO_MODE`/`AI_USE_MOCK_FALLBACK`, luego
> reiniciar. No dejar el servicio con `openai` sin `OPENAI_API_KEY` disponible: eso provoca un provider
> de IA `down` en `/health/ready` (readiness degradada). El toggle a `mock` no depende del secreto.

---

## 3. Configuración del modo demo seguro

Configuraciones autoritativas según **Doc 21 §13.2** (§520–§523). Soportan **UC-DEMO-001** (recorrido
guiado 10–15 min) y **NFR-DEMO-006** (recorrido demo reproducible); el determinismo del
`MockAIProvider` (**NFR-AI-008**) es la propiedad que hace la demo reproducible cuando se usa Mock.

| Modo | Configuración | Cuándo usarlo |
|---|---|---|
| **Demo preferido** (IA real + red de seguridad) | `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true` | Demo normal: se muestra IA real de OpenAI; si OpenAI falla/timeout, **degrada automáticamente** a `MockAIProvider` (`fallbackUsed=true`) sin cortar la demo. |
| **Contingencia offline** (determinista total) | `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true` | Sin internet / OpenAI caído / sin cuota / para máxima reproducibilidad: **todas** las salidas IA vienen del `MockAIProvider` determinista. |
| **CI / Tests** | `LLM_PROVIDER=mock` | Siempre Mock en pipelines automatizados (Doc 21 §13.2). |

> ⚠️ **Precondición de arranque (comportamiento real, ver cabecera).** Tanto `AI_USE_MOCK_FALLBACK=true`
> como `AI_DEMO_MODE=true` están **prohibidas en `NODE_ENV=production`** por `env.ts` (fail-fast). Para
> usar cualquiera de las dos configuraciones de esta tabla, el servicio Demo debe correr con `NODE_ENV`
> **distinto de `production`** (p. ej. `development`). Si el Demo corre en `production`, la única variante
> arrancable es `LLM_PROVIDER=openai` **sin** `AI_USE_MOCK_FALLBACK` (o `LLM_PROVIDER=mock` a secas, sin
> `AI_DEMO_MODE=true`). Confirmar `NODE_ENV` del servicio **antes** de elegir el modo.

> **Distinción clave.** El *modo preferido* usa **fallback controlado** (IA real con degradación
> automática); la *contingencia offline* usa **Mock puro** (nunca llama a OpenAI). No confundir ambos:
> ver [§6](#6-escenarios-de-contingencia).

---

## 4. Verificación del cambio

Tras aplicar un toggle y reiniciar, confirmar que surtió efecto. **No** se crean logs ni métricas
nuevos: los campos ya son emitidos por la fundación IA (PB-P0-009..011).

### 4.1 Healthcheck / smoke del servicio

- `GET /health` → `200 OK` (liveness; App Runner lo usa para disponibilidad, Doc 21 §10.4).
- `GET /health/ready` → `200` (o `503` si alguna dependencia está `down`). El **AI provider probe**
  (`backend/src/modules/platform-health/infrastructure/probes/ai-provider.probe.ts`) deriva el status
  **sin invocar al LLM externo**, leyendo la configuración:
  - `LLM_PROVIDER=mock` → status **`mock`**.
  - `LLM_PROVIDER=openai` **con** `OPENAI_API_KEY` presente → status **`ok`**.
  - `LLM_PROVIDER=openai` **sin** key (o valor inválido/vacío) → status **`down`** (readiness degradada).
- El probe expone **sólo el status categórico**, nunca el valor del secreto (VR-01/SEC-01).

### 4.2 Qué observar en logs

Ejecutar una función IA (p. ej. una sugerencia en el flujo de la demo) y correlacionar por
`correlationId`. Campos seguros emitidos por la capa de ejecución IA
(`backend/src/modules/ai-assistance/application/ai-execution/ai-execution-logger.ts`, whitelist SEC-04):

| Campo (log real) | Término en AC/Doc 21 | Significado |
|---|---|---|
| `provider` | `provider` | Proveedor efectivamente utilizado (`openai` o `mock`). |
| `originalProvider` | — | Proveedor solicitado antes de un eventual fallback. |
| `fallbackUsed` | `fallback_used` | `true` si la solicitud degradó a `MockAIProvider`. |
| `fallbackReason` | razón del fallback | Motivo de la degradación (timeout / failure). |
| `correlationId` | `correlationId` | Correlaciona la solicitud con el proveedor observado (Doc 21 §13.3, §19.2). |

Eventos relevantes: `ai.fallback_used` (info), `ai.provider.timeout`, `ai.provider.failure`,
`ai.fallback_failed`, `ai.config.invalid`.

> **Nota de nomenclatura.** Los AC y Doc 21 nombran `fallback_used` / `provider`; el **campo real en el
> log** es `fallbackUsed` (camelCase) y el **evento** es `ai.fallback_used`. Se documentan ambos para que
> la verificación sea ejecutable sin ambigüedad.

### 4.3 Determinismo del `MockAIProvider` (NFR-AI-008)

Con `LLM_PROVIDER=mock` (o `AI_DEMO_MODE=true`), repetir la misma solicitud IA debe producir la
**misma salida** (fixtures deterministas,
`backend/src/modules/ai-assistance/infrastructure/providers/mock/`). Esto es lo que hace la demo
reproducible offline.

> **SEC-04.** No se registran prompts/respuestas completas con datos sensibles (Doc 21 §13.3, §19.3);
> la verificación se apoya en identificadores y campos seguros, no en el contenido crudo del prompt.

---

## 5. Procedimiento de reversión

La reversión restaura la configuración **previa** de env vars; **no** toca datos (el runbook opera sólo
sobre configuración).

1. Recuperar el **estado previo** anotado en [§2.1 paso 1](#21-toggle-openai--mock-forzar-mock-determinista) (valores de `LLM_PROVIDER`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`).
2. Restablecer esas variables a su valor anterior en la configuración del servicio Demo.
3. Confirmar que `OPENAI_API_KEY` / `OPENAI_MODEL` siguen presentes si se vuelve a `openai`.
4. Aplicar y **reiniciar / redeployar** el servicio.
5. **Verificar post-reversión** reutilizando [§4](#4-verificación-del-cambio): `/health` + `/health/ready` en verde y `provider` esperado en logs; si se volvió a `openai`, el AI provider probe debe reportar `ok`.
6. Registrar la reversión en el [§7 Registro del dry-run](#7-registro-del-dry-run).

> **Referencia cruzada (no implementada aquí).** La reversión de **configuración** de este runbook es
> independiente del **reset de datos demo** (US-140 / PB-P3-001, panel `/admin/seed`). Si además se
> necesita restaurar datos, ese reset es el procedimiento correcto; este runbook no altera datos.

---

## 6. Escenarios de contingencia

### 6.1 EC-01 / NT-02: OpenAI caído o sin cuota durante la demo

Con `LLM_PROVIDER=openai`:

- **Fallback automático (si `AI_USE_MOCK_FALLBACK=true` y `NODE_ENV≠production`):** ante fallo/timeout de
  OpenAI el sistema degrada a `MockAIProvider` (BR-AI-009). Se observa en logs como `fallbackUsed=true`
  con `originalProvider=openai`, `provider=mock` y `fallbackReason` (evento `ai.fallback_used`). La demo
  continúa con salida determinista sin intervención manual.
- **Toggle manual a `mock` (siempre disponible):** si el fallback no está habilitado (p. ej. porque el
  Demo corre en `production`) o se prefiere control explícito, aplicar el toggle
  [§2.1 `openai` → `mock`](#21-toggle-openai--mock-forzar-mock-determinista) y reiniciar.
- **Cómo distinguirlos:** el fallback automático mantiene `LLM_PROVIDER=openai` y produce
  `fallbackUsed=true` **por solicitud**; el toggle manual cambia `LLM_PROVIDER` a `mock` y produce
  `provider=mock` **sin** `fallbackUsed` (no hubo degradación: se pidió Mock directamente).

### 6.2 EC-02 / NT-01: variable de entorno mal configurada

- **`LLM_PROVIDER` con valor no soportado** (distinto de `openai`/`mock`/`anthropic`): el esquema Zod de
  `env.ts` hace **fail-fast** en el arranque (el proceso no monta rutas). Diagnóstico: el servicio no
  levanta y el log de arranque indica la variable inválida.
- **`LLM_PROVIDER=openai` sin `OPENAI_API_KEY`:** el arranque de OpenAIProvider produce
  `AIProviderNotConfiguredError` y `/health/ready` reporta el AI provider como **`down`** (readiness
  degradada, EC-02). Diagnóstico: revisar `/health/ready` y el binding del secreto en Secrets Manager.
- **`AI_USE_MOCK_FALLBACK=true` / `AI_DEMO_MODE=true` / `CAPTCHA_PROVIDER=mock` con `NODE_ENV=production`:**
  **fail-fast** en el arranque (no arranca). Diagnóstico: el log de arranque indica la variable prohibida
  en producción; corregir bajando `NODE_ENV` del servicio Demo o retirando la flag antes de la demo.
- **Corrección general:** ajustar la variable, reiniciar y re-verificar según [§4](#4-verificación-del-cambio) **antes** de iniciar la demo. La validación de configuración es propiedad de la fundación IA (PB-P0-009/011); este runbook sólo documenta cómo detectarla y corregirla.

> **Fuera de alcance:** no hay **failover automático a Anthropic** (Non-Goal, ADR-AI-004). `anthropic`
> permanece como stub que falla explícitamente; no se debe usar como contingencia.

---

## 7. Registro del dry-run

> **Estado: pendiente de ejecución en vivo.** El dry-run (AC-06 / TS-01 / TS-02 / NT-01 / NT-02) debe
> ejecutarse sobre el **entorno Demo corriendo** (servicio backend + BD + seed). **No se registran
> resultados inventados.** Esta sección queda lista para completarse durante el ensayo. **Sin valores de
> secretos** (sólo estado por paso).

### 7.1 Corrida de toggle `openai` → `mock` → `openai` (DR-01)

| Fecha | Responsable | Entorno / `NODE_ENV` | Paso | Acción | Resultado esperado | Resultado observado |
| ----- | ----------- | -------------------- | ---- | ------ | ------------------ | ------------------- |
| _(pendiente)_ | | | 1 | Estado previo anotado (§2.1) | Estado registrado | |
| _(pendiente)_ | | | 2 | `openai` → `mock` (+ reinicio) | `/health/ready` AI `mock`; logs `provider=mock` (TS-01) | |
| _(pendiente)_ | | | 3 | Verificar determinismo Mock (NFR-AI-008) | Misma entrada ⇒ misma salida | |
| _(pendiente)_ | | | 4 | `mock` → `openai` (reversión, §5) | `/health/ready` AI `ok`; smoke `/health` 200 (TS-02) | |

### 7.2 Escenarios negativos (DR-02)

| Fecha | Responsable | Escenario | Acción | Resultado esperado | Resultado observado |
| ----- | ----------- | --------- | ------ | ------------------ | ------------------- |
| _(pendiente)_ | | NT-01: `LLM_PROVIDER` inválido | Configurar valor no soportado + arrancar | Fail-fast en boot; diagnóstico en log de arranque | |
| _(pendiente)_ | | NT-02: OpenAI caído con `AI_USE_MOCK_FALLBACK=true` | Simular fallo OpenAI | `fallbackUsed=true`, `provider=mock` en logs | |

**Criterio de cierre (AC-06).** DR-01 confirma el toggle `openai`→`mock`→`openai` end-to-end (con
determinismo del Mock y healthcheck/smoke post-reversión), y DR-02 confirma el diagnóstico de env var
inválida y la degradación observable a Mock. Registrar fecha, responsable y resultado por paso, sin
secretos (SEC-04).

---

## 8. Referencias

- **Configuración autoritativa de env vars IA:** Doc 21 §13 (§511–§531) — `docs/21-Deployment-and-DevOps-Design.md`.
- **Arquitectura IA / LLMProvider, adapters, fallback, demo mode:** Doc 17 — `docs/17-AI-Architecture-and-PromptOps-Design.md`; ADR-AI-001..004 (Doc 22).
- **Higiene de secretos:** Doc 19 — `docs/19-Security-and-Authorization-Design.md`; Doc 21 §10.5, §13.3, §19.3.
- **Despliegue del entorno Demo:** PB-P2-022 (App Runner) · ADR-DEVOPS-001; nota de plataforma: ADR-DEVOPS-008 (EC2).
- **Código real (verificación, no se modifica):**
  - `backend/src/config/env.ts` — esquema y fail-fast de configuración.
  - `backend/src/modules/ai-assistance/infrastructure/llm-provider.factory.ts` — `selectProvider`.
  - `backend/src/modules/ai-assistance/application/ai-execution/ai-execution-logger.ts` — campos de log seguros.
  - `backend/src/modules/platform-health/infrastructure/probes/ai-provider.probe.ts` — AI provider probe (`/health/ready`).
- **Demo readiness relacionada:** [`Pre-Demo-Checklist.md`](./Pre-Demo-Checklist.md) (US-143, ítem **g** → este runbook) · [`Demo-Script.md`](./Demo-Script.md) (US-142) · reset de datos demo US-140 (`/admin/seed`).
- **NFR clave:** NFR-AI-008 (determinismo Mock) · NFR-DEMO-006 (recorrido demo reproducible) · UC-DEMO-001.
