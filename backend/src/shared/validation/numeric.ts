// Validadores numéricos compartidos (US-096 / BE-001).
import { z } from 'zod';

/** Decimal string no negativo, hasta 2 decimales (precios/montos). */
export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Debe ser un decimal >= 0 con hasta 2 decimales');
