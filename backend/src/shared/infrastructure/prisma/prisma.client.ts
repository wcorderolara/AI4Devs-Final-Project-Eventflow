// Shared kernel — punto de importación canónico del singleton de Prisma Client (US-090 / BE-004).
// Doc 14 §24.1. Re-exporta el singleton ya definido en `src/infrastructure/prisma/client.ts`
// (creado en US-099) para evitar múltiples instancias de PrismaClient (duplicación del pool de
// conexiones). Ver Deviation en el execution record de US-090.
export { prisma } from '../../../infrastructure/prisma/client.js';
