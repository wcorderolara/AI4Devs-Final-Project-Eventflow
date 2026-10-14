// Datos LATAM deterministas para el seed (US-085, BR-SEED-004/009). Sin PII real (BR-PRIVACY-010):
// nombres ficticios y emails de dominio `@seed.eventflow.test`. Sin aleatoriedad → idempotencia.

// US-076 (PB-P1-043 / DB-003): 6 EventTypes culturales obligatorios (FR-EVENT-013).
// Codes fijos: `wedding, xv, baptism, baby_shower, birthday, corporate`. i18n en
// 4 locales (Decisión PO D3, `es-LATAM` requerido). `sortOrder` explícito (D10)
// mapea al orden de presentación estándar del wizard de creación de eventos.
// `label` se conserva denormalizado desde `nameI18n['es-LATAM']` para callers legacy
// (`PrismaEventTypeRepository.findActive`, `useEventTypes` FE) que proyectan
// `{code, label}` directamente.
export interface EventTypeSeed {
  code: string;
  label: string;
  sortOrder: number;
  nameI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
}

export const EVENT_TYPES: EventTypeSeed[] = [
  {
    code: 'wedding',
    label: 'Boda',
    sortOrder: 10,
    nameI18n: { 'es-LATAM': 'Boda', 'es-ES': 'Boda', en: 'Wedding', pt: 'Casamento' },
    descriptionI18n: {
      'es-LATAM': 'Ceremonia y recepción matrimonial.',
      'es-ES': 'Ceremonia y banquete de boda.',
      en: 'Wedding ceremony and reception.',
      pt: 'Cerimônia e recepção de casamento.',
    },
  },
  {
    code: 'xv',
    label: 'XV Años',
    sortOrder: 20,
    nameI18n: { 'es-LATAM': 'XV Años', 'es-ES': '15 Años', en: 'Quinceañera', pt: '15 Anos' },
    descriptionI18n: {
      'es-LATAM': 'Celebración de los quince años.',
      'es-ES': 'Celebración de 15 años.',
      en: 'Quinceañera celebration.',
      pt: 'Festa de 15 anos.',
    },
  },
  {
    code: 'baptism',
    label: 'Bautizo',
    sortOrder: 30,
    nameI18n: { 'es-LATAM': 'Bautizo', 'es-ES': 'Bautizo', en: 'Baptism', pt: 'Batizado' },
    descriptionI18n: {
      'es-LATAM': 'Ceremonia religiosa de bautismo.',
      'es-ES': 'Ceremonia de bautismo.',
      en: 'Baptism ceremony.',
      pt: 'Cerimônia de batizado.',
    },
  },
  {
    code: 'baby_shower',
    label: 'Baby Shower',
    sortOrder: 40,
    nameI18n: { 'es-LATAM': 'Baby Shower', 'es-ES': 'Baby Shower', en: 'Baby Shower', pt: 'Chá de Bebê' },
    descriptionI18n: {
      'es-LATAM': 'Celebración previa al nacimiento del bebé.',
      'es-ES': 'Celebración pre-natal.',
      en: 'Pre-birth celebration for expecting parents.',
      pt: 'Comemoração antes do nascimento do bebê.',
    },
  },
  {
    code: 'birthday',
    label: 'Cumpleaños',
    sortOrder: 50,
    nameI18n: { 'es-LATAM': 'Cumpleaños', 'es-ES': 'Cumpleaños', en: 'Birthday', pt: 'Aniversário' },
    descriptionI18n: {
      'es-LATAM': 'Celebración de cumpleaños.',
      'es-ES': 'Fiesta de cumpleaños.',
      en: 'Birthday celebration.',
      pt: 'Festa de aniversário.',
    },
  },
  {
    code: 'corporate',
    label: 'Evento Corporativo',
    sortOrder: 60,
    nameI18n: {
      'es-LATAM': 'Evento Corporativo',
      'es-ES': 'Evento de Empresa',
      en: 'Corporate Event',
      pt: 'Evento Corporativo',
    },
    descriptionI18n: {
      'es-LATAM': 'Lanzamientos, cenas de fin de año, activaciones de marca.',
      'es-ES': 'Eventos corporativos y empresariales.',
      en: 'Product launches, year-end dinners, brand activations.',
      pt: 'Lançamentos, jantares de fim de ano, ativações de marca.',
    },
  },
];

// US-075 (PB-P1-042 / DB-003): catálogo LATAM culturalmente coherente (BR-SERVICE-004)
// con jerarquía 2 niveles (Decisión PO D4), i18n 4 locales (Decisión PO D3, es-LATAM
// requerido) y `sort_order` explícito para el orden en el árbol (Decisión PO D8).
//
// Compatibilidad hacia atrás: los 12 códigos originales (`catering`, `marimba`, `music_dj`,
// `photography`, `video`, `venue`, `decoration`, `flowers`, `cake`, `invitations`,
// `transport`, `makeup`) se preservan verbatim para no romper referencias existentes de
// `VendorService`, `Quote`, `EventTask` o `VendorProfileCategory`. Las nuevas subcategorías
// (`mariachi`, `hora_loca`) y roots (`music`, `entertainment`, `attire`, `souvenirs`,
// `planning`, `beverages`, `mc`) llenan el catálogo para demo de árbol completo.
//
// Reorganización de jerarquía:
//   - `marimba`, `music_dj`, `mariachi`     → hijos de `music`
//   - `video`                                → hijo de `photography`
//   - `flowers`                              → hijo de `decoration`
//   - `hora_loca`                            → hijo de `entertainment`
//
// Roots totales: 15. Subcategorías: 6. Cobertura demo del árbol completo con 2 niveles.
type ServiceCategorySeed = {
  code: string;
  label: string;
  depthLevel: 1 | 2;
  parentCode: string | null;
  sortOrder: number;
  nameI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
};

export const SERVICE_CATEGORIES: ServiceCategorySeed[] = [
  // ── Roots (15) ─────────────────────────────────────────────────────────────
  {
    code: 'catering',
    label: 'Banquetes y Catering',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 10,
    nameI18n: { 'es-LATAM': 'Banquetes y Catering', 'es-ES': 'Banquetes y Catering', en: 'Catering', pt: 'Buffet e Catering' },
  },
  {
    code: 'venue',
    label: 'Salones y Locaciones',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 20,
    nameI18n: { 'es-LATAM': 'Salones y Locaciones', 'es-ES': 'Salones y Locaciones', en: 'Venues', pt: 'Salões e Locais' },
  },
  {
    code: 'decoration',
    label: 'Decoración',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 30,
    nameI18n: { 'es-LATAM': 'Decoración', 'es-ES': 'Decoración', en: 'Decoration', pt: 'Decoração' },
  },
  {
    code: 'photography',
    label: 'Fotografía',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 40,
    nameI18n: { 'es-LATAM': 'Fotografía', 'es-ES': 'Fotografía', en: 'Photography', pt: 'Fotografia' },
  },
  {
    code: 'music',
    label: 'Música',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 50,
    nameI18n: { 'es-LATAM': 'Música', 'es-ES': 'Música', en: 'Music', pt: 'Música' },
  },
  {
    code: 'cake',
    label: 'Pastelería y Mesa de Dulces',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 60,
    nameI18n: { 'es-LATAM': 'Pastelería y Mesa de Dulces', 'es-ES': 'Repostería y Mesa Dulce', en: 'Cake & Sweets Table', pt: 'Confeitaria e Mesa de Doces' },
  },
  {
    code: 'invitations',
    label: 'Invitaciones',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 70,
    nameI18n: { 'es-LATAM': 'Invitaciones', 'es-ES': 'Invitaciones', en: 'Invitations', pt: 'Convites' },
  },
  {
    code: 'transport',
    label: 'Transporte',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 80,
    nameI18n: { 'es-LATAM': 'Transporte', 'es-ES': 'Transporte', en: 'Transport', pt: 'Transporte' },
  },
  {
    code: 'makeup',
    label: 'Maquillaje y Peinado',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 90,
    nameI18n: { 'es-LATAM': 'Maquillaje y Peinado', 'es-ES': 'Maquillaje y Peluquería', en: 'Makeup & Hair', pt: 'Maquiagem e Cabelo' },
  },
  {
    code: 'entertainment',
    label: 'Entretenimiento',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 100,
    nameI18n: { 'es-LATAM': 'Entretenimiento', 'es-ES': 'Entretenimiento', en: 'Entertainment', pt: 'Entretenimento' },
  },
  {
    code: 'attire',
    label: 'Vestuario y Trajes',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 110,
    nameI18n: { 'es-LATAM': 'Vestuario y Trajes', 'es-ES': 'Vestuario y Trajes', en: 'Attire & Suits', pt: 'Vestuário e Trajes' },
  },
  {
    code: 'souvenirs',
    label: 'Souvenirs y Recuerdos',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 120,
    nameI18n: { 'es-LATAM': 'Souvenirs y Recuerdos', 'es-ES': 'Detalles y Recuerdos', en: 'Souvenirs & Favors', pt: 'Lembrancinhas' },
  },
  {
    code: 'planning',
    label: 'Organización y Coordinación',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 130,
    nameI18n: { 'es-LATAM': 'Organización y Coordinación', 'es-ES': 'Organización y Coordinación', en: 'Planning & Coordination', pt: 'Organização e Coordenação' },
  },
  {
    code: 'beverages',
    label: 'Bebidas y Bartender',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 140,
    nameI18n: { 'es-LATAM': 'Bebidas y Bartender', 'es-ES': 'Bebidas y Coctelería', en: 'Beverages & Bartender', pt: 'Bebidas e Bartender' },
  },
  {
    code: 'mc',
    label: 'Animación y Maestro de Ceremonias',
    depthLevel: 1,
    parentCode: null,
    sortOrder: 150,
    nameI18n: { 'es-LATAM': 'Animación y Maestro de Ceremonias', 'es-ES': 'Animación y Presentador', en: 'MC & Host', pt: 'Animação e Mestre de Cerimônias' },
  },
  // ── Subcategorías (6) ──────────────────────────────────────────────────────
  {
    code: 'marimba',
    label: 'Marimba',
    depthLevel: 2,
    parentCode: 'music',
    sortOrder: 10,
    nameI18n: { 'es-LATAM': 'Marimba', 'es-ES': 'Marimba', en: 'Marimba', pt: 'Marimba' },
  },
  {
    code: 'music_dj',
    label: 'DJ y Sonido',
    depthLevel: 2,
    parentCode: 'music',
    sortOrder: 20,
    nameI18n: { 'es-LATAM': 'DJ y Sonido', 'es-ES': 'DJ y Sonido', en: 'DJ & Sound', pt: 'DJ e Som' },
  },
  {
    code: 'mariachi',
    label: 'Mariachi',
    depthLevel: 2,
    parentCode: 'music',
    sortOrder: 30,
    nameI18n: { 'es-LATAM': 'Mariachi', 'es-ES': 'Mariachi', en: 'Mariachi', pt: 'Mariachi' },
  },
  {
    code: 'video',
    label: 'Video',
    depthLevel: 2,
    parentCode: 'photography',
    sortOrder: 10,
    nameI18n: { 'es-LATAM': 'Video', 'es-ES': 'Vídeo', en: 'Video', pt: 'Vídeo' },
  },
  {
    code: 'flowers',
    label: 'Flores y Arreglos',
    depthLevel: 2,
    parentCode: 'decoration',
    sortOrder: 10,
    nameI18n: { 'es-LATAM': 'Flores y Arreglos', 'es-ES': 'Flores y Arreglos', en: 'Flowers & Arrangements', pt: 'Flores e Arranjos' },
  },
  {
    code: 'hora_loca',
    label: 'Hora Loca',
    depthLevel: 2,
    parentCode: 'entertainment',
    sortOrder: 10,
    nameI18n: { 'es-LATAM': 'Hora Loca', 'es-ES': 'Hora Loca', en: 'Party Hour', pt: 'Hora Louca' },
  },
];

export const LOCATIONS: Array<{ code: string; country: string; region: string; city: string }> = [
  { code: 'GT-GUA', country: 'Guatemala', region: 'Guatemala', city: 'Ciudad de Guatemala' },
  { code: 'MX-CDMX', country: 'México', region: 'CDMX', city: 'Ciudad de México' },
  { code: 'CO-ANT', country: 'Colombia', region: 'Antioquia', city: 'Medellín' },
];

export const ORGANIZER_NAMES = [
  'María Fernanda López',
  'Carlos Enrique Ramírez',
  'Ana Lucía Gómez',
  'José Antonio Morales',
  'Gabriela Sánchez',
  'Diego Alejandro Castillo',
];

export type SeedCurrency = 'GTQ' | 'MXN' | 'COP' | 'USD';
export type SeedLocationCode = 'GT-GUA' | 'MX-CDMX' | 'CO-ANT';

// Moneda local por ubicación: el paquete de un proveedor siempre va en la moneda de su país.
export const LOCAL_CURRENCY: Record<SeedLocationCode, SeedCurrency> = {
  'GT-GUA': 'GTQ',
  'MX-CDMX': 'MXN',
  'CO-ANT': 'COP',
};

// Tipo de cambio aproximado desde GTQ y redondeo "comercial" por moneda. Sólo para que los montos
// demo sean plausibles entre países; no es un dato financiero.
export const FX_FROM_GTQ: Record<SeedCurrency, number> = { GTQ: 1, MXN: 2.3, COP: 515, USD: 0.13 };
const PRICE_STEP: Record<SeedCurrency, number> = { GTQ: 50, MXN: 100, COP: 50_000, USD: 10 };

/** Redondea un monto (ya en `currency`) al escalón comercial de esa moneda. */
export function roundPrice(amount: number, currency: SeedCurrency): number {
  const step = PRICE_STEP[currency];
  return Math.max(step, Math.round(amount / step) * step);
}

/** Convierte un precio de referencia en GTQ a `currency`, redondeado al escalón comercial. */
export function seedPrice(amountGtq: number, currency: SeedCurrency): number {
  return roundPrice(amountGtq * FX_FROM_GTQ[currency], currency);
}

export interface VendorSeed {
  businessName: string;
  categoryCode: string;
  locationCode: SeedLocationCode;
  bio: string;
  packageName: string;
  packageDescription: string;
  /** Precio de referencia del paquete en GTQ; se convierte a la moneda local del proveedor. */
  referencePriceGtq: number;
  /** Mensaje que el organizador envía al pedir cotización de esta categoría. */
  briefMessage: string;
}

// Orden fijo: el índice define el email (`vendorN@…`) y los escenarios demo por posición
// (0 ancla demo + límite de categorías, 1 portafolio lleno, 2 hidden, 3 ocultado, 4 rechazado).
// Los pares (0,1), (2,3), (4,5)… comparten país porque cotizan juntos para el mismo evento.
export const VENDORS: VendorSeed[] = [
  {
    businessName: 'Banquetes El Quetzal',
    categoryCode: 'catering',
    locationCode: 'GT-GUA',
    bio: 'Banquetes para bodas, XV años y eventos corporativos en la Ciudad de Guatemala. Cocina guatemalteca e internacional con meseros y montaje incluidos.',
    packageName: 'Menú tres tiempos para 100 invitados',
    packageDescription: 'Entrada, plato fuerte a elegir entre res o pollo y postre. Incluye vajilla, mantelería, meseros y bebidas sin alcohol durante el servicio.',
    referencePriceGtq: 17_500,
    briefMessage: 'Buscamos menú de tres tiempos con una opción vegetariana. Necesitamos meseros y montaje de mesas.',
  },
  {
    businessName: 'Marimba Tradición Chapina',
    categoryCode: 'marimba',
    locationCode: 'GT-GUA',
    bio: 'Marimba orquesta con repertorio tradicional guatemalteco y música popular para bodas, bautizos y fiestas familiares en Guatemala.',
    packageName: 'Marimba orquesta, 4 horas',
    packageDescription: 'Marimba con cinco músicos, equipo de sonido para salón mediano y repertorio a elección de los anfitriones.',
    referencePriceGtq: 4_500,
    briefMessage: 'Queremos marimba para la recepción, con algunos sones tradicionales al inicio.',
  },
  {
    businessName: 'DJ Sonido Total',
    categoryCode: 'music_dj',
    locationCode: 'MX-CDMX',
    bio: 'DJ y producción de audio para fiestas y eventos sociales en la Ciudad de México. Llevamos sonido, iluminación y pista según el tamaño del salón.',
    packageName: 'DJ con sonido e iluminación, 5 horas',
    packageDescription: 'DJ, equipo de sonido profesional, iluminación robótica y micrófono inalámbrico para brindis y anuncios.',
    referencePriceGtq: 5_500,
    briefMessage: 'Necesitamos DJ con iluminación para la fiesta; mezcla de música actual y clásicos de los 80 y 90.',
  },
  {
    businessName: 'Foto Estudio Aurora',
    categoryCode: 'photography',
    locationCode: 'MX-CDMX',
    bio: 'Fotografía de bodas y eventos sociales en la Ciudad de México, con estilo natural y entrega de galería digital.',
    packageName: 'Cobertura fotográfica de 8 horas',
    packageDescription: 'Dos fotógrafos, sesión previa, cobertura de ceremonia y recepción, y galería digital con fotos editadas.',
    referencePriceGtq: 8_500,
    briefMessage: 'Buscamos cobertura completa de ceremonia y recepción, con algunas fotos de grupo familiares.',
  },
  {
    businessName: 'Video Producciones Cielo',
    categoryCode: 'video',
    locationCode: 'CO-ANT',
    bio: 'Video de bodas y eventos en Medellín y el Valle de Aburrá. Grabamos con dos cámaras y entregamos un video resumen y la ceremonia completa.',
    packageName: 'Video resumen y ceremonia completa',
    packageDescription: 'Video resumen de 5 minutos con música, ceremonia completa editada y toma aérea con dron si el lugar lo permite.',
    referencePriceGtq: 7_500,
    briefMessage: 'Queremos un video resumen corto para compartir en redes y la ceremonia completa.',
  },
  {
    businessName: 'Salón Jardín Las Rosas',
    categoryCode: 'venue',
    locationCode: 'CO-ANT',
    bio: 'Salón con jardín en Medellín para celebraciones de hasta 200 personas. Contamos con parqueo, cocina de apoyo y área techada para lluvia.',
    packageName: 'Salón y jardín para 150 personas, 6 horas',
    packageDescription: 'Uso de salón y jardín, mobiliario básico, iluminación ambiental, parqueo y personal de limpieza.',
    referencePriceGtq: 16_000,
    briefMessage: 'Buscamos salón con jardín y área techada por si llueve, con parqueo para los invitados.',
  },
  {
    businessName: 'Decoraciones Encanto',
    categoryCode: 'decoration',
    locationCode: 'GT-GUA',
    bio: 'Decoración de salones, mesas y escenarios para bodas, XV años y baby showers en la Ciudad de Guatemala. Diseñamos según la paleta del evento.',
    packageName: 'Decoración de salón y mesa principal',
    packageDescription: 'Diseño según paleta de colores, mesa principal, centros de mesa para 15 mesas, telas e iluminación decorativa.',
    referencePriceGtq: 7_800,
    briefMessage: 'Queremos decoración en tonos suaves para el salón y la mesa principal.',
  },
  {
    businessName: 'Floristería Primavera',
    categoryCode: 'flowers',
    locationCode: 'GT-GUA',
    bio: 'Arreglos florales para ceremonias y recepciones en la Ciudad de Guatemala, con flor de temporada de productores locales.',
    packageName: 'Flores para ceremonia y 12 centros de mesa',
    packageDescription: 'Ramo principal, arreglos para el altar o la entrada y 12 centros de mesa con flor de temporada.',
    referencePriceGtq: 5_200,
    briefMessage: 'Necesitamos arreglos para la ceremonia y centros de mesa con flores blancas y verdes.',
  },
  {
    businessName: 'Pastelería Dulce Hogar',
    categoryCode: 'cake',
    locationCode: 'MX-CDMX',
    bio: 'Pasteles y mesas de dulces para bodas, XV años y cumpleaños en la Ciudad de México. Hacemos degustación antes de confirmar el diseño.',
    packageName: 'Pastel de tres pisos para 120 porciones',
    packageDescription: 'Pastel de tres pisos con relleno a elección, decoración en fondant o betún y entrega en el salón.',
    referencePriceGtq: 2_600,
    briefMessage: 'Buscamos pastel para unos 120 invitados y, si es posible, una pequeña mesa de postres.',
  },
  {
    businessName: 'Invitaciones Papel & Tinta',
    categoryCode: 'invitations',
    locationCode: 'MX-CDMX',
    bio: 'Diseño e impresión de invitaciones y papelería para eventos en la Ciudad de México, en papel texturizado y en versión digital.',
    packageName: '100 invitaciones impresas con sobre',
    packageDescription: 'Diseño personalizado, 100 invitaciones impresas en papel texturizado con sobre y una versión digital para enviar por mensaje.',
    referencePriceGtq: 2_000,
    briefMessage: 'Necesitamos invitaciones impresas y una versión digital para enviar por mensaje.',
  },
  {
    businessName: 'Transporte Elegante',
    categoryCode: 'transport',
    locationCode: 'GT-GUA',
    bio: 'Traslado de novios, quinceañeras e invitados en la Ciudad de Guatemala, con autos clásicos y microbuses con conductor.',
    packageName: 'Auto clásico con conductor, 4 horas',
    packageDescription: 'Auto clásico decorado con conductor uniformado para el traslado a la ceremonia y a la recepción.',
    referencePriceGtq: 2_800,
    briefMessage: 'Buscamos un auto para el traslado a la ceremonia y luego a la recepción.',
  },
  {
    businessName: 'Estilo & Glam Maquillaje',
    categoryCode: 'makeup',
    locationCode: 'GT-GUA',
    bio: 'Maquillaje y peinado para novias, quinceañeras y familiares en la Ciudad de Guatemala. Atendemos a domicilio o en el lugar del evento.',
    packageName: 'Maquillaje y peinado con prueba previa',
    packageDescription: 'Prueba de maquillaje y peinado una semana antes, servicio el día del evento y retoque antes de la recepción.',
    referencePriceGtq: 1_900,
    briefMessage: 'Necesitamos maquillaje y peinado para la festejada y dos acompañantes.',
  },
];

export const VENDOR_BUSINESSES = VENDORS.map((v) => v.businessName);

export type SeedEventStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface EventSeed {
  title: string;
  /** Code del EventType; el título debe corresponder al tipo. */
  eventTypeCode: string;
  locationCode: SeedLocationCode;
  currency: SeedCurrency;
  language: 'es_LATAM' | 'en';
  guestsCount: number;
  /** Presupuesto estimado en la moneda del evento. */
  estimatedBudget: number;
  /** Días respecto a la fecha de corrida del seed (negativo = pasado). */
  daysFromSeed: number;
  status: SeedEventStatus;
  notes?: string;
}

// 12 eventos. El índice fija organizador ancla, cotizaciones (eventos 0..9 con 2 proveedores
// cada uno) y reservas confirmadas (eventos 0..4, ya realizados). Activos/borradores quedan en el
// futuro y completados/cancelados en el pasado, siempre relativo al día en que corre el seed.
export const EVENTS: EventSeed[] = [
  { title: 'Boda de Ana Lucía y Javier', eventTypeCode: 'wedding', locationCode: 'GT-GUA', currency: 'GTQ', language: 'es_LATAM', guestsCount: 150, estimatedBudget: 95_000, daysFromSeed: -3, status: 'completed' },
  { title: 'XV años de Valeria', eventTypeCode: 'xv', locationCode: 'MX-CDMX', currency: 'MXN', language: 'es_LATAM', guestsCount: 120, estimatedBudget: 180_000, daysFromSeed: -40, status: 'completed' },
  { title: 'Bautizo de Mateo', eventTypeCode: 'baptism', locationCode: 'CO-ANT', currency: 'COP', language: 'es_LATAM', guestsCount: 60, estimatedBudget: 20_000_000, daysFromSeed: -75, status: 'completed' },
  // Ancla "cercano a auto-completar" (US-087 AC-02): activo con fecha hoy − 2 días.
  { title: 'Baby shower de Sofía', eventTypeCode: 'baby_shower', locationCode: 'GT-GUA', currency: 'GTQ', language: 'es_LATAM', guestsCount: 40, estimatedBudget: 18_000, daysFromSeed: -2, status: 'active' },
  { title: 'Cumpleaños 40 de Andrés', eventTypeCode: 'birthday', locationCode: 'MX-CDMX', currency: 'MXN', language: 'es_LATAM', guestsCount: 80, estimatedBudget: 90_000, daysFromSeed: -20, status: 'completed' },
  { title: 'Cena de fin de año del equipo comercial', eventTypeCode: 'corporate', locationCode: 'GT-GUA', currency: 'USD', language: 'en', guestsCount: 100, estimatedBudget: 15_000, daysFromSeed: 60, status: 'active' },
  { title: 'Boda de Camila y Diego', eventTypeCode: 'wedding', locationCode: 'GT-GUA', currency: 'GTQ', language: 'es_LATAM', guestsCount: 180, estimatedBudget: 120_000, daysFromSeed: 95, status: 'active' },
  { title: 'XV años de Ximena', eventTypeCode: 'xv', locationCode: 'MX-CDMX', currency: 'MXN', language: 'es_LATAM', guestsCount: 150, estimatedBudget: 220_000, daysFromSeed: 45, status: 'active' },
  { title: 'Bautizo de Emiliano', eventTypeCode: 'baptism', locationCode: 'CO-ANT', currency: 'COP', language: 'es_LATAM', guestsCount: 50, estimatedBudget: 12_000_000, daysFromSeed: 120, status: 'draft' },
  { title: 'Baby shower de Lucía y Pablo', eventTypeCode: 'baby_shower', locationCode: 'GT-GUA', currency: 'GTQ', language: 'es_LATAM', guestsCount: 35, estimatedBudget: 16_000, daysFromSeed: 30, status: 'draft' },
  { title: 'Cumpleaños 60 de don Roberto', eventTypeCode: 'birthday', locationCode: 'GT-GUA', currency: 'GTQ', language: 'es_LATAM', guestsCount: 70, estimatedBudget: 30_000, daysFromSeed: -10, status: 'cancelled', notes: 'Cancelado: la familia decidió posponer la celebración.' },
  { title: 'Lanzamiento de nueva línea de productos', eventTypeCode: 'corporate', locationCode: 'MX-CDMX', currency: 'USD', language: 'en', guestsCount: 200, estimatedBudget: 25_000, daysFromSeed: -25, status: 'cancelled', notes: 'Cancelado: el lanzamiento se movió al siguiente trimestre.' },
];

/** Título previo a este ajuste; permite reconocer eventos de BDs sembradas antes sin duplicarlos. */
export function legacyEventTitle(index: number): string {
  return `Evento Demo #${index + 1}`;
}

export interface ReviewSeed {
  rating: number;
  comment: string;
}

// 24 reseñas: la i-ésima va a la reserva confirmada `i % 5` (0 catering, 1 DJ, 2 salón,
// 3 decoración, 4 pastel). 0..16 publicadas, 17..21 ocultas (datos de contacto), 22..23 eliminadas
// (contenido ajeno al servicio). Rating y texto siempre coherentes.
export const REVIEWS: ReviewSeed[] = [
  { rating: 5, comment: 'La comida llegó caliente y a tiempo. Los invitados preguntaron por el pepián.' },
  { rating: 5, comment: 'El DJ leyó muy bien a la gente; la pista no se vació en toda la noche.' },
  { rating: 4, comment: 'El jardín estaba impecable y el personal muy atento. El parqueo se quedó corto.' },
  { rating: 5, comment: 'La decoración quedó igual a la propuesta y montaron todo antes de la hora.' },
  { rating: 4, comment: 'El pastel estaba delicioso; el diseño fue un poco más sencillo que la muestra.' },
  { rating: 4, comment: 'Buen servicio y porciones generosas. Faltó un mesero en la mesa de los abuelos.' },
  { rating: 4, comment: 'Buena música y puntuales. El sonido estaba algo fuerte al principio.' },
  { rating: 5, comment: 'El salón es amplio y el área techada nos salvó cuando empezó a llover.' },
  { rating: 3, comment: 'Bonito resultado, pero cambiaron algunas flores sin avisarnos.' },
  { rating: 5, comment: 'La degustación nos ayudó a elegir el relleno. Todos repitieron.' },
  { rating: 5, comment: 'Atentos con las restricciones alimentarias de varios invitados. Muy recomendables.' },
  { rating: 3, comment: 'Cumplió con lo contratado, aunque llegó tarde a la prueba de sonido.' },
  { rating: 5, comment: 'Muy buena atención desde la visita al lugar hasta el cierre del evento.' },
  { rating: 4, comment: 'Muy creativos con el presupuesto que teníamos. Lo volvería a contratar.' },
  { rating: 5, comment: 'Entregaron el pastel en el salón a la hora exacta y en perfecto estado.' },
  { rating: 5, comment: 'El servicio fue impecable de principio a fin.' },
  { rating: 4, comment: 'Ambiente muy agradable; recibieron nuestras canciones especiales sin problema.' },
  // Ocultas: incluyen datos de contacto (política de reseñas).
  { rating: 5, comment: 'Lindo lugar. Si quieren precio especial escríbanme al 5555-0101.' },
  { rating: 4, comment: 'Buena decoración. Pidan el contacto directo por correo para que salga más barato.' },
  { rating: 2, comment: 'El pastel llegó tarde. Llámenme al 5555-0199 y les cuento qué pasó.' },
  { rating: 4, comment: 'Buen banquete; mi número es 5555-0123 si quieren referencias.' },
  { rating: 3, comment: 'Sonido aceptable. Contáctenme por mensaje directo para más detalles.' },
  // Eliminadas: contenido ajeno al servicio contratado.
  { rating: 1, comment: '¿Alguien sabe dónde alquilar sillas para otra fiesta?' },
  { rating: 1, comment: '¿Alguien conoce un mariachi disponible para el próximo sábado?' },
];

/** Cuerpo de la notificación de bienvenida según el rol del usuario seed. */
export const WELCOME_NOTIFICATION: Record<'admin' | 'organizer' | 'vendor', { title: string; body: string }> = {
  admin: {
    title: 'Te damos la bienvenida a EventFlow',
    body: 'Desde el panel puedes revisar proveedores pendientes y moderar reseñas.',
  },
  organizer: {
    title: 'Te damos la bienvenida a EventFlow',
    body: 'Crea tu evento y usa el asistente para armar tareas, presupuesto y solicitudes de cotización.',
  },
  vendor: {
    title: 'Te damos la bienvenida a EventFlow',
    body: 'Completa tu perfil y tus paquetes para empezar a recibir solicitudes de cotización.',
  },
};
