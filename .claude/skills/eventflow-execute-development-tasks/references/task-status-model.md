# Referencia — Modelo de estados de Tarea e Historia

> Todos los literales de estado se conservan **verbatim** (no se traducen).

---

## 1. Estados de tarea

* `Not Started` — no ha comenzado implementación.
* `In Progress` — el record fue actualizado y la implementación está activa.
* `Implemented` — el cambio de código/config/documentación existe, pero la validación completa
  aún no pasó.
* `Blocked` — la ejecución no puede continuar de forma segura.
* `Rework Required` — la validación encontró un problema de implementación.
* `Done` — implementación + validación requerida + evidencia + chequeo de AC pasaron.
* `Skipped` — la tarea no se ejecutará y tiene justificación formal.

Una tarea requerida en `Skipped` normalmente **impide** la finalización de la User Story.

---

## 2. Transiciones permitidas

```text
Not Started → In Progress
Not Started → Skipped
In Progress → Implemented
In Progress → Blocked
Implemented → Done
Implemented → Rework Required
Rework Required → In Progress
Blocked → In Progress
```

### Transiciones NO permitidas sin documentación explícita de recuperación

```text
Not Started → Done
Blocked → Done
Skipped → Done
In Progress → Done
```

Toda transición hacia `Done` debe pasar por `Implemented` y por validación con evidencia real.
Si por recuperación excepcional se requiere una transición no permitida, documenta el motivo,
la evidencia recuperada y el chequeo de AC en el execution record antes de aplicarla.

---

## 3. Estados de ejecución de la User Story (Story execution status)

* `Initialized`
* `Ready`
* `In Progress`
* `Blocked`
* `Validation`
* `Done`
* `Partially Completed`
* `Cancelled`

### La User Story NO puede pasar a `Done` mientras

* haya tareas requeridas sin terminar;
* haya tareas requeridas bloqueadas;
* haya tareas requeridas en `Skipped` sin justificación aceptada;
* queden Acceptance Criteria sin cubrir;
* falle una validación requerida;
* queden desviaciones materiales sin resolver.

---

## 4. Resultado global de la ejecución (respuesta final)

Uno de: `DONE` | `PARTIALLY_COMPLETED` | `BLOCKED` | `VALIDATION_FAILED` | `INVALID_INPUT`.
No exageres el nivel de completitud: si cualquier condición de §3 no se cumple, el resultado
global **no** puede ser `DONE`.
