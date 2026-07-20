'use client';

// EventTypesPanel (US-076 / FE-001..004). Cliente que orquesta la tabla y los 2 dialogs
// (form + delete). Carga la lista `admin` (incluye inactivos).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminEventTypesList } from '../hooks/adminEventTypesQueries';
import { EventTypeTable } from './EventTypeTable';
import { EventTypeFormDialog, type EventTypeFormMode } from './EventTypeFormDialog';
import { EventTypeDeleteDialog } from './EventTypeDeleteDialog';
import type { AdminEventTypeNode } from '../api/adminEventTypesApi.types';

export function EventTypesPanel(): React.JSX.Element {
  const t = useTranslations('admin.event-type.panel');
  const query = useAdminEventTypesList();

  const [formMode, setFormMode] = useState<EventTypeFormMode | null>(null);
  const [deleteNode, setDeleteNode] = useState<AdminEventTypeNode | null>(null);

  return (
    <section aria-labelledby="admin-event-types-title" className="space-y-4">
      <header>
        <h1 id="admin-event-types-title" className="text-2xl font-bold">
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
        <EventTypeTable
          items={query.data}
          onCreate={() => setFormMode({ kind: 'create' })}
          onEdit={(node) => setFormMode({ kind: 'edit', node })}
          onSoftDelete={(node) => setDeleteNode(node)}
          onReactivate={(node) => setFormMode({ kind: 'edit', node })}
        />
      )}

      <EventTypeFormDialog mode={formMode} onClose={() => setFormMode(null)} />

      <EventTypeDeleteDialog node={deleteNode} onClose={() => setDeleteNode(null)} />
    </section>
  );
}
