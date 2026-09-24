-- US-008 (PB-P4-001 / DB-001) — Login con Google (OAuth): identidad federada en `users`.
--
-- Motivación (Tech Spec §10):
--   * `google_sub` — `sub` OIDC de Google (identificador estable del usuario en el proveedor).
--     Nullable (las cuentas email/password no lo tienen), UNIQUE (una cuenta por identidad Google).
--   * `password_hash` pasa a NULLABLE para admitir cuentas creadas SOLO por OAuth (sin contraseña).
--
-- Estrategia aditiva, reproducible y sin backfill destructivo (ADR-DB-005):
--   1. Relajar el NOT NULL de `password_hash` — las cuentas existentes conservan su hash.
--   2. Agregar la columna `google_sub` nullable.
--   3. Índice UNIQUE sobre `google_sub` (nombre convencional Prisma `users_google_sub_key`;
--      en Postgres un UNIQUE INDEX ignora los NULL, por lo que múltiples cuentas sin Google
--      no colisionan).
--
-- La invariante "password_hash O google_sub presente" se valida en la capa de aplicación
-- (BE-003), no como CHECK físico (decisión Tech Spec §10 / Task DB-001 Exclude).

-- 1. `password_hash` nullable (forward-only; no rompe cuentas existentes).
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- 2. Nueva columna `google_sub` (nullable).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" TEXT;

-- 3. Índice UNIQUE sobre `google_sub` (equivale al `@unique` de Prisma).
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_key" ON "users"("google_sub");
