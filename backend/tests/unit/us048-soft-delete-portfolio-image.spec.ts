// US-048 (PB-P1-026 / QA-001 + QA-004) — Unit tests de:
// - DTOs Zod (`ImageIdParamSchema`, `SoftDeletePortfolioImageBodySchema`).
// - Branches del `SoftDeletePortfolioImageUseCase` (vendor null/hidden, attachment 404 uniforme,
//   idempotencia por carrera, éxito con log).
// - Cobertura del contrato del logger `vendor.portfolio.deleted`.
import { describe, expect, it, vi } from 'vitest';
import { SoftDeletePortfolioImageUseCase } from '../../src/modules/attachments/application/soft-delete-portfolio-image.use-case.js';
import {
  ImageIdParamSchema,
  SoftDeletePortfolioImageBodySchema,
} from '../../src/modules/attachments/interface/dto/soft-delete-portfolio-image.request.js';
import {
  AttachmentNotFoundError,
  PortfolioProfileHiddenError,
  PortfolioProfileNotFoundError,
} from '../../src/modules/attachments/domain/attachment.errors.js';
import type {
  ActiveAttachmentSnapshot,
  AttachmentRepository,
  CreateAttachmentInput,
  SoftDeleteAttachmentInput,
  VendorProfileForPortfolio,
  VendorProfileForPortfolioReader,
} from '../../src/modules/attachments/ports/attachment.repository.js';
import type { AttachmentView } from '../../src/modules/attachments/domain/attachment.js';
import type { PortfolioEventLogger } from '../../src/modules/attachments/application/portfolio-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const NOW = new Date('2026-07-15T12:00:00Z');
const clock: ClockPort = { now: () => NOW };
const VENDOR_USER_ID = '00000000-0000-0000-0000-0000000000a1';
const VENDOR_PROFILE_ID = '00000000-0000-0000-0000-0000000000b1';
const IMAGE_ID = '11111111-1111-1111-1111-111111111111';

function vendorProfile(overrides: Partial<VendorProfileForPortfolio> = {}): VendorProfileForPortfolio {
  return { id: VENDOR_PROFILE_ID, status: 'approved', deletedAt: null, ...overrides };
}

function attachmentSnapshot(
  overrides: Partial<ActiveAttachmentSnapshot> = {},
): ActiveAttachmentSnapshot {
  return { id: IMAGE_ID, ownerId: VENDOR_PROFILE_ID, workLabel: 'boda-lopez-2024', ...overrides };
}

function fakeReader(result: VendorProfileForPortfolio | null): VendorProfileForPortfolioReader {
  return { findActiveByVendorUserId: vi.fn(async () => result) };
}

function fakeAttachments(overrides: Partial<AttachmentRepository> = {}): AttachmentRepository {
  return {
    create: vi.fn(async (_input: CreateAttachmentInput): Promise<AttachmentView> => {
      throw new Error('not used in delete tests');
    }),
    existsActiveByOwnerAndLabel: vi.fn(async () => false),
    countActiveByOwnerAndLabel: vi.fn(async () => 0),
    countDistinctActiveLabelsByOwner: vi.fn(async () => 0),
    findActiveOwnedByIdAndVendor: vi.fn(async () => attachmentSnapshot()),
    softDeleteByIdOwned: vi.fn(async (_input: SoftDeleteAttachmentInput) => true),
    ...overrides,
  };
}

function fakeLogger(): PortfolioEventLogger {
  return { emitUploaded: vi.fn(), emitUploadFailed: vi.fn(), emitDeleted: vi.fn() };
}

// ── DTO schemas ─────────────────────────────────────────────────────────────

describe('ImageIdParamSchema', () => {
  it('acepta UUID válido', () => {
    expect(() => ImageIdParamSchema.parse({ imageId: IMAGE_ID })).not.toThrow();
  });
  it('rechaza cadena no-UUID', () => {
    expect(() => ImageIdParamSchema.parse({ imageId: 'not-a-uuid' })).toThrow();
  });
});

describe('SoftDeletePortfolioImageBodySchema', () => {
  it('acepta body vacío (deletion_reason ausente)', () => {
    expect(() => SoftDeletePortfolioImageBodySchema.parse({})).not.toThrow();
  });
  it('acepta deletion_reason 1..500 chars', () => {
    expect(() => SoftDeletePortfolioImageBodySchema.parse({ deletion_reason: 'a'.repeat(500) }))
      .not.toThrow();
    expect(() => SoftDeletePortfolioImageBodySchema.parse({ deletion_reason: 'ok' })).not.toThrow();
  });
  it('rechaza deletion_reason > 500 chars', () => {
    expect(() =>
      SoftDeletePortfolioImageBodySchema.parse({ deletion_reason: 'a'.repeat(501) }),
    ).toThrow();
  });
  it('rechaza deletion_reason vacío (tras trim)', () => {
    expect(() => SoftDeletePortfolioImageBodySchema.parse({ deletion_reason: '   ' })).toThrow();
  });
  it('rechaza propiedades extra (strict)', () => {
    expect(() =>
      SoftDeletePortfolioImageBodySchema.parse({ deletion_reason: 'ok', extra: true }),
    ).toThrow();
  });
});

// ── Use case ────────────────────────────────────────────────────────────────

describe('SoftDeletePortfolioImageUseCase', () => {
  it('AC-01/AC-02: happy path — actualiza y emite log', async () => {
    const attachments = fakeAttachments();
    const events = fakeLogger();
    const useCase = new SoftDeletePortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      events,
      clock,
    );

    await useCase.execute({
      vendorUserId: VENDOR_USER_ID,
      imageId: IMAGE_ID,
      deletionReason: 'Imagen desactualizada',
    });

    expect(attachments.softDeleteByIdOwned).toHaveBeenCalledWith({
      id: IMAGE_ID,
      ownerId: VENDOR_PROFILE_ID,
      deletedBy: VENDOR_USER_ID,
      deletionReason: 'Imagen desactualizada',
    });
    expect(events.emitDeleted).toHaveBeenCalledOnce();
  });

  it('AC-02: sin deletion_reason persiste null', async () => {
    const attachments = fakeAttachments();
    const useCase = new SoftDeletePortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      fakeLogger(),
      clock,
    );

    await useCase.execute({ vendorUserId: VENDOR_USER_ID, imageId: IMAGE_ID, deletionReason: null });

    expect(attachments.softDeleteByIdOwned).toHaveBeenCalledWith(
      expect.objectContaining({ deletionReason: null }),
    );
  });

  it('EC-04: vendor sin perfil activo → PortfolioProfileNotFoundError', async () => {
    const useCase = new SoftDeletePortfolioImageUseCase(
      fakeAttachments(),
      fakeReader(null),
      fakeLogger(),
      clock,
    );
    await expect(
      useCase.execute({ vendorUserId: VENDOR_USER_ID, imageId: IMAGE_ID, deletionReason: null }),
    ).rejects.toBeInstanceOf(PortfolioProfileNotFoundError);
  });

  it('EC-03: vendor con status=hidden → PortfolioProfileHiddenError', async () => {
    const useCase = new SoftDeletePortfolioImageUseCase(
      fakeAttachments(),
      fakeReader(vendorProfile({ status: 'hidden' })),
      fakeLogger(),
      clock,
    );
    await expect(
      useCase.execute({ vendorUserId: VENDOR_USER_ID, imageId: IMAGE_ID, deletionReason: null }),
    ).rejects.toBeInstanceOf(PortfolioProfileHiddenError);
  });

  it('EC-01/EC-02: attachment ajeno o inexistente → AttachmentNotFoundError (uniforme)', async () => {
    const attachments = fakeAttachments({
      findActiveOwnedByIdAndVendor: vi.fn(async () => null),
    });
    const useCase = new SoftDeletePortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      fakeLogger(),
      clock,
    );
    await expect(
      useCase.execute({ vendorUserId: VENDOR_USER_ID, imageId: IMAGE_ID, deletionReason: null }),
    ).rejects.toBeInstanceOf(AttachmentNotFoundError);
    expect(attachments.softDeleteByIdOwned).not.toHaveBeenCalled();
  });

  it('TOCTOU: carrera contra otro DELETE (updateMany count=0) → AttachmentNotFoundError', async () => {
    const attachments = fakeAttachments({
      softDeleteByIdOwned: vi.fn(async () => false),
    });
    const events = fakeLogger();
    const useCase = new SoftDeletePortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      events,
      clock,
    );
    await expect(
      useCase.execute({ vendorUserId: VENDOR_USER_ID, imageId: IMAGE_ID, deletionReason: null }),
    ).rejects.toBeInstanceOf(AttachmentNotFoundError);
    // El log de éxito NO se emite en la rama de carrera.
    expect(events.emitDeleted).not.toHaveBeenCalled();
  });
});
