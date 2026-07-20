'use client';

// EventTypeTable (US-076 / FE-002). Renderiza la lista plana admin del catálogo
// `EventType` con acciones por fila (Editar · Desactivar / Reactivar). Sin jerarquía
// (diferencia clave vs `CategoryTreeView` de US-075) — tabla simple ordenada por
// `sort_order`.
//
// A11Y (WAI-ARIA Table Pattern, Tech Spec §8):
//   - contenedor `role="table"` con `aria-label`;
//   - encabezados con `role="columnheader"`;
//   - filas con `role="row"`; celdas con `role="cell"`;
//   - badge inactivo semántico (`aria-label` en el chip).
import { useTranslations } from 'next-intl';
import type { AdminEventTypeNode } from '../api/adminEventTypesApi.types';

interface Props {
  items: AdminEventTypeNode[];
  onCreate: () => void;
  onEdit: (node: AdminEventTypeNode) => void;
  onSoftDelete: (node: AdminEventTypeNode) => void;
  onReactivate: (node: AdminEventTypeNode) => void;
}

export function EventTypeTable({
  items,
  onCreate,
  onEdit,
  onSoftDelete,
  onReactivate,
}: Props): React.JSX.Element {
  const t = useTranslations('admin.event-type.table');

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center">
        <p className="text-sm text-neutral-600">{t('empty')}</p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('create')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {t('countLabel', { count: items.length })}
        </p>
        <button
          type="button"
          onClick={onCreate}
          data-testid="event-type-table-create"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('create')}
        </button>
      </div>
      <div role="table" aria-label={t('ariaLabel')} className="w-full overflow-hidden rounded-md border border-neutral-200">
        <div role="rowgroup" className="bg-neutral-50">
          <div role="row" className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_240px] items-center gap-2 border-b border-neutral-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <div role="columnheader">{t('nameHeader')}</div>
            <div role="columnheader">{t('codeHeader')}</div>
            <div role="columnheader" className="text-right">{t('sortOrderHeader')}</div>
            <div role="columnheader" className="text-right">{t('actionsHeader')}</div>
          </div>
        </div>
        <div role="rowgroup">
          {items.map((item) => (
            <EventTypeRow
              key={item.id}
              node={item}
              onEdit={onEdit}
              onSoftDelete={onSoftDelete}
              onReactivate={onReactivate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  node: AdminEventTypeNode;
  onEdit: (node: AdminEventTypeNode) => void;
  onSoftDelete: (node: AdminEventTypeNode) => void;
  onReactivate: (node: AdminEventTypeNode) => void;
}

function EventTypeRow({ node, onEdit, onSoftDelete, onReactivate }: RowProps): React.JSX.Element {
  const t = useTranslations('admin.event-type.table');
  const label = nodeLabel(node);
  return (
    <div
      role="row"
      data-testid={`event-type-row-${node.code}`}
      className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_240px] items-center gap-2 border-b border-neutral-100 px-3 py-2 last:border-b-0 ${
        node.is_active ? 'bg-white' : 'bg-neutral-50'
      }`}
    >
      <div role="cell" className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-neutral-900">{label}</span>
        {node.description ? (
          <span className="truncate text-xs text-neutral-500">{node.description}</span>
        ) : null}
      </div>
      <div role="cell" className="min-w-0">
        <span className="truncate text-xs text-neutral-600">{node.code}</span>
        {node.is_active ? null : (
          <span
            className="ml-2 inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-700"
            aria-label={t('inactiveBadgeAria', { name: label })}
            data-testid={`event-type-inactive-badge-${node.code}`}
          >
            {t('inactiveBadge')}
          </span>
        )}
      </div>
      <div role="cell" className="text-right text-sm text-neutral-700">
        {node.sort_order}
      </div>
      <div role="cell" className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(node)}
          aria-label={t('editAria', { name: label })}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {t('edit')}
        </button>
        {node.is_active ? (
          <button
            type="button"
            onClick={() => onSoftDelete(node)}
            aria-label={t('deleteAria', { name: label })}
            className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            {t('delete')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReactivate(node)}
            aria-label={t('reactivateAria', { name: label })}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            {t('reactivate')}
          </button>
        )}
      </div>
    </div>
  );
}

function nodeLabel(node: AdminEventTypeNode): string {
  const esLatam = node.name_i18n['es-LATAM'];
  return typeof esLatam === 'string' && esLatam.length > 0 ? esLatam : node.label;
}
