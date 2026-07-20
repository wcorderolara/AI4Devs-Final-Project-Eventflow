'use client';

// Hooks TanStack — admin vendors (US-074 list + US-047 moderate).
//
// - `useModerateVendor(ctx)` — mutation atómica; invalida:
//     * `adminVendorsKeys.all` prefix → refresca el listado global del panel (US-074 AC-05).
//     * `['public-vendor','detail',vendorSlug]` para refrescar el perfil público SEO tras
//       `hide`/`unhide` — el filtro `is_hidden=false` cambia la visibilidad (US-047 D2).
//     * `['vendor-directory']` para actualizar el listado público autenticado.
//
// - `useAdminVendorsList(filters)` — infinite query con cursor keyset (paridad US-077). El
//   `queryKey` incluye los filtros normalizados para que cambiar filtros invalide la cache
//   correcta y evite mezclar páginas de filtros distintos.
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { adminVendorsApi } from '../api/adminVendorsApi';
import type {
  AdminVendorListFilters,
  AdminVendorsListDTO,
  ModerateVendorBodyDTO,
  ModeratedVendorDTO,
} from '../api/adminVendorsApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminVendorsKeys = {
  all: ['admin', 'vendors'] as const,
  list: (filters: AdminVendorListFilters) => ['admin', 'vendors', 'list', filters] as const,
} as const;

// ── moderate mutation ───────────────────────────────────────────────────────

export interface ModerateVendorInput extends ModerateVendorBodyDTO {
  vendorId: string;
}

export interface UseModerateVendorCtx {
  /** Slug del vendor público para invalidar su ficha (hide/unhide cambia visibilidad). */
  vendorSlug?: string;
}

export function useModerateVendor(
  ctx: UseModerateVendorCtx = {},
): ReturnType<typeof useMutation<ModeratedVendorDTO, ApiError, ModerateVendorInput>> {
  const qc = useQueryClient();
  return useMutation<ModeratedVendorDTO, ApiError, ModerateVendorInput>({
    mutationFn: ({ vendorId, action, reason }) =>
      adminVendorsApi.moderate(vendorId, { action, reason }),
    onSuccess: () => {
      // US-074 AC-05: cualquier `admin.vendors.list.*` queda stale — invalidación por prefijo.
      void qc.invalidateQueries({ queryKey: adminVendorsKeys.all });
      if (ctx.vendorSlug) {
        void qc.invalidateQueries({ queryKey: ['public-vendor', 'detail', ctx.vendorSlug] });
      }
      // El directorio público autenticado (US-045) también se refresca por si
      // approve/reject/hide/unhide cambian su visibilidad.
      void qc.invalidateQueries({ queryKey: ['vendor-directory'] });
    },
  });
}

// ── list infinite query (US-074) ────────────────────────────────────────────

export interface UseAdminVendorsListOptions {
  enabled?: boolean;
}

export function useAdminVendorsList(
  filters: AdminVendorListFilters,
  { enabled = true }: UseAdminVendorsListOptions = {},
) {
  return useInfiniteQuery<
    AdminVendorsListDTO,
    ApiError,
    InfiniteData<AdminVendorsListDTO, string | undefined>,
    ReturnType<typeof adminVendorsKeys.list>,
    string | undefined
  >({
    queryKey: adminVendorsKeys.list(filters),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => adminVendorsApi.list({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
