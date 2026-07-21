// US-078 / BE-001 — Mapper: fila Prisma → `AdminEventListItem` (proyección resumida para el
// listado admin). Whitelist explícita: solo los campos necesarios para render de la tabla
// (paridad con `admin-vendor.mapper.ts`). El detalle completo se sirve por otro endpoint.
import type { EventStatus, Prisma } from '@prisma/client';

export interface AdminEventListItemOwner {
  id: string;
  email: string;
  fullName: string | null;
}

export interface AdminEventListItemType {
  id: string;
  code: string;
  label: string;
}

export interface AdminEventListItem {
  id: string;
  title: string;
  status: EventStatus;
  eventDate: string | null; // ISO 8601 o null (draft sin fecha)
  guestsCount: number | null;
  estimatedBudget: string | null; // Decimal serializado
  currency: string;
  createdAt: string;
  deletedAt: string | null;
  owner: AdminEventListItemOwner;
  eventType: AdminEventListItemType;
}

export type AdminEventListRow = Prisma.EventGetPayload<{
  select: {
    id: true;
    title: true;
    status: true;
    eventDate: true;
    guestsCount: true;
    estimatedBudget: true;
    currency: true;
    createdAt: true;
    deletedAt: true;
    user: { select: { id: true; email: true; fullName: true } };
    eventType: { select: { id: true; code: true; label: true } };
  };
}>;

export function toAdminEventListItem(row: AdminEventListRow): AdminEventListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    eventDate: row.eventDate ? row.eventDate.toISOString() : null,
    guestsCount: row.guestsCount ?? null,
    estimatedBudget: row.estimatedBudget ? row.estimatedBudget.toString() : null,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    owner: {
      id: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName ?? null,
    },
    eventType: {
      id: row.eventType.id,
      code: row.eventType.code,
      label: row.eventType.label,
    },
  };
}
