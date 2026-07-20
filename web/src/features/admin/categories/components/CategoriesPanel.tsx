'use client';

// CategoriesPanel (US-075 / FE-001 + FE-002 + FE-003 + FE-004). Cliente que orquesta
// el árbol y los 2 dialogs (form + delete). Carga la lista `admin` (incluye inactivas).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminCategoriesList } from '../hooks/adminCategoriesQueries';
import { CategoryTreeView } from './CategoryTreeView';
import { CategoryFormDialog, type CategoryFormMode } from './CategoryFormDialog';
import { CategoryDeleteDialog } from './CategoryDeleteDialog';
import type { AdminCategoryTreeNode } from '../api/adminCategoriesApi.types';

export function CategoriesPanel(): React.JSX.Element {
  const t = useTranslations('admin.category.panel');
  const query = useAdminCategoriesList();

  const [formMode, setFormMode] = useState<CategoryFormMode | null>(null);
  const [deleteNode, setDeleteNode] = useState<AdminCategoryTreeNode | null>(null);

  return (
    <section aria-labelledby="admin-categories-title" className="space-y-4">
      <header>
        <h1 id="admin-categories-title" className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      {query.isPending ? (
        <p role="status" className="text-sm text-neutral-600">
          {t('loading')}
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-700">
          {t('error')}
        </p>
      ) : (
        <CategoryTreeView
          tree={query.data.tree}
          onCreateRoot={() => setFormMode({ kind: 'create-root' })}
          onCreateChild={(parent) => setFormMode({ kind: 'create-child', parent })}
          onEdit={(node) => setFormMode({ kind: 'edit', node })}
          onSoftDelete={(node) => setDeleteNode(node)}
          onReactivate={(node) => setFormMode({ kind: 'edit', node })}
        />
      )}

      <CategoryFormDialog
        mode={formMode}
        roots={query.data?.tree ?? []}
        onClose={() => setFormMode(null)}
      />

      <CategoryDeleteDialog node={deleteNode} onClose={() => setDeleteNode(null)} />
    </section>
  );
}
