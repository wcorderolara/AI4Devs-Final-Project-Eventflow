// Códigos de tipo de evento soportados por el contrato Event API (US-095 / BE-001). VR-01.
// El código es la clave pública (`EventType.code`); el use case valida su existencia/activo y lo
// resuelve al `eventTypeId` (FK) en la frontera de persistencia.
export const EVENT_TYPE_CODES = [
  'wedding',
  'xv',
  'baptism',
  'baby_shower',
  'birthday',
  'corporate',
] as const;

export type EventTypeCode = (typeof EVENT_TYPE_CODES)[number];
