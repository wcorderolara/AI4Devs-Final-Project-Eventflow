'use client';

import { CreateEventWizard } from '../components/CreateEventWizard';

/** Página `/organizer/events/new` (US-009). El gating de sesión/rol lo aplica el layout `(app)`. */
export function CreateEventPage(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <CreateEventWizard />
    </div>
  );
}
