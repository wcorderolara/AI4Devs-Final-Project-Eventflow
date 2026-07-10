import type { PrismaClient } from '@prisma/client';

// MigrationStatusChecker (US-085 EC-02). Detecta drift de schema con una sonda liviana: si las
// tablas base no existen, las migraciones no están aplicadas → exit code 2 con mensaje accionable.
// Errores de conexión (no drift) se re-lanzan para que el CLI los trate como exit code 1 (EC-01).

export class MigrationDriftError extends Error {
  constructor() {
    super('Database schema is not up to date. Run `prisma migrate deploy` before seeding (US-100).');
    this.name = 'MigrationDriftError';
  }
}

export async function assertSchemaReady(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM users LIMIT 1');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/does not exist|42P01|P2021|relation .* does not exist/i.test(message)) {
      throw new MigrationDriftError();
    }
    throw err;
  }
}
