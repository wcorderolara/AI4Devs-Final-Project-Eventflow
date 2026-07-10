'use client';

import { useTranslations } from 'next-intl';
import { Sidebar, VENDOR_NAV_ITEMS } from '@/shared/navigation';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('navigation');
  return (
    <div className="flex flex-1">
      <Sidebar items={VENDOR_NAV_ITEMS} ariaLabel={t('sidebar.vendor.label')} />
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}
