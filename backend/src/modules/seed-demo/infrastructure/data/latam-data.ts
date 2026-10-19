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
  { code: 'GT-SAC', country: 'Guatemala', region: 'Sacatepéquez', city: 'Antigua Guatemala' },
  { code: 'GT-QUE', country: 'Guatemala', region: 'Quetzaltenango', city: 'Quetzaltenango' },
  { code: 'MX-JAL', country: 'México', region: 'Jalisco', city: 'Guadalajara' },
  { code: 'MX-NLE', country: 'México', region: 'Nuevo León', city: 'Monterrey' },
  { code: 'CO-DC', country: 'Colombia', region: 'Bogotá D.C.', city: 'Bogotá' },
  { code: 'CO-BOL', country: 'Colombia', region: 'Bolívar', city: 'Cartagena' },
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
export type SeedLocationCode =
  | 'GT-GUA'
  | 'GT-SAC'
  | 'GT-QUE'
  | 'MX-CDMX'
  | 'MX-JAL'
  | 'MX-NLE'
  | 'CO-ANT'
  | 'CO-DC'
  | 'CO-BOL';

// Moneda local por ubicación: el paquete de un proveedor siempre va en la moneda de su país.
export const LOCAL_CURRENCY: Record<SeedLocationCode, SeedCurrency> = {
  'GT-GUA': 'GTQ',
  'GT-SAC': 'GTQ',
  'GT-QUE': 'GTQ',
  'MX-CDMX': 'MXN',
  'MX-JAL': 'MXN',
  'MX-NLE': 'MXN',
  'CO-ANT': 'COP',
  'CO-DC': 'COP',
  'CO-BOL': 'COP',
};

/** País de una ubicación seed (prefijo del código): agrupa eventos y proveedores que cotizan juntos. */
export function seedCountryOf(code: SeedLocationCode): 'GT' | 'MX' | 'CO' {
  return code.slice(0, 2) as 'GT' | 'MX' | 'CO';
}

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
  /** Segundo paquete opcional (se identifica por nombre dentro del proveedor). */
  extraPackage?: { packageName: string; packageDescription: string; referencePriceGtq: number };
  /**
   * Trabajo del portafolio con fotos de `seed-assets/portfolio/vendors/<slug>/NN.jpg`. Sólo los
   * proveedores agregados después; los 12 originales usan los escenarios por índice del seed.
   */
  portfolioWorkLabel?: string;
}

/**
 * Los 12 proveedores originales sostienen la matriz de cotizaciones/reservas (US-087/US-088) y los
 * escenarios por índice (portafolio lleno, oculto, moderado, rechazado). Los agregados después sólo
 * suman directorio, reseñas e historial.
 */
export const CORE_VENDOR_COUNT = 12;

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
  // ── Proveedores agregados al directorio (12..32): aprobados y visibles ──────────────────────
  {
    businessName: 'Fotografía Luz de Antigua',
    categoryCode: 'photography',
    locationCode: 'GT-SAC',
    bio: 'Fotografía de bodas y celebraciones en Antigua Guatemala y sus alrededores. Aprovechamos la luz natural de patios, ruinas y calles empedradas para retratos sin poses forzadas.',
    packageName: 'Cobertura de 6 horas con galería digital',
    packageDescription: 'Un fotógrafo durante 6 horas, sesión de retratos en exteriores de Antigua y galería digital con las fotos editadas.',
    referencePriceGtq: 6_500,
    briefMessage: 'Buscamos fotógrafo para la ceremonia y la recepción, con fotos de grupo familiares.',
    extraPackage: {
      packageName: 'Sesión de retratos previa al evento',
      packageDescription: 'Sesión de 2 horas en calles y patios de Antigua, con 40 fotos editadas.',
      referencePriceGtq: 1_800,
    },
    portfolioWorkLabel: 'boda-en-antigua-2025',
  },
  {
    businessName: 'Cine Boda Producciones',
    categoryCode: 'video',
    locationCode: 'MX-JAL',
    bio: 'Videos de bodas y XV años en Guadalajara y su zona metropolitana. Grabamos con dos cámaras, cuidamos el audio de los discursos y entregamos un video resumen con música licenciada.',
    packageName: 'Video resumen y ceremonia completa',
    packageDescription: 'Dos camarógrafos, video resumen de 4 a 6 minutos, y ceremonia y discursos completos editados.',
    referencePriceGtq: 7_000,
    briefMessage: 'Queremos un video resumen para compartir y los discursos completos.',
    extraPackage: {
      packageName: 'Tomas aéreas con dron',
      packageDescription: 'Tomas aéreas del lugar y de la llegada de los invitados, sujetas a los permisos del recinto.',
      referencePriceGtq: 1_500,
    },
    portfolioWorkLabel: 'boda-en-tlaquepaque-2025',
  },
  {
    businessName: 'Mariachi Real de Jalisco',
    categoryCode: 'mariachi',
    locationCode: 'MX-JAL',
    bio: 'Mariachi tradicional de Guadalajara con violines, trompetas, guitarrón y vihuela. Tocamos serenatas, misas y fiestas con repertorio ranchero, huapangos y boleros.',
    packageName: 'Mariachi de 9 elementos, 1 hora',
    packageDescription: 'Nueve músicos con traje de charro, repertorio a elección y equipo de sonido para salón mediano.',
    referencePriceGtq: 2_200,
    briefMessage: 'Queremos mariachi para la entrada a la fiesta, con algunas rancheras clásicas.',
    extraPackage: {
      packageName: 'Serenata sorpresa, 45 minutos',
      packageDescription: 'Serenata en domicilio o salón con seis músicos y las canciones que elijan los anfitriones.',
      referencePriceGtq: 1_300,
    },
    portfolioWorkLabel: 'serenata-y-fiesta-2025',
  },
  {
    businessName: 'DJ Ritmo Paisa',
    categoryCode: 'music_dj',
    locationCode: 'CO-ANT',
    bio: 'DJ para fiestas en Medellín con salsa, reguetón, vallenato y crossover. Llevamos sonido, luces y micrófono inalámbrico, y armamos la lista de canciones con los anfitriones.',
    packageName: 'DJ con sonido y luces, 6 horas',
    packageDescription: 'DJ, cabina, dos bafles profesionales, luces de pista y micrófono inalámbrico para brindis.',
    referencePriceGtq: 4_500,
    briefMessage: 'Necesitamos DJ con música crossover y salsa para la fiesta.',
    portfolioWorkLabel: 'fiesta-en-el-poblado-2025',
  },
  {
    businessName: 'Barra Móvil La Ceiba',
    categoryCode: 'beverages',
    locationCode: 'GT-GUA',
    bio: 'Barra móvil de cócteles y bebidas sin alcohol para eventos en la Ciudad de Guatemala. Llevamos barra, cristalería, hielo y bartenders.',
    packageName: 'Barra de cócteles para 100 invitados, 5 horas',
    packageDescription: 'Dos bartenders, barra iluminada, cristalería, hielo y carta de seis cócteles con y sin alcohol. El licor lo proveen los anfitriones.',
    referencePriceGtq: 6_000,
    briefMessage: 'Buscamos barra de cócteles con opciones sin alcohol para los invitados.',
    extraPackage: {
      packageName: 'Barra de café y bebidas calientes',
      packageDescription: 'Café guatemalteco de altura, chocolate y té con un barista durante 3 horas.',
      referencePriceGtq: 1_600,
    },
    portfolioWorkLabel: 'barra-de-cocteles-2025',
  },
  {
    businessName: 'Hora Loca Carnaval',
    categoryCode: 'hora_loca',
    locationCode: 'CO-DC',
    bio: 'Hora loca para bodas, quince años y fiestas en Bogotá: batucada, zanqueros, disfraces y accesorios luminosos para animar la pista.',
    packageName: 'Hora loca de 45 minutos',
    packageDescription: 'Batucada, dos zanqueros, animador, máscaras y accesorios luminosos para 100 invitados.',
    referencePriceGtq: 3_200,
    briefMessage: 'Queremos hora loca con batucada y accesorios para la pista.',
    portfolioWorkLabel: 'hora-loca-quince-2025',
  },
  {
    businessName: 'Animación Chispa',
    categoryCode: 'mc',
    locationCode: 'MX-NLE',
    bio: 'Animadores y maestros de ceremonias para fiestas y eventos de empresa en Monterrey. Conducimos el programa, los brindis y dinámicas para todas las edades.',
    packageName: 'Maestro de ceremonias, 5 horas',
    packageDescription: 'Conducción del programa, presentación de la entrada, brindis y dinámicas en la pista, con micrófono inalámbrico.',
    referencePriceGtq: 2_800,
    briefMessage: 'Buscamos un animador que conduzca el programa y anime la pista.',
    portfolioWorkLabel: 'animacion-de-fiesta-2025',
  },
  {
    businessName: 'Coordina Eventos Xelajú',
    categoryCode: 'planning',
    locationCode: 'GT-QUE',
    bio: 'Coordinación de bodas y XV años en Quetzaltenango. Armamos el cronograma, hablamos con los proveedores y acompañamos el día del evento para que la familia no se preocupe.',
    packageName: 'Coordinación del día del evento',
    packageDescription: 'Reunión previa, cronograma, contacto con proveedores y dos coordinadores durante el evento.',
    referencePriceGtq: 4_000,
    briefMessage: 'Necesitamos coordinación el día del evento y apoyo con el cronograma.',
    extraPackage: {
      packageName: 'Planeación completa',
      packageDescription: 'Acompañamiento desde tres meses antes: presupuesto, selección de proveedores y coordinación del día.',
      referencePriceGtq: 9_500,
    },
    portfolioWorkLabel: 'boda-en-xela-2025',
  },
  {
    businessName: 'Recuerdos Hechos a Mano',
    categoryCode: 'souvenirs',
    locationCode: 'MX-CDMX',
    bio: 'Recuerdos artesanales para bodas, bautizos y XV años en la Ciudad de México: bordados, velas, jaboncitos y empaques personalizados.',
    packageName: '100 recuerdos personalizados',
    packageDescription: 'Cien piezas artesanales a elegir (vela, jabón o bordado) con empaque y etiqueta con el nombre del evento.',
    referencePriceGtq: 2_400,
    briefMessage: 'Buscamos recuerdos artesanales para unos 100 invitados.',
    portfolioWorkLabel: 'recuerdos-de-bautizo-2025',
  },
  {
    businessName: 'Trajes y Vestidos Alameda',
    categoryCode: 'attire',
    locationCode: 'CO-DC',
    bio: 'Alquiler y confección de trajes y vestidos de fiesta en Bogotá. Hacemos ajustes a la medida y entregamos con planchado incluido.',
    packageName: 'Alquiler de traje completo',
    packageDescription: 'Traje, camisa, corbata o corbatín y ajustes a la medida, con una prueba previa.',
    referencePriceGtq: 900,
    briefMessage: 'Necesitamos alquiler de trajes para el anfitrión y dos acompañantes.',
    extraPackage: {
      packageName: 'Vestido de fiesta a la medida',
      packageDescription: 'Confección de vestido con dos pruebas y tela a elegir.',
      referencePriceGtq: 4_200,
    },
    portfolioWorkLabel: 'trajes-de-gala-2025',
  },
  {
    businessName: 'Banquetes La Hacienda',
    categoryCode: 'catering',
    locationCode: 'MX-NLE',
    bio: 'Banquetes en Monterrey con cocina norteña: cabrito, carne asada, frijoles charros y postres caseros. Incluimos meseros, montaje y vajilla.',
    packageName: 'Banquete norteño para 100 invitados',
    packageDescription: 'Entrada, plato fuerte de carne asada o cabrito, guarniciones, postre, meseros, montaje y vajilla.',
    referencePriceGtq: 18_000,
    briefMessage: 'Buscamos banquete norteño con una opción vegetariana y meseros.',
    extraPackage: {
      packageName: 'Taquiza para el cierre de la fiesta',
      packageDescription: 'Taquiza con tres guisados, tortillas y salsas para 100 personas.',
      referencePriceGtq: 3_500,
    },
    portfolioWorkLabel: 'banquete-norteno-2025',
  },
  {
    businessName: 'Sabores del Caribe Catering',
    categoryCode: 'catering',
    locationCode: 'CO-BOL',
    bio: 'Catering de cocina caribeña en Cartagena: arroz con coco, pescado frito, patacones y jugos naturales, con meseros y montaje.',
    packageName: 'Menú caribeño para 80 invitados',
    packageDescription: 'Entrada, plato fuerte de pescado o pollo con arroz con coco y patacón, postre y jugos naturales, con meseros.',
    referencePriceGtq: 14_000,
    briefMessage: 'Queremos un menú caribeño con opción sin mariscos para algunos invitados.',
    portfolioWorkLabel: 'cena-caribena-2025',
  },
  {
    businessName: 'Hacienda Los Arcos',
    categoryCode: 'venue',
    locationCode: 'GT-SAC',
    bio: 'Hacienda colonial a las afueras de Antigua Guatemala con jardines, fuente y corredores techados para celebraciones de hasta 250 personas.',
    packageName: 'Jardín y corredores para 150 personas, 8 horas',
    packageDescription: 'Uso de jardín y corredores, mobiliario, iluminación ambiental, parqueo y personal de limpieza.',
    referencePriceGtq: 22_000,
    briefMessage: 'Buscamos lugar con jardín y área techada para unos 150 invitados.',
    extraPackage: {
      packageName: 'Ceremonia en la capilla',
      packageDescription: 'Uso de la capilla de la hacienda para la ceremonia, con sillas y arreglo floral básico.',
      referencePriceGtq: 3_000,
    },
    portfolioWorkLabel: 'boda-en-la-hacienda-2025',
  },
  {
    businessName: 'Terraza Bahía',
    categoryCode: 'venue',
    locationCode: 'CO-BOL',
    bio: 'Terraza con vista a la bahía de Cartagena para cenas y fiestas de hasta 180 personas, con área cubierta y climatizada.',
    packageName: 'Terraza para 120 personas, 6 horas',
    packageDescription: 'Uso de terraza y área cubierta, mobiliario, iluminación, sonido ambiental y personal de apoyo.',
    referencePriceGtq: 18_500,
    briefMessage: 'Buscamos terraza con vista al mar y área cubierta por si llueve.',
    portfolioWorkLabel: 'cena-frente-al-mar-2025',
  },
  {
    businessName: 'Flores de la Sabana',
    categoryCode: 'flowers',
    locationCode: 'CO-DC',
    bio: 'Floristería en Bogotá con flor de cultivos de la Sabana: rosas, hortensias y follajes para ceremonias, centros de mesa y ramos.',
    packageName: 'Ramo y 10 centros de mesa',
    packageDescription: 'Ramo principal, arreglo para la entrada y diez centros de mesa con flor de temporada.',
    referencePriceGtq: 4_200,
    briefMessage: 'Necesitamos centros de mesa con rosas y hortensias en tonos claros.',
    portfolioWorkLabel: 'centros-de-mesa-2025',
  },
  {
    businessName: 'Dulce Tentación Repostería',
    categoryCode: 'cake',
    locationCode: 'MX-JAL',
    bio: 'Repostería en Guadalajara: pasteles de varios pisos, mesas de postres y galletas decoradas. Degustación previa con cita.',
    packageName: 'Pastel de dos pisos para 80 porciones',
    packageDescription: 'Pastel de dos pisos con relleno a elegir, decoración en betún o fondant y entrega en el salón.',
    referencePriceGtq: 1_800,
    briefMessage: 'Buscamos pastel para unos 80 invitados y una mesa de postres.',
    extraPackage: {
      packageName: 'Mesa de postres para 100 invitados',
      packageDescription: 'Cupcakes, galletas decoradas, gelatinas y dulces de leche, con montaje y base decorativa.',
      referencePriceGtq: 2_600,
    },
    portfolioWorkLabel: 'pastel-de-xv-2025',
  },
  {
    businessName: 'Decoraciones Fiesta Brava',
    categoryCode: 'decoration',
    locationCode: 'MX-NLE',
    bio: 'Decoración de salones en Monterrey con globos, telas, luces y centros de mesa para fiestas infantiles, XV años y bodas.',
    packageName: 'Decoración de salón con globos y luces',
    packageDescription: 'Arco de globos, telas en el techo, iluminación cálida, mesa principal y centros de mesa para 12 mesas.',
    referencePriceGtq: 6_200,
    briefMessage: 'Queremos decoración con globos y luces en tonos dorados.',
    portfolioWorkLabel: 'salon-de-xv-2025',
  },
  {
    businessName: 'Marimba Sones de Xela',
    categoryCode: 'marimba',
    locationCode: 'GT-QUE',
    bio: 'Marimba de Quetzaltenango con sones tradicionales, boleros y música popular para bodas, bautizos y fiestas familiares.',
    packageName: 'Marimba doble, 3 horas',
    packageDescription: 'Marimba doble con seis marimbistas, repertorio tradicional y popular, y equipo de sonido.',
    referencePriceGtq: 3_800,
    briefMessage: 'Queremos marimba con sones tradicionales para la recepción.',
    portfolioWorkLabel: 'marimba-en-xela-2025',
  },
  {
    businessName: 'Luces y Burbujas Show',
    categoryCode: 'entertainment',
    locationCode: 'CO-ANT',
    bio: 'Shows de burbujas gigantes, luces y humo bajo para fiestas infantiles, quince años y bodas en Medellín.',
    packageName: 'Show de burbujas y luces, 40 minutos',
    packageDescription: 'Burbujas gigantes, máquina de burbujas para la pista, luces LED y un animador.',
    referencePriceGtq: 2_500,
    briefMessage: 'Buscamos un show de burbujas para los niños y para la pista.',
    portfolioWorkLabel: 'show-de-burbujas-2025',
  },
  {
    businessName: 'Glam Studio Cartagena',
    categoryCode: 'makeup',
    locationCode: 'CO-BOL',
    bio: 'Maquillaje y peinado para novias, quinceañeras e invitadas en Cartagena, a domicilio o en el hotel, con productos de larga duración.',
    packageName: 'Maquillaje y peinado con prueba previa',
    packageDescription: 'Prueba previa, maquillaje y peinado el día del evento en el hotel o en casa.',
    referencePriceGtq: 1_800,
    briefMessage: 'Necesitamos maquillaje y peinado para la festejada y tres acompañantes.',
    extraPackage: {
      packageName: 'Maquillaje para acompañantes',
      packageDescription: 'Maquillaje y peinado sencillo por persona, para damas o familiares.',
      referencePriceGtq: 600,
    },
    portfolioWorkLabel: 'maquillaje-de-novia-2025',
  },
  {
    businessName: 'Autos Clásicos del Valle',
    categoryCode: 'transport',
    locationCode: 'MX-JAL',
    bio: 'Renta de autos clásicos con chofer en Guadalajara para bodas, XV años y sesiones de fotos.',
    packageName: 'Auto clásico con chofer, 4 horas',
    packageDescription: 'Auto clásico decorado con chofer para los traslados a la ceremonia, a la recepción y a las fotos.',
    referencePriceGtq: 3_000,
    briefMessage: 'Buscamos un auto clásico para el traslado a la ceremonia y a la fiesta.',
    portfolioWorkLabel: 'auto-clasico-boda-2025',
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

export type SeedReviewStatus = 'published' | 'hidden' | 'removed';

export interface ReviewSeed {
  /** `businessName` del proveedor reseñado. */
  vendor: string;
  rating: number;
  /** Texto único entre las reseñas seed: es la clave estable de la reseña (idempotencia). */
  comment: string;
  /** Por defecto `published`. `hidden`/`removed` llevan su AdminAction de moderación. */
  status?: SeedReviewStatus;
}

// Cada reseña cuelga de su propia reserva confirmada en un evento ya completado del autor (ver
// `REVIEW_EVENTS`), igual que en la app: dueño del evento, `confirmed_intent` con el proveedor y
// una sola reseña activa por reserva. Las 24 primeras son las históricas del seed (mismos textos,
// mismo proveedor); incluyen los ejemplos moderados: ocultas por datos de contacto y eliminadas por
// contenido ajeno al servicio. Rating y texto siempre coherentes.
const QUETZAL = 'Banquetes El Quetzal';
const DJ_TOTAL = 'DJ Sonido Total';
const LAS_ROSAS = 'Salón Jardín Las Rosas';
const ENCANTO = 'Decoraciones Encanto';
const DULCE_HOGAR = 'Pastelería Dulce Hogar';

export const REVIEWS: ReviewSeed[] = [
  { vendor: QUETZAL, rating: 5, comment: 'La comida llegó caliente y a tiempo. Los invitados preguntaron por el pepián.' },
  { vendor: DJ_TOTAL, rating: 5, comment: 'El DJ leyó muy bien a la gente; la pista no se vació en toda la noche.' },
  { vendor: LAS_ROSAS, rating: 4, comment: 'El jardín estaba impecable y el personal muy atento. El parqueo se quedó corto.' },
  { vendor: ENCANTO, rating: 5, comment: 'La decoración quedó igual a la propuesta y montaron todo antes de la hora.' },
  { vendor: DULCE_HOGAR, rating: 4, comment: 'El pastel estaba delicioso; el diseño fue un poco más sencillo que la muestra.' },
  { vendor: QUETZAL, rating: 4, comment: 'Buen servicio y porciones generosas. Faltó un mesero en la mesa de los abuelos.' },
  { vendor: DJ_TOTAL, rating: 4, comment: 'Buena música y puntuales. El sonido estaba algo fuerte al principio.' },
  { vendor: LAS_ROSAS, rating: 5, comment: 'El salón es amplio y el área techada nos salvó cuando empezó a llover.' },
  { vendor: ENCANTO, rating: 3, comment: 'Bonito resultado, pero cambiaron algunas flores sin avisarnos.' },
  { vendor: DULCE_HOGAR, rating: 5, comment: 'La degustación nos ayudó a elegir el relleno. Todos repitieron.' },
  { vendor: QUETZAL, rating: 5, comment: 'Atentos con las restricciones alimentarias de varios invitados. Muy recomendables.' },
  { vendor: DJ_TOTAL, rating: 3, comment: 'Cumplió con lo contratado, aunque llegó tarde a la prueba de sonido.' },
  { vendor: LAS_ROSAS, rating: 5, comment: 'Muy buena atención desde la visita al lugar hasta el cierre del evento.' },
  { vendor: ENCANTO, rating: 4, comment: 'Muy creativos con el presupuesto que teníamos. Lo volvería a contratar.' },
  { vendor: DULCE_HOGAR, rating: 5, comment: 'Entregaron el pastel en el salón a la hora exacta y en perfecto estado.' },
  { vendor: QUETZAL, rating: 5, comment: 'El servicio fue impecable de principio a fin.' },
  { vendor: DJ_TOTAL, rating: 4, comment: 'Ambiente muy agradable; recibieron nuestras canciones especiales sin problema.' },
  // Ocultas: incluyen datos de contacto (política de reseñas).
  { vendor: LAS_ROSAS, rating: 5, status: 'hidden', comment: 'Lindo lugar. Si quieren precio especial escríbanme al 5555-0101.' },
  { vendor: ENCANTO, rating: 4, status: 'hidden', comment: 'Buena decoración. Pidan el contacto directo por correo para que salga más barato.' },
  { vendor: DULCE_HOGAR, rating: 2, status: 'hidden', comment: 'El pastel llegó tarde. Llámenme al 5555-0199 y les cuento qué pasó.' },
  { vendor: QUETZAL, rating: 4, status: 'hidden', comment: 'Buen banquete; mi número es 5555-0123 si quieren referencias.' },
  { vendor: DJ_TOTAL, rating: 3, status: 'hidden', comment: 'Sonido aceptable. Contáctenme por mensaje directo para más detalles.' },
  // Eliminadas: contenido ajeno al servicio contratado.
  { vendor: LAS_ROSAS, rating: 1, status: 'removed', comment: '¿Alguien sabe dónde alquilar sillas para otra fiesta?' },
  { vendor: ENCANTO, rating: 1, status: 'removed', comment: '¿Alguien conoce un mariachi disponible para el próximo sábado?' },

  // ── Guatemala ──────────────────────────────────────────────────────────────────────────────
  { vendor: QUETZAL, rating: 2, comment: 'La comida llegó tibia porque el carro se retrasó, y los meseros tardaron en atender las mesas del fondo.' },
  { vendor: QUETZAL, rating: 4, comment: 'Buen sazón y presentación cuidada. El café del final se terminó antes de tiempo.' },
  { vendor: 'Marimba Tradición Chapina', rating: 5, comment: 'Tocaron los sones que pedimos para la entrada y la gente bailó desde la primera pieza.' },
  { vendor: 'Marimba Tradición Chapina', rating: 5, comment: 'Puntuales y muy respetuosos con los tiempos del programa. Los abuelos quedaron felices.' },
  { vendor: 'Marimba Tradición Chapina', rating: 4, comment: 'Excelente repertorio. El equipo de sonido se escuchaba algo saturado en las piezas rápidas.' },
  { vendor: 'Marimba Tradición Chapina', rating: 5, comment: 'Llegaron con tiempo para montar y no hubo ningún atraso. Muy recomendables.' },
  { vendor: 'Marimba Tradición Chapina', rating: 4, comment: 'Muy buena marimba; nos hubiera gustado una pausa más corta entre bloques.' },
  { vendor: ENCANTO, rating: 2, comment: 'Faltaron los arreglos de la mesa de regalos que estaban en la cotización y nadie nos avisó.' },
  { vendor: ENCANTO, rating: 4, comment: 'Montaron a tiempo y los centros de mesa quedaron muy bonitos.' },
  { vendor: 'Floristería Primavera', rating: 2, comment: 'Cambiaron las rosas blancas por claveles sin consultarnos y el ramo no se parecía a la muestra.' },
  { vendor: 'Floristería Primavera', rating: 4, comment: 'Flores frescas que aguantaron toda la noche. Entregaron una hora antes, como acordamos.' },
  { vendor: 'Floristería Primavera', rating: 3, comment: 'Los centros de mesa quedaron bien, pero el arreglo de la entrada era más pequeño de lo que pedimos.' },
  { vendor: 'Floristería Primavera', rating: 3, comment: 'Bonito trabajo, aunque tuvimos que llamar varias veces para confirmar la hora de entrega.' },
  { vendor: 'Transporte Elegante', rating: 1, comment: 'El auto llegó 40 minutos tarde y tuvimos que retrasar todo el programa.' },
  { vendor: 'Transporte Elegante', rating: 2, comment: 'El conductor no conocía la ruta y nos cobraron aparte la hora extra de espera, que no venía en la cotización.' },
  { vendor: 'Transporte Elegante', rating: 4, comment: 'Auto bonito y bien decorado. El conductor fue amable y paciente con las fotos.' },
  { vendor: 'Estilo & Glam Maquillaje', rating: 5, comment: 'El maquillaje aguantó toda la noche, incluso con el calor del salón.' },
  { vendor: 'Estilo & Glam Maquillaje', rating: 5, comment: 'Llegaron puntuales a la casa y trabajaron rápido sin dejar de ser cuidadosas.' },
  { vendor: 'Estilo & Glam Maquillaje', rating: 5, comment: 'La prueba previa nos ayudó a ajustar el tono. Quedó idéntico a lo que pedimos.' },
  { vendor: 'Estilo & Glam Maquillaje', rating: 4, comment: 'Muy buen peinado; el retoque antes de la recepción fue más corto de lo esperado.' },
  { vendor: 'Estilo & Glam Maquillaje', rating: 5, comment: 'Atendieron también a la mamá y a las tías, y todas quedaron felices.' },
  { vendor: 'Estilo & Glam Maquillaje', rating: 5, comment: 'Profesionales y muy amables. Repetiríamos sin dudarlo.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 5, comment: 'Las fotos en los patios y las ruinas quedaron preciosas. Entregaron la galería antes de lo prometido.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 5, comment: 'Capturaron momentos que ni vimos. Muy discretos durante todo el evento.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 5, comment: 'Excelente dirección en las fotos de grupo; nadie salió con los ojos cerrados.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 5, comment: 'Nos guiaron con los horarios de luz para las fotos al atardecer. Resultado espectacular.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 4, comment: 'Muy buen trabajo; la edición tardó un par de semanas más de lo acordado.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 5, comment: 'Trato amable con todos los invitados y fotos naturales, nada forzado.' },
  { vendor: 'Fotografía Luz de Antigua', rating: 5, comment: 'La galería digital está muy bien organizada y fue fácil compartirla con la familia.' },
  { vendor: 'Barra Móvil La Ceiba', rating: 4, comment: 'Buenos cócteles y la barra se veía muy bien en el jardín.' },
  { vendor: 'Barra Móvil La Ceiba', rating: 2, comment: 'Se acabó el hielo a mitad de la fiesta y tardaron más de una hora en reponerlo.' },
  { vendor: 'Barra Móvil La Ceiba', rating: 2, comment: 'Nos cobraron aparte los vasos de vidrio, que no aparecían en la cotización.' },
  { vendor: 'Barra Móvil La Ceiba', rating: 5, comment: 'Los bartenders fueron rápidos y muy amables; la limonada con rosa de jamaica fue un éxito.' },
  { vendor: 'Coordina Eventos Xelajú', rating: 5, comment: 'Coordinaron a todos los proveedores y nosotros solo disfrutamos. El cronograma se cumplió.' },
  { vendor: 'Coordina Eventos Xelajú', rating: 3, comment: 'Buena organización en general, pero la comunicación la semana previa fue lenta.' },
  { vendor: 'Coordina Eventos Xelajú', rating: 4, comment: 'Resolvieron rápido cuando el sonido falló al inicio. Muy ordenados.' },
  { vendor: 'Hacienda Los Arcos', rating: 5, comment: 'Los jardines y la fuente son hermosos; las fotos quedaron de revista.' },
  { vendor: 'Hacienda Los Arcos', rating: 5, comment: 'El personal estuvo pendiente de todo y el lugar estaba impecable.' },
  { vendor: 'Hacienda Los Arcos', rating: 4, comment: 'Lugar precioso. Faltó señalización para llegar al parqueo de noche.' },
  { vendor: 'Hacienda Los Arcos', rating: 5, comment: 'Nos dejaron entrar temprano para decorar sin costo extra.' },
  { vendor: 'Hacienda Los Arcos', rating: 4, comment: 'Muy bonito, aunque el frío de la noche se sintió y hubo pocos calentadores.' },
  { vendor: 'Hacienda Los Arcos', rating: 5, comment: 'El coordinador del lugar resolvió todo con calma. Excelente experiencia.' },
  { vendor: 'Hacienda Los Arcos', rating: 3, comment: 'Bonito lugar, pero los baños se quedaron sin papel a medianoche y nadie respondió rápido.' },
  { vendor: 'Hacienda Los Arcos', rating: 5, comment: 'Ambiente colonial muy elegante y sin ruido de la calle.' },
  { vendor: 'Marimba Sones de Xela', rating: 5, comment: 'Marimba de mucha calidad; tocaron con alegría y respetaron el horario.' },
  { vendor: 'Marimba Sones de Xela', rating: 4, comment: 'Muy buena música; tardaron un poco en montar el equipo.' },

  // ── México ─────────────────────────────────────────────────────────────────────────────────
  { vendor: DULCE_HOGAR, rating: 3, comment: 'El pastel estaba rico, pero llegó con una esquina del fondant golpeada.' },
  { vendor: 'Invitaciones Papel & Tinta', rating: 4, comment: 'El papel texturizado se ve muy elegante y la versión digital llegó el mismo día.' },
  { vendor: 'Invitaciones Papel & Tinta', rating: 2, comment: 'Hubo un error en la fecha impresa y la reimpresión tardó una semana.' },
  { vendor: 'Invitaciones Papel & Tinta', rating: 5, comment: 'Diseño muy cuidado y atención rápida a los cambios que pedimos.' },
  { vendor: 'Cine Boda Producciones', rating: 5, comment: 'El video resumen nos hizo llorar. La música quedó perfecta.' },
  { vendor: 'Cine Boda Producciones', rating: 4, comment: 'Muy buen trabajo con el dron; la entrega se demoró tres semanas más de lo acordado.' },
  { vendor: 'Cine Boda Producciones', rating: 5, comment: 'Grabaron sin estorbar y captaron los discursos completos con buen audio.' },
  { vendor: 'Cine Boda Producciones', rating: 4, comment: 'Edición muy profesional. Nos hubiera gustado ver más tomas de la pista.' },
  { vendor: 'Cine Boda Producciones', rating: 4, comment: 'Buen equipo y trato amable; el primer corte tenía detalles de color que corrigieron sin problema.' },
  { vendor: 'Mariachi Real de Jalisco', rating: 5, comment: 'Llegaron uniformados impecables y la entrada con mariachi fue lo mejor de la noche.' },
  { vendor: 'Mariachi Real de Jalisco', rating: 5, comment: 'Se sabían todas las canciones que pedimos, incluso las rancheras viejitas del abuelo.' },
  { vendor: 'Mariachi Real de Jalisco', rating: 4, comment: 'Gran mariachi; empezaron diez minutos tarde, pero cumplieron la hora completa.' },
  { vendor: 'Mariachi Real de Jalisco', rating: 5, comment: 'La serenata sorpresa salió perfecta. Muy coordinados con el salón.' },
  { vendor: 'Mariachi Real de Jalisco', rating: 5, comment: 'Excelente voz del cantante principal. Todos terminamos cantando con ellos.' },
  { vendor: 'Mariachi Real de Jalisco', rating: 4, comment: 'Muy buenos, aunque las trompetas sonaban demasiado fuerte para el tamaño del salón.' },
  { vendor: 'Animación Chispa', rating: 2, comment: 'El animador hizo bromas incómodas con algunos invitados y tuvimos que pedirle que parara.' },
  { vendor: 'Animación Chispa', rating: 4, comment: 'Mantuvo a la gente activa y respetó el programa de brindis.' },
  { vendor: 'Animación Chispa', rating: 1, comment: 'Llegó una hora tarde y no traía el micrófono inalámbrico que habíamos acordado.' },
  { vendor: 'Animación Chispa', rating: 4, comment: 'Buenas dinámicas para niños y adultos; se adaptó bien al público.' },
  { vendor: 'Recuerdos Hechos a Mano', rating: 5, comment: 'Los recuerdos bordados quedaron preciosos y muy bien empacados.' },
  { vendor: 'Recuerdos Hechos a Mano', rating: 2, comment: 'Faltaron 20 piezas del pedido y las entregaron dos días después de la fiesta.' },
  { vendor: 'Banquetes La Hacienda', rating: 5, comment: 'El cabrito y la carne asada estuvieron deliciosos. Porciones generosas.' },
  { vendor: 'Banquetes La Hacienda', rating: 4, comment: 'Buen servicio de meseros y todo muy limpio.' },
  { vendor: 'Banquetes La Hacienda', rating: 2, comment: 'La comida llegó fría a las mesas del fondo y el postre se sirvió casi a medianoche.' },
  { vendor: 'Banquetes La Hacienda', rating: 5, comment: 'Muy atentos con el menú infantil y con las opciones sin gluten.' },
  { vendor: 'Banquetes La Hacienda', rating: 3, comment: 'Buen sabor, pero un mesero nos contestó de mala manera cuando pedimos más tortillas.' },
  { vendor: 'Banquetes La Hacienda', rating: 4, comment: 'Montaje elegante y puntuales con los tiempos.' },
  { vendor: 'Banquetes La Hacienda', rating: 4, comment: 'La degustación previa nos ayudó a elegir; buen precio por todo lo que incluye.' },
  { vendor: 'Dulce Tentación Repostería', rating: 5, comment: 'El pastel quedó igualito al diseño y el relleno de cajeta fue un éxito.' },
  { vendor: 'Dulce Tentación Repostería', rating: 5, comment: 'Entregaron a tiempo y la mesa de postres se veía hermosa.' },
  { vendor: 'Dulce Tentación Repostería', rating: 5, comment: 'Sabor increíble, no sobró ni una rebanada.' },
  { vendor: 'Dulce Tentación Repostería', rating: 4, comment: 'Muy rico; el betún se suavizó un poco con el calor del jardín.' },
  { vendor: 'Dulce Tentación Repostería', rating: 5, comment: 'Atención muy amable desde la degustación hasta la entrega.' },
  { vendor: 'Decoraciones Fiesta Brava', rating: 1, comment: 'Terminaron de montar cuando los invitados ya estaban llegando y faltaron las luces que pagamos.' },
  { vendor: 'Decoraciones Fiesta Brava', rating: 3, comment: 'El resultado final se veía bien, pero los globos se desinflaron antes de partir el pastel.' },
  { vendor: 'Decoraciones Fiesta Brava', rating: 3, comment: 'Cumplieron con lo básico, pero cobraron como extra el retiro de la decoración sin avisarnos antes.' },
  { vendor: 'Autos Clásicos del Valle', rating: 5, comment: 'El auto clásico estaba impecable y el chofer fue muy puntual.' },
  { vendor: 'Autos Clásicos del Valle', rating: 4, comment: 'Muy bonito el carro; el aire acondicionado no funcionaba bien.' },
  { vendor: 'Autos Clásicos del Valle', rating: 5, comment: 'Nos esperaron sin problema durante las fotos. Excelente servicio.' },
  { vendor: 'Autos Clásicos del Valle', rating: 3, comment: 'El auto llegó a tiempo, pero sin el arreglo floral que habíamos acordado.' },

  // ── Colombia ───────────────────────────────────────────────────────────────────────────────
  { vendor: LAS_ROSAS, rating: 3, comment: 'El jardín es bonito, pero la música del salón de al lado se escuchaba durante los discursos.' },
  { vendor: 'DJ Ritmo Paisa', rating: 5, comment: 'Puso salsa, reguetón y crossover en el momento justo; la pista nunca se vació.' },
  { vendor: 'DJ Ritmo Paisa', rating: 5, comment: 'Muy profesional; llegó temprano a probar el sonido.' },
  { vendor: 'DJ Ritmo Paisa', rating: 4, comment: 'Buena música y luces; el micrófono para el brindis falló un par de veces.' },
  { vendor: 'DJ Ritmo Paisa', rating: 5, comment: 'Atendió todas nuestras peticiones y leyó muy bien a los invitados.' },
  { vendor: 'DJ Ritmo Paisa', rating: 3, comment: 'Buena selección, pero el volumen estaba tan alto que no se podía conversar en las mesas.' },
  { vendor: 'DJ Ritmo Paisa', rating: 5, comment: 'Excelente energía toda la noche. Lo recomendamos.' },
  { vendor: 'Hora Loca Carnaval', rating: 5, comment: 'La hora loca levantó la fiesta; los disfraces y las máscaras encantaron a todos.' },
  { vendor: 'Hora Loca Carnaval', rating: 5, comment: 'Llegaron puntuales y con mucha energía. Incluyeron a los niños y a los abuelos.' },
  { vendor: 'Hora Loca Carnaval', rating: 4, comment: 'Muy divertido; duró un poco menos de lo contratado.' },
  { vendor: 'Hora Loca Carnaval', rating: 5, comment: 'La batucada y los zanqueros fueron espectaculares. Valió cada peso.' },
  { vendor: 'Trajes y Vestidos Alameda', rating: 4, comment: 'Buena variedad de trajes y ajustes rápidos.' },
  { vendor: 'Trajes y Vestidos Alameda', rating: 2, comment: 'El vestido llegó con el dobladillo sin terminar y tuvimos que arreglarlo el mismo día.' },
  { vendor: 'Trajes y Vestidos Alameda', rating: 3, comment: 'Atención amable, pero entregaron el traje la noche anterior y no hubo tiempo para otra prueba.' },
  { vendor: 'Sabores del Caribe Catering', rating: 5, comment: 'El arroz con coco y el pescado frito fueron lo más comentado de la noche.' },
  { vendor: 'Sabores del Caribe Catering', rating: 4, comment: 'Comida deliciosa; los meseros se demoraron un poco con las bebidas.' },
  { vendor: 'Sabores del Caribe Catering', rating: 5, comment: 'Muy organizados y atentos con los invitados que no comían mariscos.' },
  { vendor: 'Sabores del Caribe Catering', rating: 3, comment: 'Buen sabor, pero faltaron postres para varias mesas.' },
  { vendor: 'Sabores del Caribe Catering', rating: 4, comment: 'Buena presentación y todo llegó caliente a las mesas.' },
  { vendor: 'Terraza Bahía', rating: 5, comment: 'La vista a la bahía al atardecer es increíble. Los invitados no paraban de tomar fotos.' },
  { vendor: 'Terraza Bahía', rating: 2, comment: 'El aire acondicionado del área cubierta no funcionó y hacía muchísimo calor.' },
  { vendor: 'Terraza Bahía', rating: 4, comment: 'Lugar hermoso y personal amable; el acceso es complicado para personas mayores por las escaleras.' },
  { vendor: 'Terraza Bahía', rating: 3, comment: 'Bonita terraza, pero cobraron un recargo por hora extra que no estaba en la cotización.' },
  { vendor: 'Terraza Bahía', rating: 5, comment: 'Todo impecable y el coordinador del lugar muy atento.' },
  { vendor: 'Terraza Bahía', rating: 2, comment: 'Nos cambiaron el horario de montaje dos días antes y la decoración quedó a medias.' },
  { vendor: 'Flores de la Sabana', rating: 5, comment: 'Flores muy frescas; las hortensias y las rosas duraron toda la semana.' },
  { vendor: 'Flores de la Sabana', rating: 4, comment: 'Arreglos bonitos y entrega puntual. El ramo era algo más pequeño de lo esperado.' },
  { vendor: 'Luces y Burbujas Show', rating: 5, comment: 'El show de burbujas tuvo a los niños fascinados durante media hora.' },
  { vendor: 'Luces y Burbujas Show', rating: 4, comment: 'Muy lindo show de luces; el montaje ocupó más espacio del que nos dijeron.' },
  { vendor: 'Luces y Burbujas Show', rating: 3, comment: 'Los niños se divirtieron, pero la máquina de humo hizo sonar la alarma del salón.' },
  { vendor: 'Glam Studio Cartagena', rating: 1, comment: 'Llegaron dos horas tarde y tuvimos que maquillarnos a la carrera antes de salir.' },
  { vendor: 'Glam Studio Cartagena', rating: 2, comment: 'El maquillaje se corrió con el calor en la primera hora de la fiesta.' },
  { vendor: 'Glam Studio Cartagena', rating: 4, comment: 'Peinados muy bonitos y trato amable.' },
  { vendor: 'Glam Studio Cartagena', rating: 2, comment: 'Nos cobraron el maquillaje de una acompañante extra que nunca atendieron.' },
  { vendor: 'Glam Studio Cartagena', rating: 4, comment: 'Buen resultado en las fotos, aunque tardaron más de lo previsto.' },
];

// Organizadores con historial (eventos ya realizados y reseñas). Siguen el patrón de identidades
// seed (`organizerN@…`) a continuación de los 6 organizadores demo, que no cambian.
export const REVIEWER_ORGANIZER_NAMES = [
  'Paola Méndez',
  'Luis Fernando Cifuentes',
  'Mónica Herrera',
  'Rodrigo Pérez',
  'Fernanda Ruiz',
  'Alejandro Treviño',
  'Itzel Hernández',
  'Jorge Salinas',
  'Daniela Ortiz',
  'Laura Restrepo',
  'Andrés Felipe Ospina',
  'Valentina Cárdenas',
  'Carolina Mejía',
  'Mauricio Torres',
  'Juliana Vargas',
];

export interface ReviewEventSeed {
  title: string;
  eventTypeCode: string;
  /** Ubicación por defecto; si el evento reservó un salón, se usa la del salón. */
  locationCode: SeedLocationCode;
  /** Índice en `REVIEWER_ORGANIZER_NAMES` (dueño del evento y autor de sus reseñas). */
  organizer: number;
  guestsCount: number;
  /** Días respecto a la corrida del seed (siempre en el pasado: eventos completados). */
  daysFromSeed: number;
}

// Eventos ya realizados que sostienen las reseñas (ver `buildReviewHistoryPlan`). Primero se reparten
// las reseñas de salones (el evento pasa a la ciudad del salón) y luego el resto, prefiriendo eventos
// de la misma ciudad del proveedor; siempre sin repetir categoría confirmada en un evento. Dentro de
// cada país van primero los eventos grandes (bodas, XV años), que concentran más proveedores.
export const REVIEW_EVENTS: ReviewEventSeed[] = [
  { title: 'Boda de Paola y Andrés', eventTypeCode: 'wedding', locationCode: 'GT-SAC', organizer: 0, guestsCount: 180, daysFromSeed: -150 },
  { title: 'Boda de Mónica y Esteban', eventTypeCode: 'wedding', locationCode: 'GT-SAC', organizer: 2, guestsCount: 160, daysFromSeed: -300 },
  { title: 'XV años de Andrea', eventTypeCode: 'xv', locationCode: 'GT-QUE', organizer: 1, guestsCount: 140, daysFromSeed: -210 },
  { title: 'XV años de Daniela', eventTypeCode: 'xv', locationCode: 'GT-QUE', organizer: 3, guestsCount: 120, daysFromSeed: -45 },
  { title: 'Cumpleaños 50 de doña Marta', eventTypeCode: 'birthday', locationCode: 'GT-GUA', organizer: 1, guestsCount: 90, daysFromSeed: -95 },
  { title: 'Aniversario de la empresa familiar', eventTypeCode: 'corporate', locationCode: 'GT-GUA', organizer: 3, guestsCount: 110, daysFromSeed: -130 },
  { title: 'Bautizo de Sebastián', eventTypeCode: 'baptism', locationCode: 'GT-GUA', organizer: 0, guestsCount: 70, daysFromSeed: -35 },
  { title: 'Baby shower de Mónica', eventTypeCode: 'baby_shower', locationCode: 'GT-GUA', organizer: 2, guestsCount: 45, daysFromSeed: -60 },
  { title: 'Cena de fin de año de la cooperativa', eventTypeCode: 'corporate', locationCode: 'GT-GUA', organizer: 1, guestsCount: 120, daysFromSeed: -320 },
  { title: 'Cumpleaños 40 de Lucía', eventTypeCode: 'birthday', locationCode: 'GT-GUA', organizer: 2, guestsCount: 90, daysFromSeed: -22 },

  { title: 'Boda de Fernanda y Rodrigo', eventTypeCode: 'wedding', locationCode: 'MX-JAL', organizer: 4, guestsCount: 200, daysFromSeed: -180 },
  { title: 'Boda de Mariana y Jorge', eventTypeCode: 'wedding', locationCode: 'MX-NLE', organizer: 7, guestsCount: 220, daysFromSeed: -240 },
  { title: 'XV años de Renata', eventTypeCode: 'xv', locationCode: 'MX-CDMX', organizer: 6, guestsCount: 150, daysFromSeed: -120 },
  { title: 'XV años de Camila', eventTypeCode: 'xv', locationCode: 'MX-JAL', organizer: 8, guestsCount: 160, daysFromSeed: -160 },
  { title: 'Cumpleaños 60 de don Ernesto', eventTypeCode: 'birthday', locationCode: 'MX-JAL', organizer: 7, guestsCount: 100, daysFromSeed: -85 },
  { title: 'Cumpleaños 30 de Alejandro', eventTypeCode: 'birthday', locationCode: 'MX-NLE', organizer: 5, guestsCount: 80, daysFromSeed: -70 },
  { title: 'Cena de fin de año del despacho', eventTypeCode: 'corporate', locationCode: 'MX-NLE', organizer: 5, guestsCount: 90, daysFromSeed: -290 },
  { title: 'Bautizo de Regina', eventTypeCode: 'baptism', locationCode: 'MX-JAL', organizer: 4, guestsCount: 60, daysFromSeed: -40 },
  { title: 'Cumpleaños 8 de Emilio', eventTypeCode: 'birthday', locationCode: 'MX-CDMX', organizer: 8, guestsCount: 50, daysFromSeed: -55 },
  { title: 'Baby shower de Itzel', eventTypeCode: 'baby_shower', locationCode: 'MX-CDMX', organizer: 6, guestsCount: 40, daysFromSeed: -30 },

  { title: 'Boda de Laura y Santiago', eventTypeCode: 'wedding', locationCode: 'CO-ANT', organizer: 9, guestsCount: 170, daysFromSeed: -200 },
  { title: 'XV años de Sara', eventTypeCode: 'xv', locationCode: 'CO-ANT', organizer: 12, guestsCount: 130, daysFromSeed: -110 },
  { title: 'XV años de Isabella', eventTypeCode: 'xv', locationCode: 'CO-DC', organizer: 14, guestsCount: 140, daysFromSeed: -170 },
  { title: 'Cumpleaños 40 de Andrés Felipe', eventTypeCode: 'birthday', locationCode: 'CO-DC', organizer: 10, guestsCount: 80, daysFromSeed: -90 },
  { title: 'Cumpleaños 70 de la abuela Rosa', eventTypeCode: 'birthday', locationCode: 'CO-ANT', organizer: 12, guestsCount: 70, daysFromSeed: -260 },
  { title: 'Bautizo de Martín', eventTypeCode: 'baptism', locationCode: 'CO-ANT', organizer: 9, guestsCount: 50, daysFromSeed: -50 },
  { title: 'Boda de Valentina y Julián', eventTypeCode: 'wedding', locationCode: 'CO-BOL', organizer: 11, guestsCount: 150, daysFromSeed: -140 },
  { title: 'Boda de Natalia y Mauricio', eventTypeCode: 'wedding', locationCode: 'CO-BOL', organizer: 13, guestsCount: 190, daysFromSeed: -330 },
  { title: 'Matrimonio civil de Juliana y Felipe', eventTypeCode: 'wedding', locationCode: 'CO-BOL', organizer: 14, guestsCount: 60, daysFromSeed: -27 },
  { title: 'Fiesta de fin de año de la agencia', eventTypeCode: 'corporate', locationCode: 'CO-BOL', organizer: 10, guestsCount: 100, daysFromSeed: -280 },
  { title: 'Bautizo de Jacobo', eventTypeCode: 'baptism', locationCode: 'CO-BOL', organizer: 13, guestsCount: 55, daysFromSeed: -65 },
  { title: 'Baby shower de Valentina', eventTypeCode: 'baby_shower', locationCode: 'CO-BOL', organizer: 11, guestsCount: 35, daysFromSeed: -38 },
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
