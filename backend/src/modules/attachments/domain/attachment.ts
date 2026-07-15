// Entidad de dominio Attachment (US-043 / PB-P1-026). Vista transporte sin acoplarse a Prisma.
import type { AttachmentOwnerType } from './constants.js';

export type AttachmentStatus = 'active' | 'deleted';

export interface AttachmentView {
  id: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  workLabel: string;
  mime: string;
  sizeBytes: number;
  storageUrl: string;
  status: AttachmentStatus;
  createdAt: Date;
  dimensions: { width: number; height: number };
}
