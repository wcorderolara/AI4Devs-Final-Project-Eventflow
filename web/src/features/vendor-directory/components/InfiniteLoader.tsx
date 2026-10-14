'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/shared/design-system';

export interface InfiniteLoaderProps {
  hasMore: boolean;
  isLoading: boolean;
  /** Error al cargar la última página: se muestra con un botón de reintento y se pausa el auto-load. */
  hasError?: boolean;
  onLoadMore: () => void;
  labels: { loadMore: string; loading: string; end: string; error: string; retry: string };
  /** Muestra el aviso de fin sólo si ya hay elementos en la lista. */
  showEnd?: boolean;
}

/**
 * Infinite scroll accesible para los directorios.
 *
 * Un marcador al final de la lista pide la siguiente página ~400 px antes de llegar
 * (`IntersectionObserver`). El botón "Cargar más" queda como respaldo para teclado y para
 * navegadores sin observer; la carga se anuncia en una región `aria-live`. Si una página falla,
 * el auto-load se detiene hasta que la persona reintente (evita bucles de peticiones fallidas).
 */
export function InfiniteLoader({
  hasMore,
  isLoading,
  hasError = false,
  onLoadMore,
  labels,
  showEnd = true,
}: InfiniteLoaderProps): React.JSX.Element | null {
  const sentinel = useRef<HTMLDivElement>(null);
  // La referencia más reciente: el observer no se recrea en cada render del padre.
  const loadMore = useRef(onLoadMore);
  loadMore.current = onLoadMore;

  useEffect(() => {
    if (!hasMore || isLoading || hasError) return;
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore.current();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, hasError]);

  return (
    <div ref={sentinel} className="flex flex-col items-center gap-3 py-8">
      <p role="status" aria-live="polite" className="sr-only">
        {isLoading ? labels.loading : ''}
      </p>
      {hasError ? (
        <div role="alert" className="flex flex-col items-center gap-3 font-ui text-body-sm text-feedback-error">
          <p>{labels.error}</p>
          <Button type="button" variant="secondary" onClick={onLoadMore}>
            {labels.retry}
          </Button>
        </div>
      ) : isLoading ? (
        <p aria-hidden="true" className="font-ui text-body-sm text-muted">
          {labels.loading}
        </p>
      ) : hasMore ? (
        <Button type="button" variant="secondary" onClick={onLoadMore}>
          {labels.loadMore}
        </Button>
      ) : showEnd ? (
        <p className="font-display text-[1.25rem] italic text-secondary">{labels.end}</p>
      ) : null}
    </div>
  );
}
