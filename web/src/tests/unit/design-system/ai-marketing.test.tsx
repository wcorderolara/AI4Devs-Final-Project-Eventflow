// PB-P2-032 — Componentes asistidos por IA y de Marketing del design system.
//
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §31 (familia AI) y §32
// (marketing). Reglas transversales: la divulgación de IA es texto visible (UI-DEC-010), el
// estado nunca depende sólo del color y una sugerencia no es un dato confirmado hasta que
// alguien la acepta.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AILabel,
  AIRecommendationActions,
  AIRecommendationCard,
  Button,
  FormField,
  Input,
  MarketingCTAGroup,
  MarketingFeatureCard,
  MarketingFeatureGrid,
  MarketingFeatureGridItem,
  MarketingHero,
  MarketingSection,
  Textarea,
  type AIRecommendationState,
} from '@/shared/design-system';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const DISCLOSURE = 'Sugerencia de IA';

describe('PB-P2-032 · AILabel', () => {
  beforeEach(cleanup);

  it('la divulgación es texto visible, no sólo un icono', () => {
    const { container } = render(<AILabel label={DISCLOSURE} />);
    expect(screen.getByText(DISCLOSURE)).toBeInTheDocument();
    // El glifo acompaña al texto y por eso es decorativo.
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sin `live` no crea región viva; con `live` sí', () => {
    const { rerender } = render(
      <AILabel label={DISCLOSURE} ariaLabel="Contenido sugerido por IA" />,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('img')).toHaveAccessibleName('Contenido sugerido por IA');

    rerender(<AILabel label={DISCLOSURE} ariaLabel="Contenido sugerido por IA" live />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Contenido sugerido por IA');
  });

  it('el fallback se comunica con su propio texto', () => {
    render(<AILabel label={DISCLOSURE} fallbackLabel="Generado desde plantilla base" />);
    expect(screen.getByText('Generado desde plantilla base')).toBeInTheDocument();
  });
});

describe('PB-P2-032 · AIRecommendationCard · estados', () => {
  beforeEach(cleanup);

  function renderCard(props: Partial<React.ComponentProps<typeof AIRecommendationCard>> = {}) {
    return render(
      <AIRecommendationCard
        state="pending"
        aiLabel={DISCLOSURE}
        title="Plan sugerido"
        description="Fases y tareas propuestas para tu evento."
        data-testid="card"
        {...props}
      />,
    );
  }

  it('pending: divulgación + contenido + acciones de revisión', () => {
    const onAccept = vi.fn();
    renderCard({
      statusLabel: 'Pendiente de revisión',
      actions: (
        <AIRecommendationActions
          groupLabel="Acciones de la sugerencia"
          accept={{ label: 'Aceptar', onSelect: onAccept }}
          edit={{ label: 'Editar', onSelect: vi.fn() }}
          reject={{ label: 'Rechazar', onSelect: vi.fn() }}
        />
      ),
    });
    expect(screen.getByText(DISCLOSURE)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plan sugerido' })).toBeInTheDocument();
    expect(screen.getByText('Pendiente de revisión')).toBeInTheDocument();
    for (const name of ['Aceptar', 'Editar', 'Rechazar']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('loading: un solo patrón, sin porcentaje inventado y con `aria-busy`', () => {
    const { container } = renderCard({ state: 'loading', loadingLabel: 'Generando sugerencia…' });
    expect(screen.getByTestId('card')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Generando sugerencia…');
    // Ni progressbar ni cifra de progreso: la generación por IA no la conoce.
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(container.textContent ?? '').not.toMatch(/\d+\s?%/);
  });

  it('loading: el placeholder respeta reduced motion y es decorativo', () => {
    const { container } = renderCard({ state: 'loading', loadingLabel: 'Generando…' });
    const skeleton = container.querySelector('[data-variant="text"]');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(container.innerHTML).toContain('motion-reduce:animate-none');
  });

  it('editing: compone los campos del feature y expone cancelar / guardar', async () => {
    const user = userEvent.setup();
    const onCancelEdit = vi.fn();
    const onSaveEdit = vi.fn();
    renderCard({
      state: 'editing',
      statusLabel: 'Editando sugerencia',
      editor: (
        <FormField label="Resumen">
          {(field) => <Textarea {...field} defaultValue="Propuesta original" />}
        </FormField>
      ),
      onCancelEdit,
      cancelEditLabel: 'Cancelar',
      onSaveEdit,
      saveEditLabel: 'Guardar cambios',
    });

    expect(screen.getByLabelText('Resumen')).toHaveValue('Propuesta original');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelEdit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSaveEdit).toHaveBeenCalledTimes(1);
  });

  it('editing: `isSubmitting` bloquea el guardado y evita el doble envío', async () => {
    const user = userEvent.setup();
    const onSaveEdit = vi.fn();
    renderCard({
      state: 'editing',
      editor: <FormField label="Título">{(field) => <Input {...field} />}</FormField>,
      onSaveEdit,
      saveEditLabel: 'Guardar cambios',
      onCancelEdit: vi.fn(),
      cancelEditLabel: 'Cancelar',
      isSubmitting: true,
      submittingLabel: 'Guardando…',
    });
    const save = screen.getByTestId('ai-action-save-edit');
    expect(save).toBeDisabled();
    await user.click(save);
    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('accepted: abandona la presentación de sugerencia y no deja acciones pendientes', () => {
    renderCard({
      state: 'accepted',
      statusLabel: 'Sugerencia aplicada',
      actions: (
        <AIRecommendationActions
          groupLabel="Acciones"
          accept={{ label: 'Aceptar', onSelect: vi.fn() }}
        />
      ),
    });
    expect(screen.getByText('Sugerencia aplicada')).toBeInTheDocument();
    // Un dato confirmado no puede seguir ofreciendo «Aceptar» ni vestir la superficie de IA.
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
    expect(screen.getByTestId('card').className).not.toContain('bg-ai-surface');
  });

  it('edited: se distingue del aceptado sin cambios', () => {
    renderCard({ state: 'edited', statusLabel: 'Confirmado (editado)' });
    expect(screen.getByText('Confirmado (editado)')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveAttribute('data-state', 'edited');
  });

  it('rejected: no vuelve a parecer un pendiente activo', () => {
    renderCard({
      state: 'rejected',
      statusLabel: 'Sugerencia descartada',
      actions: (
        <AIRecommendationActions
          groupLabel="Acciones"
          accept={{ label: 'Aceptar', onSelect: vi.fn() }}
        />
      ),
    });
    expect(screen.getByText('Sugerencia descartada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
    expect(screen.getByTestId('card').className).not.toContain('bg-ai-surface');
  });

  it('fallback: lo declara en texto, sigue siendo revisable y no nombra al proveedor', () => {
    renderCard({
      state: 'fallback',
      fallbackLabel: 'Generado desde plantilla base',
      statusLabel: 'Pendiente de revisión',
      actions: (
        <AIRecommendationActions
          groupLabel="Acciones"
          accept={{ label: 'Aceptar', onSelect: vi.fn() }}
          reject={{ label: 'Rechazar', onSelect: vi.fn() }}
        />
      ),
    });
    expect(screen.getByText('Generado desde plantilla base')).toBeInTheDocument();
    // El fallback no bloquea el flujo humano.
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled();
    expect(screen.getByTestId('card').textContent ?? '').not.toMatch(
      /openai|anthropic|gemini|provider|api key/i,
    );
  });

  it('error: mensaje seguro anunciado + reintento; nunca el payload del proveedor', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderCard({
      state: 'error',
      statusLabel: 'No se pudo generar',
      errorMessage: 'La IA tardó demasiado en responder. Intenta de nuevo.',
      onRetry,
      retryLabel: 'Reintentar',
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('La IA tardó demasiado en responder.');
    expect(alert.textContent ?? '').not.toMatch(/stack|TypeError|at Object\.|"error":/i);

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('el estado nunca se comunica sólo con color: siempre hay texto', () => {
    const STATES: AIRecommendationState[] = [
      'pending',
      'fallback',
      'editing',
      'accepted',
      'edited',
      'rejected',
      'error',
    ];
    for (const state of STATES) {
      cleanup();
      renderCard({
        state,
        statusLabel: `Estado ${state}`,
        errorMessage: 'Fallo',
        fallbackLabel: 'Plantilla',
      });
      expect(screen.getByText(`Estado ${state}`)).toBeInTheDocument();
    }
  });

  it('la divulgación de IA está presente en todos los estados', () => {
    const STATES: AIRecommendationState[] = [
      'loading',
      'pending',
      'fallback',
      'editing',
      'accepted',
    ];
    for (const state of STATES) {
      cleanup();
      renderCard({ state, loadingLabel: 'Generando…' });
      expect(screen.getAllByText(DISCLOSURE).length).toBeGreaterThan(0);
    }
  });
});

describe('PB-P2-032 · AIRecommendationActions', () => {
  beforeEach(cleanup);

  it('respeta el orden canónico Aceptar → Editar → Regenerar → Rechazar', () => {
    render(
      <AIRecommendationActions
        groupLabel="Acciones de la sugerencia"
        reject={{ label: 'Rechazar', onSelect: vi.fn() }}
        regenerate={{ label: 'Regenerar', onSelect: vi.fn() }}
        edit={{ label: 'Editar', onSelect: vi.fn() }}
        accept={{ label: 'Aceptar', onSelect: vi.fn() }}
      />,
    );
    const group = screen.getByRole('group', { name: 'Acciones de la sugerencia' });
    const labels = within(group)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(labels).toEqual(['Aceptar', 'Editar', 'Regenerar', 'Rechazar']);
  });

  it('sólo pinta las acciones que el feature aporta', () => {
    render(
      <AIRecommendationActions
        groupLabel="Acciones"
        regenerate={{ label: 'Regenerar', onSelect: vi.fn() }}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
  });

  it('rechazar no es una acción destructiva', () => {
    render(
      <AIRecommendationActions
        groupLabel="Acciones"
        reject={{ label: 'Rechazar', onSelect: vi.fn() }}
      />,
    );
    // Descartar una sugerencia no borra datos del usuario: nunca la familia error (§31).
    expect(screen.getByTestId('ai-action-reject').className).not.toContain('bg-action-destructive');
  });

  it('`isBusy` bloquea todo el grupo: una acción en vuelo no admite otra', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <AIRecommendationActions
        groupLabel="Acciones"
        isBusy
        accept={{ label: 'Aceptar', onSelect: onAccept }}
        reject={{ label: 'Rechazar', onSelect: vi.fn() }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
  });

  it('las acciones son alcanzables por teclado y admiten nombre accesible propio', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <AIRecommendationActions
        groupLabel="Acciones"
        accept={{
          label: 'Aceptar',
          ariaLabel: 'Aplicar la sugerencia de checklist',
          onSelect: onAccept,
        }}
      />,
    );
    await user.tab();
    const accept = screen.getByRole('button', { name: 'Aplicar la sugerencia de checklist' });
    expect(accept).toHaveFocus();
    expect(accept.className).toMatch(/focus-ring/);
    await user.keyboard('{Enter}');
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});

describe('PB-P2-032 · MarketingHero', () => {
  beforeEach(cleanup);

  function renderHero(props: Partial<React.ComponentProps<typeof MarketingHero>> = {}) {
    return render(
      <MarketingHero
        eyebrow="Planificación asistida por IA"
        heading="Convierte la idea de tu evento en un plan accionable"
        description="Cada sugerencia queda pendiente de tu revisión."
        ctaGroupLabel="Empezar"
        primaryCta={<Button>Crear una cuenta</Button>}
        secondaryCta={<Button variant="secondary">Explorar proveedores</Button>}
        data-testid="hero"
        {...props}
      />,
    );
  }

  it('el titular es el `h1` de la página', () => {
    renderHero();
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Convierte la idea de tu evento en un plan accionable',
    });
    expect(heading).toBeInTheDocument();
    // El eyebrow es apoyo, no un encabezado.
    expect(screen.getByText('Planificación asistida por IA').tagName).toBe('P');
  });

  it('los dos CTA existen, en orden, y el grupo tiene nombre accesible', () => {
    renderHero();
    const group = screen.getByRole('group', { name: 'Empezar' });
    const labels = within(group)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(labels).toEqual(['Crear una cuenta', 'Explorar proveedores']);
  });

  it('los CTA se apilan a ancho completo en móvil y vuelven en línea desde `sm`', () => {
    renderHero();
    const group = screen.getByRole('group', { name: 'Empezar' });
    expect(group.className).toContain('flex-col');
    expect(group.className).toContain('sm:flex-row');
    expect(group.className).toContain('[&>*]:w-full');
  });

  it('no codifica rutas: los CTA llegan construidos por la página', () => {
    renderHero({
      primaryCta: <a href="/register">Crear una cuenta</a>,
      secondaryCta: undefined,
    });
    expect(screen.getByRole('link', { name: 'Crear una cuenta' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('en `split` el apoyo visual convive con el texto sin desbordar', () => {
    renderHero({ layout: 'split', media: <div data-testid="hero-media">preview</div> });
    expect(screen.getByTestId('hero')).toHaveAttribute('data-layout', 'split');
    expect(screen.getByTestId('hero-media')).toBeInTheDocument();
  });
});

describe('PB-P2-032 · MarketingSection', () => {
  beforeEach(cleanup);

  it('mantiene la jerarquía: la sección usa `h2`, no `h1`', () => {
    render(
      <MarketingSection heading="Lo que puedes hacer hoy" description="Capacidades disponibles.">
        <p>contenido</p>
      </MarketingSection>,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Lo que puedes hacer hoy' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('la sección se nombra por su heading', () => {
    render(<MarketingSection heading="Capacidades">contenido</MarketingSection>);
    expect(screen.getByRole('region', { name: 'Capacidades' })).toBeInTheDocument();
  });
});

describe('PB-P2-032 · MarketingFeatureCard y Grid', () => {
  beforeEach(cleanup);

  it('la card estática no es un control y usa el Card canónico', () => {
    render(
      <MarketingFeatureCard
        icon={<Sparkles />}
        title="Checklist editable"
        description="Ajusta las tareas antes de aplicarlas."
        data-testid="feature"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Checklist editable' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    // `data-variant` lo aporta el `Card` compartido: no hay un segundo sistema de cards.
    expect(screen.getByTestId('feature')).toHaveAttribute('data-variant', 'default');
  });

  it('con `href` es un enlace real y el icono sigue siendo decorativo', () => {
    const { container } = render(
      <MarketingFeatureCard
        icon={<Sparkles />}
        title="Directorio de proveedores"
        href="/vendors"
        data-testid="feature"
      />,
    );
    const link = screen.getByRole('link', { name: 'Directorio de proveedores' });
    expect(link).toHaveAttribute('href', '/vendors');
    expect(link).toHaveAttribute('data-variant', 'interactive');
    expect(container.querySelector('svg')?.closest('span')).toHaveAttribute('aria-hidden', 'true');
  });

  it('tolera contenido largo sin romper la card', () => {
    const long = 'Descripción '.repeat(40);
    render(<MarketingFeatureCard title="Título extenso de una capacidad" description={long} />);
    expect(screen.getByText(long.trim(), { exact: false })).toBeInTheDocument();
  });

  it('el grid es una lista semántica y colapsa a una columna en móvil', () => {
    render(
      <MarketingFeatureGrid ariaLabel="Capacidades de EventFlow" columns={3} data-testid="grid">
        <MarketingFeatureGridItem>
          <MarketingFeatureCard title="Uno" />
        </MarketingFeatureGridItem>
        <MarketingFeatureGridItem>
          <MarketingFeatureCard title="Dos" />
        </MarketingFeatureGridItem>
      </MarketingFeatureGrid>,
    );
    const list = screen.getByRole('list', { name: 'Capacidades de EventFlow' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(list.className).toContain('grid-cols-1');
    expect(list.className).toContain('sm:grid-cols-2');
    expect(list.className).toContain('lg:grid-cols-3');
  });
});

describe('PB-P2-032 · MarketingCTAGroup', () => {
  beforeEach(cleanup);

  it('el orden del DOM coincide con el orden visual y de tabulación', async () => {
    const user = userEvent.setup();
    render(
      <MarketingCTAGroup
        ariaLabel="Acciones principales"
        primary={<Button>Primaria</Button>}
        secondary={<Button variant="secondary">Secundaria</Button>}
      />,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Primaria' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Secundaria' })).toHaveFocus();
  });

  it('funciona con una sola acción', () => {
    render(<MarketingCTAGroup primary={<Button>Única</Button>} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});

describe('PB-P2-032 · alcance de producto', () => {
  beforeEach(cleanup);

  it('ningún componente del grupo codifica copy ni funcionalidad fuera del MVP', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const forbidden =
      /prueba gratis|free trial|agendar demostraci|schedule a demo|gesti[oó]n de invitados|guest list|rsvp|seating|asignaci[oó]n de mesas|whatsapp|tiempo real|real[- ]time/i;
    for (const dir of ['ai', 'marketing']) {
      for (const file of readdirSync(`src/shared/design-system/${dir}`)) {
        const source = readFileSync(`src/shared/design-system/${dir}/${file}`, 'utf8');
        expect(source, `${dir}/${file} contiene alcance fuera del MVP`).not.toMatch(forbidden);
      }
    }
  });
});
