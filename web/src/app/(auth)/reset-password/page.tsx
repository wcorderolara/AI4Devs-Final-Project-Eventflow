import { ResetPasswordPage } from '@/features/auth';

/** /reset-password?token=… (US-004 / FE-002): establecer nueva contraseña con token single-use. */
export default function ResetPassword({ searchParams }: { searchParams?: { token?: string } }) {
  return <ResetPasswordPage token={searchParams?.token} />;
}
