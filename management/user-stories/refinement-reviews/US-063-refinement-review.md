# User Story Refinement Review — US-063

## Source User Story File
management/user-stories/US-063-booking-disclaimer-visible.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-063-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q7 resueltas. La US-063 declara `Backlog Item: PB-P1-037`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (`FR-BOOKING-005`→`FR-BOOKING-006/007`; agregados `UC-BOOKING-001/002`, `BR-BOOKING-006/009`, `NFR-OBS-005`). Refactor explícito de US-061 D8 para enforcement server-side bilateral. AC-01..AC-04, EC-01..EC-03, VR-01..VR-02. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-063 |
| Backlog Item | PB-P1-037 — Disclaimer visible + committed sincronizado |
| Epic | EPIC-CMP-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-063-refinement-review.md |

## 2. Diagnóstico

US-063 es 1 de 2 en PB-P1-037 (US-063 disclaimer + US-064 committed dashboard). El disclaimer ya fue parcialmente entregado en US-060 (enforcement server-side al crear) y US-061 (sólo client-side al confirmar, per Decisión PO US-061 D8). US-063 consolida el componente compartido + audit trail + paridad de enforcement.

### Hallazgos clave

1. **Trazabilidad**: cita `FR-BOOKING-005` (no existe — la correcta es **`FR-BOOKING-006`** "disclaimer visible al crear o confirmar BookingIntent"). Faltan `BR-BOOKING-009` (sin penalty ⇒ explica el disclaimer), `NFR-OBS-005`.
2. **Falta declarar `Backlog Item: PB-P1-037`**.
3. **Conflicto con US-061 D8**: US-061 confirmó sin enforcement server-side. US-063 plantea enforcement server-side. PO debe decidir si refactoriza US-061 para paridad o mantiene asimetría (create=server, confirm=client-only).
4. **Persistencia `agreement_accepted_at`**: nuevo campo en `booking_intents` (o `booking_intent_agreements` tabla aparte para historial). PB-P1-037 description sugiere "disclaimer aceptado al confirmar" ⇒ audit explícito.
5. **Componente compartido**: `BookingDisclaimer` reusable en `CreateBookingDialog` (US-060) y `ConfirmBookingDialog` (US-061).
6. **Copy del disclaimer**: texto exacto FR-BOOKING-006 + BR-BOOKING-009 validado por legal en 4 locales.
7. **Audit/log event**: `disclaimer.accepted` con context (create vs confirm).
8. **Acción en cancel?**: PB-P1-037 no menciona disclaimer en cancel. Recomendado: NO (la cancel ya es sin penalty per BR-BOOKING-009).

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO/Tech | Enforcement server-side en confirm (US-061) | **Sí, extender enforcement server-side** a US-061 para paridad. Body de confirm pasa a requerir `disclaimer_accepted: true` (refactor de Decisión US-061 D8). |
| Q2 | Tech | Persistencia agreement | Añadir `agreement_accepted_at timestamptz` y `agreement_accepted_at_confirm timestamptz` (o una sola con `agreement_accepted_at` actualizada en cada acción). Recomendado: 2 columnas separadas (`disclaimer_accepted_at_create`, `disclaimer_accepted_at_confirm`) para audit completo. |
| Q3 | PO | Copy del disclaimer | Texto único en 4 locales: "Acuerdo final, pago y contrato ocurren fuera de la plataforma. EventFlow no procesa pagos ni cobra penalizaciones. Aceptas continuar bajo estas condiciones." (Decisión PO 8.1 #5 + FR-BOOKING-006 + FR-BOOKING-007). |
| Q4 | Tech | Componente compartido | `BookingDisclaimer` (Client Component) reusable que recibe `mode: 'create' | 'confirm'`, expone checkbox, retorna `agreement_accepted` al parent. Usado en US-060 + US-061. |
| Q5 | PO | Log event | `disclaimer.accepted` con `userId`, `bookingIntentId`, `action: 'create' | 'confirm'`, `agreementCopyVersion` (constante en código). |
| Q6 | PO | Disclaimer en cancel | NO. La cancel sin penalty (BR-BOOKING-009) no requiere disclaimer adicional. |
| Q7 | Tech | Versionado del copy | Mantener constante `BOOKING_DISCLAIMER_COPY_VERSION = 'v1'` en código. Si copy cambia (futuro), bump version y log lo registra. |

## 9. Recomendación

`Needs Refinement` — 7 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
