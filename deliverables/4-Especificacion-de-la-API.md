# 4. Especificación de la API

Pendiente de implementación.

Propuesta preliminar pendiente de validación técnica.

La documentación disponible no incluye contratos API finales implementados. Para respetar el alcance del MVP y el límite de hasta 3 endpoints, se proponen a continuación tres endpoints derivados del FRD y de los casos de uso principales. Deben tratarse como borrador funcional, no como contrato definitivo.

```yaml
openapi: 3.1.0
info:
  title: EventFlow API
  version: "0.1.0-preliminar"
  description: >
    Propuesta preliminar derivada de la documentación de Planning y Analysis.
servers:
  - url: https://api.eventflow.local
paths:
  /events:
    post:
      summary: Crear un evento
      description: Crea un evento propiedad del organizador autenticado.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - eventTypeCode
                - eventDate
                - guestsCount
                - city
                - countryCode
                - estimatedBudget
                - currencyCode
                - languageCode
              properties:
                eventTypeCode:
                  type: string
                  enum: [wedding, xv, baptism, baby_shower, birthday, corporate]
                eventDate:
                  type: string
                  format: date
                guestsCount:
                  type: integer
                  minimum: 1
                city:
                  type: string
                countryCode:
                  type: string
                estimatedBudget:
                  type: number
                currencyCode:
                  type: string
                  enum: [GTQ, USD, EUR, MXN, COP]
                languageCode:
                  type: string
                  enum: [es-LATAM, es-ES, pt, en]
      responses:
        "201":
          description: Evento creado en estado draft.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [draft]
                  ownerId:
                    type: string
                    format: uuid
        "400":
          description: Datos inválidos.
        "401":
          description: Usuario no autenticado.
        "403":
          description: Rol no autorizado.

  /events/{eventId}/ai/event-plan:
    post:
      summary: Generar plan de evento con IA
      description: Genera un plan preliminar del evento usando la capa LLMProvider.
      parameters:
        - in: path
          name: eventId
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Sugerencia IA generada y almacenada como AIRecommendation.
          content:
            application/json:
              schema:
                type: object
                properties:
                  recommendationId:
                    type: string
                    format: uuid
                  type:
                    type: string
                    enum: [event_plan]
                  accepted:
                    type: boolean
                    example: false
                  fallbackUsed:
                    type: boolean
                  output:
                    type: object
                    additionalProperties: true
        "401":
          description: Usuario no autenticado.
        "403":
          description: El evento no pertenece al usuario o el rol no aplica.
        "404":
          description: Evento no encontrado.
        "408":
          description: Timeout de IA o degradación controlada.

  /quote-requests:
    post:
      summary: Crear solicitud de cotización
      description: Envía una solicitud estructurada de cotización a un proveedor aprobado.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - eventId
                - vendorProfileId
                - serviceCategoryId
                - brief
              properties:
                eventId:
                  type: string
                  format: uuid
                vendorProfileId:
                  type: string
                  format: uuid
                serviceCategoryId:
                  type: string
                  format: uuid
                brief:
                  type: string
                aiGeneratedBrief:
                  type: boolean
                  default: false
      responses:
        "201":
          description: Solicitud creada con estado sent.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [sent]
                  eventId:
                    type: string
                    format: uuid
                  vendorProfileId:
                    type: string
                    format: uuid
        "400":
          description: Datos inválidos o límite excedido.
        "401":
          description: Usuario no autenticado.
        "403":
          description: El usuario no es owner del evento o el proveedor no es visible.
        "409":
          description: Ya existe una solicitud activa para el mismo evento y proveedor.
```
