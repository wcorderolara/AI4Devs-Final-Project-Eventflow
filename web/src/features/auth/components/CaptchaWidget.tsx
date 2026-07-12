'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Token que el backend acepta con `CAPTCHA_PROVIDER=mock` (PB-P0-006 / US-109). */
export const MOCK_CAPTCHA_TOKEN = '__test__';

export interface CaptchaWidgetProps {
  /** Recibe el token resuelto, o null cuando el widget se resetea. */
  onToken: (token: string | null) => void;
  /** Incrementar para reiniciar el widget tras un error del backend (EC-01). */
  resetSignal?: number;
}

/**
 * CaptchaWidget (US-001 / FE-003; diferido de PB-P0-006). El proveedor se resuelve por
 * configuración pública: `mock` (local/CI/demo sin proveedor real) renderiza el checkbox fake
 * que emite el token de prueba; la validez REAL siempre la decide el backend server-side
 * (SEC-03). Los proveedores reales (reCAPTCHA/hCaptcha) se integran vía config por ambiente
 * sin impacto en este contrato (`siteKey` público + callback `onToken`).
 */
export function CaptchaWidget({ onToken, resetSignal = 0 }: CaptchaWidgetProps): React.JSX.Element {
  const t = useTranslations('auth.register.captcha');
  const checkboxId = useId();
  const [checked, setChecked] = useState(false);
  const provider = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? 'mock';

  // EC-01: ante error del backend el form incrementa `resetSignal` → el widget se reinicia.
  useEffect(() => {
    if (resetSignal > 0) {
      setChecked(false);
      onToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  if (provider !== 'mock') {
    // Proveedor real aún no seleccionado formalmente (Tech Spec §17): la elección es config por
    // ambiente. Sin script del proveedor cargado, se informa indisponibilidad (fail-safe).
    return (
      <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
        {t('unavailable')}
      </p>
    );
  }

  return (
    <fieldset className="rounded border border-neutral-300 p-3">
      <legend className="px-1 text-sm font-medium">{t('label')}</legend>
      <div className="flex items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            onToken(e.target.checked ? MOCK_CAPTCHA_TOKEN : null);
          }}
          className="h-5 w-5"
        />
        <label htmlFor={checkboxId} className="text-sm">
          {t('mockLabel')}
        </label>
      </div>
    </fieldset>
  );
}
