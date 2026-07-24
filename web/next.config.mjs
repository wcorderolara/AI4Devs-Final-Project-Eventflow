import createNextIntlPlugin from 'next-intl/plugin';

// next-intl App Router SIN i18n routing (sin prefijo URL — Doc 15 §17/§31.2). El plugin apunta al
// request config que resuelve el locale desde el header propagado por el middleware.
const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

// Proxy same-origin del API (ADR-DEVOPS-008 · deploy free-tier sin dominio propio). Cuando el backend
// vive en otro dominio (EC2/sslip.io), las cookies de sesión serían third-party y los navegadores las
// bloquean. Proxyando `/api/v1/*` desde el propio origen del frontend (Next.js reverse proxy), la
// cookie de sesión HTTP-only queda first-party. Se activa SOLO si `BACKEND_ORIGIN` está definido; sin
// él, no hay rewrite (comportamiento original de orígenes separados + CORS — Doc 21 §9).
const backendOrigin = process.env.BACKEND_ORIGIN;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sin `experimental.serverActions` (ADR-API-001, ADR-FE-002/003, Doc 15 §6).
  // Sin `i18n` legacy de Pages Router (next-intl App Router usa middleware + request config — VR-05).
  async rewrites() {
    if (!backendOrigin) return [];
    return [{ source: '/api/v1/:path*', destination: `${backendOrigin}/api/v1/:path*` }];
  },
};

export default withNextIntl(nextConfig);
