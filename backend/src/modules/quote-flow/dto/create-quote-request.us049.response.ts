// Response shape del endpoint `POST /api/v1/quote-requests` (US-049 / BE-005). Tech Spec §7 / §9.
// El brief y el snapshot del evento se serializan desde el envelope JSON `QuoteRequest.brief`
// (DEV-01 del execution record) más los IDs relacionales guardados en columnas.
export interface CreateQuoteRequestUs049Response {
  id: string;
  status: 'sent';
  sent_at: string;
  event_id: string;
  vendor_profile_id: string;
  service_category_id: string;
  ai_generated_brief: boolean;
  brief: {
    budget: string;
    currency_code: string;
    message: string;
  };
  event_snapshot: {
    event_type_id: string;
    event_date: string | null;
    location_id: string | null;
    guests_count: number | null;
  };
}
