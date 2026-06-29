# Technical Specification — US-081: LanguageSelector global

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-081 |
| Source User Story | `management/user-stories/US-081-user-change-language.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-081-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-047 |
| Backlog Title | Selector de idioma y configuración del evento |
| Backlog Execution Order | 81 |
| User Story Position in Backlog Item | 1 de 2 (US-081 → US-082) |
| Related User Stories in Backlog Item | US-081, US-082 |
| Epic | EPIC-I18N-001 |
| Backlog Item Dependencies | US-007, PB-P0-009..011 |
| Feature | LanguageSelector global + reuso PATCH US-007 + optimistic UI |
| Module / Domain | I18N |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-047 multi-story (US-081 + US-082). US-081 abre. Execution order 81.

---

## 3. Executive Technical Summary

**Backend**: Sin endpoints nuevos. Validar que US-007 PATCH /users/me acepta `preferred_language` enum. Si no, refactor minimal.

**Frontend**:
- `LanguageSelector` Client Component en header global.
- `useLocaleSwitcher` hook con cookie + optimistic + rollback.
- Integración next-intl middleware.

---

## 4. Scope Boundary

### In Scope
- Componente + hook + integración header + i18n labels.
- Validación enum (backend si refactor necesario).

### Out of Scope
- Endpoints nuevos backend.
- Auto-detect browser.
- Idiomas adicionales.

---

## 5. Architecture Alignment

Reuso de patron next-intl + US-007 endpoint.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 authenticated change | Hook + PATCH + re-render | FE |
| AC-02 anonymous | Cookie only | FE |
| AC-03 optimistic rollback | Hook con error handler | FE |
| AC-04 default es-LATAM | next-intl middleware | FE |
| AC-05 selector global | Header layout | FE |
| EC-01..03 | Edge handling | FE |

---

## 7. Backend Technical Design

### Validación (refactor minimal si necesario)

Si US-007 PATCH /users/me NO incluye `preferred_language`, extender DTO:

```ts
export const updateMeBody = z.object({
  // ... fields existentes
  preferred_language: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']).optional(),
}).strict();
```

Use case actualiza `users.preferred_language` si presente.

Sin migraciones nuevas (heredado US-007).

---

## 8. Frontend Technical Design

### Componente `LanguageSelector`

```tsx
'use client';

const LOCALES = [
  { code: 'es-LATAM', label: 'Español (LATAM)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
];

export function LanguageSelector() {
  const t = useTranslations('common.languageSelector');
  const currentLocale = useLocale();
  const { switchLocale, isLoading } = useLocaleSwitcher();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t('label')}>
        🌐 {currentLocale}
      </DropdownMenuTrigger>
      <DropdownMenuContent role="listbox">
        {LOCALES.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            role="option"
            aria-selected={code === currentLocale}
            onClick={() => switchLocale(code)}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Hook `useLocaleSwitcher`

```ts
export function useLocaleSwitcher() {
  const router = useRouter();
  const session = useSession(); // o tu auth
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newLocale: string) => usersApi.updateMe({ preferred_language: newLocale }),
    onError: (err, newLocale, context) => {
      // Rollback cookie al locale anterior
      setCookie('NEXT_LOCALE', context.previousLocale, { path: '/', maxAge: 365 * 24 * 60 * 60 });
      router.refresh();
      toast.error(t('common.languageSelector.error'));
    },
  });

  const switchLocale = (newLocale: string) => {
    const previousLocale = getCookie('NEXT_LOCALE') || 'es-LATAM';
    // 1. Cookie inmediata
    setCookie('NEXT_LOCALE', newLocale, { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
    // 2. Refresh para re-render con nuevo locale
    router.refresh();
    // 3. PATCH async si authenticated
    if (session.user) {
      mutation.mutate(newLocale, { context: { previousLocale } });
    }
  };

  return { switchLocale, isLoading: mutation.isPending };
}
```

### Header integration

`components/layout/Header.tsx` añade `<LanguageSelector />` en la barra superior derecha.

### i18n

`messages/{4 locales}.json` añadir:
- `common.languageSelector.label`
- `common.languageSelector.error`

(Labels nativos como "Español (LATAM)" se hardcodean en `LOCALES` array para evitar circular dependency.)

---

## 9. API Contract

Sin endpoints nuevos. Reuso `PATCH /api/v1/users/me`.

---

## 10. Database / Prisma Design

Sin migraciones. `users.preferred_language` ya existe (heredado US-007).

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design

- Cookie con `SameSite=Lax`, `Path=/`, `MaxAge=1y`.
- Backend valida enum (FR-I18N-001).

## 13. Testing Strategy

### Unit
- `useLocaleSwitcher` hook: switchLocale + onError rollback.
- DTO refactor (si aplica).

### Integration
- TS-01..TS-04.

### E2E
- TS-03 optimistic rollback con MSW simulando 5xx.
- TS-05 selector visible en todas las páginas.

### Accessibility
- Dropdown accesible (axe + keyboard).

### Performance
- Re-render `< 200ms p95`.

---

## 14. Observability & Audit

Log `i18n.locale.changed` con context.

---

## 15. Seed / Demo
N/A.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar reuso PATCH /users/me con preferred_language | Documentar. | Actualizar. | No |
| `docs/15` (i18n strategy) | Documentar cookie + middleware behavior | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cookie deshabilitada | UI no persiste sesión | Aceptable; in-memory para sesión actual |
| Race conditions PATCH | Estado inconsistente | Último gana; aceptable |
| Translation faltante en algún locale | UX degradada | Fallback a es-LATAM |
| Rollback failure | UX confusa | Toast claro + dejar cookie en último intento |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend** (opcional, si US-007 no lo entrega):
- `src/modules/users/dto/update-me.body.ts` (extender)
- `src/modules/users/use-cases/update-me.use-case.ts` (manejar preferred_language)

**Frontend**:
- `components/i18n/LanguageSelector.tsx` (nuevo)
- `hooks/useLocaleSwitcher.ts` (nuevo)
- `components/layout/Header.tsx` (extender con `<LanguageSelector />`)
- `lib/api/usersApi.ts` (verificar que `updateMe` acepta `preferred_language`)
- `messages/{4 locales}.json` (extender con `common.languageSelector.*`)

### Orden sugerido
1. BE: verificar/extender PATCH /users/me con preferred_language.
2. FE: `useLocaleSwitcher` + UT.
3. FE: `LanguageSelector` + axe test.
4. FE: integración en Header.
5. i18n labels + traducciones.
6. Tests IT + E2E.
7. Documentación.

### Decisiones que no deben reabrirse
D1–D6.

### Qué no implementar
- Auto-detect.
- Idiomas adicionales.
- Translations runtime.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| BE | 1 (verify/extend US-007) |
| FE | 4 (Hook, Selector, Header, i18n) |
| QA | 4 (UT, IT, A11Y, E2E) |
| DOC | 1 |
| **Total** | 10 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-081 entrega surface UI del selector de idioma global reusando endpoint US-007. PB-P1-047 continúa con US-082 (idioma del evento).
