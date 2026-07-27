// PB-P2-032 — Auditoría axe-core del catálogo AI y Marketing + validación de los patrones
// responsivos y de accesibilidad que la pantalla Stitch ejemplifica.
//
// Umbral del gate (US-131 / OPS-001): 0 violaciones `critical`. Aquí se endurece a **0
// violaciones de cualquier severidad**, igual que en PB-P2-028/029/031.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sparkles } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import {
  AILabel,
  AIRecommendationActions,
  AIRecommendationCard,
  Button,
  FilterBar,
  FormField,
  IconButton,
  Input,
  MarketingCTAGroup,
  MarketingFeatureCard,
  MarketingFeatureGrid,
  MarketingFeatureGridItem,
  MarketingHero,
  MarketingSection,
  SearchInput,
  Select,
  Textarea,
  type AIRecommendationState,
} from '@/shared/design-system';
import { auditA11y, formatViolations } from './helpers/axe';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const AI_STATES: AIRecommendationState[] = [
  'loading',
  'pending',
  'fallback',
  'editing',
  'accepted',
  'edited',
  'rejected',
  'error',
];

function AICatalog(): React.JSX.Element {
  return (
    <main>
      <h1>Catálogo IA</h1>
      <AILabel label="Sugerencia de IA" ariaLabel="Contenido sugerido por IA" />
      {AI_STATES.map((state) => (
        <AIRecommendationCard
          key={state}
          state={state}
          headingLevel={2}
          aiLabel="Sugerencia de IA"
          aiLabelAriaLabel="Contenido sugerido por IA"
          title={`Plan sugerido (${state})`}
          description="Fases y tareas propuestas a partir de los datos de tu evento."
          statusLabel={`Estado: ${state}`}
          loadingLabel="Generando sugerencia…"
          loadingHint="Esto puede tomar hasta 60 segundos."
          fallbackLabel="Generado desde plantilla base"
          fallbackAriaLabel="La sugerencia se generó a partir de una plantilla base"
          errorMessage="La IA tardó demasiado en responder. Intenta de nuevo."
          correlationId="c-123"
          correlationLabel="Referencia"
          onRetry={() => undefined}
          retryLabel="Reintentar"
          contextNote="Basado en el tipo de evento y el número de invitados declarado."
          editor={
            <>
              <FormField label="Título de la sugerencia">
                {(field) => <Input {...field} defaultValue="Plan sugerido" />}
              </FormField>
              <FormField label="Resumen" error="El resumen no puede quedar vacío.">
                {(field) => <Textarea {...field} defaultValue="" />}
              </FormField>
            </>
          }
          onCancelEdit={() => undefined}
          cancelEditLabel="Cancelar"
          onSaveEdit={() => undefined}
          saveEditLabel="Guardar cambios"
          actions={
            <AIRecommendationActions
              groupLabel="Acciones de la sugerencia"
              accept={{
                label: 'Aceptar',
                ariaLabel: 'Aceptar el plan sugerido',
                onSelect: () => undefined,
              }}
              edit={{ label: 'Editar', onSelect: () => undefined }}
              regenerate={{ label: 'Regenerar', onSelect: () => undefined }}
              reject={{ label: 'Rechazar', onSelect: () => undefined }}
            />
          }
        >
          <ul>
            <li>Definir el presupuesto por categoría.</li>
            <li>Solicitar cotizaciones a proveedores aprobados.</li>
          </ul>
        </AIRecommendationCard>
      ))}
    </main>
  );
}

describe('PB-P2-032 · axe · familia AI', () => {
  it('los ocho estados no tienen violaciones', async () => {
    const { container } = render(<AICatalog />);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('el error de formulario dentro de la edición se asocia y no depende del color', () => {
    render(<AICatalog />);
    const textarea = screen.getByLabelText('Resumen');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const message = document.getElementById((describedBy ?? '').split(' ')[0] as string);
    expect(message).toHaveTextContent('El resumen no puede quedar vacío.');
  });

  it('las acciones AI son alcanzables por teclado con foco visible', async () => {
    const user = userEvent.setup();
    render(
      <AIRecommendationActions
        groupLabel="Acciones de la sugerencia"
        accept={{ label: 'Aceptar', onSelect: () => undefined }}
        reject={{ label: 'Rechazar', onSelect: () => undefined }}
      />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus();
    await user.tab();
    const reject = screen.getByRole('button', { name: 'Rechazar' });
    expect(reject).toHaveFocus();
    // Tratamiento canónico: `.focus-ring` (focus-visible + offset blanco), nunca `focus:` genérico.
    expect(reject.className).toMatch(/focus-ring/);
    expect(reject.className).not.toMatch(/(?<!focus-visible)\bfocus:[a-z]/);
  });
});

function MarketingCatalog(): React.JSX.Element {
  return (
    <main>
      <MarketingHero
        eyebrow="Planificación asistida por IA"
        heading="Convierte la idea de tu evento en un plan accionable"
        description="Cada sugerencia de IA queda pendiente de tu revisión."
        ctaGroupLabel="Empezar con EventFlow"
        primaryCta={<Button>Crear una cuenta</Button>}
        secondaryCta={<Button variant="secondary">Explorar proveedores</Button>}
      />
      <MarketingSection
        heading="Lo que puedes hacer hoy"
        description="Capacidades disponibles en EventFlow."
        background="subtle"
      >
        <MarketingFeatureGrid ariaLabel="Capacidades de EventFlow" columns={3}>
          <MarketingFeatureGridItem>
            <MarketingFeatureCard
              icon={<Sparkles />}
              title="Checklist editable"
              description="Ajusta las tareas sugeridas antes de aplicarlas."
            />
          </MarketingFeatureGridItem>
          <MarketingFeatureGridItem>
            <MarketingFeatureCard
              icon={<Sparkles />}
              title="Directorio de proveedores"
              description="Busca proveedores aprobados por categoría y ciudad."
              href="/vendors"
            />
          </MarketingFeatureGridItem>
        </MarketingFeatureGrid>
        <MarketingCTAGroup
          className="mt-8"
          ariaLabel="Acciones de la sección"
          primary={<Button>Crear una cuenta</Button>}
        />
      </MarketingSection>
    </main>
  );
}

describe('PB-P2-032 · axe · marketing', () => {
  it('la composición de marketing no tiene violaciones', async () => {
    const { container } = render(<MarketingCatalog />);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('la jerarquía de encabezados es correcta: un solo `h1` y secciones en `h2`', () => {
    render(<MarketingCatalog />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Lo que puedes hacer hoy' }),
    ).toBeInTheDocument();
  });
});

describe('PB-P2-032 · validación de patrones existentes', () => {
  // La pantalla Stitch ilustra el FilterBar horizontal vs apilado. NO se crea una segunda
  // implementación: se valida la canónica del grupo Navigation & Feedback (PB-P2-029).
  it('el FilterBar canónico apila en móvil sin desbordar y conserva el foco', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <h1>Listado</h1>
        <FilterBar
          ariaLabel="Filtros del listado"
          search={<SearchInput aria-label="Buscar" clearLabel="Limpiar búsqueda" />}
          applyLabel="Aplicar filtros"
          clearLabel="Limpiar"
          appliedLabel="Filtros aplicados"
          onClear={() => undefined}
          onSubmit={() => undefined}
        >
          <FormField label="Estado">
            {(field) => (
              <Select
                {...field}
                options={[
                  { value: 'draft', label: 'Borrador' },
                  { value: 'active', label: 'Activo' },
                ]}
              />
            )}
          </FormField>
        </FilterBar>
      </main>,
    );

    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);

    // Una sola implementación: no hay un segundo formulario «mobile» duplicado en el DOM.
    const form = screen.getByRole('form', { name: 'Filtros del listado' });
    expect(screen.getAllByRole('form')).toHaveLength(1);

    // La rejilla de controles va de 1 columna (móvil) a 2 (tablet) y 3 (desktop): apila sin
    // recurrir a una variante paralela ni a scroll horizontal.
    const controls = form.querySelector('.grid') as HTMLElement;
    expect(controls.className).toContain('grid-cols-1');
    expect(controls.className).toContain('md:grid-cols-2');
    expect(controls.className).toContain('lg:grid-cols-3');

    // El orden de foco sigue el orden visual: búsqueda → controles → acciones.
    await user.tab();
    expect(screen.getByLabelText('Buscar')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Estado')).toHaveFocus();
  });

  it('los controles compactos conservan el objetivo táctil mínimo', () => {
    render(
      <>
        <IconButton icon={<Sparkles />} aria-label="Regenerar sugerencia" size="sm" />
        <Button size="sm">Aceptar</Button>
      </>,
    );
    // `IconButton` fija 44 px reales; `Button sm` mide 32 px y amplía el área con `.hit-area`.
    expect(screen.getByRole('button', { name: 'Regenerar sugerencia' }).className).toContain(
      'min-h-touch',
    );
    expect(screen.getByRole('button', { name: 'Aceptar' }).className).toContain('hit-area');
  });

  it('la carga AI respeta `prefers-reduced-motion`', () => {
    const { container } = render(
      <AIRecommendationCard
        state="loading"
        aiLabel="Sugerencia de IA"
        loadingLabel="Generando sugerencia…"
      />,
    );
    expect(container.innerHTML).toContain('motion-reduce:animate-none');
  });
});
