// Perfil público SEO del vendor — Server Component + ISR + JSON-LD (US-046 / FE-001).
// AC-01 (metadata + JSON-LD), AC-02 (404 uniforme), AC-04 (cache: ISR 300s + backend
// Cache-Control 60s / SWR 300s), D3 (canonical `/vendors/:slug` sin prefijo de locale),
// D6 (uniform 404 sin distinguir "no existe" vs "no aprobado").
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicVendorProfile } from '@/features/vendor-public/components/PublicVendorProfile';
import { JsonLdLocalBusiness } from '@/features/vendor-public/components/JsonLdLocalBusiness';
import { vendorsPublicApi } from '@/features/vendor-public/api/vendorPublicApi';

export const revalidate = 300;

// Una sola llamada al backend por render: `generateMetadata` y la página comparten el resultado.
// El endpoint público tiene rate limit (60 req/min por IP, US-046 D7) y todas las llamadas SSR
// salen desde la IP del servidor de Next, así que cada petición duplicada gasta el cupo de todos.
const getVendor = cache((slug: string) => vendorsPublicApi.get(slug));

// La página se renderiza dinámicamente por slug la primera vez y luego se cachea con ISR.
// `dynamicParams: true` permite generar bajo demanda cualquier slug no listado en
// `generateStaticParams` (aquí ninguno — SSG explícito es Future).
export const dynamicParams = true;

interface PageProps {
  params: { slug: string };
}

function resolveSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function truncateBio(bio: string, max = 160): string {
  if (bio.length <= max) return bio;
  return `${bio.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getVendor(params.slug);
  const siteUrl = resolveSiteUrl();

  if (result.status !== 'ok') {
    return {
      title: 'EventFlow',
      description: '',
      robots: { index: false, follow: false },
    };
  }

  const vendor = result.data;
  const description = truncateBio(vendor.bio || vendor.businessName);
  const canonicalPath = `/vendors/${vendor.slug}`;
  const firstThumbnail = vendor.portfolio[0]?.thumbnails[0];

  return {
    title: `${vendor.businessName} | EventFlow`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: vendor.businessName,
      description,
      type: 'profile',
      url: `${siteUrl.replace(/\/$/, '')}${canonicalPath}`,
      images: firstThumbnail ? [{ url: firstThumbnail }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: vendor.businessName,
      description,
      images: firstThumbnail ? [firstThumbnail] : undefined,
    },
  };
}

export default async function PublicVendorPage({ params }: PageProps) {
  const result = await getVendor(params.slug);
  if (result.status === 'not_found') {
    notFound();
  }
  if (result.status !== 'ok') {
    // 429/5xx/red NO son "no existe": un 404 aquí haría desaparecer a un proveedor aprobado y ISR
    // lo cachearía. Se lanza para que lo atienda `(public)/error.tsx` (mensaje genérico + reintento,
    // sin detalles del backend) y la ruta se vuelva a generar en la próxima visita. El 404 uniforme
    // de D6 sigue aplicando a lo que el backend responde como no encontrado (no existe/no aprobado).
    throw new Error('public vendor profile unavailable');
  }
  const vendor = result.data;
  const siteUrl = resolveSiteUrl();

  return (
    <>
      <JsonLdLocalBusiness vendor={vendor} siteUrl={siteUrl} />
      <PublicVendorProfile vendor={vendor} />
    </>
  );
}
