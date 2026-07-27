# EventFlow — Landing Screen Implementation (Stitch «EventFlow - Inicio»)

| Campo | Valor |
|---|---|
| Nombre del documento | EventFlow — Landing Screen Implementation |
| Versión | 1.1 |
| Estado | Implementado |
| Fecha | 2026-07-27 |
| Tipo | Registro de implementación de pantalla (Stitch → frontend) |
| Alcance | Alineación visual y funcional de `/` (landing pública) con la screen Stitch aprobada, incluido el header público y los CTA dependientes de sesión. La v1.1 añade el seguimiento de §8: anclas absolutas, scroll suave y directorio público con datos reales (`GET /api/v1/public/vendors`). **No** modifica el contrato de autenticación, el guard de rutas ni el alcance del MVP. |
| Autoridad aplicada | 1) alcance de producto/MVP aprobado · 2) `EventFlow-UI-Foundations.md` · 3) `EventFlow-Design-Tokens.md` · 4) `EventFlow-Component-Foundations.md` · 5) `DEVELOPMENT_CONVENTIONS.md` · 6) `15-Frontend-Architecture-Design.md` · 7) componentes públicos existentes · 8) rutas y sesión existentes · 9) i18n existente · 10) screen Stitch |

---

## 1. Screen Stitch recuperada

| Ítem | Valor |
|---|---|
| Proyecto | **EventFlow AI Planning Workspace** (`projects/10889252267442839867`) |
| Screen | **EventFlow - Inicio** (`screens/7af2150dd6684c70be98fea230457b0b`) |
| Device / tamaño | `DESKTOP`, 2816 × 6988 |
| Artefactos inspeccionados | HTML generado completo (378 líneas) + screenshot (JPEG) |
| Assets referenciados | 2 fotografías en `lh3.googleusercontent.com` — **ninguna** incorporada (ver §7) |

Coincidencia exacta verificada sobre los tres identificadores (proyecto, screen y nombre). No se
sustituyó por ninguna otra pantalla. Los archivos temporales se descargaron fuera del árbol de
código y se eliminaron al terminar.

Información que Stitch **no** aporta y que se resolvió con las fuentes del proyecto: variantes
tablet/móvil, estados de foco, comportamiento con sesión iniciada, metadata SEO y traducciones.

---

## 2. Punto de partida

`/` no era un stub: PB-P2-032 ya había sustituido el `appName` + `welcome` inicial por una
composición con `MarketingHero` + `MarketingSection` + `MarketingFeatureGrid` y copy verificado en
`common.landing`. Esta tarea **no rehace** ese trabajo: conserva las seis capacidades y su copy, y
añade lo que la screen Stitch aporta y faltaba.

Diferencias reales frente a Stitch antes de empezar:

1. El header público era una fila plana de enlaces (`Directorio · Iniciar sesión · Registrarse`)
   sin navegación móvil, sin acciones destacadas y **sin conocer la sesión**: a un usuario ya
   autenticado se le seguía ofreciendo iniciar sesión.
2. El hero era centrado y sin apoyo visual; Stitch lo plantea a dos columnas con un badge de IA y
   una muestra de producto.
3. No había secciones de *cómo funciona*, público proveedor ni cierre con CTA.
4. No había metadata propia de la home (título/descripción/canónica/Open Graph).
5. No había navegación por anclas.

---

## 3. Reuse map

| Responsabilidad | Implementación existente | Decisión |
|---|---|---|
| Layout público | `app/(public)/layout.tsx` | **Extender** (resuelve sesión, monta el nuevo header) |
| Header público | *(fila de enlaces en línea en el layout)* | **Crear** `shared/navigation/PublicHeader.tsx` |
| Navegación móvil | `design-system/navigation/MobileNavigationDrawer` + `MobileNavigationTrigger` | Reutilizar (envueltos en `PublicMobileMenu`) |
| Cierre del drawer al navegar | `MobileNavigationDrawer` / `SidebarSection` / `SidebarItem` | **Extender**: prop `onNavigate` |
| Marca | `shared/navigation/Logo` | Reutilizar sin cambios |
| Skip link | `shared/navigation/SkipLink` | Reutilizar sin cambios |
| Selector de idioma | `shared/i18n/LanguageSelector` | Reutilizar sin cambios |
| Footer | `shared/navigation/Footer` | **Extender** (tokens semánticos + fix del año) |
| Hero | `design-system/marketing/MarketingHero` | Reutilizar (`layout="split"`, `eyebrow`, `media` — ya existían) |
| Badge de IA del hero | `design-system/feedback/Badge` | Reutilizar (`variant="role"` + icono) |
| Muestra de producto del hero | `design-system/data-display/Card` + `ai/AILabel` | Reutilizar por composición → `LandingHeroPreview` |
| Secciones de contenido | `design-system/marketing/MarketingSection` | **Extender**: prop `id` (+ `scroll-mt-header`); `align` centra sólo la cabecera |
| Rejilla de capacidades | `design-system/marketing/MarketingFeatureGrid` | **Extender**: prop `ordered` (`<ol>` para pasos) |
| Cards de capacidad / paso / proveedor | `design-system/marketing/MarketingFeatureCard` | Reutilizar sin cambios |
| Grupos de CTA | `design-system/marketing/MarketingCTAGroup` | Reutilizar sin cambios |
| CTA como enlace | *(cadenas de clases sueltas en `page.tsx`)* | **Crear** `design-system/actions/ActionLink` |
| Escalas de variante/tamaño de acción | `design-system/actions/Button` | **Extraer** a `actions/actionStyles.ts` (compartido) |
| Sesión en servidor | *(no existía; sólo `useSession()` cliente)* | **Crear** `auth-session/serverSession.ts` |
| Mapa rol → workspace | `features/auth/hooks/useLogin.roleHome` | **Mover** a `shared/navigation/roleHome.ts` (delega) |
| Resolución de CTA públicos | *(no existía)* | **Crear** `shared/navigation/publicNavigation.ts` |
| Página de landing | `app/(public)/page.tsx` | **Mover** a `features/marketing/pages/LandingPage.tsx` (convención de `features/*/pages`) |
| Iconografía | `lucide-react` | Reutilizar (no se añade ninguna librería) |
| Tipografía | `Inter` / `Inter Tight` vía `next/font` | Reutilizar (no se carga ninguna fuente nueva) |
| i18n | `next-intl` + catálogos `common` / `navigation` | Reutilizar (se amplían claves) |

### Componentes nuevos y por qué

- **`PublicHeader`** — no existía ningún header público con navegación, acciones destacadas y
  conciencia de sesión. `Topbar`/`AuthenticatedShell` son el cromo del shell autenticado (sidebar,
  menú de usuario, notificaciones), que esta superficie no debe tener. Vive en
  `shared/navigation/` junto a `Footer`, `Logo` y `SkipLink`, y **compone** primitivas existentes.
- **`PublicMobileMenu`** — envoltorio cliente mínimo que sólo posee el estado `open`. No
  reimplementa nada: delega en `MobileNavigationDrawer`, que ya resuelve focus trap, `Escape`,
  clic fuera, retorno del foco y bloqueo de scroll.
- **`ActionLink`** — un CTA que navega tiene que ser un `<a href>` real (clic central, pestaña
  nueva, anunciado como enlace, funcional sin JavaScript) y `Button` renderiza un `<button>`. Sin
  esta pieza, las cadenas de clases se copiaban en header, hero, sección de proveedores y cierre.
  **No es un segundo sistema de botones**: comparte con `Button` las mismas escalas vía
  `actionStyles.ts`.
- **`LandingHeroPreview`** — apoyo visual del hero. Es específico de la landing y compone `Card` +
  `AILabel`; no duplica ninguna primitiva. No usa `AIRecommendationCard` porque aquella modela una
  sugerencia *viva* con acciones de revisión, que aquí serían botones inertes.
- **`serverSession.ts`** — contrapartida server-side de `useSession()`. Sin ella el CTA correcto
  sólo podía calcularse tras hidratar, con el parpadeo consiguiente.
- **`publicNavigation.ts`** — punto único de resolución `sesión → destino` para header, hero,
  sección de proveedores y cierre. Evita tres copias del mapa de rutas por rol.

---

## 4. Estructura de la página

| Sección | Origen | Nota |
|---|---|---|
| Header sticky | Stitch | Marca · anclas · idioma · acciones según sesión |
| Hero (split) | Stitch | Badge de IA · `h1` con énfasis · descripción · 2 CTA · muestra de producto |
| `#how-it-works` | Adaptada | Tres pasos reales: describir → la IA propone → tú decides (`<ol>`) |
| `#features` | Stitch (bento) | Las seis capacidades del MVP, en rejilla uniforme |
| `#for-vendors` | Stitch (parcial) | Público secundario: perfil/paquetes, solicitudes, reseñas moderadas |
| Cierre con CTA | Stitch | Superficie inversa aprobada, CTA según sesión |
| Footer | Stitch (reducido) | Marca + copyright; sin columnas de enlaces inexistentes |

**Omitidas de Stitch:** franja de prueba social por ciudades, contadores del hero, tarjeta
flotante de ahorro, columnas del footer, y los ítems de nav *Solutions* y *Pricing*.

**Sin sección de IA independiente:** el posicionamiento human-in-the-loop se transmite en el badge
del hero, la muestra de producto, los pasos 2 y 3 de *cómo funciona* y la capacidad «Tú tienes el
control». Una sección adicional sólo repetiría el mismo mensaje.

---

## 5. Sesión y CTA

El rol **no se deduce de la URL ni del navegador**. `getServerSessionClaims()` lee las mismas
cookies que `roleGuardMiddleware` (`eventflow_session` presente + `eventflow_role` whitelisted) y
falla en seguro a *anónimo* ante cualquier error o pareja incompleta. Es una señal de UX, no un
security boundary (ADR-FE-003/015): el backend autoriza cada request.

| Estado | Header | Hero y cierre | Sección proveedores |
|---|---|---|---|
| Anónimo | `Iniciar sesión` + `Crear cuenta` | `/register` + `/vendors` | `/register` |
| Organizer | `Ir a mis eventos` (única) | `/organizer` + `/organizer/events` | `/organizer` |
| Vendor | `Ir a mi espacio de proveedor` (única) | `/vendor` + `/vendor/quotes` | `/vendor` |
| Admin | `Abrir administración` (única) | `/admin` + `/admin/metrics` | `/admin` |

A un usuario con sesión **no** se le vuelve a ofrecer iniciar sesión ni registrarse. Todos los
destinos existen ya en el App Router; no se ha creado ninguna ruta nueva.

---

## 6. SEO e i18n

- `generateMetadata` server-side: título y descripción localizados desde
  `common.landing.metadata`, canónica `/`, Open Graph (`type`, `url`, `siteName`, `title`,
  `description`) y `twitter: summary`.
- **Sin `alternates.languages`**: EventFlow no enruta el locale por URL (Doc 15 §17/§31.2), así que
  los cuatro idiomas comparten dirección. Cuatro `hreflang` apuntando a `/` serían una señal falsa.
  El `x-default` del layout raíz ya cubre el caso.
- **Sin `openGraph.images`**: no hay asset OG aprobado en el repositorio y no se enlaza uno de
  Stitch. Es un follow-up (§10).
- Todo el contenido principal es server-rendered. El único JavaScript de la superficie es el
  drawer móvil y el selector de idioma; la página funciona con JavaScript deshabilitado
  (verificado en E2E).
- Traducciones completas en los cuatro locales (`es-LATAM`, `es-ES`, `pt`, `en`), con la
  terminología propia de cada uno (`cotización` vs `presupuesto` en es-ES).
- El titular lleva el énfasis como markup de la traducción (`<em>`), no partiendo la frase en dos
  claves: cada idioma decide qué resalta y dónde cae.

---

## 7. Adaptaciones respecto a Stitch

| Detalle de Stitch | Decisión | Motivo |
|---|---|---|
| «500+ Eventos Exitosos», «98 % Satisfacción» | Omitido | Métricas inventadas |
| «Confiado por organizadores en Antigua / Cayalá / Paseo de la Sexta / Quetzaltenango» | Omitido | Prueba social fabricada; no son clientes ni marcas |
| «Pricing» / «Precios» | Omitido | No hay modelo de precios publicado |
| «Empieza Gratis Ahora» | → `Crear cuenta` | Nada respalda el «gratis» |
| «Ver Demostración» / «Hablar con Ventas» | → `Explorar proveedores` | No existe demo ni canal comercial |
| «Solutions», «Casos de Éxito», «Carreras», «Prensa», «Blog», «Sobre Nosotros», «IA Dashboard» | Omitidos | Rutas inexistentes |
| «la red más exclusiva de proveedores curados» | → «proveedores aprobados» | El directorio lista aprobados, no curados ni exclusivos |
| Tarjeta «Optimización de Presupuesto: ahorro del 12 % en catering» | → muestra de checklist etiquetada como ejemplo | Cifra inventada y describe una IA proactiva que el MVP no tiene |
| 2 fotografías alojadas por Google | Omitidas | No se enlazan assets de Stitch ni se fabrican capturas |
| Material Symbols + Font Awesome | → `lucide-react` | Librería única ratificada |
| `Inter Tight` vía `<link>` a Google Fonts | → `next/font` ya instalado | Sin peticiones de fuente en runtime |
| Paleta generada (`#683ec9`, `#fcf9f8`, …) | → tokens semánticos | La marca violeta aprobada ya cubre el papel |
| Formas flotantes con `blur(60px)` + parallax con el ratón | Omitido | UI Foundations prohíbe decoración pesada; el parallax ignora `prefers-reduced-motion` |
| `IntersectionObserver` de entrada de cards | Omitido | Contenido de marketing que arranca en `opacity-0` desaparece sin JavaScript |
| Bento asimétrico de capacidades | → rejilla uniforme | Alturas dispares rompen con traducciones largas; el `Card` canónico ya fija radio y sombra |
| Footer de cuatro columnas | → marca + copyright | Todos sus enlaces apuntarían a páginas inexistentes |
| `min-h-[90vh]` en el hero | Omitido | Altura fija recorta con texto traducido más largo |

---

## 8. Seguimiento posterior — navegación pública y directorio

Tres correcciones sobre la superficie pública, detectadas al usar la landing ya integrada.

### 8.1 Anclas del header rotas fuera de la landing

Las anclas eran relativas (`#features`). El header es el mismo en toda la superficie pública, así
que desde `/vendors` el destino era `/vendors#features`: una sección inexistente. El clic no hacía
nada y el visitante quedaba **atrapado en el directorio** sin forma de volver por el menú.

Ahora son absolutas (`/#features`). Además, el App Router escribe el fragmento en la URL pero
monta la página nueva arriba del todo, así que el salto no ocurría: `LandingHashTarget` resuelve el
fragmento al montar la landing, desplaza a la sección y **mueve el foco** a ella (WCAG 2.4.3 — sin
eso el usuario de teclado saltaba visualmente pero seguía tabulando desde el header).

### 8.2 Desplazamiento suave entre secciones

`scroll-behavior: smooth` en `html` (el `scroll-behavior` sólo surte efecto en el elemento que
scrollea). El bloque `prefers-reduced-motion` ya existente lo devuelve a `auto`, así que quien pide
menos movimiento salta directo (UI-DEC-015 / WCAG 2.3.3). El `scroll-mt-header` de las secciones
evita que la barra sticky tape el encabezado: verificado, la sección aterriza a 64 px del borde.

### 8.3 `/vendors` servía «Próximamente» en lugar de datos

La página era un placeholder pese a existir ya el directorio completo. La causa de fondo era de
backend: `GET /api/v1/vendors` **exige sesión** (US-045 lo define como *directorio autenticado*) y
el único endpoint público era `/public/vendors/:slug`, de un proveedor concreto. No había forma de
listar proveedores sin cuenta.

Esto contradecía tres decisiones ya tomadas en el repositorio: `robots.ts` permite `/vendors`
explícitamente, `sitemap.ts` la lista con prioridad 0.8, y el CTA «Explorar proveedores» de la
landing la ofrece a visitantes **sin cuenta**.

**Se añadió `GET /api/v1/public/vendors`**, reutilizando íntegramente el use case, el repositorio y
los resolvers de US-045. La única diferencia es `currentUser: null` (sin sesión no hay vendor a
quien auto-excluir). Comparte el rate limit dedicado y la política de `Cache-Control` del perfil
público. **No amplía la exposición de datos**: los campos del listado (`businessName`,
`locationCode`, `categories`, `ratingAvg`, `reviewsCount`, `priceRange`) ya son públicos hoy en
`/public/vendors/:slug`; sólo permite descubrirlos sin conocer el slug de antemano. Un test con
`.strict()` sobre el contrato impide que un campo nuevo se filtre sin decidirlo.

En el frontend, `/vendors` pasa a Server Component con metadata propia. Decisiones:

- **Paginación por enlaces** (`?cursor=`), no un botón «cargar más»: es rastreable, compartible y
  funciona sin JavaScript. El directorio autenticado conserva su scroll infinito — allí prima la
  fluidez y no hay SEO que preservar.
- **Sólo el formulario de filtros es cliente.** El listado viaja en el HTML inicial.
- **Las tarjetas enlazan al perfil público** (`/vendors/:slug`). Enlaza el título, no la card
  entera: envolver todo el contenido produciría un nombre accesible larguísimo. `VendorCard` gana
  `linkToProfile` y `headingLevel` — este último porque `h1` → `h3` saltaba un nivel (axe
  `heading-order`).
- Un **400 se distingue de una caída**: los filtros inválidos vienen de la URL y el visitante puede
  corregirlos, así que tienen su propio aviso.

---

## 9. Defectos preexistentes corregidos

- **Año del copyright con separador de millares.** `navigation.footer.copyright` usaba
  `{year, number}`, que renderizaba «© 2,026 EventFlow» en los cuatro locales. Corregido a
  `{year}`. Afecta también a `AuthSplitShell`, el otro consumidor.
- **Footer con paleta cruda.** `border-neutral-200` / `text-neutral-500` → tokens semánticos.

---

## 10. Validación ejecutada

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm run lint` | ✅ 0 warnings (`--max-warnings=0`) |
| `npm run test` | ✅ 157 archivos · 1436 tests · 1 skip |
| `npm run build` | ✅ compila; `/` en 1.74 kB de JS propio |
| `npx playwright test src/tests/e2e/layouts.public.spec.ts src/tests/e2e/routing.public.spec.ts` | ✅ 11 passed |

Cobertura añadida:

- `src/tests/unit/app/landing.test.tsx` — estructura, orden de secciones, `h1` único, jerarquía de
  encabezados, CTA por rol, destinos reales, ausencia de contenido no soportado, i18n.
- `src/tests/unit/app/landing-metadata.test.ts` — metadata en los cuatro locales, canónica, OG.
- `src/tests/unit/navigation/PublicHeader.test.tsx` — estados anónimo/autenticado, anclas, drawer
  (abrir, `Escape`, retorno de foco, cierre al navegar, selector de idioma).
- `src/tests/unit/navigation/publicNavigation.test.ts` — resolución role-aware y destinos montados.
- `src/tests/unit/auth-session/serverSession.test.ts` — claims, whitelist y fallo en seguro.
- `src/tests/a11y/landing-public.axe.test.tsx` — axe-core con **0 violaciones de cualquier
  severidad** en 4 locales × 4 estados de sesión + drawer abierto.
- `src/tests/e2e/layouts.public.spec.ts` — header, anclas, drawer y render sin JavaScript.

Validación visual (Chromium, servidor real) en 1440 / 834 / 390 px y en los cuatro locales:
`h1` único, **cero scroll horizontal** en las tres anchuras, navegación de escritorio y drawer
móvil mutuamente excluyentes, y CTA correcto en los cuatro estados de sesión.

Durante esa validación se detectaron y corrigieron dos defectos introducidos:

- 9 px de scroll horizontal a 390 px: el selector de idioma no cabía en la barra junto a la marca
  y la acción primaria. Se mueve al pie del drawer bajo `sm`.
- Anclas de navegación de escritorio con 21 px de alto. Ahora `min-h-touch`.

---

## 11. Pendientes (follow-up)

1. **Imagen Open Graph.** No existe asset aprobado; la metadata lo omite deliberadamente. Cuando
   se apruebe uno, añadir `openGraph.images` y `twitter: summary_large_image`.
2. **Enlaces legales del footer.** *Privacidad* y *Términos* siguen marcados como Future; el
   footer no los inventa.
3. **`Logo` con 28 px de alto.** Por debajo del mínimo táctil. Es un componente compartido usado
   en todos los shells; cambiarlo excede el alcance de esta pantalla.
4. **Captura real de producto en el hero.** La muestra actual está etiquetada como ejemplo
   ilustrativo. Sustituirla por una captura aprobada cuando exista.
