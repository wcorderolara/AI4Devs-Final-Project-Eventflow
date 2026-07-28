import {
  CalendarCheck,
  ClipboardList,
  FileText,
  ListChecks,
  MessageSquareQuote,
  PencilLine,
  ScrollText,
  Sparkles,
  Star,
  Store,
  UserCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SessionClaims } from '@/shared/authorization';
import {
  ActionLink,
  Badge,
  MarketingCTAGroup,
  MarketingFeatureCard,
  MarketingFeatureGrid,
  MarketingFeatureGridItem,
  MarketingHero,
  MarketingSection,
  MarketingStep,
} from '@/shared/design-system';
import {
  getPublicHeroCtas,
  getPublicVendorCta,
  PUBLIC_SECTION_ID,
} from '@/shared/navigation/publicNavigation';
import { LandingHashTarget } from '../components/LandingHashTarget';
import { LandingHeroPreview } from '../components/LandingHeroPreview';

/**
 * Landing pública de EventFlow — alineada con la screen Stitch *EventFlow - Inicio*
 * (`projects/10889252267442839867/screens/7af2150dd6684c70be98fea230457b0b`).
 *
 * Server Component síncrono: recibe los `claims` ya resueltos por la route para que el HTML
 * inicial traiga el CTA correcto según la sesión, sin parpadeo de hidratación y sin JavaScript
 * para el contenido principal. El único cliente de la página es el drawer del header.
 *
 * ## Qué se toma de Stitch y qué no
 *
 * Se conserva la **estructura**: barra sticky, hero a dos columnas con badge de IA y par de CTA,
 * bloque de capacidades, cierre con CTA y footer.
 *
 * No se codifican, porque no son ciertas o no existen en el producto:
 * - «500+ Eventos Exitosos» y «98 % Satisfacción» — métricas inventadas.
 * - «Confiado por organizadores en Antigua / Cayalá / Paseo de la Sexta / Quetzaltenango» —
 *   prueba social fabricada; ni son clientes ni son marcas.
 * - «Pricing» / «Precios» y «Hablar con Ventas» — EventFlow no tiene planes ni canal comercial.
 * - «Solutions», «Casos de Éxito», «Carreras», «Prensa», «Blog», «Sobre Nosotros» — páginas que
 *   no existen; enlazarlas sería inventar rutas.
 * - «la red más exclusiva de proveedores curados» — el directorio lista proveedores **aprobados**,
 *   que no es lo mismo que exclusivos ni curados.
 * - «Empieza Gratis Ahora» — no hay modelo de precios publicado que respalde el «gratis».
 * - «Ver Demostración» — no hay demo ni agenda comercial.
 * - «Optimización de Presupuesto: ahorro del 12 % en catering» — cifra inventada, y describe una
 *   IA proactiva que detecta oportunidades por su cuenta; el MVP sugiere cuando se le pide.
 *
 * Todo el copy vive en `common.landing` y sólo afirma capacidades disponibles hoy: plan,
 * checklist y presupuesto **sugeridos y editables**, directorio de proveedores aprobados,
 * cotizaciones estructuradas y comparación, y revisión humana de cada sugerencia.
 */
const FEATURE_ICONS = {
  plan: <CalendarCheck />,
  checklist: <ClipboardList />,
  budget: <FileText />,
  vendors: <Store />,
  quotes: <ScrollText />,
  hitl: <UserCheck />,
} as const;

const FEATURE_KEYS = Object.keys(FEATURE_ICONS) as ReadonlyArray<keyof typeof FEATURE_ICONS>;

/** Los tres pasos del flujo real: definir → la IA propone → la persona decide. */
const STEP_ICONS = {
  define: <PencilLine />,
  propose: <Sparkles />,
  decide: <ListChecks />,
} as const;

const STEP_KEYS = Object.keys(STEP_ICONS) as ReadonlyArray<keyof typeof STEP_ICONS>;

/** Valor para el público secundario. Nada de CRM, pagos ni contratos. */
const VENDOR_ICONS = {
  profile: <Store />,
  quotes: <MessageSquareQuote />,
  reviews: <Star />,
} as const;

const VENDOR_KEYS = Object.keys(VENDOR_ICONS) as ReadonlyArray<keyof typeof VENDOR_ICONS>;

export interface LandingPageProps {
  claims: SessionClaims;
}

export function LandingPage({ claims }: LandingPageProps): React.JSX.Element {
  const t = useTranslations('common.landing');
  const tNav = useTranslations('navigation');

  const hero = getPublicHeroCtas(claims);
  const vendorCta = getPublicVendorCta(claims);

  return (
    <>
      {/* No pinta nada: sólo resuelve el fragmento cuando se llega desde otra página pública. */}
      <LandingHashTarget />

      <MarketingHero
        layout="split"
        data-testid="landing-hero"
        className="bg-marketing-hero"
        eyebrow={
          // El `eyebrow` del hero se pinta en versalitas; el badge del screen Stitch es una
          // píldora con capitalización normal, así que se neutralizan ambas heredadas.
          <Badge
            variant="role"
            size="md"
            icon={<Sparkles />}
            className="normal-case tracking-ef-normal"
          >
            {t('eyebrow')}
          </Badge>
        }
        // El resaltado del titular llega como markup de la traducción (`<em>`), no partiendo la
        // frase en dos claves: cada idioma decide qué parte enfatiza y dónde cae en el orden.
        heading={t.rich('heading', {
          em: (chunks) => <em className="not-italic text-link">{chunks}</em>,
        })}
        description={t('description')}
        ctaGroupLabel={t('ctaGroupLabel')}
        primaryCta={
          <ActionLink href={hero.primary.href} variant="primary" size="lg">
            {tNav(hero.primary.labelKey)}
          </ActionLink>
        }
        secondaryCta={
          <ActionLink href={hero.secondary.href} variant="secondary" size="lg">
            {tNav(hero.secondary.labelKey)}
          </ActionLink>
        }
        media={<LandingHeroPreview />}
      />

      <MarketingSection
        id={PUBLIC_SECTION_ID.howItWorks}
        eyebrow={t('howItWorks.eyebrow')}
        heading={t('howItWorks.heading')}
        description={t('howItWorks.description')}
        align="center"
        data-testid="landing-how-it-works"
      >
        {/* `ordered`: los pasos tienen secuencia, y el lector de pantalla debe anunciarla. */}
        <MarketingFeatureGrid ariaLabel={t('howItWorks.listLabel')} columns={3} ordered>
          {STEP_KEYS.map((key, i) => (
            <MarketingFeatureGridItem key={key}>
              <MarketingStep
                index={i + 1}
                total={STEP_KEYS.length}
                icon={STEP_ICONS[key]}
                title={t(`howItWorks.steps.${key}.title`)}
                description={t(`howItWorks.steps.${key}.description`)}
                data-testid={`landing-step-${key}`}
              />
            </MarketingFeatureGridItem>
          ))}
        </MarketingFeatureGrid>
      </MarketingSection>

      <MarketingSection
        id={PUBLIC_SECTION_ID.features}
        heading={t('featuresHeading')}
        description={t('featuresDescription')}
        background="subtle"
        align="center"
        data-testid="landing-features"
      >
        <MarketingFeatureGrid ariaLabel={t('featuresListLabel')} columns={3}>
          {FEATURE_KEYS.map((key) => (
            <MarketingFeatureGridItem key={key}>
              <MarketingFeatureCard
                icon={FEATURE_ICONS[key]}
                title={t(`features.${key}.title`)}
                description={t(`features.${key}.description`)}
                data-testid={`landing-feature-${key}`}
              />
            </MarketingFeatureGridItem>
          ))}
        </MarketingFeatureGrid>
      </MarketingSection>

      <MarketingSection
        id={PUBLIC_SECTION_ID.forVendors}
        eyebrow={t('forVendors.eyebrow')}
        heading={t('forVendors.heading')}
        description={t('forVendors.description')}
        data-testid="landing-for-vendors"
      >
        <MarketingFeatureGrid ariaLabel={t('forVendors.listLabel')} columns={3}>
          {VENDOR_KEYS.map((key) => (
            <MarketingFeatureGridItem key={key}>
              <MarketingFeatureCard
                icon={VENDOR_ICONS[key]}
                title={t(`forVendors.items.${key}.title`)}
                description={t(`forVendors.items.${key}.description`)}
                data-testid={`landing-vendor-${key}`}
              />
            </MarketingFeatureGridItem>
          ))}
        </MarketingFeatureGrid>
        <MarketingCTAGroup
          className="mt-10"
          ariaLabel={t('forVendors.ctaGroupLabel')}
          primary={
            <ActionLink href={vendorCta.href} variant="secondary">
              {tNav(vendorCta.labelKey)}
            </ActionLink>
          }
        />
      </MarketingSection>

      <MarketingSection
        background="inverse"
        align="center"
        heading={t('finalCta.heading')}
        description={t('finalCta.description')}
        data-testid="landing-final-cta"
        // Halo violeta detrás del cierre: da profundidad a la banda oscura para que se lea como un
        // final intencional y no como un rectángulo negro vacío. Puramente decorativo
        // (`before:`), no afecta al contraste del texto blanco encima.
        className="relative isolate overflow-hidden before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-full before:bg-[radial-gradient(60%_120%_at_50%_-10%,rgba(123,78,232,0.28),transparent_70%)] before:content-['']"
      >
        <MarketingCTAGroup
          align="center"
          ariaLabel={t('finalCta.ctaGroupLabel')}
          primary={
            <ActionLink href={hero.primary.href} variant="primary" size="lg">
              {tNav(hero.primary.labelKey)}
            </ActionLink>
          }
          secondary={
            <ActionLink href={hero.secondary.href} variant="secondary" size="lg">
              {tNav(hero.secondary.labelKey)}
            </ActionLink>
          }
        />
      </MarketingSection>
    </>
  );
}
