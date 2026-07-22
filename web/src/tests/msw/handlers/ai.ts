import { http, HttpResponse } from 'msw';

/** Handlers MSW de la feature AI (US-017). Mock por defecto en español latino. */
const meta = { correlationId: 'req_msw_ai', timestamp: '2026-07-13T00:00:00.000Z' };

export const aiEventPlanFixture = {
  recommendationId: 'aae1e1e1-1111-4111-8111-111111111111',
  type: 'event_plan',
  status: 'pending',
  output: {
    summary: 'Plan sugerido para el evento',
    phases: [
      { name: 'Preparación', tasks: ['Definir la fecha', 'Reservar el lugar'] },
      { name: 'Ejecución', tasks: ['Coordinar proveedores', 'Confirmar cronograma'] },
    ],
  },
  aiMeta: {
    provider: 'mock',
    promptVersion: 'v1',
    latencyMs: 42,
    fallbackUsed: false,
    languageCode: 'es-LATAM',
  },
  createdAt: '2026-07-13T00:00:00.000Z',
} as const;

export const aiChecklistFixture = {
  recommendationId: 'ccc1c1c1-1111-4111-8111-111111111111',
  type: 'checklist',
  status: 'pending',
  output: {
    tasks: [
      { title: 'Definir la fecha y el lugar', description: 'Confirmar fecha y firmar contrato del lugar.', category: 'venue', due_relative_days: 180, phase: 'T-180', priority: 'high' },
      { title: 'Contratar catering', description: 'Cerrar menú y monto con el proveedor.', category: 'catering', due_relative_days: 90, phase: 'T-90', priority: 'high' },
      { title: 'Enviar invitaciones', description: 'Enviar invitaciones digitales o físicas.', category: 'invitations', due_relative_days: 30, phase: 'T-30', priority: 'medium' },
      { title: 'Confirmar itinerario', description: 'Revisar horarios y logística con cada proveedor.', category: 'logistics', due_relative_days: 7, phase: 'T-7', priority: 'high' },
      { title: 'Preparar kit del día', description: 'Armar el kit de emergencia y checklist final.', category: 'logistics', due_relative_days: 1, phase: 'T-1', priority: 'high' },
    ],
  },
  aiMeta: {
    provider: 'mock',
    promptVersion: 'v1',
    latencyMs: 42,
    fallbackUsed: false,
    languageCode: 'es-LATAM',
  },
  createdAt: '2026-07-13T00:00:00.000Z',
} as const;

/** US-019: fixture MSW de distribución IA de presupuesto. Suma percentages = 100, amounts consistentes. */
export const aiBudgetSuggestionFixture = {
  recommendationId: 'bbb1b1b1-1111-4111-8111-111111111111',
  type: 'budget_suggestion',
  status: 'pending',
  output: {
    currency_code: 'GTQ',
    budget_estimated: 100000,
    categories: [
      { name: 'Banquetes y Catering', service_category_code: 'catering', percentage: 30, amount: 30000, notes: 'Menú principal y bebidas.' },
      { name: 'Salón y Locación', service_category_code: 'venue', percentage: 25, amount: 25000, notes: 'Renta del espacio principal.' },
      { name: 'Fotografía', service_category_code: 'photography', percentage: 15, amount: 15000, notes: 'Cobertura del evento.' },
      { name: 'Decoración', service_category_code: 'decoration', percentage: 12, amount: 12000, notes: 'Ambientación y flores.' },
      { name: 'Música y DJ', service_category_code: 'music_dj', percentage: 10, amount: 10000, notes: 'Musicalización y sonido.' },
      { name: 'Pastelería', service_category_code: 'cake', percentage: 8, amount: 8000, notes: 'Pastel y postres.' },
    ],
  },
  aiMeta: {
    provider: 'mock',
    promptVersion: 'v1',
    latencyMs: 42,
    fallbackUsed: false,
    languageCode: 'es-LATAM',
  },
  createdAt: '2026-07-13T00:00:00.000Z',
} as const;

/** US-020: fixture MSW de categorías priorizadas de proveedor. `priority_score` desc, `reason` ≤ 240. */
export const aiVendorCategoriesFixture = {
  recommendationId: 'ddd1d1d1-1111-4111-8111-111111111111',
  type: 'vendor_categories',
  status: 'pending',
  output: {
    categories: [
      { service_category_code: 'venue', name: 'Salón y locación', priority_score: 0.95, reason: 'Reserva con anticipación: alta demanda para la fecha.' },
      { service_category_code: 'catering', name: 'Banquetes y catering', priority_score: 0.9, reason: 'Menú y bebidas para todos los invitados; cotiza temprano.' },
      { service_category_code: 'photography', name: 'Fotografía', priority_score: 0.8, reason: 'Registro visual del evento; agenda vuela rápido.' },
      { service_category_code: 'music_dj', name: 'Música y DJ', priority_score: 0.7, reason: 'Ambiente y musicalización según el estilo del evento.' },
      { service_category_code: 'decoration', name: 'Decoración', priority_score: 0.6, reason: 'Ambientación y flores acordes al concepto.' },
      { service_category_code: 'cake', name: 'Pastelería', priority_score: 0.4, reason: 'Pastel y postres del evento.' },
    ],
  },
  aiMeta: {
    provider: 'mock',
    promptVersion: 'v1',
    latencyMs: 42,
    fallbackUsed: false,
    languageCode: 'es-LATAM',
  },
  createdAt: '2026-07-13T00:00:00.000Z',
} as const;

/** US-021: fixture MSW del brief IA. `brief` ≤ 2000, ítems ≤ 240, máx. 10 por array; sin PII. */
export const aiQuoteBriefFixture = {
  recommendationId: 'fff1f1f1-1111-4111-8111-111111111111',
  type: 'quote_brief',
  status: 'pending',
  output: {
    brief:
      'Solicitamos cotización para una celebración privada. Necesitamos un servicio profesional que cubra el evento con puntualidad, presentación cuidada y coordinación con el resto de proveedores. Compartimos los detalles del evento a continuación para armar la propuesta.',
    requirements: [
      'Cobertura completa del evento en la fecha y ciudad indicadas.',
      'Coordinación con los demás proveedores contratados.',
      'Presentación profesional y personal identificado.',
      'Cronograma de servicio detallado por bloques de tiempo.',
    ],
    questions: [
      '¿Cuál es el costo por hora adicional fuera del bloque contratado?',
      '¿Qué está incluido en el paquete base y qué se cotiza aparte?',
      '¿Cuál es la política de cancelación y reagendamiento?',
      '¿Qué anticipo requieren para confirmar la reserva?',
    ],
    constraints: [
      'Presupuesto referencial acorde a la moneda del evento.',
      'La confirmación final depende de aprobar la propuesta.',
    ],
  },
  aiMeta: {
    provider: 'mock',
    promptVersion: 'v1',
    latencyMs: 42,
    fallbackUsed: false,
    languageCode: 'es-LATAM',
  },
  createdAt: '2026-07-13T00:00:00.000Z',
} as const;

/** US-022 (FE-003): fixture MSW del resumen IA del comparador de Quotes. HITL informativo — sin
 *  campo de recomendación automática. */
export const aiQuoteSummaryFixture = {
  ai_recommendation_id: 'ac022c22-2222-4222-8222-222222222222',
  summaries: [
    {
      quote_id: '11111111-1111-4111-8111-111111111111',
      pros: ['Precio competitivo dentro del presupuesto.'],
      cons: ['Menús con menos opciones vegetarianas.'],
      missing_info: ['Política de cancelación por escrito.'],
      notes: 'Confirmar con el proveedor la disponibilidad para la fecha.',
    },
    {
      quote_id: '22222222-2222-4222-8222-222222222222',
      pros: ['Servicio con más opciones incluidas.'],
      cons: ['Total ligeramente por encima del promedio.'],
      missing_info: ['Detalle del cronograma de montaje.'],
      notes: 'Solicitar breakdown por bloque de servicio.',
    },
  ],
  overall_observations:
    'Ambas cotizaciones cubren los requisitos básicos; el organizador decide según prioridad de menú vs. logística.',
  locale: 'es-LATAM',
  locale_fallback: false,
  generated_at: '2026-07-22T00:00:00.000Z',
  quote_ids_snapshot: [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ],
  category_code: 'catering',
} as const;

/** US-024 (FE-002): fixture MSW de la priorización IA top 3. HITL informativo — solo sugiere. */
export const aiTaskPriorityFixture = {
  ai_recommendation_id: 'aa024024-0024-4024-8024-000000000024',
  top: [
    {
      task_id: '11111111-1111-4111-8111-111111111111',
      reason: 'Vence en menos de 7 días y bloquea otras tareas del checklist.',
      urgency_score: 10,
    },
    {
      task_id: '22222222-2222-4222-8222-222222222222',
      reason: 'Prioridad alta pendiente de arranque; conviene iniciarla esta semana.',
      urgency_score: 8,
    },
    {
      task_id: '33333333-3333-4333-8333-333333333333',
      reason: 'Tarea en progreso próxima al vencimiento; conviene cerrarla pronto.',
      urgency_score: 6,
    },
  ],
  rationale_summary:
    'Priorización enfocada en fechas próximas y prioridad alta; el organizador decide acciones concretas.',
  locale: 'es-LATAM',
  locale_fallback: false,
  cache_hit: false,
  generated_at: '2026-07-22T00:00:00.000Z',
} as const;

export const aiHandlers = [
  http.post('*/api/v1/events/:eventId/ai/event-plan', () =>
    HttpResponse.json({ data: aiEventPlanFixture, meta }, { status: 200 }),
  ),
  http.post('*/api/v1/events/:eventId/ai/checklist', () =>
    HttpResponse.json({ data: aiChecklistFixture, meta }, { status: 200 }),
  ),
  http.post('*/api/v1/events/:eventId/ai/budget-suggestion', () =>
    HttpResponse.json({ data: aiBudgetSuggestionFixture, meta }, { status: 200 }),
  ),
  http.post('*/api/v1/events/:eventId/ai/vendor-categories', () =>
    HttpResponse.json({ data: aiVendorCategoriesFixture, meta }, { status: 200 }),
  ),
  http.post('*/api/v1/events/:eventId/ai/quote-brief', () =>
    HttpResponse.json({ data: aiQuoteBriefFixture, meta }, { status: 200 }),
  ),
  // US-022 (FE-003 / AC-01..AC-05): resumen IA del comparador. Handler default 200 con snapshot fijo.
  http.post('*/api/v1/events/:eventId/ai/quote-summary', () =>
    HttpResponse.json({ data: aiQuoteSummaryFixture, meta }, { status: 200 }),
  ),
  // US-024 (FE-002 / AC-01..AC-07): AI task priority top 3 con cache signature. Handler default
  // 200 con fixture fijo — los tests que verifican cache hit/miss, fallback o AUTH usan
  // `server.use(...)` para overridear puntualmente.
  http.post('*/api/v1/events/:eventId/ai/task-priority', () =>
    HttpResponse.json({ data: aiTaskPriorityFixture, meta }, { status: 200 }),
  ),
];
