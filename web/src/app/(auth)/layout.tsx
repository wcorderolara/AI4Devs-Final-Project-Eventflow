import { LocaleSwitcher } from '@/shared/i18n';
import { Logo, SkipLink } from '@/shared/navigation';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
        <Logo />
        <LocaleSwitcher />
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center p-8">
        <div className="auth-card w-full max-w-md rounded-lg border border-neutral-200 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
