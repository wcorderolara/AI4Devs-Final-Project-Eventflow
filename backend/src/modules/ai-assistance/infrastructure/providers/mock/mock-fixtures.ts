// Registry de fixtures deterministas de MockAIProvider (US-119 / BE-002, BE-003, AI-001).
// Datos ficticios (seed/demo only), sin PII real ni secrets (SEC-02/SEC-04). Cada output es
// schema-compatible con `OUTPUT_SCHEMAS[feature]` (US-097) — validado en tests (AC-07/QA-004).
// La base por feature es el fixture `es-LATAM`; `LANGUAGE_FIXTURES` provee overrides por
// (feature, language[, scenarioSeed]). Missing fixture → output genérico (base) + warning (AC-05).
import type { AiFeatureType } from '../../../domain/ai-features.js';
import { buildFixtureKey, type MockFixtureKey } from './mock-fixture-key.js';

/** Output base determinista por feature (fixture `es-LATAM`). Preserva la conducta de US-097,
 *  incluyendo `budget_suggestion` que refleja `input.currencyCode` de forma determinista. */
export function baseOutput(feature: AiFeatureType, input: Record<string, unknown>): unknown {
  switch (feature) {
    case 'event_plan':
      return { summary: 'Plan sugerido para el evento', phases: [{ name: 'Preparación', tasks: ['Definir fecha', 'Reservar lugar'] }] };
    case 'checklist':
      return {
        tasks: [
          { title: 'Reservar el lugar', description: 'Confirmar fecha y firmar contrato.', category: 'venue', due_relative_days: 180, phase: 'T-180', priority: 'high' },
          { title: 'Contratar catering', description: 'Cerrar menú y monto con el proveedor.', category: 'catering', due_relative_days: 90, phase: 'T-90', priority: 'high' },
          { title: 'Enviar invitaciones', description: 'Enviar invitaciones digitales o físicas.', category: 'invitations', due_relative_days: 30, phase: 'T-30', priority: 'medium' },
          { title: 'Confirmar itinerario', description: 'Revisar horarios y logística con proveedores.', category: 'logistics', due_relative_days: 7, phase: 'T-7', priority: 'high' },
          { title: 'Preparar kit del día', description: 'Armar el kit de emergencia y checklist final.', category: 'logistics', due_relative_days: 1, phase: 'T-1', priority: 'high' },
        ],
      };
    case 'budget_suggestion':
      // US-037: `category` debe ser el `code` canónico de la whitelist activa (`catering`,
      // `decoration`, `venue`, etc.) para que `BudgetSuggestionApplyStrategyV2` pueda
      // resolverlas vía `ServiceCategoryReadPort.findManyByCodes` sin fallar con
      // `PAYLOAD_INVALID: unknown categories`.
      return {
        currencyCode: typeof input.currencyCode === 'string' ? input.currencyCode : 'GTQ',
        items: [{ category: 'catering', estimatedAmount: '1000.00' }, { category: 'decoration', estimatedAmount: '500.00' }],
      };
    case 'vendor_categories':
      return { categories: [{ code: 'catering', reason: 'Servicio esencial' }, { code: 'photography', reason: 'Registro del evento' }] };
    case 'quote_brief':
      return { brief: 'Brief de cotización', requirements: ['Servicio para 100 personas'], questions: ['¿Incluye montaje?'], constraints: [] };
    case 'quote_comparison':
      return { summary: 'Comparación de cotizaciones', perQuote: [], recommendation: 'Revisar la opción con mejor relación precio/valor.' };
    case 'vendor_bio':
      return { bio: 'Somos un proveedor con amplia experiencia.', highlights: ['Puntualidad', 'Calidad'] };
    case 'task_prioritization':
      return { prioritized: [{ title: 'Reservar lugar', rank: 1, rationale: 'Es la restricción principal' }] };
    default:
      return {};
  }
}

/** Overrides por key exacta (idioma/seed/promptVersion). Demuestra selección language-specific (AC-04). */
const LANGUAGE_FIXTURES: Record<string, unknown> = {
  // US-017 (PB-P1-011 / AC-02): event_plan enriquecido con ≥ 3 phases y variación por locale.
  [buildFixtureKey({ feature: 'event_plan', languageCode: 'es-LATAM', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    summary: 'Plan sugerido para tu evento',
    phases: [
      { name: 'Preparación', tasks: ['Definir la fecha', 'Reservar el lugar', 'Confirmar presupuesto'] },
      { name: 'Coordinación', tasks: ['Contactar proveedores', 'Enviar invitaciones', 'Confirmar menú'] },
      { name: 'Ejecución', tasks: ['Supervisar montaje', 'Coordinar el día del evento', 'Cerrar cuentas con proveedores'] },
    ],
  },
  [buildFixtureKey({ feature: 'event_plan', languageCode: 'es-ES', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    summary: 'Plan sugerido para vuestro evento',
    phases: [
      { name: 'Preparación', tasks: ['Fijar la fecha', 'Reservar el sitio', 'Ajustar el presupuesto'] },
      { name: 'Coordinación', tasks: ['Contactar proveedores', 'Enviar invitaciones', 'Cerrar menú'] },
      { name: 'Ejecución', tasks: ['Supervisar montaje', 'Coordinar el día', 'Cerrar cuentas'] },
    ],
  },
  [buildFixtureKey({ feature: 'event_plan', languageCode: 'pt', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    summary: 'Plano sugerido para o seu evento',
    phases: [
      { name: 'Preparação', tasks: ['Definir a data', 'Reservar o local', 'Confirmar o orçamento'] },
      { name: 'Coordenação', tasks: ['Contactar fornecedores', 'Enviar convites', 'Confirmar o menu'] },
      { name: 'Execução', tasks: ['Supervisionar montagem', 'Coordenar o dia', 'Fechar contas'] },
    ],
  },
  [buildFixtureKey({ feature: 'event_plan', languageCode: 'en', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    summary: 'Suggested plan for your event',
    phases: [
      { name: 'Preparation', tasks: ['Set the date', 'Book the venue', 'Confirm the budget'] },
      { name: 'Coordination', tasks: ['Reach out to vendors', 'Send invitations', 'Finalize the menu'] },
      { name: 'Execution', tasks: ['Oversee setup', 'Coordinate the event day', 'Settle vendor invoices'] },
    ],
  },
  // US-018 (PB-P1-012 / AC-04): checklist enriquecido con ≥ 5 tareas + 5 phases por locale.
  [buildFixtureKey({ feature: 'checklist', languageCode: 'es-LATAM', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    tasks: [
      { title: 'Reservar el lugar', description: 'Confirmar fecha y firmar contrato.', category: 'venue', due_relative_days: 180, phase: 'T-180', priority: 'high' },
      { title: 'Contratar catering', description: 'Cerrar menú y monto con el proveedor.', category: 'catering', due_relative_days: 90, phase: 'T-90', priority: 'high' },
      { title: 'Enviar invitaciones', description: 'Enviar invitaciones digitales o físicas.', category: 'invitations', due_relative_days: 30, phase: 'T-30', priority: 'medium' },
      { title: 'Confirmar itinerario', description: 'Revisar horarios y logística con proveedores.', category: 'logistics', due_relative_days: 7, phase: 'T-7', priority: 'high' },
      { title: 'Preparar kit del día', description: 'Armar kit de emergencia y checklist final.', category: 'logistics', due_relative_days: 1, phase: 'T-1', priority: 'high' },
    ],
  },
  [buildFixtureKey({ feature: 'checklist', languageCode: 'es-ES', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    tasks: [
      { title: 'Reservar el sitio', description: 'Fijar la fecha y firmar el contrato.', category: 'venue', due_relative_days: 180, phase: 'T-180', priority: 'high' },
      { title: 'Contratar el cátering', description: 'Cerrar el menú y el precio.', category: 'catering', due_relative_days: 90, phase: 'T-90', priority: 'high' },
      { title: 'Enviar invitaciones', description: 'Repartir invitaciones digitales o impresas.', category: 'invitations', due_relative_days: 30, phase: 'T-30', priority: 'medium' },
      { title: 'Confirmar horario', description: 'Repasar la logística con los proveedores.', category: 'logistics', due_relative_days: 7, phase: 'T-7', priority: 'high' },
      { title: 'Preparar el kit del día', description: 'Armar el kit de urgencias y checklist final.', category: 'logistics', due_relative_days: 1, phase: 'T-1', priority: 'high' },
    ],
  },
  [buildFixtureKey({ feature: 'checklist', languageCode: 'pt', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    tasks: [
      { title: 'Reservar o local', description: 'Confirmar a data e assinar o contrato.', category: 'venue', due_relative_days: 180, phase: 'T-180', priority: 'high' },
      { title: 'Contratar o buffet', description: 'Fechar o menu e o valor com o fornecedor.', category: 'catering', due_relative_days: 90, phase: 'T-90', priority: 'high' },
      { title: 'Enviar convites', description: 'Enviar convites digitais ou impressos.', category: 'invitations', due_relative_days: 30, phase: 'T-30', priority: 'medium' },
      { title: 'Confirmar cronograma', description: 'Rever horários e logística com fornecedores.', category: 'logistics', due_relative_days: 7, phase: 'T-7', priority: 'high' },
      { title: 'Preparar kit do dia', description: 'Montar o kit de emergência e checklist final.', category: 'logistics', due_relative_days: 1, phase: 'T-1', priority: 'high' },
    ],
  },
  [buildFixtureKey({ feature: 'checklist', languageCode: 'en', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    tasks: [
      { title: 'Book the venue', description: 'Confirm the date and sign the contract.', category: 'venue', due_relative_days: 180, phase: 'T-180', priority: 'high' },
      { title: 'Hire the caterer', description: 'Lock down the menu and total cost.', category: 'catering', due_relative_days: 90, phase: 'T-90', priority: 'high' },
      { title: 'Send invitations', description: 'Send digital or printed invitations.', category: 'invitations', due_relative_days: 30, phase: 'T-30', priority: 'medium' },
      { title: 'Confirm the run of show', description: 'Review timings and logistics with vendors.', category: 'logistics', due_relative_days: 7, phase: 'T-7', priority: 'high' },
      { title: 'Prepare the day-of kit', description: 'Assemble the emergency kit and final checklist.', category: 'logistics', due_relative_days: 1, phase: 'T-1', priority: 'high' },
    ],
  },
};

export interface FixtureResolution {
  output: unknown;
  /** `true` si hubo match exacto de fixture; `false` si se usó el output genérico (base). */
  matched: boolean;
}

/**
 * Resuelve el fixture para una key. Match exacto de override → `matched:true`. Para `es-LATAM` el
 * output base ES el fixture aprobado (`matched:true`). Cualquier otro idioma/seed sin override →
 * output genérico determinista (base) con `matched:false` (dispara warning en el provider).
 */
export function resolveFixture(key: MockFixtureKey, input: Record<string, unknown>): FixtureResolution {
  const override = LANGUAGE_FIXTURES[buildFixtureKey(key)];
  if (override !== undefined) return { output: override, matched: true };
  const isBaseLanguage = key.languageCode === 'es-LATAM' && key.scenarioSeed === 'default' && key.promptVersionId === 'v1';
  return { output: baseOutput(key.feature, input), matched: isBaseLanguage };
}
