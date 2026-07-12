import { ProfilePage } from '@/features/profile';

// US-006 / US-007 — perfil propio del organizer. Los tres roles autenticados comparten
// `ProfilePage`; el gating de sesión lo aplica el layout `(app)`.
export default function OrganizerProfilePage() {
  return <ProfilePage />;
}
