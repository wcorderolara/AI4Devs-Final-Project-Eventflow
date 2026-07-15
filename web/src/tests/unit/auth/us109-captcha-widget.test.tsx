// US-109 QA-005 (post-iteración 2026-07-14) — Tests component + A11Y del CaptchaWidget.
// Cubre: renderizado, callback onToken, resetSignal, A11Y con jest-axe.
import { render, fireEvent, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { CaptchaWidget, MOCK_CAPTCHA_TOKEN } from '@/features/auth';
import enAuth from '@/messages/en/auth.json';

expect.extend(toHaveNoViolations);

function wrap(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={{ auth: enAuth }}>
      {node}
    </NextIntlClientProvider>
  );
}

describe('US-109 QA-005 — <CaptchaWidget>', () => {
  it('emite MOCK_CAPTCHA_TOKEN al marcar el checkbox', () => {
    const onToken = vi.fn();
    render(wrap(<CaptchaWidget onToken={onToken} />));
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToken).toHaveBeenLastCalledWith(MOCK_CAPTCHA_TOKEN);
  });

  it('resetSignal reinicia el widget (emite null)', () => {
    const onToken = vi.fn();
    const { rerender } = render(wrap(<CaptchaWidget onToken={onToken} resetSignal={0} />));
    fireEvent.click(screen.getByRole('checkbox'));
    onToken.mockClear();
    rerender(wrap(<CaptchaWidget onToken={onToken} resetSignal={1} />));
    expect(onToken).toHaveBeenCalledWith(null);
  });

  it('A11Y: sin violaciones axe (fieldset + legend + checkbox etiquetado)', async () => {
    const { container } = render(wrap(<CaptchaWidget onToken={vi.fn()} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
