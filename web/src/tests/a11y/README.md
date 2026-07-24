# Frontend A11Y Suite — US-131 · PB-P2-019

> **Alcance MVP** — accesibilidad mínima usable y testeable sobre las rutas demo principales del
> organizador. **No** persigue conformidad WCAG 2.1 AA completa (NFR-FUT-002). El gate CI bloquea
> el merge únicamente ante **violaciones `impact === 'critical'`** de axe-core (política Doc 20
> §a11y · VR-02).

## TL;DR

```bash
# Correr solo la suite A11Y
npm run test:a11y

# El gate se activa automáticamente en `npm test` (glob incluye `src/tests/a11y/**`)
npm test
```

## Estructura

```
web/src/tests/a11y/
├── README.md                              (este archivo — DOC-001 + QA-004)
├── helpers/
│   ├── axe.ts                             (OPS-001 — auditA11y + formatViolations)
│   └── render-with-intl.tsx               (OPS-001 — providers de test)
├── us131-helpers-smoke.test.tsx           (smoke de los helpers)
├── us131-login.axe.test.tsx               (QA-001 — axe /login)
├── us131-create-event.axe.test.tsx        (QA-001 — axe /organizer/events/new)
├── us131-quote-compare.axe.test.tsx       (QA-001 — axe /organizer/events/:id/quotes/compare)
├── us131-keyboard-aria.test.tsx           (QA-002 — teclado + foco + ARIA + labels)
└── us131-focus-trap-modal.test.tsx        (QA-003 — focus trap + restauración + contraste)
```

## Inventario de rutas demo auditadas (DOC-001)

Las tres rutas demo principales del organizador son las mencionadas de forma inambigua por el
Tech Spec §8 y confirman el objetivo del backlog (PB-P2-019 · Doc 20 §a11y):

| Ruta demo | Componente auditado | Cobertura |
|---|---|---|
| `/login` | `LoginForm` (US-003) | axe (2 estados: limpio + banner de error) + teclado + labels + ARIA |
| `/organizer/events/new` | `CreateEventWizard` — step 0 (US-009) | axe (con MSW resolviendo `event-types`+`locations`) |
| `/organizer/events/:eventId/quotes/compare` | `QuoteComparisonTable` (US-057) | axe (2 vendors: `sent` + `accepted preferred`) |

Rutas NO auditadas en esta suite (fuera del scope MVP · Doc 20 §a11y explícito):

- Detalles de evento, tasks, budget, AI (cubiertas por sus tests unitarios de dominio).
- Panel admin y perfiles de vendor (no son "rutas demo del organizador").
- Certificación WCAG exhaustiva (NFR-FUT-002).

## Convención `critical` vs otras severidades

`auditA11y` (en `helpers/axe.ts`) divide las violaciones en **`critical`** (bloquean el merge) y
**`otherViolations`** (`serious`/`moderate`/`minor` — se reportan pero NO bloquean). Esta
política MVP viene de dos observaciones:

1. **Falsos positivos** de axe con `serious` sobre estilos visuales sin CSS externo cargado
   (jsdom no descarga la hoja de Tailwind), incompatibles con un gate estable.
2. **Prioridad de impacto** — el equipo prefiere una red de seguridad conservadora sobre
   detección exhaustiva de anti-patrones no bloqueantes.

Cuando el equipo decida elevar el gate a `serious`, actualizar `auditA11y` + este documento
+ Doc 20 §a11y en el mismo PR.

## Checklist manual mínimo (QA-004)

Ejecutar antes de cerrar el sprint o cuando se toque UI de las rutas demo. Es la red de seguridad
para lo que axe-core no cubre (orden de foco end-to-end, lectores de pantalla básicos).

### Login (`/login`)

- [ ] **Orden de foco end-to-end**: Tab desde la primera ruta accesible del layout llega al
      campo email antes que al password y luego al botón "Iniciar sesión" y a los links
      "Olvidé mi contraseña" / "Crear cuenta".
- [ ] **Enter dispara el submit** con el foco sobre el botón o dentro de un campo del formulario.
- [ ] **Foco visible** en cada elemento interactivo (outline nativo o ring de Tailwind).
- [ ] **Con lector de pantalla mínimo** (VoiceOver/Narrator/NVDA):
  - anuncia la etiqueta "Correo electrónico" al entrar al campo,
  - anuncia el error de validación cuando aparece (aria-live polite),
  - anuncia el banner de error global cuando el backend responde 401/429/captcha.
- [ ] **Captcha condicional**: cuando aparece tras N=3 intentos fallidos, es alcanzable por Tab
      y reversible por Shift+Tab.

### Creación de evento (`/organizer/events/new`)

- [ ] **Recorrido del wizard** (Tab a lo largo del step actual sin escapar al layout).
- [ ] **Anuncio del step actual** por lector (`aria-current="step"` en el `<li>` activo).
- [ ] **Errores de validación** anunciados y visibles (aria-describedby en cada campo).
- [ ] **Botón "Siguiente" habilitado** solo con campos válidos; el foco tras "Siguiente" cae en
      el primer campo del step siguiente (patrón wizard).

### Comparación de cotizaciones (`/organizer/events/:eventId/quotes/compare`)

- [ ] **Tabla es navegable por teclado** (Tab a través de las celdas interactivas: toggle
      preferred + link "Ver detalle").
- [ ] **Encabezados semánticos** (`<caption>` + `<th scope>`) anunciados por lector.
- [ ] **Vista mobile (`QuoteComparisonCards`)**: cada `<article>` tiene título accesible
      (`aria-labelledby`).
- [ ] **Estado `preferred`** no depende únicamente del color (icono ★ + label textual).

### Modales (transversal)

- [ ] **Focus trap**: Tab dentro del modal no escapa al fondo.
- [ ] **ESC cierra el modal** y devuelve el foco al opener.
- [ ] **`role="dialog"` + `aria-modal="true"` + `aria-labelledby`** siempre presentes.
- [ ] **Patrón destructive-safe**: en modales de destrucción (Cancelar QR, Rechazar quote,
      Eliminar tarea) el foco inicial NO recae sobre el CTA destructivo.

## Documentation Alignment (no bloqueante)

**N-A1** — Los `NFR-A11Y-001..005` (Doc 10 §14) son `Should Have` a nivel de requisito, pero la
**SUITE** que los verifica (`PB-P2-019`) es `Must Have`. No es una contradicción: la suite es la
**red de seguridad mínima verificable en CI**, no una promesa de conformidad WCAG completa.
Cuando el equipo decida perseguir WCAG 2.1 AA formal (NFR-FUT-002), esta suite crecerá — el gate
`critical` se mantendrá como línea base.

**N-A2** — El inventario de "rutas demo principales" se resuelve a las **3 rutas** listadas
arriba, coherentes con el Tech Spec §8 y el flujo demo del organizador de US-128.

## Dependencias y decisiones

- **`jest-axe@10`** + **`@types/jest-axe`** + **`axe-core`** ya estaban instalados desde
  US-056/061/073 (dialogs con jest-axe integrado). No se agregaron nuevas dependencias.
- **No añadimos `@axe-core/playwright`** — Testing Library + jest-axe cubre AC-01..AC-04 en
  jsdom. La verificación en un navegador real vive en el checklist manual y (opcional futuro)
  Playwright E2E fuera del scope MVP (D-02 execution record).
- **Contraste** (VR-04 · NFR-A11Y-005) se verifica con cálculo WCAG 2.1 determinista sobre los
  tokens Tailwind del repo, no con la regla `color-contrast` de axe — jsdom no puede muestrear
  píxeles vía `<canvas>` (limitación conocida).
