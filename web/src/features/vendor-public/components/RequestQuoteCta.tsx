'use client';

// CTA «Pedir cotización» del perfil público (US-049: entrada al flujo de solicitud de cotización).
// El perfil se sirve cacheado (ISR) e igual para todos, así que el CTA es una isla cliente que
// decide por la sesión:
//   - organizador → elige uno de sus eventos activos (el backend sólo acepta eventos activos) y
//     va a `/organizer/events/:id/quotes/new?vendor=<slug>`; con un único evento activo va directo;
//   - visitante sin sesión → login, y vuelve a este perfil;
//   - proveedor / admin → no aplica, no se muestra.
import { MessageSquareQuote } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useEventsList } from '@/features/events';
import { useSession } from '@/shared/auth-session';
import { formatDate } from '@/shared/i18n';
import { ActionLink, Button, Modal } from '@/shared/design-system';

export interface RequestQuoteCtaProps {
  vendorSlug: string;
}

function quoteHref(eventId: string, vendorSlug: string): string {
  return `/organizer/events/${encodeURIComponent(eventId)}/quotes/new?vendor=${encodeURIComponent(vendorSlug)}`;
}

export function RequestQuoteCta({ vendorSlug }: RequestQuoteCtaProps): React.JSX.Element | null {
  const { role, isLoading } = useSession();

  if (isLoading) return null;
  if (role === null) {
    return (
      <ActionLink
        href={`/login?from=${encodeURIComponent(`/vendors/${vendorSlug}`)}`}
        variant="primary"
        leadingIcon={<MessageSquareQuote />}
      >
        <RequestQuoteLabel />
      </ActionLink>
    );
  }
  if (role !== 'organizer') return null;
  return <OrganizerRequestQuote vendorSlug={vendorSlug} />;
}

function RequestQuoteLabel(): React.JSX.Element {
  const t = useTranslations('publicVendor.requestQuote');
  return <>{t('cta')}</>;
}

function OrganizerRequestQuote({ vendorSlug }: RequestQuoteCtaProps): React.JSX.Element {
  const t = useTranslations('publicVendor.requestQuote');
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const events = useEventsList({ status: 'active', pageSize: 50 });
  const active = events.data?.items ?? [];
  const groupId = useId();

  function start(): void {
    // Un único evento activo: no hay nada que elegir.
    if (active.length === 1) {
      router.push(quoteHref(active[0]!.id, vendorSlug));
      return;
    }
    setEventId(active[0]?.id ?? null);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        leadingIcon={<MessageSquareQuote />}
        onClick={start}
        disabled={events.isLoading}
      >
        {t('cta')}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={active.length > 0 ? t('dialog.title') : t('noActive.title')}
        description={active.length > 0 ? t('dialog.description') : t('noActive.body')}
        closeLabel={t('dialog.cancel')}
        footer={
          active.length > 0 ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!eventId}
                onClick={() => eventId && router.push(quoteHref(eventId, vendorSlug))}
              >
                {t('dialog.continue')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <ActionLink href="/organizer/events" variant="primary">
                {t('noActive.cta')}
              </ActionLink>
            </>
          )
        }
      >
        {active.length > 0 ? (
          <fieldset>
            <legend className="sr-only">{t('dialog.eventsLabel')}</legend>
            <ul className="flex flex-col gap-2">
              {active.map((event) => (
                <li key={event.id}>
                  <label
                    htmlFor={`${groupId}-${event.id}`}
                    className="flex min-h-touch cursor-pointer items-center gap-3 rounded-card border border-subtle px-4 py-3 font-ui text-body-md text-primary has-[:checked]:border-interactive"
                  >
                    <input
                      id={`${groupId}-${event.id}`}
                      type="radio"
                      name={`${groupId}-event`}
                      value={event.id}
                      checked={eventId === event.id}
                      onChange={() => setEventId(event.id)}
                      className="focus-ring h-4 w-4 accent-[color:var(--color-action-primary)]"
                    />
                    <span className="min-w-0 flex-1">{event.name}</span>
                    <span className="font-ui text-body-sm tabular-nums text-secondary">{/* Fecha sin hora: se formatea en UTC para no correrla un día en zonas al oeste de UTC. */}
                      {formatDate(event.eventDate, locale, { dateStyle: 'medium', timeZone: 'UTC' })}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}
      </Modal>
    </>
  );
}
