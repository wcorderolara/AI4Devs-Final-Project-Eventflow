import { ResetPasswordForm } from '../components/ResetPasswordForm';

/** Composición de /reset-password (US-004 / FE-002). El token llega por query (`?token=`). */
export function ResetPasswordPage({ token }: { token?: string }): React.JSX.Element {
  return <ResetPasswordForm token={token} />;
}
