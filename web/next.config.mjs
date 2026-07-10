import createNextIntlPlugin from 'next-intl/plugin';

// next-intl App Router SIN i18n routing (sin prefijo URL — Doc 15 §17/§31.2). El plugin apunta al
// request config que resuelve el locale desde el header propagado por el middleware.
const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sin `experimental.serverActions` (ADR-API-001, ADR-FE-002/003, Doc 15 §6).
  // Sin rewrites/redirects a APIs externas ni a `/api/v1/*` (el backend vive en otro origen — Doc 21 §9).
  // Sin `i18n` legacy de Pages Router (next-intl App Router usa middleware + request config — VR-05).
};

export default withNextIntl(nextConfig);
