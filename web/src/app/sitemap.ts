import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Placeholder MVP: solo landing y directorio público. El llenado con vendors reales vive en la
// historia de vendor public sitemap (Doc 15 §14.2). Fecha fija (no `Date.now()`).
const lastModified = new Date('2026-06-19');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/vendors`, lastModified, changeFrequency: 'daily', priority: 0.8 },
  ];
}
