// Adapter Prisma — PublicVendorRepository (US-046 / BE-002, §7 Tech Spec).
// Ejecuta el lookup por slug con `include` eager y aplica el filtro público
// (`status='approved' AND deleted_at IS NULL`, D6). El repository devuelve una vista rica
// pero NO conoce el DTO externo — el whitelist final es responsabilidad del mapper
// (BE-003). Los reviews traen `authorId` para que el mapper pueda pseudonimizar el nombre;
// el `Attachment` polimórfico se lee por separado con el key `owner_type='vendor_work'`
// (Doc 18 §19) para preservar el patrón del módulo `attachments`.
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  PublicVendorPortfolioAttachmentRecord,
  PublicVendorRecord,
  PublicVendorRepository,
} from '../ports/public-vendor.repository.js';

const TOP_REVIEWS_LIMIT = 10;
const OWNER_TYPE_VENDOR_WORK = 'vendor_work';

export class PrismaPublicVendorRepository implements PublicVendorRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findPublicApprovedBySlug(slug: string): Promise<PublicVendorRecord | null> {
    // US-047 (PB-P1-041 / AC-04): filtra `is_hidden=false` para que un vendor moderado con
    // `hide` desaparezca del detalle público sin cambiar su `status='approved'` — visibilidad
    // ortogonal al estado (Decisión PO D2). Coherente con el filtro del directorio (US-045).
    const vendor = await this.prisma.vendorProfile.findFirst({
      where: {
        slug,
        status: 'approved',
        isHidden: false,
        deletedAt: null,
      },
      include: {
        location: true,
        categories: {
          where: { serviceCategory: { isActive: true, deletedAt: null } },
          include: { serviceCategory: true },
        },
        services: {
          where: { isActive: true, deletedAt: null },
          include: { serviceCategory: true },
          orderBy: [{ basePrice: 'asc' }, { createdAt: 'asc' }],
        },
        reviews: {
          where: { status: 'published', deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: TOP_REVIEWS_LIMIT,
          include: {
            author: { select: { fullName: true } },
          },
        },
      },
    });

    if (vendor === null) return null;

    const reviewsTotalPublished = await this.prisma.review.count({
      where: { vendorProfileId: vendor.id, status: 'published', deletedAt: null },
    });

    const attachments = await this.prisma.attachment.findMany({
      where: {
        ownerType: OWNER_TYPE_VENDOR_WORK,
        ownerId: vendor.id,
        status: 'active',
        deletedAt: null,
      },
      select: { url: true, workLabel: true, createdAt: true },
      orderBy: [{ workLabel: 'asc' }, { createdAt: 'asc' }],
    });

    const portfolio: PublicVendorPortfolioAttachmentRecord[] = attachments
      .filter((a) => a.workLabel !== null)
      .map((a) => ({ workLabel: a.workLabel as string, url: a.url }));

    return {
      // US-066 (PB-P1-039): expone `id` para consumo del listado paginado desde el cliente.
      id: vendor.id,
      slug: vendor.slug ?? slug,
      businessName: vendor.businessName,
      bio: vendor.bio,
      ratingAvg: vendor.ratingAvg === null ? null : Number(vendor.ratingAvg),
      reviewsCount: vendor.reviewsCount,
      reviewsTotalPublished,
      location: vendor.location
        ? {
            code: vendor.location.code,
            country: vendor.location.country,
            region: vendor.location.region,
            city: vendor.location.city,
          }
        : null,
      categories: vendor.categories.map((c) => ({
        code: c.serviceCategory.code,
        label: c.serviceCategory.label,
      })),
      packages: vendor.services.map((s) => ({
        packageName: s.packageName,
        basePrice: s.basePrice.toString(),
        currencyCode: s.currencyCode.toString(),
        description: s.description,
        serviceCategoryCode: s.serviceCategory.code,
      })),
      portfolio,
      reviews: vendor.reviews.map((r) => ({
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewerDisplayName: r.author.fullName ?? '',
      })),
    };
  }
}
