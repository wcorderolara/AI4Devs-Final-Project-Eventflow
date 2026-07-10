'use client';

import { useTranslations } from 'next-intl';
import { ORGANIZER_NAV_ITEMS, Sidebar } from '@/shared/navigation';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('navigation');
  return (
    <div className="flex flex-1">
      <Sidebar items={ORGANIZER_NAV_ITEMS} ariaLabel={t('sidebar.organizer.label')} />
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}
