import type { MetadataRoute } from 'next';

// `<baseUrl>` desde NEXT_PUBLIC_SITE_URL con fallback local (Doc 15 §14.2).
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // `/vendors` (directorio público) se permite explícitamente: `Disallow: /vendor` prefija a
      // `/vendors`, y el match más específico de `allow` lo rehabilita (Deviation D3).
      allow: ['/', '/vendors'],
      disallow: [
        '/login',
        '/register',
        '/forgot-password',
        '/organizer',
        '/vendor',
        '/admin',
        '/403',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
