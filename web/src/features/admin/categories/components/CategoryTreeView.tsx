'use client';

// CategoryTreeView (US-075 / FE-002). Renderiza el árbol admin del catálogo
// `ServiceCategory` con acciones por nodo (Crear hijo · Editar · Desactivar / Reactivar).
//
// A11Y (WAI-ARIA Tree Pattern, requisito AC A11Y + Tech Spec §8):
//   - contenedor `role="tree"` con `aria-label`;
//   - items `role="treeitem"` con `aria-level`, `aria-expanded` (para roots con hijos),
//     `aria-selected` no aplica (no hay selección exclusiva);
//   - toggle expand/collapse por botón + Enter/Space; navegación por Tab entre acciones.
//
// Diseño mínimo: sin drag-and-drop (OUT of MVP — reorder via `PATCH sort_order` en el
// FormDialog). Sin lazy loading — el árbol es cold y small (< 100 filas típicas).
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AdminCategoryTreeNode } from '../api/adminCategoriesApi.types';

interface Props {
  tree: AdminCategoryTreeNode[];
  onCreateChild: (parent: AdminCategoryTreeNode) => void;
  onCreateRoot: () => void;
  onEdit: (node: AdminCategoryTreeNode) => void;
  onSoftDelete: (node: AdminCategoryTreeNode) => void;
  onReactivate: (node: AdminCategoryTreeNode) => void;
}

export function CategoryTreeView({
  tree,
  onCreateChild,
  onCreateRoot,
  onEdit,
  onSoftDelete,
  onReactivate,
}: Props): React.JSX.Element {
  const t = useTranslations('admin.category.tree');

  if (tree.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center">
        <p className="text-sm text-neutral-600">{t('empty')}</p>
        <button
          type="button"
          onClick={onCreateRoot}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('createRoot')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {t('countLabel', { count: countAll(tree) })}
        </p>
        <button
          type="button"
          onClick={onCreateRoot}
          data-testid="category-tree-create-root"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('createRoot')}
        </button>
      </div>
      <ul role="tree" aria-label={t('ariaLabel')} className="space-y-1">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            level={1}
            onCreateChild={onCreateChild}
            onEdit={onEdit}
            onSoftDelete={onSoftDelete}
            onReactivate={onReactivate}
          />
        ))}
      </ul>
    </div>
  );
}

interface NodeProps {
  node: AdminCategoryTreeNode;
  level: number;
  onCreateChild: (parent: AdminCategoryTreeNode) => void;
  onEdit: (node: AdminCategoryTreeNode) => void;
  onSoftDelete: (node: AdminCategoryTreeNode) => void;
  onReactivate: (node: AdminCategoryTreeNode) => void;
}

function TreeNodeItem({
  node,
  level,
  onCreateChild,
  onEdit,
  onSoftDelete,
  onReactivate,
}: NodeProps): React.JSX.Element {
  const t = useTranslations('admin.category.tree');
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const canHaveChildren = node.parent_id === null; // Solo roots aceptan hijos (max 2 niveles).

  const label = useMemo(() => nodeLabel(node), [node]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-expanded={hasChildren ? expanded : undefined}
      // WAI-ARIA APG Tree Pattern: cuando no hay selección múltiple ni exclusiva
      // (nuestro tree es de solo lectura + acciones por nodo), `aria-selected="false"`
      // en todos los items es la señal correcta. La regla jsx-a11y/role-has-required-aria-props
      // lo exige explícitamente.
      aria-selected={false}
      data-testid={`category-tree-item-${node.code}`}
    >
      <div
        className={`flex items-center justify-between rounded-md border px-3 py-2 ${
          node.is_active ? 'border-neutral-200 bg-white' : 'border-neutral-200 bg-neutral-50'
        }`}
        style={{ marginLeft: `${(level - 1) * 20}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={toggle}
              aria-label={expanded ? t('collapse') : t('expand')}
              className="rounded p-1 text-neutral-600 hover:bg-neutral-100"
            >
              {expanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="inline-block w-6" aria-hidden />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-900">{label}</span>
            <span className="text-xs text-neutral-500">
              {node.code}
              {node.is_active ? null : (
                <span
                  className="ml-2 inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-700"
                  data-testid={`category-inactive-badge-${node.code}`}
                >
                  {t('inactiveBadge')}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canHaveChildren ? (
            <button
              type="button"
              onClick={() => onCreateChild(node)}
              aria-label={t('createChildAria', { name: label })}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {t('createChild')}
            </button>
          ) : null}
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
      {hasChildren && expanded ? (
        <ul role="group" className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onSoftDelete={onSoftDelete}
              onReactivate={onReactivate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function countAll(tree: AdminCategoryTreeNode[]): number {
  let n = 0;
  for (const root of tree) {
    n += 1 + root.children.length;
  }
  return n;
}

function nodeLabel(node: AdminCategoryTreeNode): string {
  const esLatam = node.name_i18n['es-LATAM'];
  return typeof esLatam === 'string' && esLatam.length > 0 ? esLatam : node.label;
}
