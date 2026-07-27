# EventFlow — Login Screen Implementation (Stitch «Iniciar Sesión (Foco)»)

| Campo | Valor |
|---|---|
| Nombre del documento | EventFlow — Login Screen Implementation |
| Versión | 1.0 |
| Estado | Implementado |
| Fecha | 2026-07-25 |
| Tipo | Registro de implementación de pantalla (Stitch → frontend) |
| Alcance | Alineación visual de `/login` con la screen Stitch aprobada. **No** modifica el contrato de autenticación, la sesión, el captcha ni las rutas de rol. |
| Autoridad aplicada | 1) `EventFlow-UI-Foundations.md` · 2) `EventFlow-Design-Tokens.md` · 3) `EventFlow-Component-Foundations.md` · 4) `DEVELOPMENT_CONVENTIONS.md` · 5) `19-Security-and-Authorization-Design.md` · 6) `15-Frontend-Architecture-Design.md` · 7) `16-API-Design-Specification.md` · 8) implementación existente de auth · 9) screen Stitch |

---

## 1. Screen Stitch recuperada

| Ítem | Valor |
|---|---|
| Proyecto | **EventFlow AI Planning Workspace** (`projects/10889252267442839867`) |
| Screen | **EventFlow - Iniciar Sesión (Foco)** (`screens/0c1f9189e86047aba9968767820217e3`) |
| Device / tamaño | `DESKTOP`, 2560 × 2048 |
| Artefactos inspeccionados | HTML generado completo (252 líneas) + screenshot (JPEG 512 × 266) |
| Assets referenciados | 1 fotografía alojada en `lh3.googleusercontent.com` — **no** incorporada (ver §5) |

Coincidencia exacta verificada sobre los tres identificadores (proyecto, screen y nombre). No se
sustituyó por ninguna otra pantalla. Los archivos temporales se descargaron fuera del árbol de
código y se eliminaron al terminar.

---

## 2. Decisión estructural: route group propio para `/login`

La composición Stitch es de **pantalla completa a dos columnas**, incompatible con la tarjeta
centrada de `src/app/(auth)/layout.tsx`, que comparten `/register`, `/forgot-password` y
`/reset-password` — fuera del alcance de esta tarea.

`/login` se movió a `src/app/(auth-login)/login/page.tsx`, con su propio `layout.tsx`, `error.tsx`
y `loading.tsx`. **La URL no cambia** (los route groups no aparecen en la ruta), el middleware de
locale y el role guard siguen aplicando igual, y las otras tres pantallas de auth quedan intactas.

---

## 3. Reuse map

| Responsabilidad | Implementación existente | Decisión |
|---|---|---|
| Shell de la página | *(no existía a dos columnas)* | **Crear** `shared/navigation/AuthSplitShell.tsx` |
| Formulario de login | `features/auth/components/LoginForm.tsx` | **Extender** (composición y primitivas; lógica intacta) |
| Campo email | `design-system/forms/Input` + `FormField` | Reutilizar (`inputSize="lg"`) |
| Campo contraseña | `design-system/forms/Input` | **Sustituir por `PasswordInput`** (ya existía, no se usaba aquí) |
| Toggle mostrar/ocultar | `design-system/forms/PasswordInput` + `FieldAction` | Reutilizar |
| Enlace junto al label | `design-system/forms/FormField` | **Extender**: nueva prop `labelAction` |
| Botón de envío | `design-system/actions/Button` | Reutilizar (`size="lg" fullWidth trailingIcon`) |
| Alerta de error | `design-system/feedback/Alert` | Reutilizar (sustituye un `<div>` a medida) |
| Aviso de reset OK | `design-system/feedback/Alert` | Reutilizar (sustituye caja verde con paleta cruda) |
| Captcha | `features/auth/components/CaptchaWidget` | Reutilizar sin cambios |
| Marca | `shared/navigation/Logo` | **Extender**: prop `tone` (`brand` \| `inverse`) |
| Selector de idioma | `shared/i18n/LanguageSelector` | Reutilizar |
| Skip link | `shared/navigation/SkipLink` | Reutilizar |
| API client | `features/auth/api/authApi.login` | Reutilizar sin cambios |
| Schema de validación | `features/auth/schemas/loginSchema` | Reutilizar sin cambios |
| Resolver de redirección | `features/auth/hooks/useLogin` (`roleHome`, `safeInternalPath`) | Reutilizar sin cambios |
| Indicador de carga | `Button.isLoading` (Spinner interno) | Reutilizar |

**Único componente nuevo: `AuthSplitShell`.** No existía ningún shell de autenticación a dos
columnas; el único shell comparable (`AuthenticatedShell`) monta sidebar, topbar y navegación por
rol, que esta pantalla no debe tener. Vive junto a él en `shared/navigation/` y **compone**
primitivas existentes (`SkipLink`, `Logo`, `LanguageSelector`): no duplica ninguna.

---

## 4. Comportamiento preservado (sin cambios)

- **Contrato**: `POST /auth/login` vía `httpClient` con `credentials: 'include'`. La sesión la
  emite el backend por cookie `HttpOnly` (`Set-Cookie`). El frontend no lee, no persiste y no
  inspecciona token alguno; no se escribe nada en `localStorage`/`sessionStorage` (verificado por
  test).
- **Captcha condicional (N=3)**: el widget sólo aparece cuando el backend devuelve
  `CAPTCHA_REQUIRED`/`CAPTCHA_INVALID`; se reinicia en cada fallo y el token viaja en el payload
  del reintento. Sin bypass. El proveedor sigue resolviéndose por configuración pública.
- **Anti-enumeración**: un `401` produce siempre el mismo mensaje genérico.
- **Rate limit**: `429` muestra los segundos de `Retry-After`, con variante sin tiempo.
- **Redirección por rol**: `useLogin` invalida `['me']` (el `SessionProvider` rehidrata con
  `GET /users/me`) y navega a `safeInternalPath(from) ?? roleHome(user.role)` —
  `organizer → /organizer`, `vendor → /vendor`, `admin → /admin`. El rol proviene de la respuesta
  del backend, nunca del formulario ni de la URL.
- **Open redirect**: `from` se valida como ruta interna; un valor externo se descarta y se cae al
  dashboard del rol.
- **Usuario ya autenticado**: lo redirige `roleGuardMiddleware` en el edge antes de renderizar
  (`/login` con cookie de sesión + rol válido → `/{role}`). No se añadió lógica duplicada en la
  página ni se destruye la sesión existente.

---

## 5. Adaptaciones respecto de Stitch

| Detalle Stitch | Adaptación | Motivo |
|---|---|---|
| Fotografía de stock alojada en Google | Panel con degradado de la escala de marca violeta + un acento suave | No se enlazan assets de Stitch desde producción, no hay asset aprobado equivalente y esta tarea no genera imágenes |
| Copy publicitario del panel («diseñada para coordinadores…») | Copy **aprobado** de la landing (`common.landing.heading` + 3 títulos de capacidades) | Evita afirmar capacidades que el MVP no tiene |
| Paleta Material (`#683ec9`, `#fcf9f8`, `outline-variant`…) | Tokens semánticos aprobados (`action-primary`, `surface`, `border-*`, `focus-*`) | La paleta Stitch no es autoridad sobre los tokens aprobados |
| Material Symbols | `lucide-react` | Librería única ratificada del proyecto |
| Tailwind config de Stitch (fuentes/escala propias) | `tailwind.config.ts` del proyecto (Inter / Inter Tight, escala aprobada) | Un solo sistema tipográfico |
| Input con foco «pintado» (`border-primary ring-2` fijos) | `:focus-visible` real con el anillo canónico + `autoFocus` en email | El estado de foco no puede ser permanente; el token de foco es el aprobado |
| Enlaces de pie *Privacidad / Términos / Ayuda* | Omitidos | Esas rutas no existen; los links legales están marcados como Future |
| Sin captcha en el mock | Captcha condicional conservado | Requisito de seguridad aprobado del flujo |
| «¿No tienes una cuenta? Crear cuenta» concatenado | Mensaje único con `t.rich` y etiqueta `<link>` | No se construyen frases concatenando fragmentos traducidos |
| Botón de idioma «Español» a medida | `LanguageSelector` del design system | Componente existente con listbox accesible y persistencia real |

---

## 6. Accesibilidad

- Un único `h1` por página (el título del formulario); el panel usa `<p>` y no introduce headings.
- Landmarks: `main#main-content` (destino del skip link) y `aside` complementario.
- Labels reales asociadas por `for`/`id`; el placeholder nunca sustituye al label.
- `autocomplete="email"` / `current-password`; `type` correcto por campo.
- Errores de campo asociados por `aria-describedby` + `aria-invalid`; error global en `Alert`
  (`role="alert"`) que **recibe el foco** tras un envío fallido.
- Estado pendiente expuesto con `aria-busy` en el `<form>` y en el botón, más texto de carga.
- Toggle de contraseña con nombre accesible distinto por estado y `aria-pressed`.
- Orden de tabulación: email (autofocus) → enlace de recuperación → contraseña → toggle → enviar.
- Envío con Enter; foco al primer campo inválido; icono + texto en todos los estados (el color
  nunca es la única señal); sin scroll horizontal en 390 / 834 / 1440 px.

---

## 7. Archivos tocados

| Ruta | Estado | Propósito |
|---|---|---|
| `web/src/app/(auth-login)/layout.tsx` | Nuevo | Monta `AuthSplitShell` sólo para `/login` |
| `web/src/app/(auth-login)/login/page.tsx` | Movido desde `(auth)/login/` | Sin cambios de lógica |
| `web/src/app/(auth-login)/error.tsx` | Nuevo | Boundary equivalente al de `(auth)`, con `ErrorState` |
| `web/src/app/(auth-login)/loading.tsx` | Nuevo | Skeleton con la forma del formulario |
| `web/src/shared/navigation/AuthSplitShell.tsx` | Nuevo | Shell a dos columnas |
| `web/src/shared/navigation/Logo.tsx` | Modificado | Prop `tone` para superficies oscuras |
| `web/src/shared/navigation/index.ts` | Modificado | Export del shell |
| `web/src/shared/design-system/forms/FormField.tsx` | Modificado | Prop `labelAction` |
| `web/src/shared/design-system/README.md` | Modificado | Documenta `labelAction` |
| `web/src/features/auth/components/LoginForm.tsx` | Modificado | Composición Stitch sobre primitivas existentes |
| `web/src/features/auth/pages/LoginPage.tsx` | Modificado | Aviso de reset con `Alert` |
| `web/src/messages/{en,es-ES,es-LATAM,pt}/auth.json` | Modificados | `password.placeholder`, `noAccount` (rich); baja `createAccount` |
| `web/src/tests/integration/auth/login-form.test.tsx` | Modificado | +13 casos (validación, doble envío, payload, red, storage, i18n) |
| `web/src/tests/a11y/us131-keyboard-aria.test.tsx` | Modificado | Orden de foco actualizado + toggle |
| `web/src/tests/a11y/us131-login.axe.test.tsx` | Modificado | Audita la página completa |
| `web/src/tests/unit/design-system/forms-fields.test.tsx` | Modificado | Caso de `labelAction` |
| `web/src/tests/unit/navigation/AuthSplitShell.test.tsx` | Nuevo | Landmarks, headings, copy aprobado, cero assets remotos |
| `web/src/tests/e2e/layouts.auth.spec.ts` | Modificado | `.auth-card` se verifica en `/register`; `/login` verifica el shell |

---

## 8. Validación ejecutada

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 warnings) |
| `npm run test` (151 archivos) | ✅ 1346 pasan · 1 skip |
| `npm run build` | ✅ `/login` compila |
| `npx playwright test` (auth-login, auth-register, auth-password-reset, routing.auth-redirect, layouts.auth) | ✅ |
| Validación visual (1440 / 834 / 390 px; 4 locales; estados default, foco, validación, error de auth, captcha, carga, contraseña visible) | ✅ sin overflow horizontal |

---

## 9. Pendientes y observaciones

1. **Proveedor de captcha real** (preexistente): `CaptchaWidget` sólo implementa el modo `mock`;
   con `NEXT_PUBLIC_CAPTCHA_PROVIDER` distinto informa indisponibilidad (fail-safe). La elección
   del proveedor sigue abierta en la Tech Spec §17.
2. **`Footer.copyright` con año numérico** (preexistente): `shared/navigation/Footer.tsx` pasa
   `year: 2026` como número, y en `en` `Intl` lo agrupa como «2,026». `AuthSplitShell` lo evita
   pasando el año como string; el `Footer` público sigue con el defecto.
3. **React Query Devtools visible en el build de producción local** (preexistente, no específico
   de `/login`): aparece también en `/register`. Fuera del alcance de esta tarea.
4. **Prettier** (preexistente): 281 archivos del repo no están formateados. Los archivos tocados
   aquí sí lo están.
5. Los otros tres pantallas de `(auth)` conservan la tarjeta centrada. Unificarlas con el shell a
   dos columnas requiere una decisión de UX propia.
