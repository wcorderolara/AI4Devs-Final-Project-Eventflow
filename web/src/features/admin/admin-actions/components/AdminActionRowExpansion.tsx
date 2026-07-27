'use client';

// US-080 / FE-002 — Panel expandible con el `payload` JSON completo de una AdminAction.
// A11Y: se renderiza como una `<tr>` extra bajo la fila principal con `role="region"`
// y `aria-labelledby` que enlaza al `id` de la fila padre.
import { useTranslations } from 'next-intl';

interface Props {
  regionId: string;
  labelledById: string;
  reason: string | null;
  payload: Record<string, unknown> | null;
  colSpan: number;
}

function formatPayload(payload: Record<string, unknown> | null): string {
  if (payload === null) return '';
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function AdminActionRowExpansion({
  regionId,
  labelledById,
  reason,
  payload,
  colSpan,
}: Props): React.JSX.Element {
  const t = useTranslations('admin.admin-actions.list');
  const payloadText = formatPayload(payload);
  const hasPayload = payloadText.length > 0;
  const hasReason = reason !== null && reason.length > 0;

  return (
    <tr>
      {/* La fila de expansión reutiliza la superficie sutil de la cabecera de tabla para leerse
          como continuación de la fila padre, con tokens semánticos en vez de `neutral-*`. */}
      <td colSpan={colSpan} className="bg-surface-subtle px-3 py-3">
        <div id={regionId} role="region" aria-labelledby={labelledById} className="space-y-3">
          {hasReason ? (
            <div>
              <p className="font-ui text-caption font-semibold uppercase tracking-ef-wide text-secondary">
                {t('expansion.reasonLabel')}
              </p>
              <p className="mt-1 whitespace-pre-wrap font-body text-body-sm text-primary">
                {reason}
              </p>
            </div>
          ) : null}

          <div>
            <p className="font-ui text-caption font-semibold uppercase tracking-ef-wide text-secondary">
              {t('expansion.payloadLabel')}
            </p>
            {hasPayload ? (
              <pre className="mt-1 max-h-64 overflow-auto rounded-card border border-subtle bg-surface p-2 font-mono text-caption text-primary">
                {payloadText}
              </pre>
            ) : (
              <p className="mt-1 font-body text-body-sm text-muted">
                {t('expansion.payloadEmpty')}
              </p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
