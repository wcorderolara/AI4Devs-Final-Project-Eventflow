// Bounded context `localization` (Doc 14 §9). Placeholder documental: en el MVP no tiene capas
// propias. Los idiomas soportados viven en `shared/constants/languages.ts` y los catálogos i18n
// en cada módulo consumidor (p. ej. `notifications/i18n`). `export {}` mantiene el módulo
// compilable con `tsc`.
export {};
