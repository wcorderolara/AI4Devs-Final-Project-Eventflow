import { httpGet } from '@/shared/api-client';

export interface OrganizerMetricsDTO {
  events: {
    total: number;
    byStatus: { draft: number; active: number; completed: number; cancelled: number };
    thisWeek: number;
  };
  tasks: { pending: number };
  quotes: { requestsSent: number; received: number; accepted: number };
  bookings: { confirmed: number };
  reviews: { written: number };
  notifications: { unread: number };
  weekRange: { start: string; end: string };
  generatedAt: string;
}

interface Envelope {
  data: OrganizerMetricsDTO;
  meta: { correlationId: string; timestamp: string };
}

export const organizerMetricsApi = {
  async get(): Promise<OrganizerMetricsDTO> {
    const env = await httpGet<Envelope>('/organizer/metrics');
    return env.data;
  },
};
