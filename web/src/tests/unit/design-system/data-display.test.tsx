// PB-P2-031 — Componentes de Data Display del design system.
//
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §21 (Tabs, Accordion),
// §22 (Card, MetricCard), §23 (Table), §20/§24 (Pagination), §13 (DescriptionList) y §26
// (CurrencyDisplay). Regla transversal (§37): semántica nativa antes que ARIA, y el estado
// nunca depende sólo del color.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CurrencyDisplay,
  DescriptionList,
  DescriptionListItem,
  MetricCard,
  Pagination,
  ResponsiveTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableStatusRow,
  Tabs,
} from '@/shared/design-system';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe('PB-P2-031 · Card', () => {
  beforeEach(cleanup);

  it('la variante por defecto es un contenedor, no un control', () => {
    render(
      <Card data-testid="card">
        <CardHeader icon={<Calendar />}>
          <CardTitle>Boda de Ana</CardTitle>
          <CardDescription>15 de marzo</CardDescription>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveAttribute('data-variant', 'default');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('una card no interactiva no entra en el orden de tabulación', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Card data-testid="card">
          <CardTitle>Sin acción</CardTitle>
        </Card>
        <button type="button">Después</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Después' })).toHaveFocus();
  });

  it('con `onSelect` es un `<button>` real y se activa con teclado', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Card onSelect={onSelect} aria-label="Seleccionar evento" data-testid="card">
        <CardTitle>Boda de Ana</CardTitle>
      </Card>,
    );
    const card = screen.getByRole('button', { name: 'Seleccionar evento' });
    expect(card).toHaveAttribute('data-variant', 'interactive');

    await user.tab();
    expect(card).toHaveFocus();
    // El anillo de foco canónico es la utilidad `.focus-ring` (focus-visible + offset blanco).
    expect(card.className).toMatch(/focus-ring/);

    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('con `href` es un enlace real', () => {
    render(
      <Card href="/organizer/events/e1">
        <CardTitle>Boda de Ana</CardTitle>
      </Card>,
    );
    expect(screen.getByRole('link', { name: 'Boda de Ana' })).toHaveAttribute(
      'href',
      '/organizer/events/e1',
    );
  });

  it('`variant="interactive"` sin acción es un error de uso, no un div clicable', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Card variant="interactive">
        <CardTitle>Falsa card interactiva</CardTitle>
      </Card>,
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Card'));
    error.mockRestore();
  });
});

describe('PB-P2-031 · MetricCard', () => {
  beforeEach(cleanup);

  it('expone la etiqueta como nombre de la región y el valor con su descripción accesible', () => {
    render(
      <MetricCard
        label="Eventos activos"
        value={24}
        valueDescription="24 eventos activos"
        comparison="vs mes anterior"
      />,
    );
    const region = screen.getByRole('region', { name: 'Eventos activos' });
    expect(within(region).getByLabelText('24 eventos activos')).toHaveTextContent('24');
    expect(within(region).getByText('vs mes anterior')).toBeInTheDocument();
  });

  it('la tendencia no infiere significado del signo: el intent lo declara el consumidor', () => {
    const { rerender } = render(
      <MetricCard
        label="Cancelaciones"
        value={12}
        trend={{ direction: 'up', label: '12 %', intent: 'negative' }}
        data-testid="metric"
      />,
    );
    expect(screen.getByTestId('metric').querySelector('[data-trend="up"]')).toHaveAttribute(
      'data-intent',
      'negative',
    );

    // El mismo `direction` con otro significado: `up` no implica «bueno».
    rerender(
      <MetricCard
        label="Tareas completadas"
        value={12}
        trend={{ direction: 'up', label: '12 %', intent: 'positive' }}
        data-testid="metric"
      />,
    );
    expect(screen.getByTestId('metric').querySelector('[data-trend="up"]')).toHaveAttribute(
      'data-intent',
      'positive',
    );
  });

  it('sin `intent` la tendencia es neutra', () => {
    render(
      <MetricCard
        label="Invitados"
        value={120}
        trend={{ direction: 'flat', label: '0 %' }}
        data-testid="metric"
      />,
    );
    expect(screen.getByTestId('metric').querySelector('[data-trend="flat"]')).toHaveAttribute(
      'data-intent',
      'neutral',
    );
  });

  it('el estado de carga consume el Skeleton existente y marca `aria-busy`', () => {
    render(
      <MetricCard
        label="Eventos"
        state="loading"
        loadingLabel="Cargando métricas"
        data-testid="metric"
      />,
    );
    expect(screen.getByTestId('metric')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Cargando métricas' })).toBeInTheDocument();
    expect(screen.queryByText('24')).toBeNull();
  });

  it('el estado vacío muestra contexto, no un cero inventado', () => {
    render(
      <MetricCard
        label="Reseñas"
        state="empty"
        emptyLabel="Sin datos aún"
        emptyDescription="Vuelve tras tu primer evento"
      />,
    );
    expect(screen.getByText('Sin datos aún')).toBeInTheDocument();
    expect(screen.getByText('Vuelve tras tu primer evento')).toBeInTheDocument();
  });

  it('el estado de error se anuncia', () => {
    render(<MetricCard label="Reseñas" state="error" errorLabel="No se pudieron cargar" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar');
  });
});

describe('PB-P2-031 · Table', () => {
  beforeEach(cleanup);

  function renderTable(extra?: React.ReactNode): void {
    render(
      <Table caption="Items de presupuesto" data-testid="table">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Concepto</TableHeaderCell>
            <TableHeaderCell align="numeric">Planificado</TableHeaderCell>
            <TableHeaderCell align="end">Acciones</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow interactive>
            <TableCell description="Ciudad de Guatemala">Salón</TableCell>
            <TableCell align="numeric">1000</TableCell>
            <TableCell align="end">
              <button type="button" aria-label="Editar Salón">
                Editar
              </button>
            </TableCell>
          </TableRow>
          {extra}
        </TableBody>
      </Table>,
    );
  }

  it('usa markup semántico con `caption` y `th scope="col"`', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Items de presupuesto' });
    expect(table.querySelector('caption')).toHaveTextContent('Items de presupuesto');
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('las columnas numéricas comparten alineación y numeración tabular', () => {
    renderTable();
    const numeric = screen.getByRole('cell', { name: '1000' });
    expect(numeric.className).toMatch(/text-right/);
    expect(numeric.className).toMatch(/tabular-nums/);
  });

  it('las acciones de fila conservan nombre accesible y la fila no es un div clicable', () => {
    renderTable();
    expect(screen.getByRole('button', { name: 'Editar Salón' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
    // Ninguna fila es un `div` con `role`: son `<tr>` nativos.
    for (const row of rows) expect(row.tagName).toBe('TR');
  });

  it('el ordenamiento es controlado y publica `aria-sort` sólo en columnas ordenables', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      <Table caption="Eventos">
        <TableHead>
          <TableRow>
            <TableHeaderCell
              sortable
              sortDirection="ascending"
              onSort={onSort}
              sortLabel="Ordenar por fecha"
            >
              Fecha
            </TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Hoy</TableCell>
            <TableCell>Activo</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const [sortable, plain] = screen.getAllByRole('columnheader');
    expect(sortable).toHaveAttribute('aria-sort', 'ascending');
    expect(plain).not.toHaveAttribute('aria-sort');

    await user.click(screen.getByRole('button', { name: 'Ordenar por fecha' }));
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('los estados de carga / vacío / error viven dentro del `tbody`', () => {
    render(
      <Table caption="Eventos">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Nombre</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableStatusRow colSpan={1} live>
            Sin resultados con estos filtros
          </TableStatusRow>
        </TableBody>
      </Table>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Sin resultados con estos filtros');
    expect(status.closest('td')).toHaveAttribute('colspan', '1');
  });
});

describe('PB-P2-031 · ResponsiveTable', () => {
  beforeEach(cleanup);

  const items = [
    { id: 'a', label: 'Salón' },
    { id: 'b', label: 'Catering' },
  ];

  function renderResponsive() {
    return render(
      <ResponsiveTable
        items={items}
        getRowKey={(item) => item.id}
        summaryLabel="Resumen de items"
        data-testid="responsive"
        renderSummary={(item) => (
          <Card padding="sm">
            <CardTitle>{item.label}</CardTitle>
          </Card>
        )}
      >
        <Table caption="Items">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Concepto</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.label}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>,
    );
  }

  it('ambas vistas se alimentan de la misma lista', () => {
    const { container } = renderResponsive();
    const rows = container.querySelectorAll('tbody tr');
    const summaries = container.querySelectorAll('[data-view="summary"] > li');
    expect(rows).toHaveLength(items.length);
    expect(summaries).toHaveLength(items.length);
  });

  it('las vistas son mutuamente excluyentes: nunca se exponen dos juegos de acciones a la vez', () => {
    const { container } = renderResponsive();
    const table = container.querySelector('[data-view="table"]') as HTMLElement;
    const summary = container.querySelector('[data-view="summary"]') as HTMLElement;
    // `hidden` es `display:none`: el nodo sale del árbol de accesibilidad y del orden de foco.
    expect(table.className).toContain('hidden');
    expect(table.className).toContain('md:block');
    expect(summary.className).toContain('md:hidden');
  });

  it('la lista móvil tiene nombre accesible', () => {
    renderResponsive();
    expect(screen.getByRole('list', { name: 'Resumen de items' })).toBeInTheDocument();
  });
});

describe('PB-P2-031 · Pagination', () => {
  beforeEach(cleanup);

  const labels = {
    ariaLabel: 'Paginación',
    previousLabel: 'Anterior',
    nextLabel: 'Siguiente',
  };

  it('anterior y siguiente notifican la página destino', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        {...labels}
        page={2}
        totalPages={5}
        onPageChange={onPageChange}
        summary="Página 2 de 5"
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('los extremos deshabilitan la flecha correspondiente', () => {
    const { rerender } = render(
      <Pagination {...labels} page={1} totalPages={3} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();

    rerender(<Pagination {...labels} page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('sin resultados no se anuncia ningún rango y ambas flechas quedan deshabilitadas', () => {
    render(
      <Pagination {...labels} page={1} totalPages={0} onPageChange={vi.fn()} summary="1–0 de 0" />,
    );
    expect(screen.queryByTestId('pagination-summary')).toBeNull();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('el selector de tamaño de página tiene label y devuelve un número', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Pagination
        {...labels}
        page={1}
        totalPages={4}
        onPageChange={vi.fn()}
        pageSize={{ value: 10, options: [10, 25, 50], onChange, label: 'Por página' }}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Por página'), '25');
    expect(onChange).toHaveBeenCalledWith(25);
  });
});

describe('PB-P2-031 · Tabs', () => {
  beforeEach(cleanup);

  const items = [
    { id: 'general', label: 'General' },
    { id: 'guests', label: 'Invitados', badge: 2 },
    { id: 'budget', label: 'Presupuesto', disabled: true },
    { id: 'tasks', label: 'Tareas' },
  ];

  function renderTabs() {
    return render(
      <Tabs items={items} ariaLabel="Secciones del evento">
        {(active) => <p>Panel {active}</p>}
      </Tabs>,
    );
  }

  it('asocia cada tab con su panel y marca el activo', () => {
    renderTabs();
    const active = screen.getByRole('tab', { name: 'General' });
    expect(active).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(active).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', active.id);
    expect(panel).toHaveTextContent('Panel general');
  });

  it('`←`/`→` navegan saltando los deshabilitados y activan el destino', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.tab();
    expect(screen.getByRole('tab', { name: /General/ })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Invitados/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    // «Presupuesto» está deshabilitado: el foco lo salta.
    expect(screen.getByRole('tab', { name: 'Tareas' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel tasks');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /Invitados/ })).toHaveFocus();
  });

  it('`Home` y `End` van a los extremos habilitados', async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.tab();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Tareas' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /General/ })).toHaveFocus();
  });

  it('el tab deshabilitado no se activa con el ratón', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs items={items} ariaLabel="Secciones" onChange={onChange}>
        {(active) => <p>{active}</p>}
      </Tabs>,
    );
    await user.click(screen.getByRole('tab', { name: 'Presupuesto' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('el estado activo no depende sólo del color', () => {
    renderTabs();
    const active = screen.getByRole('tab', { name: /General/ });
    expect(active.className).toMatch(/font-semibold/);
    expect(active.className).toMatch(/border-interactive/);
  });

  it('modo controlado: el valor lo manda el consumidor', async () => {
    const user = userEvent.setup();
    function Controlled(): React.JSX.Element {
      const [value, setValue] = useState('guests');
      return (
        <Tabs items={items} ariaLabel="Secciones" value={value} onChange={setValue}>
          {(active) => <p>Panel {active}</p>}
        </Tabs>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel guests');
    await user.click(screen.getByRole('tab', { name: 'Tareas' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel tasks');
  });
});

describe('PB-P2-031 · Accordion', () => {
  beforeEach(cleanup);

  function renderAccordion(type: 'single' | 'multiple' = 'single') {
    return render(
      <Accordion type={type} defaultValue={['vendors']}>
        <AccordionItem value="vendors">
          <AccordionTrigger>Requisitos de proveedores</AccordionTrigger>
          <AccordionPanel>Contenido de proveedores</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="catering">
          <AccordionTrigger>Restricciones de catering</AccordionTrigger>
          <AccordionPanel>Contenido de catering</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="legal" disabled>
          <AccordionTrigger>Legal</AccordionTrigger>
          <AccordionPanel>Contenido legal</AccordionPanel>
        </AccordionItem>
      </Accordion>,
    );
  }

  it('el trigger es un botón dentro de un heading y publica `aria-expanded`', () => {
    renderAccordion();
    const open = screen.getByRole('button', { name: 'Requisitos de proveedores' });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open.closest('h3')).not.toBeNull();
    const closed = screen.getByRole('button', { name: 'Restricciones de catering' });
    expect(closed).toHaveAttribute('aria-expanded', 'false');
  });

  it('el panel abierto está asociado al trigger por `aria-controls`', () => {
    renderAccordion();
    const trigger = screen.getByRole('button', { name: 'Requisitos de proveedores' });
    const panel = screen.getByRole('region', { name: 'Requisitos de proveedores' });
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveTextContent('Contenido de proveedores');
  });

  it('`single` cierra el anterior; `multiple` mantiene ambos abiertos', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAccordion('single');
    await user.click(screen.getByRole('button', { name: 'Restricciones de catering' }));
    expect(screen.queryByText('Contenido de proveedores')).toBeNull();
    expect(screen.getByText('Contenido de catering')).toBeInTheDocument();
    unmount();

    renderAccordion('multiple');
    await user.click(screen.getByRole('button', { name: 'Restricciones de catering' }));
    expect(screen.getByText('Contenido de proveedores')).toBeInTheDocument();
    expect(screen.getByText('Contenido de catering')).toBeInTheDocument();
  });

  it('el item deshabilitado no abre y `↑`/`↓` lo saltan', async () => {
    const user = userEvent.setup();
    renderAccordion();
    const disabled = screen.getByRole('button', { name: 'Legal' });
    expect(disabled).toBeDisabled();

    screen.getByRole('button', { name: 'Requisitos de proveedores' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Restricciones de catering' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    // Sólo quedan dos triggers habilitados: el recorrido es circular y omite «Legal».
    expect(screen.getByRole('button', { name: 'Requisitos de proveedores' })).toHaveFocus();
  });

  it('el panel cerrado se desmonta en vez de animar la altura', async () => {
    const user = userEvent.setup();
    renderAccordion();
    await user.click(screen.getByRole('button', { name: 'Requisitos de proveedores' }));
    expect(screen.queryByText('Contenido de proveedores')).toBeNull();
  });
});

describe('PB-P2-031 · DescriptionList', () => {
  beforeEach(cleanup);

  it('usa `dl` / `dt` / `dd`, no un grid genérico', () => {
    const { container } = render(
      <DescriptionList data-testid="dl">
        <DescriptionListItem term="Organizadora">Ana Pérez</DescriptionListItem>
      </DescriptionList>,
    );
    expect(container.querySelector('dl')).not.toBeNull();
    expect(container.querySelector('dt')).toHaveTextContent('Organizadora');
    expect(container.querySelector('dd')).toHaveTextContent('Ana Pérez');
  });

  it('una y dos columnas colapsan a una en móvil', () => {
    const { rerender } = render(
      <DescriptionList columns={1} data-testid="dl">
        <DescriptionListItem term="Sede">Antigua</DescriptionListItem>
      </DescriptionList>,
    );
    expect(screen.getByTestId('dl').className).toContain('grid-cols-1');
    expect(screen.getByTestId('dl').className).not.toContain('sm:grid-cols-2');

    rerender(
      <DescriptionList columns={2} data-testid="dl">
        <DescriptionListItem term="Sede">Antigua</DescriptionListItem>
      </DescriptionList>,
    );
    expect(screen.getByTestId('dl').className).toContain('grid-cols-1');
    expect(screen.getByTestId('dl').className).toContain('sm:grid-cols-2');
  });

  it('un valor ausente muestra el texto de reemplazo, no una `dd` vacía', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionListItem term="Sede" emptyText="Sin definir" />
      </DescriptionList>,
    );
    expect(container.querySelector('dd')).toHaveTextContent('Sin definir');
  });
});

describe('PB-P2-031 · CurrencyDisplay', () => {
  beforeEach(cleanup);

  it('formatea GTQ en es-LATAM con el código ISO en `title`', () => {
    render(
      <CurrencyDisplay amount={45000} currencyCode="GTQ" locale="es-LATAM" data-testid="amount" />,
    );
    const el = screen.getByTestId('amount');
    expect(el).toHaveAttribute('title', 'GTQ');
    expect(el.textContent ?? '').toMatch(/45[.,]000/);
    expect(el.className).toContain('tabular-nums');
  });

  it('el formato depende del locale: la misma cifra cambia de separador', () => {
    const { rerender } = render(
      <CurrencyDisplay amount={1234.5} currencyCode="USD" locale="en" data-testid="amount" />,
    );
    const inEnglish = screen.getByTestId('amount').textContent ?? '';
    rerender(
      <CurrencyDisplay amount={1234.5} currencyCode="USD" locale="es-ES" data-testid="amount" />,
    );
    const inSpanish = screen.getByTestId('amount').textContent ?? '';
    expect(inEnglish).not.toBe(inSpanish);
  });

  it('`showCurrencyCode` desambigua el símbolo sin convertir la moneda', () => {
    render(
      <CurrencyDisplay
        amount={500}
        currencyCode="USD"
        locale="en"
        showCurrencyCode
        data-testid="amount"
      />,
    );
    const el = screen.getByTestId('amount');
    expect(el.textContent ?? '').toMatch(/USD/);
    // Nunca aparece una segunda moneda: no hay conversión (BR-BUDGET-007).
    expect(el.textContent ?? '').not.toMatch(/GTQ|EUR/);
  });

  it('el contexto de moneda siempre llega al lector de pantalla', () => {
    // Con símbolo (`US$`) el código no está en el texto: se añade al nombre accesible.
    const { rerender } = render(
      <CurrencyDisplay amount={45000} currencyCode="USD" locale="es-ES" data-testid="amount" />,
    );
    let el = screen.getByTestId('amount');
    expect(el).toHaveAttribute('title', 'USD');
    expect(el.getAttribute('aria-label') ?? el.textContent ?? '').toMatch(/USD/);

    // Si el código ya es visible, no se repite: `aria-label` redundante sería ruido.
    rerender(
      <CurrencyDisplay
        amount={45000}
        currencyCode="USD"
        locale="es-ES"
        showCurrencyCode
        data-testid="amount"
      />,
    );
    el = screen.getByTestId('amount');
    expect(el.textContent ?? '').toMatch(/USD/);
    expect(el).not.toHaveAttribute('aria-label');
  });

  it('`accessibleLabel` sustituye al nombre por defecto', () => {
    render(
      <CurrencyDisplay
        amount={500}
        currencyCode="GTQ"
        locale="es-LATAM"
        accessibleLabel="500 quetzales guatemaltecos"
      />,
    );
    expect(screen.getByLabelText('500 quetzales guatemaltecos')).toBeInTheDocument();
  });
});
