import { LoginPage } from '@/features/auth';

/**
 * /login (US-003 / FE-001). El query `from` (inyectado por el role guard de US-105) se valida
 * como ruta interna en `useLogin` antes de redirigir (prevención de open redirect — EC-04 US-105).
 * `?reset=success` (US-004 / AC-02): muestra el aviso de contraseña restablecida.
 */
export default function Login({ searchParams }: { searchParams?: { from?: string; reset?: string } }) {
  return <LoginPage from={searchParams?.from} showResetSuccess={searchParams?.reset === 'success'} />;
}
