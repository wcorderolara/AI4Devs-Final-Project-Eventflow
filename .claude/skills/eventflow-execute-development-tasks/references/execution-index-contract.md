# Referencia — Contrato del Índice Global de Ejecución

Ruta (fallback, si no existe un índice equivalente):
`management/workflows/Development-Execution-Index.md`

**No** crees índices competidores. El índice **resume**, no duplica, los execution records.

---

## 1. Estructura

Un único documento con una tabla. Cada fila corresponde a **una** User Story ejecutada:

```markdown
# Development Execution Index

| Phase | Backlog ID | US ID | Título | Execution Record | Total | Done | In Progress | Blocked | Rework | Skipped | Estado | Última actualización |
| ----- | ---------- | ----- | ------ | ---------------- | ----: | ---: | ----------: | ------: | -----: | ------: | ------ | -------------------- |
| P0 | PB-P0-001 | US-099 | Prisma schema, migraciones y constraints | [record](development-execution/P0/PB-P0-001/US-099-execution.md) | 12 | 12 | 0 | 0 | 0 | 0 | `Done` | 2026-07-08 |
```

Columnas: Phase · Backlog ID · US ID · Título · enlace al execution record · total de tareas base ·
Done · In Progress · Blocked · Rework Required · Skipped · estado global · última actualización.

---

## 2. Reglas

* Preserva las filas existentes; actualiza **solo** la fila correspondiente, de forma atómica.
* **No** crees filas duplicadas para la misma User Story.
* Usa **enlaces relativos** al execution record.
* Mantén el orden consistente según el backlog priorizado
  (`management/artifacts/4-Product-Backlog-Prioritized.md`): Phase → Backlog ID → posición de la
  historia dentro del item.
* **No** marques historias futuras como completas.
* **No** infieras progreso de otras historias sin leer su execution record.
* Actualiza el índice tras transiciones significativas de estado (§11-H de SKILL.md), no en cada
  lectura de archivo.
* Si el archivo de índice aún no existe, créalo con el encabezado de la tabla y la primera fila.
