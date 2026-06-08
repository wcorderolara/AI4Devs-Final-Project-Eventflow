# 1. Descripción general del producto

## 1.1. Objetivo:

EventFlow busca resolver la fragmentación y el estrés que viven las personas que organizan eventos en LATAM cuando deben coordinar tareas, presupuesto y proveedores usando herramientas dispersas como hojas de cálculo, redes sociales y mensajería. El producto está orientado principalmente a organizadores de bodas, XV años, bautizos, baby showers, cumpleaños y eventos corporativos pequeños, con un segmento secundario de proveedores que necesitan un flujo más estructurado para recibir y responder cotizaciones.

La propuesta de valor del MVP es convertir una idea suelta de evento en un plan accionable en pocos minutos mediante asistencia de IA, manteniendo el alcance acotado a un workspace de planificación y a un flujo simplificado de descubrimiento y cotización de proveedores. El MVP no se documenta como marketplace transaccional: no incluye pagos reales, contratos, comisiones, WhatsApp ni chat en tiempo real.

## 1.2. Características y funcionalidades principales:

- Creación de eventos mediante wizard con tipo de evento, fecha, invitados, ciudad, presupuesto estimado, moneda e idioma.
- Generación asistida por IA de plan de evento, checklist, distribución de presupuesto y categorías sugeridas de proveedores.
- Validación humana obligatoria sobre toda salida de IA antes de convertirla en dato oficial del sistema.
- Gestión de checklist con tareas manuales o generadas por IA, estados de avance y fechas relativas al evento.
- Gestión de presupuesto por categorías con visualización de montos planificados y comprometidos.
- Directorio curado de proveedores aprobados con filtros por categoría, ciudad y rango de precio.
- Perfil de proveedor con biografía, portafolio, paquetes o servicios y estado de aprobación administrativa.
- Solicitudes de cotización estructuradas con brief derivado del evento y límite de solicitudes activas por categoría.
- Respuestas de cotización por parte del proveedor, comparación lado a lado y resumen IA opcional.
- Intención de reserva simulada (`BookingIntent`) sin pago real ni firma contractual dentro de la plataforma.
- Reseñas verificadas posteriores al evento y moderación manual por parte del administrador.
- Panel administrativo para aprobación de proveedores, gestión de categorías, lectura de eventos y auditoría básica.
- Soporte multiidioma documentado para `es-LATAM`, `es-ES`, `pt` y `en`.
- Moneda configurable por evento sin conversión automática.
- Datos seed y `MockAIProvider` para demo reproducible, tests y operación en modo controlado.
- Capa de abstracción `LLMProvider` con `OpenAIProvider` como proveedor principal documentado, `MockAIProvider` obligatorio y `AnthropicProvider` preparado como stub futuro.

## 1.3. Diseño y experiencia de usuario:

Pendiente de evidencia visual.

Con base en la documentación existente, la experiencia esperada es la de una aplicación web responsive con branding premium y aspiracional, enfocada en reducir ansiedad y dar claridad operativa. El flujo principal del organizador parte de crear un evento, revisar sugerencias IA, ajustar checklist y presupuesto, explorar proveedores aprobados y avanzar hacia cotizaciones comparables. El proveedor dispone de un portal simple para mantener su perfil y responder briefs estructurados, mientras que el administrador opera un panel de curaduría, moderación y métricas operativas.

No se documentan capturas, mockups ni videotutoriales en el repositorio actual, por lo que esta sección debe completarse cuando exista evidencia visual de la implementación.

## 1.4. Instrucciones de instalación:

Pendiente de implementación.

Pendiente de completar cuando el repositorio esté implementado.

Información que deberá agregarse:
- Requisitos previos.
- Variables de entorno.
- Instalación de dependencias.
- Configuración de base de datos.
- Migraciones.
- Seed data.
- Ejecución local de backend.
- Ejecución local de frontend.
- Ejecución de tests.
