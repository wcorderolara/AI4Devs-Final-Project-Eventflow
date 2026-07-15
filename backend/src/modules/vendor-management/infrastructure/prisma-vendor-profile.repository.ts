// Adapter Prisma — VendorProfileRepository (US-040 / BE-003).
// Escritura transaccional: insert `vendor_profiles` + bulk insert `vendor_profile_categories`
// dentro de `prisma.$transaction`. La UNIQUE constraint del slug se maneja con retry (P2002)
// en el use case.
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  CategoryReplacementResult,
  CreateVendorProfileInput,
  LocationReader,
  ServiceCategoryLookup,
  UpdateVendorProfileFields,
  VendorProfileEditableSnapshot,
  VendorProfileRepository,
  VendorProfileWithCategoriesSnapshot,
} from '../ports/vendor-profile.repository.js';
import {
  ProfileAlreadyExistsError,
  SlugConflictError,
} from '../ports/vendor-profile.repository.js';
import type { VendorProfileStatus, VendorProfileView } from '../domain/vendor-profile.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export class PrismaVendorProfileRepository implements VendorProfileRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async existsForUser(userId: string): Promise<boolean> {
    const found = await this.prisma.vendorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return found !== null;
  }

  async findSlugsStartingWith(base: string): Promise<string[]> {
    const escaped = base.replace(/[\\%_]/g, (m) => `\\${m}`);
    const rows = await this.prisma.vendorProfile.findMany({
      where: {
        OR: [{ slug: base }, { slug: { startsWith: `${escaped}-` } }],
      },
      select: { slug: true },
    });
    return rows.map((r) => r.slug).filter((s): s is string => typeof s === 'string');
  }

  async create(input: CreateVendorProfileInput): Promise<VendorProfileView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.vendorProfile.create({
          data: {
            userId: input.vendorUserId,
            businessName: input.businessName,
            bio: input.bio,
            locationId: input.locationId,
            languagesSupported: input.languagesSupported,
            slug: input.slug,
            status: 'pending',
            categoryChangeCount: 0,
          },
          select: {
            id: true,
            userId: true,
            businessName: true,
            bio: true,
            locationId: true,
            languagesSupported: true,
            slug: true,
            status: true,
            createdAt: true,
          },
        });

        await tx.vendorProfileCategory.createMany({
          data: input.categoryIds.map((serviceCategoryId) => ({
            vendorProfileId: created.id,
            serviceCategoryId,
          })),
        });

        const categories = await tx.serviceCategory.findMany({
          where: { id: { in: input.categoryIds } },
          select: { id: true, label: true },
        });

        return toView({
          ...created,
          categories: categories.map((c) => ({ id: c.id, name: c.label })),
        });
      });
    } catch (err) {
      if (isPrismaKnown(err) && err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]) : [];
        if (target.includes('slug') || target.includes('vendor_profiles_slug_key')) {
          throw new SlugConflictError(input.slug);
        }
        if (target.includes('user_id') || target.includes('vendor_profiles_user_id_key')) {
          throw new ProfileAlreadyExistsError();
        }
      }
      throw err;
    }
  }

  async findEditableByVendorUserId(
    vendorUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VendorProfileEditableSnapshot | null> {
    const client = tx ?? this.prisma;
    const row = await client.vendorProfile.findFirst({
      where: { userId: vendorUserId, deletedAt: null },
      select: { id: true, userId: true, status: true, deletedAt: true },
    });
    if (!row) return null;
    return toSnapshot(row);
  }

  async findAnyByVendorUserId(
    vendorUserId: string,
  ): Promise<VendorProfileEditableSnapshot | null> {
    const row = await this.prisma.vendorProfile.findFirst({
      where: { userId: vendorUserId },
      select: { id: true, userId: true, status: true, deletedAt: true },
    });
    return row ? toSnapshot(row) : null;
  }

  async update(
    id: string,
    patch: UpdateVendorProfileFields,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const data: Prisma.VendorProfileUpdateInput = {};
    if (patch.businessName !== undefined) data.businessName = patch.businessName;
    if (patch.bio !== undefined) data.bio = patch.bio;
    if (patch.locationId !== undefined) data.location = { connect: { id: patch.locationId } };
    if (patch.languagesSupported !== undefined) data.languagesSupported = patch.languagesSupported;
    await tx.vendorProfile.update({ where: { id }, data });
  }

  async updateStatus(
    id: string,
    status: VendorProfileStatus,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.vendorProfile.update({ where: { id }, data: { status } });
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.vendorProfile.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  async findActiveWithCategoriesByVendorUserId(
    vendorUserId: string,
  ): Promise<VendorProfileWithCategoriesSnapshot | null> {
    const row = await this.prisma.vendorProfile.findFirst({
      where: { userId: vendorUserId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        status: true,
        deletedAt: true,
        categoryChangeCount: true,
        requiresAdminReview: true,
        lastCategoryChangeAt: true,
        categories: {
          select: { serviceCategoryId: true },
          orderBy: { serviceCategoryId: 'asc' },
        },
      },
    });
    if (!row) return null;
    return toWithCategoriesSnapshot(row);
  }

  async lockAndRereadForCategoryChange(
    vendorProfileId: string,
    tx: Prisma.TransactionClient,
  ): Promise<VendorProfileWithCategoriesSnapshot | null> {
    // Lock explícito de la fila para evitar TOCTOU con `PATCH /vendors/me`, `DELETE
    // /vendors/me` o cambios concurrentes desde el mismo endpoint.
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "vendor_profiles" WHERE id = ${vendorProfileId}::uuid AND deleted_at IS NULL FOR UPDATE`;
    if (locked.length === 0) return null;
    const row = await tx.vendorProfile.findFirst({
      where: { id: vendorProfileId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        status: true,
        deletedAt: true,
        categoryChangeCount: true,
        requiresAdminReview: true,
        lastCategoryChangeAt: true,
        categories: {
          select: { serviceCategoryId: true },
          orderBy: { serviceCategoryId: 'asc' },
        },
      },
    });
    if (!row) return null;
    return toWithCategoriesSnapshot(row);
  }

  async replaceCategoriesAndAdvanceCounter(args: {
    vendorProfileId: string;
    currentCategoryIds: readonly string[];
    desiredCategoryIds: readonly string[];
    tx: Prisma.TransactionClient;
  }): Promise<CategoryReplacementResult> {
    const desired = new Set(args.desiredCategoryIds);
    const current = new Set(args.currentCategoryIds);
    const toRemove = [...current].filter((id) => !desired.has(id));
    const toAdd = [...desired].filter((id) => !current.has(id));

    if (toRemove.length > 0) {
      await args.tx.vendorProfileCategory.deleteMany({
        where: {
          vendorProfileId: args.vendorProfileId,
          serviceCategoryId: { in: toRemove },
        },
      });
    }
    if (toAdd.length > 0) {
      await args.tx.vendorProfileCategory.createMany({
        data: toAdd.map((serviceCategoryId) => ({
          vendorProfileId: args.vendorProfileId,
          serviceCategoryId,
        })),
      });
    }

    const updated = await args.tx.vendorProfile.update({
      where: { id: args.vendorProfileId },
      data: {
        categoryChangeCount: { increment: 1 },
        lastCategoryChangeAt: new Date(),
        requiresAdminReview: true,
      },
      select: {
        categoryChangeCount: true,
        requiresAdminReview: true,
        lastCategoryChangeAt: true,
      },
    });

    // `lastCategoryChangeAt` acaba de setearse — el `!` refleja el invariante post-write.
    return {
      categoryChangeCount: updated.categoryChangeCount,
      requiresAdminReview: updated.requiresAdminReview,
      lastCategoryChangeAt: updated.lastCategoryChangeAt as Date,
    };
  }

  async findByIdWithCategories(id: string): Promise<VendorProfileView | null> {
    const row = await this.prisma.vendorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        businessName: true,
        bio: true,
        locationId: true,
        languagesSupported: true,
        slug: true,
        status: true,
        createdAt: true,
        categories: {
          select: {
            serviceCategory: { select: { id: true, label: true } },
          },
        },
      },
    });
    if (!row) return null;
    return toView({
      ...row,
      categories: row.categories.map((c) => ({
        id: c.serviceCategory.id,
        name: c.serviceCategory.label,
      })),
    });
  }
}

export class PrismaLocationReader implements LocationReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async existsActive(id: string): Promise<boolean> {
    // Nota: el modelo `Location` no expone `isActive` en el schema (Doc 6 / catálogo curado
    // por admin). Se interpreta "activa" como "presente y no soft-deleted".
    const row = await this.prisma.location.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }
}

export class PrismaServiceCategoryLookup implements ServiceCategoryLookup {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findActiveIds(ids: readonly string[]): Promise<{ id: string; name: string }[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.serviceCategory.findMany({
      where: { id: { in: [...ids] }, isActive: true, deletedAt: null },
      select: { id: true, label: true },
    });
    return rows.map((r) => ({ id: r.id, name: r.label }));
  }

  async findByIds(ids: readonly string[]): Promise<{ id: string; isActive: boolean }[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.serviceCategory.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true, isActive: true },
    });
    return rows.map((r) => ({ id: r.id, isActive: r.isActive }));
  }
}

interface RawVendorRow {
  id: string;
  userId: string;
  businessName: string;
  bio: string | null;
  locationId: string | null;
  languagesSupported: string[];
  slug: string | null;
  status: string;
  createdAt: Date;
  categories: { id: string; name: string }[];
}

function toView(row: RawVendorRow): VendorProfileView {
  // Los invariantes de "creación US-040" garantizan que estos campos no son nulos aquí.
  if (row.bio === null || row.locationId === null || row.slug === null) {
    throw new Error('VendorProfile row missing required fields after US-040 creation');
  }
  return {
    id: row.id,
    vendorUserId: row.userId,
    businessName: row.businessName,
    bio: row.bio,
    locationId: row.locationId,
    languagesSupported: row.languagesSupported as VendorProfileView['languagesSupported'],
    categories: row.categories,
    slug: row.slug,
    status: row.status as VendorProfileStatus,
    createdAt: row.createdAt,
  };
}

function isPrismaKnown(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}

function toSnapshot(row: {
  id: string;
  userId: string;
  status: string;
  deletedAt: Date | null;
}): VendorProfileEditableSnapshot {
  return {
    id: row.id,
    vendorUserId: row.userId,
    status: row.status as VendorProfileEditableSnapshot['status'],
    deletedAt: row.deletedAt,
  };
}

function toWithCategoriesSnapshot(row: {
  id: string;
  userId: string;
  status: string;
  deletedAt: Date | null;
  categoryChangeCount: number;
  requiresAdminReview: boolean;
  lastCategoryChangeAt: Date | null;
  categories: { serviceCategoryId: string }[];
}): VendorProfileWithCategoriesSnapshot {
  return {
    id: row.id,
    vendorUserId: row.userId,
    status: row.status as VendorProfileWithCategoriesSnapshot['status'],
    deletedAt: row.deletedAt,
    categoryChangeCount: row.categoryChangeCount,
    requiresAdminReview: row.requiresAdminReview,
    lastCategoryChangeAt: row.lastCategoryChangeAt,
    categoryIds: row.categories.map((c) => c.serviceCategoryId),
  };
}

export type { SupportedLanguage };
