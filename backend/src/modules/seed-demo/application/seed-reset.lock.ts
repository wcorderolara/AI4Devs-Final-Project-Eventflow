// US-086 BE-001 — Semáforo in-memory por proceso para el reset surgical del entorno Demo.
// Garantiza exclusión mutua entre dos invocaciones concurrentes de `POST /admin/seed/reset`
// (EC-03). MVP single-instance (App Runner) → basta un lock por proceso; NO es un lock
// distribuido ni persistente (fuera de alcance, ver §7 del Technical Spec).
//
// Contrato:
//   - `acquire()` devuelve `true` si adquirió el lock, `false` si ya estaba tomado.
//   - `release()` libera el lock de forma idempotente (llamarlo sin lock tomado es no-op).
//   - `isLocked()` expone el estado para diagnóstico/tests.
// El caller es responsable de liberar en `try/finally`.

export class SeedResetLock {
  private locked = false;

  /** Intenta adquirir el lock. `true` = adquirido; `false` = ya estaba ocupado (→ 409). */
  acquire(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  /** Libera el lock. Idempotente: liberar un lock ya libre no lanza ni corrompe el estado. */
  release(): void {
    this.locked = false;
  }

  /** Estado actual del lock (para tests y diagnóstico). */
  isLocked(): boolean {
    return this.locked;
  }
}

// Instancia única compartida por el proceso: el gate de concurrencia debe ser global, no por
// request. El controller/use case reciben esta instancia por inyección para poder mockearla en tests.
export const seedResetLock = new SeedResetLock();
