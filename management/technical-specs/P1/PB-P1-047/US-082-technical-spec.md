# Technical Specification — US-082: Event Language Configuration

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-082 |
| Source User Story | `management/user-stories/US-082-configure-event-language.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-082-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-047 |
| Backlog Title | Selector de idioma y configuración del evento |
| Backlog Execution Order | 82 |
| User Story Position in Backlog Item | 2 de 2 (cierra) |
| Related User Stories in Backlog Item | US-081, US-082 |
| Epic | EPIC-I18N-001 |
| Backlog Item Dependencies | US-009, US-010, US-007/US-081, US-017..025 |
| Feature | Refactor minimal events para soportar language + binding AI |
| Module / Domain | I18N / Events |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-047 multi-story. US-082 cierra. Execution order 82.

---

## 3. Executive Technical Summary

**Backend**:
- Refactor minimal `CreateEventUseCase` (US-009): default heredado + validation.
- Refactor minimal `UpdateEventUseCase` (US-010): validación inmutabilidad por status.
- DTOs extendidos.
- Sin endpoints nuevos.

**Frontend**:
- `EventLanguageSelector` componente reusable (pattern de US-081 scoped a Event).
- Integración en wizard creation (US-009) + edit form (US-010).

**Database**:
- Verificar `events.language` enum column.

**AI Use Cases (US-017..025)**:
- Cada uno debe extraer `event.language` y pasarlo como `locale` al AIProviderPort. Esta US documenta el contrato; cada AI US implementa.

---

## 4. Scope Boundary

### In Scope
- Refactor minimal backend (DTOs + UseCases).
- Componente UI + integración.
- Contrato AI binding (documentación).

### Out of Scope
- Multilingual events.
- Translation runtime.
- Cambio retroactivo de AIRecommendations.
- Refactor de cada AI use case (queda como obligación de US-017..025).

---

## 5. Architecture Alignment

Reuso máximo de US-009/010 + pattern US-081.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 default heredado | UseCase lee organizer.preferred_language | BE |
| AC-02 override | DTO acepta language | BE |
| AC-03 edición permitida | PATCH valida status | BE |
| AC-04 edición bloqueada | 409 INVALID_TRANSITION-like | BE |
| AC-05 AI usa event.language | Cada US AI implementa binding | BE |
| EC-01..03 | Validaciones | BE |

---

## 7. Backend Technical Design

### DTOs refactor

```ts
// US-009 createEventBody — extender
export const createEventBody = z.object({
  // ... existing fields
  language: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']).optional(),
}).strict();

// US-010 updateEventBody — extender
export const updateEventBody = z.object({
  // ... existing fields
  language: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']).optional(),
}).strict();
```

### UseCase refactor

```ts
// CreateEventUseCase (US-009)
async execute({ currentUser, body }) {
  const language = body.language ?? currentUser.preferred_language ?? 'es-LATAM';
  // ... INSERT event con language
}

// UpdateEventUseCase (US-010)
async execute({ currentUser, eventId, body }) {
  // ... SELECT event
  if (body.language && ['completed', 'cancelled'].includes(existingEvent.status)) {
    throw new EventLanguageNotEditableError(existingEvent.status);
  }
  // ... UPDATE event
}
```

### AI Binding (contrato para US-017..025)

```ts
// En cada AI use case:
const aiPrompt = await this.aiProviderPort.generate({
  promptTemplate: '...',
  context: { eventTitle: event.title, /* ... */ },
  locale: event.language, // <-- nuevo
});
```

### Error Handling
`400 INVALID_LANGUAGE`, `409 EVENT_LANGUAGE_NOT_EDITABLE`, `404 EVENT_NOT_FOUND`.

---

## 8. Frontend Technical Design

### Componente

```tsx
// components/event/EventLanguageSelector.tsx
type Props = {
  value?: string;
  defaultValue: string; // organizer.preferred_language
  onChange: (locale: string) => void;
  disabled?: boolean; // si event status no editable
};

export function EventLanguageSelector({ value, defaultValue, onChange, disabled }: Props) {
  const t = useTranslations('organizer.event.language');
  // ... Dropdown similar a US-081 LanguageSelector
}
```

### Integración

- Wizard creation (US-009): paso de configuración con `<EventLanguageSelector defaultValue={user.preferred_language} />`.
- Detail page (US-010): edición inline o modal.

### Forms
RHF + Zod alineado backend.

### i18n
`organizer.event.language.*` en 4 locales.

---

## 9. API Contract

Sin endpoints nuevos. Cambios:

| Endpoint | Cambio |
|---|---|
| `POST /events` (US-009) | Body acepta `language` opcional. |
| `PATCH /events/:id` (US-010) | Body acepta `language` opcional + validación inmutabilidad. |

---

## 10. Database / Prisma Design

### Models Impacted
`Event.language` enum. Verificar columna existe; si no, migración menor.

### Migration

```sql
-- Si falta:
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es-LATAM';

-- Backfill: events existentes ya tienen default
```

---

## 11. AI / PromptOps Design

### Contrato

Cada AI use case (US-017..025) debe modificar su llamada a `AIProviderPort` para incluir `locale: event.language`. US-082 NO implementa los refactors individuales; cada AI US tiene esa responsabilidad.

### Verificación

TS-05 de esta US verifica el contrato vía un AI use case representativo (US-017 plan generation).

---

## 12. Security & Authorization Design
Heredada US-009/US-010.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (default + override + inmutabilidad).

### Integration
- TS-01..TS-04 + AI binding TS-05 (con US-017 representativo).

### API
Supertest.

### Security
- Inmutabilidad enforced.

### Accessibility
- Selector accesible.

### Performance
- Heredado US-009/010.

---

## 14. Observability & Audit

Logs `event.language.set` (create) + `event.language.changed` (update).

---

## 15. Seed / Demo
Reuso. Verificar seed crea events con language correcto.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar field language en POST/PATCH /events | Documentar. | Actualizar. | No |
| `docs/15` (i18n) | Documentar binding event.language → AI locale | Documentar. | Actualizar. | No |
| US-017..025 | Cada US AI debe refactor para usar event.language | Refactor obligatorio | Tickets de seguimiento. | No |
| Schema events.language | Verificar columna | Migración menor si falta | Aplicar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI use case no actualizado | AI output en idioma incorrecto | TS-05 verifica binding; documentar contrato claramente |
| Default no heredado | UX confusa | UseCase usa user.preferred_language |
| Inmutabilidad permisiva | Compliance | Validation server-side |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/events/dto/create-event.body.ts` (extender US-009)
- `src/modules/events/dto/update-event.body.ts` (extender US-010)
- `src/modules/events/use-cases/create-event.use-case.ts` (refactor minimal)
- `src/modules/events/use-cases/update-event.use-case.ts` (refactor minimal)
- Migración Prisma si columna falta.

**Frontend**:
- `components/event/EventLanguageSelector.tsx` (nuevo)
- `components/event/EventCreationWizard.tsx` (extender, US-009)
- `components/event/EventEditForm.tsx` (extender, US-010)
- `lib/api/eventsApi.ts` (verificar body acepta language)
- `messages/{4 locales}.json` (`organizer.event.language.*`)

### Orden sugerido
1. DB-001 (verify) + migración si falta.
2. BE refactor DTOs + UseCases.
3. FE EventLanguageSelector + integración wizard + edit.
4. i18n.
5. Tests IT + AI binding verification.
6. Documentación contrato AI.

### Decisiones que no deben reabrirse
D1–D7.

### Qué no implementar
- Refactor de cada AI use case (responsabilidad de US-017..025).
- Multilingual events.
- Retroactivo.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 3 (DTOs + 2 UseCases refactor) |
| FE | 3 (Selector + 2 integraciones + i18n agrupado) |
| QA | 4 (UT, IT, AUTH, AI binding TS-05) |
| DOC | 1 |
| **Total** | 12 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| AI impact contract clear | Pass (cada AI US implementa) |
| Security clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-082 cierra PB-P1-047 con refactor minimal backend + componente EventLanguageSelector + contrato AI binding. **EPIC-I18N-001 avanza con 2 US completas (US-081 user + US-082 event)**.
