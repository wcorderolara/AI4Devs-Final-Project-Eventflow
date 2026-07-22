// US-071 (PB-P2-004 / BE-004). `ListMyNotificationsUseCase` — orquesta el listado
// del surface organizer.
//
// Pasos:
//   1. Validar defaults (aplicados por Zod aguas arriba en el controller).
//   2. `ListNotificationsRepository.findByUser({ userId, page, pageSize, status, channel })`.
//   3. `NotificationLinkResolver.resolveMany(rows)` — batch-lookup contra `events`.
//   4. `ListNotificationsRepository.countUnreadByUser({ userId, channel })` → `unreadCount`.
//   5. Mapear a `NotificationDto` + `PaginatedNotificationsResult`.
//
// El aislamiento BR-NOTIF-005 se ejerce por el `WHERE user_id = $sessionUserId` en el
// repositorio (no hay endpoint de detalle en US-071 — el listado nunca revela filas
// ajenas).
import type {
  ListNotificationsChannel,
  ListNotificationsStatus,
} from '../interface/http/list-notifications.query.schema.js';
import type { ListNotificationsRepository } from '../ports/list-notifications.repository.js';
import type { NotificationLinkResolver } from './notification-link-resolver.service.js';

/** DTO expuesto al cliente. Contract `docs/16 §34.3` (extendido por US-071 DOC-001/003). */
export interface NotificationDto {
  id: string;
  type: string;
  /** Título localizado (proviene de `payload` — llenado por el emisor de la notificación). */
  title: string;
  /** Body localizado (proviene de `payload`). */
  body: string;
  status: 'unread' | 'read';
  /** Deep link server-side según `LINK_STRATEGY_BY_TYPE`; `null` si no aplica. */
  link: string | null;
  channel: 'in_app' | 'email_simulated';
  languageCode: string;
  /** ISO 8601. `sent_at` semántico = `created_at` (herencia US-034 D-01). */
  sent_at: string;
  read_at: string | null;
  emailSimulated: boolean;
}

export interface PaginatedNotificationsResult {
  items: NotificationDto[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
}

export interface ListMyNotificationsInput {
  userId: string;
  page: number;
  pageSize: number;
  status: ListNotificationsStatus;
  channel: ListNotificationsChannel;
}

export interface ListMyNotificationsDeps {
  repo: ListNotificationsRepository;
  linkResolver: NotificationLinkResolver;
}

export class ListMyNotificationsUseCase {
  constructor(private readonly deps: ListMyNotificationsDeps) {}

  async execute(input: ListMyNotificationsInput): Promise<PaginatedNotificationsResult> {
    const { repo, linkResolver } = this.deps;

    const [{ items, total }, unreadCount] = await Promise.all([
      repo.findByUser(input),
      repo.countUnreadByUser({ userId: input.userId, channel: input.channel }),
    ]);

    const linksById = await linkResolver.resolveMany(items);

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      unreadCount,
      items: items.map((row) => {
        const payload = row.payload as Record<string, unknown>;
        const channel = typeof payload.channel === 'string' ? (payload.channel as string) : 'in_app';
        const languageCode =
          typeof payload.languageCode === 'string' ? (payload.languageCode as string) : 'es-LATAM';
        const title = typeof payload.title === 'string' ? (payload.title as string) : deriveTitle(row.type);
        const body = typeof payload.body === 'string' ? (payload.body as string) : '';
        return {
          id: row.id,
          type: row.type,
          title,
          body,
          status: row.status,
          link: linksById.get(row.id) ?? null,
          channel: channel === 'email_simulated' ? 'email_simulated' : 'in_app',
          languageCode,
          sent_at: row.createdAt.toISOString(),
          read_at: row.readAt ? row.readAt.toISOString() : null,
          emailSimulated: channel === 'email_simulated',
        };
      }),
    };
  }
}

/**
 * Fallback muy simple para `title` cuando el emisor no lo persiste en `payload`.
 * El catálogo real de títulos por tipo es responsabilidad del emisor (US-034 en el
 * caso de `task_due_soon`). Este fallback existe sólo para evitar `title=""` visible
 * y para tests que no siembran payload completo.
 */
function deriveTitle(type: string): string {
  if (type === 'task_due_soon') return 'Task due in 7 days';
  return type;
}
