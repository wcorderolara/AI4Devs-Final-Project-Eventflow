# Panel de reset del entorno Demo (US-140 / PB-P3-001)

Experiencia operativa **frontend** para que un admin dispare el _reset surgical_ del entorno Demo
desde el panel admin. **Reutiliza** el backend de **US-086 (PB-P0-014)**: no reimplementa el motor
de reset ni el contrato — solo lo consume y refleja el resultado en la UI.

Ruta: `app/(admin)/admin/seed` → [`SeedDemoPanel`](./components/SeedDemoPanel.tsx).

## Endpoints consumidos (US-086)

| Método | Endpoint                     | Uso                                                   |
| ------ | ---------------------------- | ----------------------------------------------------- |
| GET    | `/api/v1/admin/seed/status`  | Estado del seed (`lastRunAt`, `preset`, `recordCount`) |
| POST   | `/api/v1/admin/seed/reset`   | Reset surgical + repoblado idempotente (`202` + `ResetReportDto`) |

El backend es la **única fuente de verdad de autorización** (ADR-SEC-003). El panel no implementa
lógica de autorización; solo refleja lo que responde el backend.

## Estados de UI

| Estado    | Comportamiento                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------ |
| Loading   | Skeleton mientras carga el status; botón con `aria-busy` mientras el request está en vuelo.       |
| Empty     | `status` con `lastRunAt`/`recordCount` (conteos por entidad).                                     |
| Success   | Reporte del `ResetReportDto`: conteos eliminados/recreados, `seedVersion`, `durationMs` y `correlationId`. |
| Error     | Mensaje neutro + `correlationId`; `409` → "reset en curso"; nunca stack/SQL/PII (SEC-04).          |
| No Demo   | Aviso neutro; el control **no** se expone (ver gating).                                            |

## Gating por entorno (EC-01 / THR-012)

`SEED_DEMO_ENABLED=true` solo está activo en Demo/Dev. Fuera de Demo el backend **no registra la
ruta** y responde `404` (no `403`, para evitar fingerprinting). El panel trata ese `404` como señal
autoritativa de "no disponible aquí": **oculta el control de reset** y muestra un aviso neutro que
**no revela** la existencia del endpoint ni el flag.

## Confirmación (VR-02 / VR-03)

El [`SeedResetDialog`](./components/SeedResetDialog.tsx) exige confirmación explícita: hay que
escribir el token `RESET` para habilitar el disparo. Acepta un `reason` opcional (≤ 500 chars,
alineado al `ResetRequestSchema` de US-086). Cancelar no dispara nada. La mutation no reintenta
(`retry: 0`) ante `409`/`500`.

## Auditoría (AC-03 / SEC-05)

Cada invocación (éxito o fallo) la audita el backend en `AdminAction` (`SEED_RESET` /
`SEED_RESET_FAILED`) con el mismo `correlationId` que aparece en la respuesta y en el header
`X-Correlation-Id`. El panel muestra ese `correlationId` en success y error para trazabilidad
end-to-end.

## Alineaciones documentales no bloqueantes (Tech Spec §16)

- Se adopta **`404`** (ruta no registrada) sobre `403` fuera de Demo, coherente con THR-012 /
  SEC-POL-ADMIN-003. Recomendado alinear Doc 19 §587/§1205 en una próxima revisión.
- `APP_ENV=demo` ⇔ `SEED_DEMO_ENABLED=true` se tratan como **equivalentes**; el flag es la señal
  operativa efectiva.
