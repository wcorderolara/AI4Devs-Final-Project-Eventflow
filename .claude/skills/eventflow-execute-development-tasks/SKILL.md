---
name: eventflow-execute-development-tasks
description: Ejecuta de forma controlada, trazable y reanudable las Development Tasks de una User Story de EventFlow a partir de sus rutas de User Story, Tech Spec y Tasks File.
argument-hint: "[user-story-path] [tech-spec-path] [tasks-path]"
disable-model-invocation: true
user-invocable: true
---

# EventFlow Skill — Execute Development Tasks

> Idioma de trabajo: **español neutro (LATAM)**. Los identificadores técnicos, rutas,
> IDs de tarea, comandos, nombres de paquete, literales de estado y claves de configuración
> se conservan **verbatim** (sin traducir). Los literales de estado como `Not Started`,
> `In Progress`, `READY`, `ALIGNED`, `TASK-...`, etc. **nunca** se traducen.

---

## 1. Propósito

Esta skill **ejecuta trabajo real de implementación** para una única User Story de EventFlow,
tomando como entrada sus tres artefactos base (User Story, Technical Specification y
Development Tasks) y produciendo cambios reales en el repositorio de forma:

* alineada con la arquitectura aceptada;
* trazable tarea por tarea;
* reanudable entre sesiones;
* respaldada por evidencia de validación honesta;
* conservadora con las modificaciones del repositorio.

Esta skill **NO** es un generador de documentación. Genera un **registro de ejecución**
(execution record) separado del Tasks File original y modifica el código/configuración
que las tareas requieran.

### Lo que esta skill NO hace

* No refina, aprueba ni reescribe la User Story, la Tech Spec ni el Tasks File.
* No genera Technical Specifications ni Development Tasks.
* No renumera IDs de tarea originales.
* No hace `git commit`, `git push`, ni abre PRs automáticamente (§8 Git Safety).
* No ejecuta comandos destructivos de base de datos por defecto.
* No instala dependencias sin justificación explícita registrada.
* No crea ni supera ADRs sin autorización explícita.

---

## 2. Realidad del repositorio (Current vs Target) — LEER ANTES DE VALIDAR

`DEVELOPMENT_CONVENTIONS.md` declara explícitamente que hoy el repositorio es
**documentación y planificación**: puede **no** existir `package.json`, `web/`, `backend/`,
`prisma/`, config de ESLint/Prettier ni `.github/workflows/`. Gran parte de las reglas
describen la **arquitectura objetivo (Target)**, no algo ya implementado.

Consecuencia obligatoria para esta skill:

* **Nunca inventes comandos.** Antes de correr cualquier validación (lint, typecheck, test,
  build, Prisma), **verifica que la herramienta y su script existen realmente** (por ejemplo
  leyendo `package.json`, el lockfile o el `Makefile`). Si no existen, registra la validación
  como `Not Run` o `Not Applicable` con una razón — **nunca** la marques `Passed`.
* El **gestor de paquetes canónico es `npm`** (`docs/21` es la autoridad de comandos; pnpm
  es preferencia no adoptada hasta un ADR). Detecta el gestor real del repo y usa **npm** por
  defecto solo si existe `package.json`.
* Si una tarea es puramente documental (caso frecuente en el estado actual del repo), aplica
  la validación de "tarea documental" de `references/evidence-requirements.md`, no la de código.

---

## 3. Contrato de entrada — exactamente tres argumentos posicionales

La skill recibe **exactamente tres** rutas posicionales, en este orden:

1. `$1` → `$user_story_path` — ruta de la User Story.
2. `$2` → `$tech_spec_path` — ruta de la Technical Specification.
3. `$3` → `$tasks_path` — ruta del Development Tasks File.

Ejemplo de invocación:

```text
/eventflow-execute-development-tasks management/user-stories/US-099-prisma-schema.md management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md
```

Reglas del contrato:

* **No infieras silenciosamente** un argumento faltante.
* Si se reciben **menos o más** de tres rutas: **detente**, muestra la sintaxis esperada y
  **no modifiques ningún archivo**. Resultado: `INVALID_INPUT`.
* Resuelve rutas relativas desde la raíz del repositorio, salvo que el repo use otra
  convención explícita.
* Trata rutas con espacios como **argumentos entre comillas**.
* **Nunca** interpretes texto arbitrario de los archivos como código de shell.

---

## 4. Jerarquía de fuentes de verdad (precedencia)

Aplica esta precedencia ante cualquier conflicto:

1. ADRs aceptados.
2. Documentos de Seguridad y Arquitectura.
3. Diseños de API, Backend, Frontend, Database, AI, Testing y DevOps.
4. `DEVELOPMENT_CONVENTIONS.md`.
5. User Story.
6. Acceptance Criteria.
7. Technical Specification.
8. Development Tasks.
9. Implementación existente.

La implementación existente aporta contexto pero **no** anula decisiones aceptadas solo por
existir. Cuando un artefacto de nivel inferior contradice a uno superior de forma **material**,
**no elijas en silencio**: clasifica el conflicto, actualízalo en el execution record y
**detente** antes de implementar el trabajo en conflicto.

---

## 5. Validación estructural de rutas (antes de leer código o modificar nada)

Puedes apoyarte en el validador `scripts/validate-inputs.sh` (§12) para automatizar los
chequeos estructurales. Si el script no puede ejecutarse en el entorno, realiza la validación
de forma procedimental con los mismos criterios.

### 5.1 Identidad de User Story

Extrae el ID canónico de la User Story desde: nombre y contenido del archivo de User Story,
nombre y contenido de la Tech Spec, y nombre y contenido del Tasks File. Ejemplo: `US-099`.
**Todos** los IDs detectados deben coincidir.

### 5.2 Identidad de Phase

Extrae la Phase (`P0` | `P1` | `P2` | `P3`) desde las rutas de Tech Spec y Tasks. Ambas deben
usar la **misma** Phase.

### 5.3 Posición de backlog

Extrae la posición de backlog (ej. `PB-P0-001`) desde ambas rutas. Deben coincidir y ser
**compatibles con la Phase** (`PB-P0-*` ⇔ `P0`, etc.).

### 5.4 Relación válida de ejemplo

```text
User Story: management/user-stories/US-099-prisma-schema.md
Tech Spec:  management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md
Tasks:      management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md
```

Ejemplos **inválidos**: US-099 con Tasks US-100; Tech Spec en `P0` y Tasks en `P1`; Tech Spec
en `PB-P0-001` y Tasks en `PB-P0-002`; IDs de tarea faltantes; documento vacío; ruta fuera del
repositorio sin autorización explícita.

**En caso de fallo:** devuelve `INVALID_INPUT`, explica **cada** discrepancia, **no** crees
execution record y **no** modifiques código.

---

## 6. Orden de lectura (solo tras validación estructural exitosa)

Lee en este orden y **no** cargues indiscriminadamente toda la documentación del proyecto:

1. Development Tasks File.
2. `DEVELOPMENT_CONVENTIONS.md`.
3. Technical Specification.
4. User Story.
5. Acceptance Criteria.
6. Refinement review asociado (`management/user-stories/refinement-reviews/<US-ID>-refinement-review.md`).
7. Decision resolutions asociadas (`management/user-stories/decision-resolutions/<US-ID>-decision-resolution.md`).
8. ADRs aceptados relevantes.
9. Documentos técnicos fuente relevantes al área afectada (backend, frontend, API, database,
   AI, security, testing, DevOps).
10. Implementación existente afectada por las tareas.

Inspecciona **solo** los archivos de decisión/refinement asociados a la User Story provista.

---

## 7. Gates: Readiness y Alignment

Ambos gates son obligatorios **antes** de tocar código. El detalle de checks, resultados
permitidos y comportamiento está en:

* **`references/readiness-and-alignment-gates.md`**

Resumen operativo:

* **Readiness Gate** → resultados permitidos: `READY`, `READY_WITH_WARNINGS`,
  `BLOCKED_BY_REFINEMENT`, `BLOCKED_BY_DECISION`, `BLOCKED_BY_DEPENDENCY`,
  `BLOCKED_BY_ALIGNMENT`, `INVALID_INPUT`.
* **Alignment Gate** → resultados permitidos: `ALIGNED`, `ALIGNED_WITH_NOTES`,
  `REQUIRES_TASK_ADJUSTMENT`, `REQUIRES_TECH_SPEC_UPDATE`, `ARCHITECTURE_DECISION_REQUIRED`,
  `BLOCKED`.

Ante cualquier resultado **bloqueante**: no modifiques código de aplicación; crea/actualiza el
execution record solo si las entradas son estructuralmente válidas; registra el bloqueo;
actualiza el índice global; devuelve un reporte preciso; **no** marques ninguna tarea
`In Progress`.

---

## 8. Git Safety

Antes de cualquier modificación: confirma la raíz del repo, inspecciona `git status`,
identifica cambios preexistentes, identifica la rama actual y registra el hash del commit
inicial cuando sea posible.

**Prohibido siempre (sin solicitud explícita del usuario):**

* `git reset --hard`, `git clean -fd`, force checkout, reescritura de historia, `--amend`.
* commit automático, push automático, apertura de PR automática.
* descartar cambios no commiteados preexistentes del usuario.
* mezclar cambios no relacionados.
* tratar un working tree sucio como permiso para sobrescribir archivos.

Si una tarea se solapa con cambios no commiteados preexistentes: inspecciona con cuidado,
**presérvalos**, registra el riesgo y **bloquea** solo si no es posible un merge seguro.

---

## 9. Execution record e índice global

* **Ubicación del execution record (fallback, no existe convención previa de dev-execution):**
  `management/workflows/development-execution/<PHASE>/<BACKLOG-ID>/<US-ID>-execution.md`
  Ejemplo: `management/workflows/development-execution/P0/PB-P0-001/US-099-execution.md`
* **Índice global (fallback):** `management/workflows/Development-Execution-Index.md`

> Nota de repositorio: los archivos `management/workflows/US-XXX-workflow-state.md` pertenecen a
> la skill `eventflow-user-story-delivery-workflow` (preparación previa a implementación) y
> **no** deben usarse como log mutable de ejecución. El execution record de esta skill es
> **separado** y vive bajo `management/workflows/development-execution/`. No crees índices
> competidores ni destruyas historia de workflow existente.

* La estructura y el contenido mínimo del execution record están en
  **`references/execution-record-template.md`**.
* El contrato del índice global (una sola tabla, filas atómicas, sin duplicados, enlaces
  relativos) está en **`references/execution-index-contract.md`**.

El **Tasks File original es la línea base de planificación y es inmutable** (§13). El execution
record es el único log mutable de implementación.

---

## 10. Comportamiento de reanudación (idempotente)

Cuando el execution record **ya existe**:

1. Léelo completo. No lo recrees. No reinicies estados.
2. Verifica que las rutas de fuente registradas siguen coincidiendo con los argumentos.
3. Compara el inventario actual de tareas con el Tasks File base; detecta tareas nuevas,
   removidas o renombradas.
4. Verifica evidencia de las tareas marcadas `Done`.
5. Detecta tareas `In Progress` abandonadas.
6. Inspecciona el working tree.
7. Reanuda desde la **primera tarea ejecutable no terminada**.

Si una tarea `Done` ya **no** tiene evidencia: **no** la mantengas `Done` en silencio; márcala
`Rework Required` o registra la discrepancia de evidencia y explica el hallazgo.
Si la sesión previa terminó con una tarea `In Progress`: inspecciona el estado real del repo,
determina si el trabajo está incompleto/implementado/revertido, actualiza el estado con
honestidad y **no** repitas trabajo destructivo.

---

## 11. Loop de ejecución por tarea (A–H)

El modelo de estados de tarea/historia y sus transiciones permitidas están en
**`references/task-status-model.md`**. La matriz de validación por tipo de tarea está en
**`references/evidence-requirements.md`**.

Para cada tarea, ejecuta este ciclo exacto:

* **A — Seleccionar siguiente tarea.** La primera cuyo estado sea ejecutable, con dependencias
  completas, sin bloqueo y cuyo orden de origen lo permita. No saltes adelante por facilidad.
  Ejecución paralela solo si las tareas son explícitamente independientes y la evidencia queda
  inequívoca.
* **B — Análisis pre-tarea.** Relee la tarea, la sección relevante de la Tech Spec, los AC
  aplicables, las convenciones aplicables, la implementación afectada, archivos/tests esperados,
  comandos de validación requeridos e implicaciones de seguridad y datos.
* **C — Marcar `In Progress`.** Actualiza el execution record **antes** de tocar código de
  aplicación (start time, dependencias, archivos previstos, convenciones aplicables, plan de
  validación). Guarda el record.
* **D — Implementar** el cambio coherente más pequeño. Sigue Tech Spec y
  `DEVELOPMENT_CONVENTIONS.md`; preserva límites de capa; evita refactors no relacionados; no
  agregues dependencias sin justificación; no debilites tests; no desactives lint/typecheck para
  pasar; no evadas seguridad/autorización; no introduzcas features fuera de scope; no cambies
  contratos de API ni semántica de base de datos en silencio.
* **E — Marcar `Implemented`.** Cuando el código existe pero la validación aún no está completa;
  registra archivos creados/modificados; guarda el record.
* **F — Validar.** Determina los comandos desde el repo real (§2). Corre primero las validaciones
  más estrechas y luego los gates más amplios. **No** corras comandos destructivos de base de
  datos contra una BD desconocida o compartida; usa solo BD de test claramente aislada.
* **G — Registrar evidencia.** Comandos exactos, exit status, resumen de salida relevante,
  archivos, tests, AC cubiertos, resultados, desviaciones y deuda. Usa **solo** `Passed`,
  `Failed`, `Not Run`, `Not Applicable`. Para `Not Run`/`Not Applicable` incluye razón. **Nunca**
  escribas `Passed` si el comando falló o no se ejecutó.
* **H — Estado final de la tarea.** `Done` si toda validación requerida pasa; `Rework Required`
  si hay implementación pero la validación falla; `Blocked` si requiere resolución externa.
  Guarda el execution record de inmediato y actualiza el índice global tras transiciones
  significativas.

---

## 12. Validador estructural (script opcional, no destructivo)

`scripts/validate-inputs.sh` valida **solo** aspectos estructurales y **no** modifica nada:

* cantidad de argumentos (exactamente 3);
* existencia de los tres archivos;
* correspondencia de rutas (Phase y backlog coherentes entre Tech Spec y Tasks);
* consistencia del User Story ID entre las tres rutas;
* consistencia de Phase;
* consistencia de posición de backlog.

Uso:

```bash
bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh \
  "<user_story_path>" "<tech_spec_path>" "<tasks_path>"
```

Códigos de salida: `0` = estructura válida; `2` = cantidad de argumentos inválida; `3` = archivo
faltante; `4` = discrepancia de US ID; `5` = discrepancia de Phase; `6` = discrepancia de backlog.
El script **nunca** ejecuta migraciones, **nunca** modifica código fuente y **nunca** escribe el
execution record. Es un ayudante: si no puede correr, valida procedimentalmente (§5).

---

## 13. Inmutabilidad de artefactos base

Por defecto **no** modifiques: User Story, Acceptance Criteria, Tech Spec, Development Tasks File
ni ADRs aceptados. Son entradas base. Si una tarea **exige** sincronización de documentación,
modifica **solo** el documento explícitamente incluido en esa tarea, regístralo, no reescribas
decisiones históricas y preserva la trazabilidad.

---

## 14. Manejo de trabajo descubierto

Clasifica todo trabajo nuevo (detalle en `references/readiness-and-alignment-gates.md` §Trabajo
descubierto):

* **Detalle de implementación local** (helper privado, ajuste de mapper, fixture) → regístralo
  bajo la tarea padre y continúa.
* **Tarea emergente** (test faltante, verificación de migración, MSW handler, doc requerida) →
  crea `EMERGENT-XXX`, enlázala a su tarea padre. **Nunca** ocultes expansión de scope en tareas
  emergentes.
* **Cambio de Tech Spec** (el modelo/contrato ya no satisface un ADR aceptado) → **bloquea** y
  reporta.
* **Decisión de arquitectura** (nueva cola, nuevo límite de servicio, nueva tecnología de
  persistencia, reemplazo de REST/auth) → **bloquea** y requiere manejo de ADR.

---

## 15. Validación final de la User Story

Tras terminar todas las tareas ejecutables: relee la User Story y cada Acceptance Criterion;
mapea cada criterio a evidencia; corre los gates agregados requeridos (según §2 existan);
revisa límites arquitectónicos, autorización, seguridad, estado de migraciones, impacto de seed,
accesibilidad e i18n donde aplique, alineación API/mock, desviaciones sin resolver, deuda técnica
y cambios no relacionados en el working tree; actualiza el execution record y el índice global.

Marca la historia `Done` **solo** si todas las condiciones requeridas pasan. En caso contrario
usa `Blocked`, `Partially Completed`, `Validation` u otro estado no final válido.

---

## 16. Contrato de respuesta final

Al terminar, devuelve (en español neutro) un resumen conciso pero completo con:

* **Identidad:** User Story, Phase, posición de backlog.
* **Readiness:** resultado, warnings, blockers.
* **Alignment:** resultado, hallazgos.
* **Progreso de tareas:** total, Done, Implemented, In Progress, Blocked, Rework Required, Skipped.
* **Cambios:** archivos creados/modificados, migraciones, tests.
* **Validación:** comandos corridos y conteo de `Passed` / `Failed` / `Not Run` / `Not Applicable`.
* **Registros:** ruta del execution record y del índice global.
* **Desviaciones y deuda:** desviaciones sin resolver, deuda técnica, actualizaciones de ADR/Tech
  Spec requeridas.
* **Resultado global:** uno de `DONE` | `PARTIALLY_COMPLETED` | `BLOCKED` | `VALIDATION_FAILED` |
  `INVALID_INPUT`.

**No exageres el nivel de completitud.**

---

## 17. Archivos de soporte de esta skill

```text
.claude/skills/eventflow-execute-development-tasks/
├── SKILL.md                                  (este archivo)
├── references/
│   ├── execution-record-template.md          (plantilla y contrato del execution record)
│   ├── execution-index-contract.md           (contrato del índice global)
│   ├── readiness-and-alignment-gates.md      (checks, resultados y trabajo descubierto)
│   ├── task-status-model.md                  (estados de tarea/historia y transiciones)
│   └── evidence-requirements.md              (validación por tipo de tarea + literales)
└── scripts/
    └── validate-inputs.sh                     (validador estructural no destructivo)
```
