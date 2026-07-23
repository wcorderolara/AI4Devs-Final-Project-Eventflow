// Placeholder de capa (US-090). US-116 (PB-P2-013) coloca el HTTP controller y router bajo
// `infrastructure/http/` porque `platform-health` es un módulo de infraestructura horizontal
// (no expone comandos/queries del dominio de negocio). `export {}` mantiene el módulo
// compilable con `tsc` y cumple la invariante de 5 capas verificada por `modules-structure.spec.ts`.
export {};
