// MSW handlers — vendor-portfolio (US-043 / PB-P1-026 / FE-003).
// Simulan `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` cubriendo 201, 400
// INVALID_MIME / INVALID_IMAGE / INVALID_WORK_LABEL, 401, 403, 404, 409 IMAGE_LIMIT_REACHED /
// WORK_LABEL_LIMIT_REACHED / PROFILE_HIDDEN, 413 FILE_TOO_LARGE. La rama se dispara por el
// `work_label` — permite tests de UI sin depender del backend real ni de una imagen válida.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000043';
const ATTACHMENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OWNER_ID = '11111111-1111-1111-1111-111111111111';

const TRIGGER_INVALID_MIME = 'msw-invalid-mime';
const TRIGGER_INVALID_IMAGE = 'msw-invalid-image';
const TRIGGER_INVALID_WORK_LABEL = 'msw-invalid_?';
const TRIGGER_UNAUTH = 'msw-unauth';
const TRIGGER_FORBIDDEN = 'msw-forbidden';
const TRIGGER_NOT_FOUND = 'msw-not-found';
const TRIGGER_IMAGE_LIMIT = 'msw-image-limit';
const TRIGGER_WORK_LABEL_LIMIT = 'msw-work-label-limit';
const TRIGGER_PROFILE_HIDDEN = 'msw-profile-hidden';
const TRIGGER_FILE_TOO_LARGE = 'msw-file-too-large';

interface ErrorEnvelope {
  code: string;
  status: number;
  message: string;
}

const ERRORS: Record<string, ErrorEnvelope> = {
  [TRIGGER_INVALID_MIME]: { code: 'INVALID_MIME', status: 400, message: 'File MIME type is not allowed' },
  [TRIGGER_INVALID_IMAGE]: { code: 'INVALID_IMAGE', status: 400, message: 'The uploaded image could not be processed' },
  [TRIGGER_INVALID_WORK_LABEL]: { code: 'INVALID_WORK_LABEL', status: 400, message: 'The work_label is invalid' },
  [TRIGGER_UNAUTH]: { code: 'AUTHENTICATION_REQUIRED', status: 401, message: 'Session required' },
  [TRIGGER_FORBIDDEN]: { code: 'FORBIDDEN', status: 403, message: 'Only vendors can upload portfolio images' },
  [TRIGGER_NOT_FOUND]: { code: 'PROFILE_NOT_FOUND', status: 404, message: 'Vendor profile not found' },
  [TRIGGER_IMAGE_LIMIT]: { code: 'IMAGE_LIMIT_REACHED', status: 409, message: 'Reached the limit of 10 images' },
  [TRIGGER_WORK_LABEL_LIMIT]: {
    code: 'WORK_LABEL_LIMIT_REACHED',
    status: 409,
    message: 'Reached the limit of 20 work_labels',
  },
  [TRIGGER_PROFILE_HIDDEN]: { code: 'PROFILE_HIDDEN', status: 409, message: 'Profile hidden by admin' },
  [TRIGGER_FILE_TOO_LARGE]: { code: 'FILE_TOO_LARGE', status: 413, message: 'File exceeds the maximum size' },
};

export const vendorPortfolioHandlers = [
  http.post('*/api/v1/vendors/me/portfolio/works/:workLabel/images', async ({ params }) => {
    const raw = params.workLabel;
    const workLabel = typeof raw === 'string' ? decodeURIComponent(raw) : '';

    const errorSpec = ERRORS[workLabel];
    if (errorSpec !== undefined) {
      return HttpResponse.json(
        { error: { code: errorSpec.code, message: errorSpec.message, correlationId: CORRELATION } },
        { status: errorSpec.status },
      );
    }

    return HttpResponse.json(
      {
        data: {
          id: ATTACHMENT_ID,
          owner_type: 'vendor_work',
          owner_id: OWNER_ID,
          work_label: workLabel,
          mime: 'image/jpeg',
          size_bytes: 123456,
          storage_url: '2026/07/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
          status: 'active',
          created_at: '2026-07-15T12:00:00.000Z',
          dimensions: { width: 1536, height: 2048 },
        },
        correlationId: CORRELATION,
      },
      { status: 201 },
    );
  }),
];

// US-048 (PB-P1-026 / FE-002): MSW del DELETE. La rama se dispara por el sufijo del `imageId`
// (UUID donde los últimos 12 hex dígitos codifican el escenario). Reuso del mismo mapping de
// códigos que el upload; agregamos `ATTACHMENT_NOT_FOUND` (404 uniforme para ajeno/inexistente/
// idempotencia) e `INVALID_DELETION_REASON` (400) e `INVALID_UUID` (implícito por regex del
// route matcher, que ya rechazaría non-UUIDs).

const DELETE_ERRORS: Record<string, { code: string; status: number; message: string }> = {
  'attachment-not-found': {
    code: 'ATTACHMENT_NOT_FOUND',
    status: 404,
    message: 'Attachment not found',
  },
  'invalid-deletion-reason': {
    code: 'INVALID_DELETION_REASON',
    status: 400,
    message: 'deletion_reason must be between 1 and 500 characters',
  },
  'profile-hidden': { code: 'PROFILE_HIDDEN', status: 409, message: 'Profile hidden by admin' },
  'profile-not-found': { code: 'PROFILE_NOT_FOUND', status: 404, message: 'Vendor profile not found' },
  'unauth': { code: 'AUTHENTICATION_REQUIRED', status: 401, message: 'Session required' },
  'forbidden': { code: 'FORBIDDEN', status: 403, message: 'Vendors only' },
};

function resolveDeleteError(imageId: string): { code: string; status: number; message: string } | null {
  for (const [trigger, spec] of Object.entries(DELETE_ERRORS)) {
    if (imageId.includes(trigger)) return spec;
  }
  return null;
}

vendorPortfolioHandlers.push(
  http.delete('*/api/v1/vendors/me/portfolio/images/:imageId', async ({ params }) => {
    const rawId = params.imageId;
    const imageId = typeof rawId === 'string' ? rawId : '';
    const errorSpec = resolveDeleteError(imageId);
    if (errorSpec !== null) {
      return HttpResponse.json(
        { error: { code: errorSpec.code, message: errorSpec.message, correlationId: CORRELATION } },
        { status: errorSpec.status },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
);

export const VENDOR_PORTFOLIO_DELETE_MSW_TRIGGERS = {
  ATTACHMENT_NOT_FOUND: 'attachment-not-found',
  INVALID_DELETION_REASON: 'invalid-deletion-reason',
  PROFILE_HIDDEN: 'profile-hidden',
  PROFILE_NOT_FOUND: 'profile-not-found',
  AUTHENTICATION_REQUIRED: 'unauth',
  FORBIDDEN: 'forbidden',
} as const;

export const VENDOR_PORTFOLIO_MSW_TRIGGERS = {
  INVALID_MIME: TRIGGER_INVALID_MIME,
  INVALID_IMAGE: TRIGGER_INVALID_IMAGE,
  INVALID_WORK_LABEL: TRIGGER_INVALID_WORK_LABEL,
  AUTHENTICATION_REQUIRED: TRIGGER_UNAUTH,
  FORBIDDEN: TRIGGER_FORBIDDEN,
  PROFILE_NOT_FOUND: TRIGGER_NOT_FOUND,
  IMAGE_LIMIT_REACHED: TRIGGER_IMAGE_LIMIT,
  WORK_LABEL_LIMIT_REACHED: TRIGGER_WORK_LABEL_LIMIT,
  PROFILE_HIDDEN: TRIGGER_PROFILE_HIDDEN,
  FILE_TOO_LARGE: TRIGGER_FILE_TOO_LARGE,
} as const;
