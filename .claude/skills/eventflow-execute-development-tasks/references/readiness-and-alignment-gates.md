# Referencia — Readiness Gate, Alignment Gate y Trabajo Descubierto

> Los literales de resultado (`READY`, `ALIGNED`, etc.) se conservan **verbatim**.

---

## 1. Readiness Gate

Se verifica **antes** de cualquier cambio de código. Revisa:

* User Story existe y es legible.
* El status de la User Story permite implementación (ej. `Approved`, `Approved with Minor Notes`,
  `Ready for Development Tasks: Yes`). Un status de solo refinamiento/borrador **no** habilita.
* Acceptance Criteria existen y son suficientemente testeables.
* Tech Spec existe y es legible (ej. `Ready for Task Breakdown`).
* Tasks File existe y contiene tareas identificables (IDs `TASK-...`).
* `DEVELOPMENT_CONVENTIONS.md` existe y es legible.
* Las dependencias declaradas se comprenden.
* Los predecesores bloqueantes están completos cuando hay evidencia.
* El refinement review no tiene hallazgos bloqueantes sin resolver.
* Las decision resolutions del PO se incorporaron.
* Ninguna decisión técnica abierta bloquea la implementación.
* Ningún execution record existente reporta estado bloqueante.
* La historia pertenece al backlog priorizado (`management/artifacts/4-Product-Backlog-Prioritized.md`).
* Ejecutarla ahora no viola una dependencia dura.

Inspecciona **solo** los archivos de decisión/refinement asociados a la User Story provista.

### Resultados permitidos

| Resultado | Comportamiento |
| --- | --- |
| `READY` | Procede. |
| `READY_WITH_WARNINGS` | Procede **solo** si los warnings no alteran arquitectura, comportamiento de aceptación, seguridad, autorización, integridad de persistencia ni scope. Registra **cada** warning. |
| `BLOCKED_BY_REFINEMENT` | Bloqueante. |
| `BLOCKED_BY_DECISION` | Bloqueante. |
| `BLOCKED_BY_DEPENDENCY` | Bloqueante. |
| `BLOCKED_BY_ALIGNMENT` | Bloqueante. |
| `INVALID_INPUT` | Entrada estructuralmente inválida (§5 de SKILL.md). |

### Comportamiento ante resultado bloqueante

* No modifiques código de aplicación.
* Crea/actualiza el execution record **solo** si las entradas son estructuralmente válidas.
* Registra el blocker (ID, tarea afectada, tipo, descripción, rol responsable, estado).
* Actualiza el índice global.
* Devuelve un reporte preciso.
* **No** marques ninguna tarea `In Progress`.

---

## 2. Alignment Gate

Se ejecuta tras la lectura y **antes** de implementar. Compara los artefactos en cuatro ejes.

### 2.1 Tasks vs Tech Spec

* Cada tarea deriva de la Tech Spec.
* El orden de tareas respeta dependencias.
* Todas las áreas de implementación necesarias están cubiertas.
* Tests incluidos donde se requiere.
* Migraciones incluidas donde se requiere.
* Tareas de documentación/configuración incluidas donde se requiere.
* Ninguna tarea introduce scope no aprobado.
* Ninguna tarea contradice el enfoque diseñado.

### 2.2 Tech Spec vs Development Conventions

Verifica: stack aprobado, organización de carpetas, naming, límites de capa, reglas de API,
reglas de base de datos, reglas de seguridad, expectativas de testing, reglas de DevOps y
Definition of Done.

### 2.3 Tasks vs User Story y Acceptance Criteria

* Cada Acceptance Criterion mapea a ≥ 1 tarea.
* Ningún AC queda huérfano.
* Ninguna tarea carece de justificación funcional o técnica.
* Escenarios negativos y de autorización cubiertos donde sea relevante.
* No se introduce comportamiento fuera de scope.

### 2.4 Tech Spec vs arquitectura aceptada

* Sin contradicción con ADRs.
* Sin sustitución de tecnología no autorizada.
* Sin introducción oculta de microservicio o cola.
* Sin bypass de la autorización del backend.
* Sin atajo de persistencia que filtre Prisma al Domain.
* Sin sustitución por BFF/Server Action en el frontend.
* Sin comportamiento autónomo de IA.

### Resultados permitidos

| Resultado | Significado / acción |
| --- | --- |
| `ALIGNED` | Alineado; procede. |
| `ALIGNED_WITH_NOTES` | Notas menores de implementación; procede registrándolas. |
| `REQUIRES_TASK_ADJUSTMENT` | Faltan subpasos técnicos → conviértelos en tareas emergentes etiquetadas. |
| `REQUIRES_TECH_SPEC_UPDATE` | Conflicto material con la Tech Spec → **bloquea**. |
| `ARCHITECTURE_DECISION_REQUIRED` | Requiere ADR → **bloquea** (no crees ni superes ADR sin autorización). |
| `BLOCKED` | Conflicto de diseño material → **bloquea**. |

Reglas: las notas menores pueden registrarse y la ejecución puede continuar; los subpasos
faltantes pueden volverse tareas emergentes explícitas; los conflictos de diseño materiales
**bloquean**. No reescribas el Tasks File ni la Tech Spec en silencio; no crees/superes un ADR
sin autorización explícita.

---

## 3. Trabajo descubierto (clasificación durante la ejecución)

| Clase | Ejemplos | Acción |
| --- | --- | --- |
| Detalle de implementación local | helper privado, ajuste de mapper, fixture de test | Regístralo bajo la tarea padre y continúa. |
| Tarea emergente | test de integración faltante, verificación de migración, MSW handler requerido, doc requerida | Crea `EMERGENT-XXX` enlazada a su tarea padre. |
| Cambio de Tech Spec | el modelo de datos propuesto ya no satisface un ADR aceptado; contrato de API inconsistente | **Bloquea** y reporta. |
| Decisión de arquitectura | nueva cola, nuevo límite de servicio, nueva persistencia, reemplazo de REST/auth | **Bloquea** y requiere ADR. |

**Nunca** ocultes cambios de arquitectura dentro de tareas emergentes.
