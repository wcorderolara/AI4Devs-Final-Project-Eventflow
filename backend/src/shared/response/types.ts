// Tipos del envelope de respuesta (US-093 / BE-004). ADR-API-002.
export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    correlationId: string;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SuccessEnvelope<T> {
  data: T;
  pagination?: PaginationMeta;
  meta: {
    correlationId: string;
    timestamp: string;
  };
}
