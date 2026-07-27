// PB-P2-028 — Actions del design system compartido (Button, IconButton, TextLink).
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §11 y §12.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus, Trash2 } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, IconButton, TextLink } from '@/shared/design-system';
import type { ButtonSize, ButtonVariant } from '@/shared/design-system';

const VARIANTS: ButtonVariant[] = ['primary', 'marketing', 'secondary', 'ghost', 'destructive'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Button', () => {
  it('renderiza las cinco variantes con tokens semánticos (nunca paleta cruda)', () => {
    for (const variant of VARIANTS) {
      const { unmount } = render(<Button variant={variant}>Acción</Button>);
      const button = screen.getByRole('button', { name: 'Acción' });
      expect(button.className).not.toMatch(
        /\b(bg|text|border)-(purple|blue|neutral|slate|indigo)-\d/,
      );
      expect(button.className).toContain('rounded-button');
      unmount();
    }
  });

  it('la variante primary usa la acción violeta y marketing la CTA oscura (UI-DEC-003)', () => {
    const { unmount } = render(<Button variant="primary">Guardar</Button>);
    expect(screen.getByRole('button').className).toContain('bg-action-primary');
    unmount();
    render(<Button variant="marketing">Empezar</Button>);
    expect(screen.getByRole('button').className).toContain('bg-action-marketing');
  });

  it('la variante destructive usa la familia error aprobada, nunca coral ni violeta', () => {
    render(<Button variant="destructive">Eliminar borrador</Button>);
    const className = screen.getByRole('button').className;
    expect(className).toContain('bg-action-destructive');
    expect(className).not.toMatch(/coral|violet|purple/);
  });

  it('renderiza los tres tamaños y amplía el área táctil en sm y md', () => {
    for (const size of SIZES) {
      const { unmount } = render(<Button size={size}>Acción</Button>);
      const className = screen.getByRole('button').className;
      if (size === 'lg') {
        expect(className).toContain('h-12');
        expect(className).not.toContain('hit-area');
      } else {
        // `size.control.sm/md` (32/40 px) < 44 px → ampliación invisible del área de pulsación.
        expect(className).toContain('hit-area');
      }
      unmount();
    }
  });

  it('expone el foco canónico focus-visible (nunca `focus:` genérico)', () => {
    render(<Button>Acción</Button>);
    expect(screen.getByRole('button').className).toContain('focus-ring');
  });

  it('estado disabled: no dispara la acción', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Acción
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('estado loading: marca aria-busy, sustituye el label y suprime el clic', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button isLoading loadingLabel="Guardando…" onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Guardando…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading sin `loadingLabel` conserva el label original (no cambia el ancho)', () => {
    render(<Button isLoading>Enviar cotización</Button>);
    expect(screen.getByRole('button', { name: 'Enviar cotización' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('renderiza icono leading y trailing como decorativos', () => {
    const { container } = render(
      <Button leadingIcon={<Plus />} trailingIcon={<Trash2 />}>
        Acción
      </Button>,
    );
    // El nombre accesible sigue siendo sólo el label: los iconos van en spans `aria-hidden`.
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(2);
  });

  it('el tipo por defecto es `button` (no envía el formulario que lo contiene)', () => {
    render(<Button>Acción</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('`fullWidth` ocupa el ancho disponible (patrón mobile)', () => {
    render(<Button fullWidth>Acción</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });
});

describe('IconButton', () => {
  it('exige nombre accesible: avisa en desarrollo cuando falta', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<IconButton icon={<Plus />} />);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('falta nombre accesible'));
  });

  it('no avisa cuando el nombre accesible está presente y lo expone por rol', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<IconButton icon={<Plus />} aria-label="Agregar tarea" />);
    expect(screen.getByRole('button', { name: 'Agregar tarea' })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('renderiza el icono como decorativo y respeta el mínimo táctil de 44 px', () => {
    render(<IconButton icon={<Plus />} aria-label="Agregar" />);
    const button = screen.getByRole('button', { name: 'Agregar' });
    expect(button.className).toContain('min-h-touch');
    expect(button.className).toContain('min-w-touch');
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('estado disabled y variante destructive', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <IconButton
        icon={<Trash2 />}
        aria-label="Eliminar"
        variant="destructive"
        disabled
        onClick={onClick}
      />,
    );
    const button = screen.getByRole('button', { name: 'Eliminar' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('text-feedback-error');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('TextLink', () => {
  it('el enlace interno navega y muestra foco visible', () => {
    render(<TextLink href="/organizer/events">Ver eventos</TextLink>);
    const link = screen.getByRole('link', { name: 'Ver eventos' });
    expect(link).toHaveAttribute('href', '/organizer/events');
    expect(link.className).toContain('focus-ring');
  });

  it('el enlace externo abre en pestaña nueva con rel seguro y aviso para lector de pantalla', () => {
    render(
      <TextLink href="https://example.org" external externalHintLabel="Abre en una pestaña nueva">
        Documentación
      </TextLink>,
    );
    const link = screen.getByRole('link', { name: /Documentación/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('Abre en una pestaña nueva');
  });

  it('un enlace deshabilitado no es enfocable ni navegable', () => {
    render(
      <TextLink href="/organizer" disabled>
        Ver eventos
      </TextLink>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Ver eventos').closest('[aria-disabled="true"]')).not.toBeNull();
  });
});
