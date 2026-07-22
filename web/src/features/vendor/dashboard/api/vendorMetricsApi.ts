import { httpGet } from '@/shared/api-client';

export interface VendorMetricsDTO {
  hasProfile: boolean;
  profile: {
    id: string;
    businessName: string;
    status: 'pending' | 'approved' | 'rejected' | 'hidden';
    ratingAvg: number | null;
    reviewsCount: number;
  } | null;
  quotes: {
    newRequests: number;
    awaitingResponse: number;
    respondedAwaitingDecision: number;
  };
  bookings: { thisWeek: number; totalCompleted: number };
  reviews: {
    total: number;
    ratingAvg: number | null;
    published: number;
    hidden: number;
    removed: number;
  };
  notifications: { unread: number };
  weekRange?: { start: string; end: string };
  generatedAt: string;
}

interface Envelope {
  data: VendorMetricsDTO;
  meta: { correlationId: string; timestamp: string };
}

export const vendorMetricsApi = {
  async get(): Promise<VendorMetricsDTO> {
    const env = await httpGet<Envelope>('/vendor/metrics');
    return env.data;
  },
};
