// Stub representativo de naming convention (US-090 / BE-006). Doc 14 §24.2: `prisma-<entity>.repository.ts`.
// Adaptador que implementa el puerto del módulo (import intra-módulo permitido por el boundary).
import type { UserRepository } from '../ports/user.repository.js';

export class PrismaUserRepository implements UserRepository {}
