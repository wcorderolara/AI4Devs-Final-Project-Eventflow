// Datos LATAM deterministas para el seed (US-085, BR-SEED-004/009). Sin PII real (BR-PRIVACY-010):
// nombres ficticios y emails de dominio `@seed.eventflow.test`. Sin aleatoriedad → idempotencia.

export const EVENT_TYPES: Array<{ code: string; label: string }> = [
  { code: 'wedding', label: 'Boda' },
  { code: 'xv', label: 'XV Años' },
  { code: 'baptism', label: 'Bautizo' },
  { code: 'baby_shower', label: 'Baby Shower' },
  { code: 'birthday', label: 'Cumpleaños' },
  { code: 'corporate', label: 'Evento Corporativo' },
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

export const VENDOR_BUSINESSES = [
  'Banquetes El Quetzal',
  'Marimba Tradición Chapina',
  'DJ Sonido Total',
  'Foto Estudio Aurora',
  'Video Producciones Cielo',
  'Salón Jardín Las Rosas',
  'Decoraciones Encanto',
  'Floristería Primavera',
  'Pastelería Dulce Hogar',
  'Invitaciones Papel & Tinta',
  'Transporte Elegante',
  'Estilo & Glam Maquillaje',
];
