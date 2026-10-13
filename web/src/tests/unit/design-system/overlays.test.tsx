// PB-P2-031 — Overlays del design system (Modal, ConfirmationDialog, DropdownMenu).
//
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §30 y §37 (focus trap, retorno
// de foco, `Escape`, nombre accesible). Los overlays reutilizan la primitiva accesible ya
// instalada (Headless UI); estos tests verifican el contrato, no su implementación interna.
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  ConfirmationDialog,
  DropdownMenu,
  IconButton,
  Modal,
} from '@/shared/design-system';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

/** Superficie mínima con disparador: permite verificar el retorno del foco. */
function ModalHarness(props: Partial<React.ComponentProps<typeof Modal>> = {}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invitar al equipo"
        description="Comparte el evento con tu equipo"
        closeLabel="Cerrar"
        footer={<Button onClick={() => setOpen(false)}>Guardar</Button>}
        {...props}
      >
        <label htmlFor="modal-email">Correo</label>
        <input id="modal-email" />
      </Modal>
    </>
  );
}

describe('PB-P2-031 · Modal', () => {
  beforeEach(cleanup);

  it('abre, expone título y descripción accesibles y cierra por el botón', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Invitar al equipo');
    expect(dialog).toHaveAccessibleDescription('Comparte el evento con tu equipo');

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('`Escape` cierra cuando está permitido y no cierra cuando no lo está', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ModalHarness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    unmount();

    render(<ModalHarness closeOnEscape={false} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('el clic en el overlay es configurable de forma independiente a `Escape`', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ModalHarness closeOnOverlayClick={false} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = await screen.findByRole('dialog');
    // El contenedor con scroll es el ancestro del panel: pulsar ahí es «fuera».
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // `Escape` sigue permitido: son dos decisiones distintas.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    unmount();

    render(<ModalHarness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const openDialog = await screen.findByRole('dialog');
    await user.click(openDialog.parentElement as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('atrapa el foco y lo devuelve al disparador al cerrarse', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');

    // El foco entra en el diálogo…
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    // …y tabular repetidamente nunca lo saca de él.
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('`initialFocus` decide el primer elemento enfocado', async () => {
    const user = userEvent.setup();
    function Harness(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      const ref = { current: null } as React.MutableRefObject<HTMLElement | null>;
      return (
        <>
          <Button onClick={() => setOpen(true)}>Abrir</Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Confirmar"
            closeLabel="Cerrar"
            initialFocus={ref}
            footer={
              <Button ref={ref as React.Ref<HTMLButtonElement>} variant="secondary">
                Cancelar
              </Button>
            }
          >
            <input aria-label="Nombre" />
          </Modal>
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
  });

  it('bloquea el scroll del documento mientras está abierto y lo restaura al cerrar', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    expect(document.documentElement.style.overflow).not.toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(document.documentElement.style.overflow).toBe('hidden'));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.documentElement.style.overflow).not.toBe('hidden'));
  });
});

describe('PB-P2-031 · ConfirmationDialog', () => {
  beforeEach(cleanup);

  function Harness(props: Partial<React.ComponentProps<typeof ConfirmationDialog>> = {}) {
    function Inner(): React.JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Eliminar evento</Button>
          <ConfirmationDialog
            open={open}
            onClose={() => setOpen(false)}
            title="Eliminar borrador"
            description="El borrador se eliminará de tu lista."
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            onConfirm={() => setOpen(false)}
            {...props}
          />
        </>
      );
    }
    return render(<Inner />);
  }

  it('es un `alertdialog` con etiquetas explícitas, nunca un `OK` genérico', async () => {
    const user = userEvent.setup();
    Harness();
    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Eliminar borrador');
    expect(within(dialog).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^ok$/i })).toBeNull();
  });

  it('el foco inicial va a la acción segura', async () => {
    const user = userEvent.setup();
    Harness();
    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    await screen.findByRole('alertdialog');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
  });

  it('confirmar invoca la acción y cancelar cierra sin invocarla', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    Harness({ onConfirm });
    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('la variante destructiva usa la familia de error aprobada', async () => {
    const user = userEvent.setup();
    Harness({ variant: 'destructive', icon: <Trash2 /> });
    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    const confirm = await screen.findByTestId('confirmation-dialog-confirm');
    expect(confirm.className).toContain('bg-action-destructive');
    // Nunca los decorativos de marca (UI-DEC-014).
    expect(confirm.className).not.toMatch(/lilac|coral/);
  });

  it('durante la confirmación asíncrona bloquea el reenvío y no se puede cerrar', async () => {
    const user = userEvent.setup();
    let resolve: (() => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    Harness({ onConfirm });
    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    const confirm = await screen.findByTestId('confirmation-dialog-confirm');

    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    // Un segundo intento no llega a la mutación.
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Cerrar a media operación dejaría la mutación sin retroalimentación.
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    resolve?.();
    await waitFor(() => expect(confirm).toBeEnabled());
  });

  it('`isLoading` controlado por el consumidor deshabilita ambas acciones', async () => {
    const user = userEvent.setup();
    Harness({ isLoading: true });
    await user.click(screen.getByRole('button', { name: 'Eliminar evento' }));
    await screen.findByRole('alertdialog');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByTestId('confirmation-dialog-confirm')).toBeDisabled();
  });
});

describe('PB-P2-031 · DropdownMenu', () => {
  beforeEach(cleanup);

  const onEdit = vi.fn();
  const onDelete = vi.fn();

  function renderMenu() {
    onEdit.mockClear();
    onDelete.mockClear();
    return render(
      <DropdownMenu
        trigger="Opciones"
        items={[
          { key: 'edit', label: 'Editar', onSelect: onEdit },
          { kind: 'link', key: 'detail', label: 'Ver detalle', href: '/organizer/events/e1' },
          { key: 'archive', label: 'Archivar', onSelect: vi.fn(), disabled: true },
          { kind: 'separator', key: 'sep' },
          { key: 'delete', label: 'Eliminar', onSelect: onDelete, destructive: true },
        ]}
      />,
    );
  }

  it('abre con teclado y navega con flechas', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Opciones' })).toHaveFocus();

    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    // Headless UI usa foco virtual: el foco del DOM se queda en el `menu` y el item activo se
    // señala con `aria-activedescendant` (+ `data-focus`).
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveAttribute('data-focus'),
    );
    expect(menu).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('menuitem', { name: 'Editar' }).id,
    );

    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Ver detalle' })).toHaveAttribute('data-focus'),
    );

    await user.keyboard('{End}');
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toHaveAttribute('data-focus'),
    );
  });

  it('una acción es un botón y una navegación es un enlace real', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Opciones' }));

    const action = await screen.findByRole('menuitem', { name: 'Editar' });
    expect(action.tagName).toBe('BUTTON');
    const link = screen.getByRole('menuitem', { name: 'Ver detalle' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/organizer/events/e1');

    await user.click(action);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('el item deshabilitado no dispara su acción y el destructivo usa el token de error', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Opciones' }));
    const archive = await screen.findByRole('menuitem', { name: 'Archivar' });
    expect(archive).toBeDisabled();

    expect(screen.getByRole('menuitem', { name: 'Eliminar' }).className).toContain(
      'text-feedback-error',
    );
  });

  it('`Escape` cierra y devuelve el foco al trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Opciones' });
    await user.click(trigger);
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('un trigger icon-only exige nombre accesible', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DropdownMenu iconOnly trigger={<MoreVertical />} items={[]} />);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('DropdownMenu'));
    error.mockRestore();
  });
});
