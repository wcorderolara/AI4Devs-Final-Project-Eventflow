// Adapter Prisma — AttachmentRepository (US-043 / PB-P1-026 / BE-005).
// Conteos case-insensitive con `LOWER(work_label)` vía `$queryRaw` (Prisma no ofrece un helper
// de collation LOWER en su query builder). El índice parcial
// `idx_attachments_vendor_work_active(owner_id, work_label) WHERE owner_type='vendor_work' AND
// status='active'` cubre los tres conteos.
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { AttachmentView } from '../domain/attachment.js';
import { OWNER_TYPE_VENDOR_WORK, type AttachmentOwnerType } from '../domain/constants.js';
import type {
  AttachmentRepository,
  CreateAttachmentInput,
  VendorProfileForPortfolio,
  VendorProfileForPortfolioReader,
} from '../ports/attachment.repository.js';

export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(input: CreateAttachmentInput): Promise<AttachmentView> {
    const created = await this.prisma.attachment.create({
      data: {
        id: input.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        status: 'active',
        url: input.storageUrl,
        fileName: `${input.id}.jpg`,
        mimeType: input.mime,
        workLabel: input.workLabel,
        sizeBytes: input.sizeBytes,
        uploadedBy: input.uploadedBy,
        isSeed: false,
      },
      select: {
        id: true,
        ownerType: true,
        ownerId: true,
        status: true,
        url: true,
        mimeType: true,
        workLabel: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return {
      id: created.id,
      ownerType: created.ownerType as AttachmentOwnerType,
      ownerId: created.ownerId,
      workLabel: created.workLabel ?? input.workLabel,
      mime: created.mimeType ?? input.mime,
      sizeBytes: created.sizeBytes ?? input.sizeBytes,
      storageUrl: created.url,
      status: created.status === 'active' ? 'active' : 'deleted',
      createdAt: created.createdAt,
      dimensions: input.dimensions,
    };
  }

  async existsActiveByOwnerAndLabel(ownerId: string, workLabel: string): Promise<boolean> {
    const count = await this.countActiveByOwnerAndLabel(ownerId, workLabel);
    return count > 0;
  }

  async countActiveByOwnerAndLabel(ownerId: string, workLabel: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM attachments
        WHERE owner_id = ${ownerId}::uuid
          AND owner_type = ${OWNER_TYPE_VENDOR_WORK}
          AND status = 'active'
          AND LOWER(work_label) = LOWER(${workLabel})
      `,
    );
    const [first] = rows;
    return first ? Number(first.count) : 0;
  }

  async countDistinctActiveLabelsByOwner(ownerId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(DISTINCT LOWER(work_label))::bigint AS count
        FROM attachments
        WHERE owner_id = ${ownerId}::uuid
          AND owner_type = ${OWNER_TYPE_VENDOR_WORK}
          AND status = 'active'
          AND work_label IS NOT NULL
      `,
    );
    const [first] = rows;
    return first ? Number(first.count) : 0;
  }
}

/**
 * Reader del `VendorProfile` reducido al contrato que el use case necesita. No se acopla al
 * repository del bounded context `vendor-management` para preservar la frontera hexagonal.
 */
export class PrismaVendorProfileForPortfolioReader implements VendorProfileForPortfolioReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findActiveByVendorUserId(vendorUserId: string): Promise<VendorProfileForPortfolio | null> {
    const row = await this.prisma.vendorProfile.findFirst({
      where: { userId: vendorUserId, deletedAt: null },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!row) return null;
    return { id: row.id, status: row.status, deletedAt: row.deletedAt };
  }
}
