import { RegisterPage } from '@/features/auth';

/**
 * /register (US-001 / FE-001; render condicional US-002 / FE-001). `?role=vendor` renderiza el
 * form de proveedor; default organizer. La página es dinámica (searchParams).
 */
export default function Register({ searchParams }: { searchParams?: { role?: string } }) {
  return <RegisterPage roleParam={searchParams?.role} />;
}
