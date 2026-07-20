// Mapper — Admin review list item (US-077 / BE-001). Tech Spec §7.
//
// A diferencia del mapper anonimizado del listing público (`anonymized-review.mapper.ts` de
// US-066), este mapper **NO** aplica anonimato: el admin está autorizado a ver PII completa
// (Decisión PO US-077 D4 · SEC-03). Expone:
//
//   - `id, rating, comment, status, created_at`
//   - `author: {user_id, display_name}` — `display_name` = `fullName ?? email` (safe fallback).
//   - `vendor: {id, business_name, slug}`
//   - `event: {id, title}`
//   - `last_admin_action: {action, reason, admin_id, created_at}` opcional — se toma del chain
//     `reviews.admin_action_id → admin_actions` establecido por `ModerateReviewUseCase` (US-067).
//     El `reason` proviene de `admin_actions.metadata.reason` (BR-ADMIN-011).
//
// Este mapper NO filtra campos por privacidad; delegas la responsabilidad de autorización al
// guard (`sessionAuth + roleMiddleware(['admin'])`) que envuelve la ruta. Cualquier consumidor
// distinto de admin DEBE usar `anonymized-review.mapper.ts` para preservar SEC-04 de US-066.
import type { Prisma } from '@prisma/client';

export type AdminReviewMapperInput = Prisma.ReviewGetPayload<{
  select: {
    id: true;
    rating: true;
    comment: true;
    status: true;
    createdAt: true;
    author: { select: { id: true; fullName: true; email: true } };
    vendorProfile: { select: { id: true; businessName: true; slug: true } };
    bookingIntent: {
      select: { event: { select: { id: true; title: true } } };
    };
    adminAction: {
      select: { action: true; adminUserId: true; createdAt: true; metadata: true };
    };
  };
}>;

export interface AdminReviewListItem {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  author: {
    userId: string;
    displayName: string;
  };
  vendor: {
    id: string;
    businessName: string;
    slug: string | null;
  };
  event: {
    id: string;
    title: string;
  };
  lastAdminAction: {
    action: string;
    reason: string | null;
    adminId: string | null;
    createdAt: string;
  } | null;
}

export function toAdminReviewListItem(r: AdminReviewMapperInput): AdminReviewListItem {
  const meta = (r.adminAction?.metadata ?? null) as Record<string, unknown> | null;
  const reason = meta && typeof meta.reason === 'string' ? meta.reason : null;

  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    author: {
      userId: r.author.id,
      displayName: r.author.fullName ?? r.author.email,
    },
    vendor: {
      id: r.vendorProfile.id,
      businessName: r.vendorProfile.businessName,
      slug: r.vendorProfile.slug ?? null,
    },
    event: {
      id: r.bookingIntent.event.id,
      title: r.bookingIntent.event.title,
    },
    lastAdminAction: r.adminAction
      ? {
          action: r.adminAction.action,
          reason,
          adminId: r.adminAction.adminUserId ?? null,
          createdAt: r.adminAction.createdAt.toISOString(),
        }
      : null,
  };
}
