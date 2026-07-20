// Placeholder de capa (US-090 estructural). `event-catalog` no expone puertos dedicados:
// el módulo consume `PrismaClient` directamente en `application/*.use-case.ts` — el
// contrato de negocio del catálogo (lecturas planas + writes admin) no requiere una
// abstracción de repositorio adicional. `export {}` mantiene el módulo compilable con `tsc`.
export {};
