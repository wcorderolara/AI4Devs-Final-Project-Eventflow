// Barrel — DTOs de quote-flow (US-092 base; contrato reemplazado en US-096 / BE-001).
export * from './create-quote-request.request.js';
export * from './quote-request-params.js';
export * from './quote-request.response.js';
export * from './list-quote-requests.query.js';
export * from './create-quote.request.js';
export * from './update-quote.request.js';
export * from './quote-params.js';
export * from './quote.response.js';
// US-054 (PB-P1-032 / BE-001): body opcional del endpoint reject.
export * from './reject-quote.us054.request.js';
// US-057 (PB-P1-035 / BE-001/003): query DTO + response shape del comparador de Quotes.
export * from './compare-quotes.us057.query.js';
export * from './compare-quotes.us057.response.js';
// US-058 (PB-P1-035 / BE-001): body opcional del endpoint toggle preferred.
export * from './prefer-quote.us058.request.js';
// AI DTO (US-092 / AI-001) — se conserva para ai-output-schemas.spec.
export * from './quote-brief-ai-output.js';
