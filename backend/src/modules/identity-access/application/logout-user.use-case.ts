// LogoutUserUseCase (US-094 / BE-004; US-005 / BE-001). AC-01/AC-03. Revoca la sesión vigente
// (server-side, idempotente) para que llamadas protegidas posteriores respondan 401 — supera la
// "rotación de cookie" mínima de la US (Deviation D1). El controller además limpia la cookie
// (`Max-Age=0`, flags canónicos).
import type { SessionRepository, AuthEventLogger } from '../../../shared/auth/ports.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export class LogoutUserUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(
    input: { sessionId: string; userId?: string },
    ctx: AuthUseCaseContext = {},
  ): Promise<void> {
    await this.sessions.revoke(input.sessionId, this.clock.now());
    this.events.emit('auth.logout.success', {
      correlationId: ctx.correlationId,
      userId: input.userId,
    });
  }
}
