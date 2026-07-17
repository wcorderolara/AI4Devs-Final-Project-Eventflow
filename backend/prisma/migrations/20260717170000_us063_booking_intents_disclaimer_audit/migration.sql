-- US-063 (PB-P1-037 / DB-002) — BookingIntent disclaimer audit trail.
--
-- Objetivo (Tech Spec §10, Decisiones D2 + D7):
--   Persistir en `booking_intents` 4 columnas de auditoría del disclaimer aceptado por el
--   organizer al crear el intent (US-060) y por el vendor al confirmarlo (US-061). El copy
--   está versionado por la constante `BOOKING_DISCLAIMER_COPY_VERSION` en la aplicación —
--   la columna de version es `text` para no acoplar la DB al enum de versiones futuras.
--
--   - `disclaimer_accepted_at_create  timestamptz NOT NULL` — set en cada create (US-060 refactor).
--   - `disclaimer_accepted_at_confirm timestamptz NULL`     — set en cada confirm (US-061 refactor).
--   - `disclaimer_copy_version_create  text        NOT NULL DEFAULT 'v1'` — version aceptada al crear.
--   - `disclaimer_copy_version_confirm text        NULL`               — version aceptada al confirmar.
--
-- Backfill (AC-04):
--   Para BookingIntents preexistentes:
--   - `disclaimer_accepted_at_create = created_at` (implicit acceptance at record creation time).
--   - `disclaimer_copy_version_create = 'v1'` (única version histórica del copy en MVP).
--   - `disclaimer_accepted_at_confirm = confirmed_at` sólo si `status='confirmed_intent'`.
--   - `disclaimer_copy_version_confirm = 'v1'` sólo si `status='confirmed_intent'`.
--
--   En un repo virgen (sin filas) el backfill no dispara UPDATEs — es idempotente.

-- 1) Nuevas columnas — la columna NOT NULL usa DEFAULT durante el ADD COLUMN para poblar filas
--    preexistentes con `now()`; el backfill posterior sobrescribe con `created_at`.
ALTER TABLE "booking_intents"
  ADD COLUMN "disclaimer_accepted_at_create"  timestamptz(6) NOT NULL DEFAULT NOW(),
  ADD COLUMN "disclaimer_accepted_at_confirm" timestamptz(6),
  ADD COLUMN "disclaimer_copy_version_create"  text NOT NULL DEFAULT 'v1',
  ADD COLUMN "disclaimer_copy_version_confirm" text;

-- 2) Backfill audit del create desde `created_at` (más preciso que el DEFAULT `NOW()`).
UPDATE "booking_intents"
   SET "disclaimer_accepted_at_create" = "created_at",
       "disclaimer_copy_version_create" = 'v1';

-- 3) Backfill audit del confirm sólo para intents en `confirmed_intent` con `confirmed_at` real.
UPDATE "booking_intents"
   SET "disclaimer_accepted_at_confirm" = "confirmed_at",
       "disclaimer_copy_version_confirm" = 'v1'
 WHERE "status" = 'confirmed_intent'
   AND "confirmed_at" IS NOT NULL;

-- 4) Se conservan los DEFAULT como safety net para que futuros INSERTs sin las columnas explícitas
--    (p.ej. tests raw SQL) no rompan el NOT NULL. El use case aplicativo siempre pasa el valor
--    explícito capturado en el momento de la aceptación (D5 + log estructurado).
