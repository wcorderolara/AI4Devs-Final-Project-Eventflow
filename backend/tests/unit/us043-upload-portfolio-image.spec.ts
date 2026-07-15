// US-043 (PB-P1-026 / QA-001 + QA-005) — Unit tests de:
// - `magic-bytes-validator` (JPEG/PNG/WebP + spoofing + mismatch).
// - Branches del `UploadPortfolioImageUseCase` (hidden / not-found / limit / work-label-limit /
//   invalid-mime / invalid-image / compensación en fallo de DB).
// - Contract del `toUploadPortfolioImageResponse` (QA-004).
import { describe, expect, it, vi } from 'vitest';
import { UploadPortfolioImageUseCase } from '../../src/modules/attachments/application/upload-portfolio-image.use-case.js';
import {
  detectImageMime,
  validateImageMagicBytes,
} from '../../src/modules/attachments/application/magic-bytes-validator.js';
import { toUploadPortfolioImageResponse } from '../../src/modules/attachments/interface/dto/upload-portfolio-image.response.js';
import {
  ImageLimitReachedError,
  InvalidImageError,
  InvalidMimeError,
  PortfolioProfileHiddenError,
  PortfolioProfileNotFoundError,
  WorkLabelLimitReachedError,
} from '../../src/modules/attachments/domain/attachment.errors.js';
import type {
  AttachmentRepository,
  CreateAttachmentInput,
  VendorProfileForPortfolio,
  VendorProfileForPortfolioReader,
} from '../../src/modules/attachments/ports/attachment.repository.js';
import type { FileStoragePort, SaveFileInput } from '../../src/modules/attachments/ports/file-storage.port.js';
import type { ProcessedImage } from '../../src/modules/attachments/application/sharp-pipeline.js';
import type { PortfolioEventLogger } from '../../src/modules/attachments/application/portfolio-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type { AttachmentView } from '../../src/modules/attachments/domain/attachment.js';

const NOW = new Date('2026-07-15T12:00:00Z');
const clock: ClockPort = { now: () => NOW };
const VENDOR_USER_ID = '00000000-0000-0000-0000-0000000000a1';
const VENDOR_PROFILE_ID = '00000000-0000-0000-0000-0000000000b1';

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP_SIGNATURE = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);
const PDF_SIGNATURE = Buffer.from('%PDF-1.4\n', 'ascii');

function vendorProfile(overrides: Partial<VendorProfileForPortfolio> = {}): VendorProfileForPortfolio {
  return { id: VENDOR_PROFILE_ID, status: 'approved', deletedAt: null, ...overrides };
}

function fakeAttachments(overrides: Partial<AttachmentRepository> = {}): AttachmentRepository {
  return {
    create: vi.fn(
      async (input: CreateAttachmentInput): Promise<AttachmentView> => ({
        id: input.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        workLabel: input.workLabel,
        mime: input.mime,
        sizeBytes: input.sizeBytes,
        storageUrl: input.storageUrl,
        status: 'active',
        createdAt: NOW,
        dimensions: input.dimensions,
      }),
    ),
    existsActiveByOwnerAndLabel: vi.fn(async () => false),
    countActiveByOwnerAndLabel: vi.fn(async () => 0),
    countDistinctActiveLabelsByOwner: vi.fn(async () => 0),
    ...overrides,
  };
}

function fakeReader(
  result: VendorProfileForPortfolio | null,
): VendorProfileForPortfolioReader {
  return { findActiveByVendorUserId: vi.fn(async () => result) };
}

function fakeStorage(overrides: Partial<FileStoragePort> = {}): FileStoragePort {
  return {
    save: vi.fn(
      async (input: SaveFileInput) => ({
        storageUrl: `2026/07/${input.uuid}.${input.extension}`,
      }),
    ),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
}

function fakeLogger(): PortfolioEventLogger {
  return { emitUploaded: vi.fn(), emitUploadFailed: vi.fn() };
}

function fakeProcessor(dims = { width: 1536, height: 2048 }) {
  return vi.fn(async (): Promise<ProcessedImage> => ({
    buffer: Buffer.alloc(500_000, 0x22),
    width: dims.width,
    height: dims.height,
    mime: 'image/jpeg',
  }));
}

describe('detectImageMime', () => {
  it('detects JPEG signature', () => {
    expect(detectImageMime(JPEG_SIGNATURE)).toBe('image/jpeg');
  });

  it('detects PNG signature', () => {
    expect(detectImageMime(PNG_SIGNATURE)).toBe('image/png');
  });

  it('detects WebP signature', () => {
    expect(detectImageMime(WEBP_SIGNATURE)).toBe('image/webp');
  });

  it('returns null for unknown signature (PDF)', () => {
    expect(detectImageMime(PDF_SIGNATURE)).toBeNull();
  });
});

describe('validateImageMagicBytes', () => {
  it('accepts declared MIME that matches magic-bytes', () => {
    const result = validateImageMagicBytes({ buffer: JPEG_SIGNATURE, headerMime: 'image/jpeg' });
    expect(result).toEqual({ ok: true, detectedMime: 'image/jpeg' });
  });

  it('rejects header MIME outside allowlist (application/pdf)', () => {
    const result = validateImageMagicBytes({ buffer: PDF_SIGNATURE, headerMime: 'application/pdf' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('header_not_allowed');
  });

  it('rejects allowlisted header when magic-bytes are unknown', () => {
    const result = validateImageMagicBytes({ buffer: PDF_SIGNATURE, headerMime: 'image/png' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('magic_bytes_unknown');
  });

  it('rejects PDF spoofed as image/png (magic-bytes vs header mismatch)', () => {
    // The PDF header doesn't match PNG magic-bytes, so detection returns null → magic_bytes_unknown.
    // A closer spoofing check: buffer with WebP magic-bytes but header claiming image/jpeg.
    const result = validateImageMagicBytes({ buffer: WEBP_SIGNATURE, headerMime: 'image/jpeg' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('header_magic_mismatch');
  });
});

describe('UploadPortfolioImageUseCase', () => {
  it('AC-01: happy path — inserta attachment y emite log uploaded', async () => {
    const attachments = fakeAttachments();
    const storage = fakeStorage();
    const events = fakeLogger();
    const useCase = new UploadPortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      storage,
      events,
      clock,
      fakeProcessor(),
    );

    const view = await useCase.execute({
      vendorUserId: VENDOR_USER_ID,
      workLabel: 'boda-lopez-2024',
      fileBuffer: JPEG_SIGNATURE,
      headerMime: 'image/jpeg',
    });

    expect(view.workLabel).toBe('boda-lopez-2024');
    expect(view.mime).toBe('image/jpeg');
    expect(view.status).toBe('active');
    expect(storage.save).toHaveBeenCalledOnce();
    expect(attachments.create).toHaveBeenCalledOnce();
    expect(events.emitUploaded).toHaveBeenCalledOnce();
    expect(events.emitUploadFailed).not.toHaveBeenCalled();
  });

  it('EC-04: vendor sin perfil activo → PortfolioProfileNotFoundError', async () => {
    const useCase = new UploadPortfolioImageUseCase(
      fakeAttachments(),
      fakeReader(null),
      fakeStorage(),
      fakeLogger(),
      clock,
      fakeProcessor(),
    );
    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'boda-lopez-2024',
        fileBuffer: JPEG_SIGNATURE,
        headerMime: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(PortfolioProfileNotFoundError);
  });

  it('EC-03: vendor con status=hidden → PortfolioProfileHiddenError', async () => {
    const useCase = new UploadPortfolioImageUseCase(
      fakeAttachments(),
      fakeReader(vendorProfile({ status: 'hidden' })),
      fakeStorage(),
      fakeLogger(),
      clock,
      fakeProcessor(),
    );
    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'boda-lopez-2024',
        fileBuffer: JPEG_SIGNATURE,
        headerMime: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(PortfolioProfileHiddenError);
  });

  it('EC-01: header MIME allowlisted pero magic-bytes distintos → InvalidMimeError', async () => {
    const useCase = new UploadPortfolioImageUseCase(
      fakeAttachments(),
      fakeReader(vendorProfile()),
      fakeStorage(),
      fakeLogger(),
      clock,
      fakeProcessor(),
    );
    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'boda-lopez-2024',
        fileBuffer: PDF_SIGNATURE,
        headerMime: 'image/png',
      }),
    ).rejects.toBeInstanceOf(InvalidMimeError);
  });

  it('AC-02: 10 imágenes activas en el grupo → ImageLimitReachedError', async () => {
    const attachments = fakeAttachments({
      countActiveByOwnerAndLabel: vi.fn(async () => 10),
      existsActiveByOwnerAndLabel: vi.fn(async () => true),
    });
    const useCase = new UploadPortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      fakeStorage(),
      fakeLogger(),
      clock,
      fakeProcessor(),
    );
    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'boda-lopez-2024',
        fileBuffer: JPEG_SIGNATURE,
        headerMime: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(ImageLimitReachedError);
  });

  it('EC-06: 20 work_labels distintos y el label es nuevo → WorkLabelLimitReachedError', async () => {
    const attachments = fakeAttachments({
      existsActiveByOwnerAndLabel: vi.fn(async () => false),
      countActiveByOwnerAndLabel: vi.fn(async () => 0),
      countDistinctActiveLabelsByOwner: vi.fn(async () => 20),
    });
    const useCase = new UploadPortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      fakeStorage(),
      fakeLogger(),
      clock,
      fakeProcessor(),
    );
    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'nuevo-trabajo-2026',
        fileBuffer: JPEG_SIGNATURE,
        headerMime: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(WorkLabelLimitReachedError);
  });

  it('AC-03: fallo del pipeline → InvalidImageError', async () => {
    const processor = vi.fn(async () => {
      throw new InvalidImageError();
    });
    const useCase = new UploadPortfolioImageUseCase(
      fakeAttachments(),
      fakeReader(vendorProfile()),
      fakeStorage(),
      fakeLogger(),
      clock,
      processor,
    );
    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'boda-lopez-2024',
        fileBuffer: JPEG_SIGNATURE,
        headerMime: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(InvalidImageError);
  });

  it('Compensación: si la inserción falla, se elimina el binario recién escrito', async () => {
    const attachments = fakeAttachments({
      create: vi.fn(async () => {
        throw new Error('DB failed after storage write');
      }),
    });
    const storage = fakeStorage();
    const useCase = new UploadPortfolioImageUseCase(
      attachments,
      fakeReader(vendorProfile()),
      storage,
      fakeLogger(),
      clock,
      fakeProcessor(),
    );

    await expect(
      useCase.execute({
        vendorUserId: VENDOR_USER_ID,
        workLabel: 'boda-lopez-2024',
        fileBuffer: JPEG_SIGNATURE,
        headerMime: 'image/jpeg',
      }),
    ).rejects.toThrow('DB failed after storage write');
    expect(storage.save).toHaveBeenCalledOnce();
    expect(storage.delete).toHaveBeenCalledOnce();
  });
});

describe('toUploadPortfolioImageResponse (QA-004 contract)', () => {
  it('mapea la vista al shape canónico del §9 API Contract', () => {
    const view: AttachmentView = {
      id: '11111111-1111-1111-1111-111111111111',
      ownerType: 'vendor_work',
      ownerId: '22222222-2222-2222-2222-222222222222',
      workLabel: 'boda-lopez-2024',
      mime: 'image/jpeg',
      sizeBytes: 512_000,
      storageUrl: '2026/07/foo.jpg',
      status: 'active',
      createdAt: new Date('2026-07-15T12:00:00Z'),
      dimensions: { width: 1536, height: 2048 },
    };
    expect(toUploadPortfolioImageResponse(view)).toEqual({
      id: view.id,
      owner_type: 'vendor_work',
      owner_id: view.ownerId,
      work_label: view.workLabel,
      mime: view.mime,
      size_bytes: view.sizeBytes,
      storage_url: view.storageUrl,
      status: 'active',
      created_at: '2026-07-15T12:00:00.000Z',
      dimensions: view.dimensions,
    });
  });
});
