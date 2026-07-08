// Smoke type-level del Prisma Client (US-099 / BE-001).
// Verifica que `@prisma/client` genera y exporta los tipos del dominio MVP.
// NO se conecta a la base de datos: instanciación pura para validar el import surface.
// La inyección real de PrismaClient vía DI pertenece a historias backend futuras.
import { PrismaClient } from '@prisma/client';
import type {
  User,
  Event,
  EventType,
  EventTask,
  Budget,
  BudgetItem,
  VendorProfile,
  VendorService,
  ServiceCategory,
  Location,
  QuoteRequest,
  Quote,
  BookingIntent,
  Review,
  Notification,
  Attachment,
  AdminAction,
  AIRecommendation,
  AIPromptVersion,
} from '@prisma/client';

export const prisma = new PrismaClient();

// Referencias type-level a los 19 modelos MVP para asegurar el import surface.
export type MvpDomain = {
  user: User;
  event: Event;
  eventType: EventType;
  eventTask: EventTask;
  budget: Budget;
  budgetItem: BudgetItem;
  vendorProfile: VendorProfile;
  vendorService: VendorService;
  serviceCategory: ServiceCategory;
  location: Location;
  quoteRequest: QuoteRequest;
  quote: Quote;
  bookingIntent: BookingIntent;
  review: Review;
  notification: Notification;
  attachment: Attachment;
  adminAction: AdminAction;
  aiRecommendation: AIRecommendation;
  aiPromptVersion: AIPromptVersion;
};
