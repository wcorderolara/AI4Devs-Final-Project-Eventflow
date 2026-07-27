// PB-P2-031 — Auditoría axe-core del catálogo de Data Display y Overlays.
//
// Umbral del gate (US-131 / OPS-001): 0 violaciones `critical`. Aquí se endurece a **0
// violaciones de cualquier severidad** para el catálogo propio, igual que en PB-P2-028/029.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmationDialog,
  CurrencyDisplay,
  DescriptionList,
  DescriptionListItem,
  DropdownMenu,
  IconButton,
  MetricCard,
  Modal,
  Pagination,
  Popover,
  ResponsiveSummaryRow,
  ResponsiveTable,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableStatusRow,
  Tabs,
  Tooltip,
} from '@/shared/design-system';
import { auditA11y, formatViolations } from './helpers/axe';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

/**
 * Los overlays se montan en un portal (`#headlessui-portal-root`, `document.body`), que por
 * definición vive fuera de los landmarks de la página. La regla `region` audita la estructura
 * global del documento, no el componente: en una auditoría a nivel de `document.body` sólo
 * informaría de que el arnés de test no es una página completa. El resto de reglas sigue con
 * tolerancia cero.
 */
const PORTAL_AUDIT = { rules: { region: { enabled: false } } } as const;

const ITEMS = [
  { id: 'a', label: 'Salón principal', planned: 45000, committed: 30000 },
  { id: 'b', label: 'Catering', planned: 12000, committed: 12500 },
];

function DataDisplayCatalog(): React.JSX.Element {
  return (
    <main>
      <h1>Catálogo</h1>

      <Card as="section">
        <CardHeader icon={<Calendar />}>
          <CardTitle headingLevel={2}>Boda de Ana</CardTitle>
          <CardDescription>15 de marzo · Antigua Guatemala</CardDescription>
        </CardHeader>
      </Card>

      <Card onSelect={() => undefined} aria-label="Seleccionar Boda de Ana">
        <CardTitle headingLevel={2}>Card interactiva</CardTitle>
      </Card>

      <MetricCard
        headingLevel={2}
        label="Eventos activos"
        value={24}
        valueDescription="24 eventos activos"
        trend={{ direction: 'up', label: '12 %', intent: 'positive', ariaLabel: 'sube un 12 %' }}
        comparison="vs mes anterior"
      />
      <MetricCard headingLevel={2} label="Reseñas" state="loading" loadingLabel="Cargando" />
      <MetricCard
        headingLevel={2}
        label="Cotizaciones"
        state="empty"
        emptyLabel="Sin datos aún"
        emptyDescription="Vuelve tras tu primer evento"
      />

      <ResponsiveTable
        items={ITEMS}
        getRowKey={(item) => item.id}
        summaryLabel="Resumen de items de presupuesto"
        renderSummary={(item) => (
          <Card padding="sm">
            <span>{item.label}</span>
            <ResponsiveSummaryRow label="Planificado">
              <CurrencyDisplay amount={item.planned} currencyCode="GTQ" locale="es-LATAM" />
            </ResponsiveSummaryRow>
            <Button size="sm" aria-label={`Editar ${item.label}`}>
              Editar
            </Button>
          </Card>
        )}
      >
        <Table caption="Items de presupuesto">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Concepto</TableHeaderCell>
              <TableHeaderCell
                align="numeric"
                sortable
                sortDirection="none"
                sortLabel="Ordenar por planificado"
              >
                Planificado
              </TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell align="end">Acciones</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ITEMS.map((item) => (
              <TableRow key={item.id} interactive>
                <TableCell description="Categoría: sede">{item.label}</TableCell>
                <TableCell align="numeric">
                  <CurrencyDisplay amount={item.planned} currencyCode="GTQ" locale="es-LATAM" />
                </TableCell>
                <TableCell>
                  <StatusBadge status="warning" ariaLabel={`${item.label}: excedido`}>
                    Excedido
                  </StatusBadge>
                </TableCell>
                <TableCell align="end">
                  <IconButton icon={<Trash2 />} aria-label={`Eliminar ${item.label}`} />
                </TableCell>
              </TableRow>
            ))}
            <TableStatusRow colSpan={4}>Fin del listado</TableStatusRow>
          </TableBody>
        </Table>
      </ResponsiveTable>

      <Pagination
        ariaLabel="Paginación"
        page={2}
        totalPages={5}
        onPageChange={() => undefined}
        previousLabel="Anterior"
        nextLabel="Siguiente"
        summary="Página 2 de 5"
        pageSize={{
          value: 10,
          options: [10, 25, 50],
          onChange: () => undefined,
          label: 'Por página',
        }}
      />

      <Tabs
        ariaLabel="Secciones del evento"
        items={[
          { id: 'general', label: 'General' },
          { id: 'guests', label: 'Invitados', badge: 2 },
          { id: 'legal', label: 'Legal', disabled: true },
        ]}
      >
        {(active) => (
          <DescriptionList columns={2}>
            <DescriptionListItem term="Organizadora">Ana Pérez</DescriptionListItem>
            <DescriptionListItem term="Sección activa">{active}</DescriptionListItem>
            <DescriptionListItem term="Presupuesto" numeric>
              <CurrencyDisplay amount={45000} currencyCode="GTQ" locale="es-LATAM" />
            </DescriptionListItem>
            <DescriptionListItem term="Sede" emptyText="Sin definir" />
          </DescriptionList>
        )}
      </Tabs>

      <Accordion defaultValue={['vendors']}>
        <AccordionItem value="vendors">
          <AccordionTrigger headingLevel={2}>Requisitos de proveedores</AccordionTrigger>
          <AccordionPanel>Documentación y seguros vigentes.</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="catering">
          <AccordionTrigger headingLevel={2}>Restricciones de catering</AccordionTrigger>
          <AccordionPanel>Opciones vegetarianas y sin gluten.</AccordionPanel>
        </AccordionItem>
      </Accordion>
    </main>
  );
}

describe('PB-P2-031 · axe · Data Display', () => {
  it('el catálogo de data display no tiene violaciones', async () => {
    const { container } = render(<DataDisplayCatalog />);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });
});

function OverlayCatalog(): React.JSX.Element {
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <main>
      <h1>Overlays</h1>
      <Button onClick={() => setModal(true)}>Abrir modal</Button>
      <Button onClick={() => setConfirm(true)}>Eliminar</Button>
      <DropdownMenu
        trigger="Opciones"
        items={[
          { key: 'edit', label: 'Editar', onSelect: () => undefined },
          { kind: 'link', key: 'detail', label: 'Ver detalle', href: '/organizer/events/e1' },
          { kind: 'separator', key: 'sep' },
          { key: 'delete', label: 'Eliminar', onSelect: () => undefined, destructive: true },
        ]}
      />
      <DropdownMenu
        iconOnly
        trigger={<MoreVertical />}
        triggerAriaLabel="Más acciones"
        items={[{ key: 'archive', label: 'Archivar', onSelect: () => undefined }]}
      />
      <Popover trigger="Notificaciones" title="Notificaciones">
        <p>Sin novedades.</p>
      </Popover>
      <Tooltip content="Margen antes de impuestos" delayMs={0}>
        <Button>Margen</Button>
      </Tooltip>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Editar evento"
        description="Actualiza los datos generales"
        closeLabel="Cerrar"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModal(false)}>Guardar</Button>
          </>
        }
      >
        <label htmlFor="a11y-modal-name">Nombre</label>
        <input id="a11y-modal-name" />
      </Modal>

      <ConfirmationDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Eliminar borrador"
        description="El borrador se eliminará de tu lista."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        icon={<Trash2 />}
        onConfirm={() => setConfirm(false)}
      />
    </main>
  );
}

describe('PB-P2-031 · axe · Overlays', () => {
  it('los disparadores no tienen violaciones', async () => {
    const { container } = render(<OverlayCatalog />);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('el modal abierto no tiene violaciones', async () => {
    const user = userEvent.setup();
    render(<OverlayCatalog />);
    await user.click(screen.getByRole('button', { name: 'Abrir modal' }));
    await screen.findByRole('dialog');
    const { critical, otherViolations } = await auditA11y(document.body, PORTAL_AUDIT);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('el diálogo de confirmación destructivo no tiene violaciones', async () => {
    const user = userEvent.setup();
    render(<OverlayCatalog />);
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await screen.findByRole('alertdialog');
    const { critical, otherViolations } = await auditA11y(document.body, PORTAL_AUDIT);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('el menú desplegable abierto no tiene violaciones', async () => {
    const user = userEvent.setup();
    render(<OverlayCatalog />);
    await user.click(screen.getByRole('button', { name: 'Opciones' }));
    await screen.findByRole('menu');
    const { critical, otherViolations } = await auditA11y(document.body, PORTAL_AUDIT);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });

  it('el tooltip visible no tiene violaciones', async () => {
    const user = userEvent.setup();
    render(<OverlayCatalog />);
    await user.hover(screen.getByRole('button', { name: 'Margen' }));
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument());
    const { critical, otherViolations } = await auditA11y(document.body, PORTAL_AUDIT);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
  });
});
