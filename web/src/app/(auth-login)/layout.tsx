import { AuthSplitShell } from '@/shared/navigation';

/**
 * Layout de `/login` (Server Component).
 *
 * `/login` vive en su propio route group — la URL no cambia — porque la referencia Stitch
 * *EventFlow — Iniciar Sesión (Foco)* es una composición a pantalla completa a dos columnas,
 * incompatible con la tarjeta centrada de `(auth)/layout.tsx`. Separar el grupo mantiene intactas
 * `/register`, `/forgot-password` y `/reset-password`, que están fuera del alcance de esta tarea.
 */
export default function AuthLoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthSplitShell>{children}</AuthSplitShell>;
}
