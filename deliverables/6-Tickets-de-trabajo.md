# 6. Tickets de Trabajo

Tickets propuestos para la fase de desarrollo. Pendientes de ejecución.

## Ticket 1

- `Ticket ID:` BE-001
- `Título:` Implementar backend del flujo de planificación asistida por IA
- `Tipo:` Backend
- `Contexto:` El MVP depende de una capa de IA desacoplada que permita generar plan, checklist, presupuesto y brief de cotización sin acoplar la lógica del negocio a un solo proveedor.
- `Objetivo:` Construir los servicios backend, validaciones y persistencia asociadas al uso de `LLMProvider`, `OpenAIProvider` y `MockAIProvider`.
- `Scope:` Endpoints o servicios de generación IA, timeout de 60 segundos, fallback controlado, persistencia en `AIRecommendation`, validación humana previa a persistencia oficial.
- `Requerimientos:` FR-AI-001 a FR-AI-016, BR-AI-001 a BR-AI-010, NFR-REL-001, NFR-AI-004, NFR-AI-007, NFR-AI-008.
- `Criterios de aceptación:`
  1. Toda invocación IA crea un registro `AIRecommendation`.
  2. El sistema corta la espera a los 60.000 ms y maneja error controlado o fallback.
  3. `MockAIProvider` funciona en modo determinista para demo y tests.
  4. Ninguna salida IA se convierte en dato oficial sin confirmación humana.
- `Notas técnicas:` Diseñar factory por `LLM_PROVIDER`; validar JSON de salida contra schemas esperados; incluir `prompt_version_id`, `fallback_used` y `timeout_ms`.
- `Dependencias:` Modelo de datos de `AIRecommendation`; definición de prompts versionados; autenticación y ownership de eventos.
- `Fuera de alcance:` Chatbot libre, moderación IA, generación de imágenes, failover automático a Anthropic funcional.
- `Definición de done:` Servicios implementados, pruebas críticas cubiertas, documentación técnica básica y funcionamiento verificado con proveedor real y mock.

## Ticket 2

- `Ticket ID:` FE-001
- `Título:` Construir frontend del workspace del organizador
- `Tipo:` Frontend
- `Contexto:` El principal valor del MVP está en que un organizador pueda crear un evento, revisar sugerencias IA y avanzar hacia cotizaciones desde una experiencia clara y responsive.
- `Objetivo:` Implementar la experiencia del organizador para wizard de evento, dashboard, revisión de contenido IA y flujo de cotizaciones.
- `Scope:` Formulario de creación de evento, dashboard con progreso, vistas de checklist y presupuesto, badges de contenido IA, generación y edición de brief, comparador de cotizaciones.
- `Requerimientos:` FR-EVENT-001 a FR-EVENT-014, FR-AI-001 a FR-AI-012, FR-QUOTE-001, FR-QUOTE-006, FR-QUOTE-011, FR-QUOTE-012, NFR-USAB-001 a NFR-USAB-006.
- `Criterios de aceptación:`
  1. El wizard crea eventos con todos los campos mínimos requeridos.
  2. Las sugerencias IA se distinguen visualmente y pueden editarse antes de aceptarse.
  3. El dashboard muestra progreso, próximas tareas, presupuesto comprometido y cotizaciones activas.
  4. La comparación de cotizaciones es legible en escritorio y móvil.
- `Notas técnicas:` Respetar responsive web; considerar estados vacíos, loading y error; mostrar disclaimer cuando aplique booking simulado.
- `Dependencias:` Backend de eventos e IA; catálogos de `EventType`, `ServiceCategory`, idioma y moneda; seed data para escenarios demo.
- `Fuera de alcance:` App móvil nativa, colaboración multiusuario, WhatsApp, push notifications.
- `Definición de done:` Flujo navegable en ambiente local/demo, validaciones funcionales visibles y pruebas de UI o E2E para el recorrido principal.

## Ticket 3

- `Ticket ID:` DB-001
- `Título:` Diseñar esquema relacional y seed reproducible del MVP
- `Tipo:` Database
- `Contexto:` El proyecto requiere un modelo consistente que soporte roles, eventos, proveedores, cotizaciones, booking simulado, reseñas, auditoría y escenarios demo reproducibles.
- `Objetivo:` Traducir el Domain Data Model a un esquema físico inicial y a una estrategia seed idempotente para demo, QA y desarrollo.
- `Scope:` Tablas núcleo del dominio, claves primarias y foráneas, enums, restricciones documentadas, campos `is_seed`, datos demo y escenarios obligatorios.
- `Requerimientos:` Modelo de datos del documento 6, FR-SEED-001 en adelante, NFR-DEMO-001 a NFR-DEMO-005, BR-SEED-001 a BR-SEED-010, restricciones de moneda, validez y soft delete.
- `Criterios de aceptación:`
  1. El esquema soporta ownership, auditoría admin y trazabilidad IA.
  2. Se respetan restricciones como moneda inmutable, rating 1 a 5, máximo 5 `QuoteRequest` activas por categoría y 15 días por defecto en `Quote`.
  3. `seed:demo` genera cuentas, eventos, cotizaciones, booking y reseñas sin duplicados al reejecutarse.
  4. Los datos seed se marcan con `is_seed=true`.
- `Notas técnicas:` Considerar soft delete para `Review`, `Attachment`, `ServiceCategory` y `EventType` cuando aplique; mantener catálogos cerrados y escenarios deterministas para `MockAIProvider`.
- `Dependencias:` Definición final del ORM o herramienta de migraciones; estrategia de assets placeholder para portafolio.
- `Fuera de alcance:` Pagos, contratos, integración con calendarios, conversión automática de moneda, datos reales de usuarios.
- `Definición de done:` Esquema migrable, seed documentado, verificación post-seed y cobertura de escenarios demo críticos.
