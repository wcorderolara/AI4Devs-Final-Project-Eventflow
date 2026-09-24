import { RoleSelectorOnSignup } from '@/features/auth';

/**
 * /auth/google/select-role (US-008 / FE-002, AC-02). Pantalla intermedia del primer signup OAuth.
 * El backend redirige aquí tras el callback cuando el email no existía; la continuación viaja en
 * la cookie HTTP-only emitida por el callback. VR-03: sin rol seleccionado no se puede continuar.
 */
export default function GoogleSelectRolePage(): React.JSX.Element {
  return <RoleSelectorOnSignup />;
}
