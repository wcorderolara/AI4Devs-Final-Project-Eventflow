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

// 12 categorías con jerarquía ≤ 2 niveles (depthLevel 1 raíz, 2 subcategoría). LATAM-coherentes.
export const SERVICE_CATEGORIES: Array<{ code: string; label: string; depthLevel: number }> = [
  { code: 'catering', label: 'Banquetes y Catering', depthLevel: 1 },
  { code: 'marimba', label: 'Marimba', depthLevel: 2 },
  { code: 'music_dj', label: 'DJ y Sonido', depthLevel: 2 },
  { code: 'photography', label: 'Fotografía', depthLevel: 1 },
  { code: 'video', label: 'Video', depthLevel: 2 },
  { code: 'venue', label: 'Salones y Locaciones', depthLevel: 1 },
  { code: 'decoration', label: 'Decoración', depthLevel: 1 },
  { code: 'flowers', label: 'Flores y Arreglos', depthLevel: 2 },
  { code: 'cake', label: 'Pastelería', depthLevel: 1 },
  { code: 'invitations', label: 'Invitaciones', depthLevel: 1 },
  { code: 'transport', label: 'Transporte', depthLevel: 1 },
  { code: 'makeup', label: 'Maquillaje y Peinado', depthLevel: 1 },
];

export const LOCATIONS: Array<{ country: string; region: string; city: string }> = [
  { country: 'Guatemala', region: 'Guatemala', city: 'Ciudad de Guatemala' },
  { country: 'México', region: 'CDMX', city: 'Ciudad de México' },
  { country: 'Colombia', region: 'Antioquia', city: 'Medellín' },
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
