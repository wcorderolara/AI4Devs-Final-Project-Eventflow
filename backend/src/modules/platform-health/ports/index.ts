// Placeholder de capa (US-090). US-116 (PB-P2-013) no define ports formales — los probes
// (`PostgresProbe`, `AiProviderProbe`) se instancian directamente en la composition root
// (`infrastructure/http/composition.ts`) con dependencias inyectadas (Prisma singleton, Pino).
// `export {}` mantiene el módulo compilable con `tsc`.
export {};
