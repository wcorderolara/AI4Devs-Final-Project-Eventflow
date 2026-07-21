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
      <td colSpan={colSpan} className="bg-neutral-50 px-3 py-3">
        <div
          id={regionId}
          role="region"
          aria-labelledby={labelledById}
          className="space-y-3"
        >
          {hasReason ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                {t('expansion.reasonLabel')}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
                {reason}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {t('expansion.payloadLabel')}
            </p>
            {hasPayload ? (
              <pre className="mt-1 max-h-64 overflow-auto rounded border border-neutral-200 bg-white p-2 text-xs text-neutral-800">
                {payloadText}
              </pre>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">{t('expansion.payloadEmpty')}</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
