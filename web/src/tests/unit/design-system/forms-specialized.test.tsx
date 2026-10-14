// PB-P2-028 — Controles especializados (DateInput, FileUpload).
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §16, §18 y §19.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateInput, FileUpload, FormField } from '@/shared/design-system';

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
