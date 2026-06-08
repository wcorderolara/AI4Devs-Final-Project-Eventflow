# 5. Historias de Usuario

Historias de usuario propuestas a partir del FRD y Use Cases. Pendientes de validación durante la fase de desarrollo.

## Historia de Usuario 1

- `ID:` HU-001
- `Título:` Crear evento y obtener plan inicial con IA
- `Historia:` Como organizador, quiero crear un evento y generar un plan inicial con IA para saber por dónde empezar y convertir una idea suelta en un plan accionable.
- `Valor de negocio:` Reduce la fricción inicial, demuestra el principal diferenciador de EventFlow y acelera el tiempo hasta el primer valor.
- `Criterios de aceptación:`
  1. El organizador puede crear un evento con tipo, fecha, invitados, ciudad, presupuesto, moneda e idioma.
  2. El sistema genera un plan IA con timeline y categorías sugeridas sin convertirlo en dato oficial automáticamente.
  3. La salida IA se muestra como sugerencia editable y solo se confirma tras acción explícita del usuario.
  4. El sistema registra la recomendación en `AIRecommendation` con proveedor, prompt versionado y estado `accepted=false` por defecto.
- `Caso de uso relacionado:` UC-EVENT-001, UC-AI-001
- `Requerimientos FRD relacionados:` FR-EVENT-001, FR-EVENT-002, FR-EVENT-003, FR-AI-001, FR-AI-009, FR-AI-010, FR-AI-012
- `Prioridad:` Must Have

## Historia de Usuario 2

- `ID:` HU-002
- `Título:` Solicitar y comparar cotizaciones
- `Historia:` Como organizador, quiero enviar solicitudes de cotización estructuradas y comparar respuestas lado a lado para tomar una decisión informada sin depender de conversaciones dispersas.
- `Valor de negocio:` Estandariza el flujo con proveedores, mejora la toma de decisiones y mantiene el MVP dentro del scope de cotización simplificada.
- `Criterios de aceptación:`
  1. El organizador puede generar o editar un brief y enviar una `QuoteRequest` a un proveedor aprobado desde un evento activo.
  2. El sistema impide superar el límite de 5 solicitudes activas por categoría y evento.
  3. Las cotizaciones recibidas se pueden visualizar y comparar lado a lado.
  4. El organizador puede marcar una cotización preferida y decidir si la acepta o rechaza.
  5. El resumen IA del comparador, si se usa, no altera los datos originales de las cotizaciones.
- `Caso de uso relacionado:` UC-AI-005, UC-QUOTE-001, UC-QUOTE-006, UC-QUOTE-007
- `Requerimientos FRD relacionados:` FR-AI-005, FR-AI-006, FR-QUOTE-001, FR-QUOTE-002, FR-QUOTE-006, FR-QUOTE-011, FR-QUOTE-012
- `Prioridad:` Must Have

## Historia de Usuario 3

- `ID:` HU-003
- `Título:` Responder cotización como proveedor
- `Historia:` Como proveedor, quiero recibir briefs estructurados y responder con una cotización clara y vigente para ahorrar tiempo y atender leads con mejor contexto.
- `Valor de negocio:` Mejora la calidad operativa del proveedor, completa el flujo bilateral del MVP y facilita la demostración end-to-end.
- `Criterios de aceptación:`
  1. El proveedor solo puede ver `QuoteRequest` dirigidas a su propio perfil.
  2. El proveedor puede crear una `Quote` en borrador y enviarla con total, desglose y condiciones.
  3. Si no define `valid_until`, el sistema asigna 15 días calendario por defecto.
  4. Una cotización enviada no puede editarse como si siguiera en borrador.
  5. El proveedor recibe notificación si su cotización es rechazada o expira.
- `Caso de uso relacionado:` UC-QUOTE-004, UC-QUOTE-005, UC-QUOTE-010
- `Requerimientos FRD relacionados:` FR-QUOTE-004, FR-QUOTE-005, FR-QUOTE-009, FR-QUOTE-010, FR-AUTH-009
- `Prioridad:` Must Have
