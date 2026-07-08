---
description: Ejecuta las Development Tasks de una User Story de EventFlow usando su User Story, Tech Spec y Tasks File.
argument-hint: "[user-story-path] [tech-spec-path] [tasks-path]"
---

Este comando es un punto de entrada corto para la skill de proyecto
`.claude/skills/eventflow-execute-development-tasks/SKILL.md`, que es la **única fuente de
verdad** del flujo de ejecución. No dupliques ni abrevies el workflow aquí.

## Argumentos (exactamente 3, en este orden)

- `user_story_path = $0` — ruta de la User Story.
- `tech_spec_path = $1` — ruta de la Technical Specification.
- `tasks_path = $2` — ruta del Development Tasks File.

Las rutas con espacios deben pasarse entre comillas.

## Validación de invocación

Verifica que se hayan suministrado **exactamente tres** argumentos (`$0`, `$1`, `$2`, todos
presentes y no vacíos).

Si se suministran **menos o más de tres** argumentos:

- no inspecciones ni modifiques código de aplicación;
- no crees execution records;
- no actualices el índice global;
- muestra la sintaxis esperada y un ejemplo válido;
- detente.

Sintaxis esperada:

```text
/execute-development-tasks <user-story-path> <tech-spec-path> <tasks-path>
```

Ejemplo válido (una sola User Story, una sola Phase, una sola posición de backlog):

```text
/execute-development-tasks management/user-stories/US-099-prisma-schema.md management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md
```

## Comportamiento

Cuando los tres argumentos están presentes:

1. Resuelve las rutas relativas desde la raíz del repositorio.
2. Lee `.claude/skills/eventflow-execute-development-tasks/SKILL.md`.
3. Aplica ese archivo como el **workflow autoritativo**, vinculando:
   - `user_story_path = $0`
   - `tech_spec_path = $1`
   - `tasks_path = $2`
4. Ejecuta el workflow completo hasta terminar, salvo que alcance una condición de bloqueo
   definida por la skill.
5. Preserva **todas** las reglas de la skill: seguridad de Git, readiness gate, alignment gate,
   validación de rutas, ejecución por tarea, creación/reanudación del execution record,
   transiciones de estado, captura de evidencia, actualización del índice global y validación
   final de la User Story.

Como la skill está configurada para invocación manual (`disable-model-invocation: true`), este
comando debe **leer y seguir** las instrucciones de `SKILL.md` directamente, sin depender de la
invocación automática de la skill por el modelo.

No reemplaces la lógica de la skill por una interpretación abreviada. No infieras argumentos
faltantes. No ejecutes una User Story distinta de la suministrada explícitamente.

Devuelve el resultado en español neutro (LATAM), con el contrato de respuesta final definido por
la skill.
