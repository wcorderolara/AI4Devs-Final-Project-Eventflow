'use client';

// US-031 (PB-P1-017 / FE-003) — Banner inline con el desglose por `error.code`.
// `role="status"` + `aria-live="polite"` para anunciar el resumen tras el submit sin interrumpir
// la navegación por teclado del organizador. Los mensajes por `error.code` se traducen a partir
// del namespace `tasks.bulkConfirm.resultBanner.codes.<CODE>` en 4 locales.
import { useTranslations } from 'next-intl';
import type {
  BulkItemErrorCode,
  ConfirmAITasksBulkResponse,
} from '../api/tasksBulkApi';

interface Props {
  response: ConfirmAITasksBulkResponse;
}

function tallyByCode(
  response: ConfirmAITasksBulkResponse,
): Partial<Record<BulkItemErrorCode, number>> {
  const counts: Partial<Record<BulkItemErrorCode, number>> = {};
  for (const item of response.results) {
    if (!item.accepted && item.error) {
      counts[item.error.code] = (counts[item.error.code] ?? 0) + 1;
    }
  }
  return counts;
}

export function BulkResultBanner({ response }: Props): JSX.Element {
  const t = useTranslations('tasks.bulkConfirm.resultBanner');
  const codes = tallyByCode(response);
  const codeEntries = (Object.entries(codes) as Array<[BulkItemErrorCode, number]>).filter(
    ([, count]) => count > 0,
  );
  return (
    <div role="status" aria-live="polite" data-testid="bulk-result-banner">
      <h3>{t('title')}</h3>
      <p>{t('acceptedCount', { count: response.summary.accepted })}</p>
      <p>{t('rejectedCount', { count: response.summary.rejected })}</p>
      {codeEntries.length > 0 ? (
        <>
          <p>{t('byCodeHeading')}</p>
          <ul>
            {codeEntries.map(([code, count]) => (
              <li key={code}>
                <span data-testid={`bulk-result-code-${code}`}>{t(`codes.${code}`)}</span>
                {`: ${count}`}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
