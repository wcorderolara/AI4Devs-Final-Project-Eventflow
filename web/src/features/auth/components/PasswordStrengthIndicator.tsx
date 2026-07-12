'use client';

import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '../schemas/registerOrganizerSchema';

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/** Heurística visual (US-001 / FE-002). NO es la validación canónica (esa es Zod + backend). */
export function computePasswordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN_LENGTH) return 'weak';
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) return 'weak';
  const long = password.length >= 14;
  const mixed = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);
  return (long && (mixed || symbol)) || (mixed && symbol) ? 'strong' : 'medium';
}

const BAR_STYLE: Record<PasswordStrength, { width: string; color: string }> = {
  weak: { width: 'w-1/3', color: 'bg-red-500' },
  medium: { width: 'w-2/3', color: 'bg-amber-500' },
  strong: { width: 'w-full', color: 'bg-green-600' },
};

export function PasswordStrengthIndicator({ password }: { password: string }): React.JSX.Element | null {
  const t = useTranslations('auth.register.strength');
  if (password.length === 0) return null;
  const strength = computePasswordStrength(password);
  const { width, color } = BAR_STYLE[strength];
  return (
    <div className="mt-1" data-testid="password-strength">
      <div className="h-1.5 w-full rounded bg-neutral-200" aria-hidden="true">
        <div className={`h-1.5 rounded ${color} ${width}`} />
      </div>
      <p className="mt-1 text-xs text-neutral-600" aria-live="polite">
        {t('label')}: {t(strength)}
      </p>
    </div>
  );
}
