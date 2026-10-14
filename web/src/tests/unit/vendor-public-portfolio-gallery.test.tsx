// Galería del portafolio público: cuadrícula clickeable + visor a pantalla completa con el pie de
// crédito que exigen las fotos de licencia libre (CC BY / CC BY-SA).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { PortfolioWorkGallery } from '@/features/vendor-public/components/PortfolioWorkGallery';
import type { PublicVendorPortfolioImageDTO } from '@/features/vendor-public/api/vendorPublicApi.types';
import esLatamPublicVendor from '@/messages/es-LATAM/public-vendor.json';

const images: PublicVendorPortfolioImageDTO[] = [
  {
    url: '/api/v1/public/portfolio/1',
    credit: {
      title: 'Marimba en Antigua',
      author: 'Ana Pérez',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Marimba.jpg',
    },
  },
  { url: '/api/v1/public/portfolio/2', credit: null },
  {
    url: '/api/v1/public/portfolio/3',
    credit: { title: null, author: null, license: 'CC0', licenseUrl: null, source: null },
  },
];

function renderGallery() {
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ publicVendor: esLatamPublicVendor }}>
      <PortfolioWorkGallery
        workLabel="XV años 2024"
        images={images}
        alts={['Foto 1', 'Foto 2', 'Foto 3']}
      />
    </NextIntlClientProvider>,
  );
}

describe('PortfolioWorkGallery', () => {
  it('cada miniatura es un botón que abre el visor en esa foto', async () => {
    renderGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 1 de 3 de XV años 2024' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('1 de 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Foto 1' })).toBeInTheDocument();
  });

  it('muestra el pie de crédito con autor, licencia enlazada y fuente', async () => {
    renderGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 1 de 3 de XV años 2024' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Foto de Ana Pérez, licencia CC BY-SA 4.0.');
    expect(within(dialog).getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0',
    );
    expect(within(dialog).getByRole('link', { name: 'Ver original en Wikimedia Commons' })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Marimba.jpg',
    );
  });

  it('navega con las flechas y una foto propia no muestra crédito', async () => {
    renderGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 1 de 3 de XV años 2024' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('2 de 3')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('licencia');
    await userEvent.keyboard('{ArrowRight}');
    expect(dialog).toHaveTextContent('Foto con licencia CC0.');
    await userEvent.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('1 de 3')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(within(dialog).getByText('3 de 3')).toBeInTheDocument();
  });

  it('Escape cierra el visor', async () => {
    renderGallery();
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 2 de 3 de XV años 2024' }));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
