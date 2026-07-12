// Adapter — AuthAttemptTracker In-Memory (US-003 / BE-004, DB-001). Default MVP: proceso único
// (App Runner single instance); el estado se pierde en restart, lo cual es aceptable — el rate
// limit canónico (10/IP/10min) sigue conteniendo el abuso bruto. Ventana deslizante: un fallo
// fuera de ventana reinicia la cuenta. Poda oportunista para acotar memoria.
import type { AuthAttemptTracker } from '../../shared/security/auth-attempts/auth-attempt-tracker.port.js';
import type { ClockPort } from '../../shared/domain/clock.port.js';
import { config } from '../../config/env.js';

interface AttemptEntry {
  consecutiveFailures: number;
  lastFailureAt: number;
}

export class InMemoryAuthAttemptTracker implements AuthAttemptTracker {
  private readonly entries = new Map<string, AttemptEntry>();

  constructor(
    private readonly clock: ClockPort,
    private readonly threshold: number = config.AUTH_LOGIN_CAPTCHA_THRESHOLD,
    private readonly windowMs: number = config.AUTH_LOGIN_ATTEMPT_WINDOW_MS,
  ) {}

  private key(ip: string, email: string): string {
    return `${ip}|${email.trim().toLowerCase()}`;
  }

  private isExpired(entry: AttemptEntry, now: number): boolean {
    return now - entry.lastFailureAt > this.windowMs;
  }

  recordFailure(ip: string, email: string): void {
    const now = this.clock.now().getTime();
    const key = this.key(ip, email);
    const current = this.entries.get(key);
    if (!current || this.isExpired(current, now)) {
      this.entries.set(key, { consecutiveFailures: 1, lastFailureAt: now });
    } else {
      this.entries.set(key, { consecutiveFailures: current.consecutiveFailures + 1, lastFailureAt: now });
    }
    this.pruneExpired();
  }

  isCaptchaRequired(ip: string, email: string): boolean {
    const now = this.clock.now().getTime();
    const entry = this.entries.get(this.key(ip, email));
    if (!entry || this.isExpired(entry, now)) return false;
    return entry.consecutiveFailures >= this.threshold;
  }

  resetOnSuccess(ip: string, email: string): void {
    this.entries.delete(this.key(ip, email));
  }

  pruneExpired(): void {
    const now = this.clock.now().getTime();
    for (const [key, entry] of this.entries) {
      if (this.isExpired(entry, now)) this.entries.delete(key);
    }
  }
}
