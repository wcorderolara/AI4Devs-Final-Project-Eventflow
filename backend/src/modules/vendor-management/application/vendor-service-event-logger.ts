// Logger de eventos del CRUD `VendorService` (US-044 / BE-008).
// Solo IDs opacos y metadatos operativos — nada de precios en logs de estado transaccional
// (los precios viven en el response; los logs son para trazabilidad de transiciones y auditoría
// ligera, no para BI).
export const VENDOR_SERVICE_CREATED_EVENT = 'vendor.service.created';
export const VENDOR_SERVICE_UPDATED_EVENT = 'vendor.service.updated';
export const VENDOR_SERVICE_DEACTIVATED_EVENT = 'vendor.service.deactivated';

export interface VendorServiceCreatedContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  vendorServiceId: string;
  serviceCategoryId: string;
  currencyCode: string;
  activeCountAfter: number;
  durationMs?: number;
}

export interface VendorServiceUpdatedContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  vendorServiceId: string;
  fieldsUpdated: readonly string[];
  reactivated: boolean;
  durationMs?: number;
}

export interface VendorServiceDeactivatedContext {
  correlationId?: string;
  vendorProfileId: string;
  vendorUserId: string;
  vendorServiceId: string;
  durationMs?: number;
}

export interface VendorServiceEventLogger {
  emitCreated(ctx: VendorServiceCreatedContext): void;
  emitUpdated(ctx: VendorServiceUpdatedContext): void;
  emitDeactivated(ctx: VendorServiceDeactivatedContext): void;
}

export function buildVendorServiceCreatedPayload(ctx: VendorServiceCreatedContext) {
  return {
    event: VENDOR_SERVICE_CREATED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    vendorServiceId: ctx.vendorServiceId,
    serviceCategoryId: ctx.serviceCategoryId,
    currencyCode: ctx.currencyCode,
    activeCountAfter: ctx.activeCountAfter,
    durationMs: ctx.durationMs,
  };
}

export function buildVendorServiceUpdatedPayload(ctx: VendorServiceUpdatedContext) {
  return {
    event: VENDOR_SERVICE_UPDATED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    vendorServiceId: ctx.vendorServiceId,
    fieldsUpdated: ctx.fieldsUpdated,
    reactivated: ctx.reactivated,
    durationMs: ctx.durationMs,
  };
}

export function buildVendorServiceDeactivatedPayload(ctx: VendorServiceDeactivatedContext) {
  return {
    event: VENDOR_SERVICE_DEACTIVATED_EVENT,
    correlationId: ctx.correlationId,
    vendorProfileId: ctx.vendorProfileId,
    vendorUserId: ctx.vendorUserId,
    vendorServiceId: ctx.vendorServiceId,
    durationMs: ctx.durationMs,
  };
}
