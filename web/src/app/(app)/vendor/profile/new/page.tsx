// Ruta `/vendor/profile/new` (US-040 / FE-002). Página cliente que orquesta el wizard.
'use client';

import { useRouter } from 'next/navigation';
import { VendorProfileWizard } from '@/features/vendor-profile';

export default function CreateVendorProfilePage(): React.JSX.Element {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <VendorProfileWizard
        onCancel={() => router.push('/vendor/profile')}
      />
    </main>
  );
}
