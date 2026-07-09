// Shared kernel — TransactionManagerPort (US-090 / BE-003). Doc 14 §7.1.
// Puerto abstracto para ejecutar una unidad de trabajo transaccional. La implementación
// concreta (adaptador Prisma) pertenece a PB-P0-001/PB-P0-003.
export interface TransactionManagerPort {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
