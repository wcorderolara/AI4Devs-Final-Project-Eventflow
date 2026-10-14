import {
  Brush,
  Cake,
  Camera,
  Car,
  ClipboardList,
  Disc3,
  Drum,
  Flower2,
  Gift,
  Guitar,
  Landmark,
  Mail,
  Mic,
  Music,
  Palette,
  PartyPopper,
  Shirt,
  Store,
  UtensilsCrossed,
  Video,
  Wine,
  type LucideIcon,
} from 'lucide-react';

/**
 * Sello visual de cada categoría de proveedor: un icono y un tinte de la paleta por familia.
 * Sin fotos de portafolio servibles en el MVP, el sello es lo que da ritmo al directorio y deja
 * reconocer de un vistazo qué ofrece cada proveedor.
 *
 * Familias: comida y bebida (cempasúchil), música y animación (añil), lugar, imagen y logística
 * (jade), decoración y estilo (bugambilia). Una categoría nueva sin entrada cae a un sello neutro.
 */
export type CategoryTone = 'brand' | 'jade' | 'anil' | 'cempasuchil' | 'neutral';

interface CategoryVisual {
  icon: LucideIcon;
  tone: CategoryTone;
}

const VISUALS: Record<string, CategoryVisual> = {
  catering: { icon: UtensilsCrossed, tone: 'cempasuchil' },
  cake: { icon: Cake, tone: 'cempasuchil' },
  beverages: { icon: Wine, tone: 'cempasuchil' },
  music: { icon: Music, tone: 'anil' },
  music_dj: { icon: Disc3, tone: 'anil' },
  marimba: { icon: Drum, tone: 'anil' },
  mariachi: { icon: Guitar, tone: 'anil' },
  entertainment: { icon: PartyPopper, tone: 'anil' },
  hora_loca: { icon: PartyPopper, tone: 'anil' },
  mc: { icon: Mic, tone: 'anil' },
  venue: { icon: Landmark, tone: 'jade' },
  photography: { icon: Camera, tone: 'jade' },
  video: { icon: Video, tone: 'jade' },
  transport: { icon: Car, tone: 'jade' },
  planning: { icon: ClipboardList, tone: 'jade' },
  flowers: { icon: Flower2, tone: 'brand' },
  decoration: { icon: Palette, tone: 'brand' },
  invitations: { icon: Mail, tone: 'brand' },
  makeup: { icon: Brush, tone: 'brand' },
  attire: { icon: Shirt, tone: 'brand' },
  souvenirs: { icon: Gift, tone: 'brand' },
};

const FALLBACK: CategoryVisual = { icon: Store, tone: 'neutral' };

/** Clases literales (Tailwind sólo genera lo que ve escrito). Texto ≥ 700 para contraste AA. */
export const CATEGORY_TONE_CLASSES: Record<CategoryTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  jade: 'bg-jade-50 text-jade-700 ring-jade-200',
  anil: 'bg-anil-50 text-anil-700 ring-anil-200',
  cempasuchil: 'bg-cempasuchil-50 text-cempasuchil-700 ring-cempasuchil-200',
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
};

export function categoryVisual(code: string | undefined): CategoryVisual {
  return (code && VISUALS[code]) || FALLBACK;
}

interface CategoryStampProps {
  code: string | undefined;
  size?: 'md' | 'lg';
  className?: string;
}

/** Sello circular decorativo: el nombre de la categoría siempre se muestra aparte como texto. */
export function CategoryStamp({ code, size = 'md', className = '' }: CategoryStampProps): React.JSX.Element {
  const { icon: Icon, tone } = categoryVisual(code);
  const box = size === 'lg' ? 'h-16 w-16 [&>svg]:h-7 [&>svg]:w-7' : 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${box} ${CATEGORY_TONE_CLASSES[tone]} ${className}`}
    >
      <Icon strokeWidth={1.5} />
    </span>
  );
}
