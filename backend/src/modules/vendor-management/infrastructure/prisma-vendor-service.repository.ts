// Adapter Prisma — `VendorServiceRepository` (US-044 / PB-P1-027 BE-003).
// Aísla Prisma del use case. Todas las escrituras son single-row. `basePrice` es `Decimal`
// (numeric(14,2)); Prisma lo acepta como string y lo retorna como Decimal — normalizamos con
// `toFixed(2)` para que el response y los logs sean estables.
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  VendorServiceCurrencyCode,
  VendorServiceView,
} from '../domain/vendor-service.js';
import type {
  CreateVendorServiceInput,
  UpdateVendorServiceInput,
  VendorServiceOwnedSnapshot,
  VendorServiceRepository,
} from '../ports/vendor-service.repository.js';

type VendorServiceRow = Prisma.VendorServiceGetPayload<{
  select: {
    id: true;
    vendorProfileId: true;
    serviceCategoryId: true;
    packageName: true;
    description: true;
    basePrice: true;
    currencyCode: true;
    isActive: true;
    aiGeneratedDescription: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

const ROW_SELECT = {
  id: true,
  vendorProfileId: true,
  serviceCategoryId: true,
  packageName: true,
  description: true,
  basePrice: true,
  currencyCode: true,
  isActive: true,
  aiGeneratedDescription: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toView(row: VendorServiceRow): VendorServiceView {
  return {
    id: row.id,
    vendorProfileId: row.vendorProfileId,
    serviceCategoryId: row.serviceCategoryId,
    packageName: row.packageName,
    description: row.description,
    basePrice: row.basePrice.toFixed(2),
    currencyCode: row.currencyCode as VendorServiceCurrencyCode,
    isActive: row.isActive,
    aiGeneratedDescription: row.aiGeneratedDescription,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaVendorServiceRepository implements VendorServiceRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  countActiveByVendorProfileId(vendorProfileId: string): Promise<number> {
    return this.prisma.vendorService.count({
      where: { vendorProfileId, isActive: true, deletedAt: null },
    });
  }

  async findAllByVendorProfileId(vendorProfileId: string): Promise<VendorServiceView[]> {
    const rows = await this.prisma.vendorService.findMany({
      where: { vendorProfileId, deletedAt: null },
      select: ROW_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toView);
  }

  async findOwnedById(
    id: string,
    vendorProfileId: string,
  ): Promise<VendorServiceOwnedSnapshot | null> {
    const row = await this.prisma.vendorService.findFirst({
      where: { id, vendorProfileId, deletedAt: null },
      select: { id: true, vendorProfileId: true, isActive: true },
    });
    return row ?? null;
  }

  async existsOwnedById(id: string, vendorProfileId: string): Promise<boolean> {
    const row = await this.prisma.vendorService.findFirst({
      where: { id, vendorProfileId, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }

  async create(input: CreateVendorServiceInput): Promise<VendorServiceView> {
    const row = await this.prisma.vendorService.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        serviceCategoryId: input.serviceCategoryId,
        packageName: input.packageName,
        description: input.description,
        basePrice: input.basePrice,
        currencyCode: input.currencyCode,
        isActive: true,
        aiGeneratedDescription: false,
      },
      select: ROW_SELECT,
    });
    return toView(row);
  }

  async update(
    id: string,
    vendorProfileId: string,
    patch: UpdateVendorServiceInput,
  ): Promise<VendorServiceView> {
    const data: Prisma.VendorServiceUncheckedUpdateInput = {};
    if (patch.packageName !== undefined) data.packageName = patch.packageName;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.basePrice !== undefined) data.basePrice = patch.basePrice;
    if (patch.currencyCode !== undefined) data.currencyCode = patch.currencyCode;
    if (patch.serviceCategoryId !== undefined) data.serviceCategoryId = patch.serviceCategoryId;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;

    // El use case garantiza previamente que el servicio pertenece al vendor; usamos
    // `updateMany` para atarnos al par (id, vendorProfileId) sin exponer un `findUnique`
    // adicional y por defensa profunda.
    await this.prisma.vendorService.updateMany({
      where: { id, vendorProfileId, deletedAt: null },
      data,
    });

    const row = await this.prisma.vendorService.findFirstOrThrow({
      where: { id, vendorProfileId, deletedAt: null },
      select: ROW_SELECT,
    });
    return toView(row);
  }

  async softDeactivate(
    id: string,
    vendorProfileId: string,
  ): Promise<{ transitioned: boolean } | null> {
    const row = await this.prisma.vendorService.findFirst({
      where: { id, vendorProfileId, deletedAt: null },
      select: { id: true, isActive: true },
    });
    if (row === null) return null;

    if (!row.isActive) {
      return { transitioned: false };
    }

    const result = await this.prisma.vendorService.updateMany({
      where: { id, vendorProfileId, isActive: true, deletedAt: null },
      data: { isActive: false },
    });
    return { transitioned: result.count > 0 };
  }
}
