# Entrega Final — EventFlow (AI4Devs)

Esta carpeta agrupa los **entregables de cierre** de la entrega final: reportes de evidencia
académica, catálogo de PromptOps, guion de demo, índice de ADRs y runbooks operativos de la
demo desplegada. Todos son documentos de consolidación (por enlace) sobre el trabajo ya
materializado en el repositorio.

> **Demo desplegada:** <https://main.d2jh1ql4whmeue.amplifyapp.com> (frontend Amplify + backend EC2 Free Tier con Caddy TLS en <https://18-235-214-199.sslip.io> + RDS PostgreSQL, ADR-DEVOPS-008)
> **Identidad gráfica (Stitch):** <https://stitch.withgoogle.com/projects/10889252267442839867>
> **Usuarios de prueba:** ver [`backend/docs/operations/seed.md`](../../backend/docs/operations/seed.md)
> y [`docs/Evaluator-Flows-Guide.md`](../../docs/Evaluator-Flows-Guide.md) — el entorno desplegado
> corre el **mismo seed demo** (`admin@seed.eventflow.test`, `organizer0..5@seed.eventflow.test`,
> `vendor0..11@seed.eventflow.test`, password `Demo1234!`, captcha mock `__test__`).

## Índice de entregables

| # | Documento | Propósito | User Story | Link |
|---:|---|---|---|---|
| 1 | Reporte final de evidencia académica | Consolida por enlace toda la evidencia SDLC, de implementación, PromptOps y demo; congela el estado de la entrega. | US-150 (PB-P3-011) | [Ver](./1-Academic-Evidence-Report.md) |
| 2 | Catálogo de prompts y outputs (PromptOps) | Evidencia de PromptOps responsable: prompt, output ejemplar (datos sintéticos del MockAIProvider), guardrails y HITL por capacidad IA. | US-149 (PB-P2-026) | [Ver](./2-AI-Prompt-Evidence-Catalog.md) |
| 3 | Guion de Demo Guiada (10–15 min) | Guion paso a paso para recorrer los flujos MVP end-to-end sobre el entorno con seed. | US-142 (PB-P3-003) | [Ver](./3-Demo-Script.md) |
| 4 | Índice maestro de ADRs | Índice navegable de los 46 ADRs (generado desde `docs/22`, no editar a mano). | — | [Ver](./4-ADR-Index.md) |
| 5 | Runbook — Smoke sobre la URL de Demo | Procedimiento para correr el smoke E2E mínimo (login, eventos, IA Mock, comparador) contra la URL pública, manual o por workflow post-deploy. | US-146 (PB-P3-007) | [Ver](./5-Demo-URL-Smoke-Runbook.md) |
| 6 | Runbook — Toggle `LLM_PROVIDER` / `AI_DEMO_MODE` | Procedimiento para alternar el proveedor IA (OpenAI/Mock) y activar el modo demo determinista. | US-144 (PB-P3-005) | [Ver](./6-AI-Provider-Toggle-Runbook.md) |

## Cómo acceder a la demo

1. Abrir <https://main.d2jh1ql4whmeue.amplifyapp.com>.
2. Iniciar sesión con cualquier usuario del seed demo (tabla de arriba). En modo captcha `mock`,
   el token válido es el literal `__test__`.
3. Seguir el [Guion de Demo Guiada](./3-Demo-Script.md) o la
   [Evaluator Flows Guide](../../docs/Evaluator-Flows-Guide.md) para recorrer los flujos por rol.

> Si la demo no está disponible o el seed fue alterado, el entorno puede reconstruirse localmente
> siguiendo el **Local Setup** del [README raíz](../../README.md).
