// Bootstrap del proceso (US-089 / BE-004, OBS-001).
// Orden fail-fast: (1) al importar `./config/env.js` la config se valida con Zod — si una
// variable requerida falta o es inválida, lanza `ZodError` (EC-01, EC-02); (2) `prisma.$connect()`
// stub verifica la integración del cliente; (3) `app.listen(PORT)`.
// Los imports son dinámicos y dentro del `try` para que un fallo de validación en tiempo de
// import quede capturado y el proceso salga con exit code != 0 y un mensaje descriptivo.
// Logs sin PII ni secretos (SEC-03, NFR-OBS-006). El logger estructurado completo es US-091/PB-P0-003.
import type { Server } from 'node:http';

async function main(): Promise<void> {
  // (1) Validación de config (fail-fast). El import ejecuta `parseConfig(process.env)`.
  const { config } = await import('./config/env.js');
  const { default: app } = await import('./app.js');
  const { prisma } = await import('./infrastructure/prisma/client.js');

  // (2) Stub de verificación de conectividad. Schema y migraciones pertenecen a PB-P0-001.
  await prisma.$connect();
  console.info('Database connection established');

  // (3) Servidor escuchando.
  const server: Server = app.listen(config.PORT, () => {
    console.info(`Server listening on port ${config.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // Solo el mensaje (nombres de campos de Zod), nunca los valores de las variables (SEC-03).
  console.error(`[FATAL] Configuration error: ${message}`);
  process.exit(1);
});
