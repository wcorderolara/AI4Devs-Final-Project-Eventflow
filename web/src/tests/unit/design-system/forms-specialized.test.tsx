// PB-P2-028 — Controles especializados (DateInput, CurrencyInput, FileUpload).
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §16, §18 y §19.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyInput, DateInput, FileUpload, FormField } from '@/shared/design-system';
import { parseAmountInput, roundToDecimals } from '@/shared/design-system';

describe('DateInput', () => {
  it('usa el control de fecha nativo con límites mínimo y máximo', () => {
    render(
      <FormField label="Fecha del evento" helperText="No puede estar en el pasado.">
        {(field) => (
          <DateInput {...field} min="2026-01-01" max="2026-12-31" defaultValue="2026-07-24" />
        )}
      </FormField>,
    );
    const input = screen.getByLabelText('Fecha del evento');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveAttribute('min', '2026-01-01');
    expect(input).toHaveAttribute('max', '2026-12-31');
  });

  it('expone el error de rango cruzado a través de FormField', () => {
    render(
      <FormField label="Fecha hasta" error="La fecha final no puede ser anterior a la inicial">
        {(field) => <DateInput {...field} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Fecha hasta');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('La fecha final no puede ser anterior');
  });
});

describe('parseAmountInput', () => {
  it('acepta los separadores de los cuatro locales soportados', () => {
    expect(parseAmountInput('1234.56')).toBe(1234.56);
    expect(parseAmountInput('1.234,56')).toBe(1234.56);
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
    expect(parseAmountInput('1.234')).toBe(1234);
    expect(parseAmountInput('0,5')).toBe(0.5);
    expect(parseAmountInput('1.234.567')).toBe(1234567);
  });

  it('devuelve null cuando no hay dígitos', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('   ')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
  });

  it('redondea sin arrastrar el ruido binario del float', () => {
    expect(roundToDecimals(0.1 + 0.2, 2)).toBe(0.3);
    expect(roundToDecimals(1234.5678, 2)).toBe(1234.57);
  });
});

describe('CurrencyInput', () => {
  function CurrencyHarness({
    currencyCode = 'GTQ',
    locale = 'es-419',
    readOnly = false,
    initial = 1500,
  }: {
    currencyCode?: string;
    locale?: string;
    readOnly?: boolean;
    initial?: number | null;
  }): React.JSX.Element {
    const [value, setValue] = useState<number | null>(initial);
    return (
      <div>
        <FormField label="Monto planificado" helperText="Sin conversión de moneda.">
          {(field) => (
            <CurrencyInput
              {...field}
              currencyCode={currencyCode}
              locale={locale}
              value={value}
              onValueChange={setValue}
              readOnly={readOnly}
            />
          )}
        </FormField>
        <output data-testid="canonical">{value === null ? 'null' : String(value)}</output>
      </div>
    );
  }

  it('muestra el código ISO como prefijo bloqueado y lo asocia al lector de pantalla (GTQ)', () => {
    render(<CurrencyHarness currencyCode="GTQ" />);
    const input = screen.getByLabelText('Monto planificado');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    const codeNode = screen.getByTestId('currencyInput.code');
    expect(codeNode).toHaveTextContent('GTQ');
    expect(ids).toContain(codeNode.id);
    // No hay selector de moneda: la moneda del evento es inmutable (BR-EVENT-007).
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('formatea según el locale y conserva el valor canónico numérico (USD/en)', async () => {
    const user = userEvent.setup();
    render(<CurrencyHarness currencyCode="USD" locale="en" initial={1234.5} />);
    const input = screen.getByLabelText('Monto planificado') as HTMLInputElement;
    expect(input.value).toBe('1,234.50');

    await user.clear(input);
    await user.type(input, '2500.75');
    expect(screen.getByTestId('canonical')).toHaveTextContent('2500.75');

    // Al perder el foco se reformatea sin alterar el número almacenado.
    fireEvent.blur(input);
    expect(input.value).toBe('2,500.75');
    expect(screen.getByTestId('canonical')).toHaveTextContent('2500.75');
  });

  it('acepta entrada con separadores es-LATAM y usa inputMode decimal', async () => {
    const user = userEvent.setup();
    render(<CurrencyHarness initial={null} />);
    const input = screen.getByLabelText('Monto planificado') as HTMLInputElement;
    expect(input).toHaveAttribute('inputmode', 'decimal');

    await user.type(input, '1.500,25');
    expect(screen.getByTestId('canonical')).toHaveTextContent('1500.25');
  });

  it('estado readOnly: el valor se muestra formateado y no entra en modo edición', async () => {
    const user = userEvent.setup();
    render(<CurrencyHarness readOnly initial={1500} />);
    const input = screen.getByLabelText('Monto planificado') as HTMLInputElement;
    expect(input).toHaveAttribute('readonly');
    await user.click(input);
    expect(input.value).toBe('1,500.00');
  });
});

describe('FileUpload', () => {
  const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
  const MAX_BYTES = 5 * 1024 * 1024;

  function file(name: string, type: string, size = 1024): File {
    const created = new File(['x'], name, { type });
    Object.defineProperty(created, 'size', { value: size });
    return created;
  }

  function renderUpload(overrides: Partial<Parameters<typeof FileUpload>[0]> = {}) {
    const onFilesSelected = vi.fn();
    const onFilesRejected = vi.fn();
    const onRemoveFile = vi.fn();
    render(
      <FileUpload
        dropzoneLabel="Selecciona o arrastra un archivo"
        hintLabel="JPG, PNG o WebP · máximo 5 MB"
        removeLabel={(name) => `Quitar ${name}`}
        accept={IMAGE_ACCEPT}
        maxSizeBytes={MAX_BYTES}
        onFilesSelected={onFilesSelected}
        onFilesRejected={onFilesRejected}
        onRemoveFile={onRemoveFile}
        {...overrides}
      />,
    );
    return { onFilesSelected, onFilesRejected, onRemoveFile };
  }

  it('mantiene un input de archivo nativo, enfocable y con label asociado', async () => {
    const user = userEvent.setup();
    renderUpload();
    const input = screen.getByLabelText('Selecciona o arrastra un archivo');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', IMAGE_ACCEPT);
    // Ruta accesible por teclado: el input nativo recibe foco sin depender del drop zone.
    await user.tab();
    expect(input).toHaveFocus();
  });

  it('selección por clic: acepta un archivo válido', async () => {
    const user = userEvent.setup();
    const { onFilesSelected, onFilesRejected } = renderUpload();
    const input = screen.getByLabelText('Selecciona o arrastra un archivo');
    await user.upload(input, file('portada.png', 'image/png'));
    expect(onFilesSelected).toHaveBeenCalledTimes(1);
    expect(onFilesSelected.mock.calls[0]?.[0]?.[0]?.name).toBe('portada.png');
    expect(onFilesRejected).not.toHaveBeenCalled();
  });

  it('rechaza un tipo no soportado sin llamar a onFilesSelected', () => {
    const { onFilesSelected, onFilesRejected } = renderUpload();
    const input = screen.getByLabelText('Selecciona o arrastra un archivo');
    fireEvent.change(input, { target: { files: [file('contrato.pdf', 'application/pdf')] } });
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(onFilesRejected).toHaveBeenCalledWith([expect.objectContaining({ reason: 'type' })]);
  });

  it('rechaza un archivo que excede el tamaño máximo recibido por props', () => {
    const { onFilesSelected, onFilesRejected } = renderUpload();
    const input = screen.getByLabelText('Selecciona o arrastra un archivo');
    fireEvent.change(input, {
      target: { files: [file('grande.png', 'image/png', MAX_BYTES + 1)] },
    });
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(onFilesRejected).toHaveBeenCalledWith([expect.objectContaining({ reason: 'size' })]);
  });

  it('arrastrar y soltar aplica la misma validación', () => {
    const { onFilesSelected } = renderUpload();
    const dropzone = screen.getByTestId('fileUpload.dropzone');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file('foto.jpg', 'image/jpeg')] } });
    expect(onFilesSelected).toHaveBeenCalledTimes(1);
  });

  it('lista los archivos seleccionados y permite quitarlos', async () => {
    const user = userEvent.setup();
    const { onRemoveFile } = renderUpload({ selectedFiles: [{ name: 'foto.jpg', size: 2048 }] });
    await user.click(screen.getByRole('button', { name: 'Quitar foto.jpg' }));
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });

  it('estado disabled: no acepta drop ni permite abrir el selector', () => {
    const { onFilesSelected } = renderUpload({ disabled: true });
    expect(screen.getByLabelText('Selecciona o arrastra un archivo')).toBeDisabled();
    fireEvent.drop(screen.getByTestId('fileUpload.dropzone'), {
      dataTransfer: { files: [file('foto.jpg', 'image/jpeg')] },
    });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it('anuncia el estado de subida y el progreso, y muestra el error asociado', () => {
    renderUpload({
      status: 'uploading',
      progress: 40,
      statusMessage: 'Subiendo foto.jpg',
      selectedFiles: [{ name: 'foto.jpg' }],
    });
    expect(screen.getByRole('status')).toHaveTextContent('Subiendo foto.jpg');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  });

  it('el error se asocia al input por aria-describedby y usa role alert', () => {
    renderUpload({ status: 'error', errorMessage: 'El archivo supera 5 MB' });
    const input = screen.getByLabelText('Selecciona o arrastra un archivo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    expect(
      ids.some((id) => document.getElementById(id)?.textContent?.includes('supera 5 MB')),
    ).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('El archivo supera 5 MB');
  });
});
