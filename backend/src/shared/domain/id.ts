// Shared kernel — value object Id (branded type) para identidades UUID (US-090 / BE-001).
// Doc 14 §7.1, §24.1. El branded type distingue en tiempo de compilación entre `string` e `Id`.
// Usa `node:crypto` nativo (no el paquete `uuid`) — permitido en domain (no es infra/SDK externo).
import { randomUUID } from 'node:crypto';

export type Id = string & { readonly _brand: 'Id' };

export const Id = {
  from: (value: string): Id => value as Id,
  generate: (): Id => randomUUID() as Id,
};
