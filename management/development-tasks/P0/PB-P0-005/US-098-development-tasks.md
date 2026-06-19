# Development Tasks — PB-P0-005 / US-098: Generar snapshot OpenAPI automatizado

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-098 |
| Source User Story | management/user-stories/US-098-openapi-snapshot.md |
| Source Technical Specification | management/technical-specs/P0/PB-P0-005/US-098-technical-spec.md |
| Decision Resolution Artifact | management/user-stories/decision-resolutions/US-098-decision-resolution.md |
| Priority | P0 |
| Backlog ID | PB-P0-005 |
| Backlog Title | OpenAPI Snapshot desde Zod |
| Backlog Execution Order | 5 |
| User Story Position in Backlog Item | 1 of 1 |
| Related User Stories in Backlog Item | US-098 |
| Epic | EPIC-API-001 |
| Backlog Item Dependencies | PB-P0-004 |
| Feature | OpenAPI Snapshot |
| Module / Domain | API / Platform |
| Backlog Alignment Status | Found |
| Task Breakdown Status | Ready for Sprint Planning |
| Created Date | 2026-06-15 |
| Last Updated | 2026-06-15 |

---

## 2. Source Validation

| Source | Found | Used | Notes |
|---|---|---|---|
| User Story | Yes | Yes | US-098 está Approved y Ready for Development Tasks. |
| Technical Specification | Yes | Yes | Fuente primaria; status `Ready for Task Breakdown`. |
| Decision Resolution Artifact | Yes | Yes | Formaliza `backend/openapi.json` como snapshot canónico. |
| Product Backlog Prioritized | Yes | Yes | PB-P0-005 encontrado en P0 execution order 5. |
| ADRs | Yes | Yes | ADR-ARCH-003, ADR-API-001..004, ADR-TEST-001 y ADR-DEVOPS-006 usados vía spec. |

---

## 3. Backlog Execution Context

### Parent Backlog Item

**PB-P0-005 — OpenAPI Snapshot desde Zod**

Generar especificación OpenAPI 3.x desde schemas Zod usando `zod-to-openapi` o equivalente. El snapshot debe estar versionado, validado en CI y servir como fuente verificable para frontend, MSW y pruebas contractuales.

### Execution Order Rationale

US-098 se ejecuta después de PB-P0-004 porque el snapshot OpenAPI debe reflejar endpoints, DTOs, envelopes y security metadata ya definidos por US-094, US-095, US-096 y US-097. Las tareas no deben crear endpoints nuevos ni reabrir decisiones canónicas de esas historias.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-098 | Generar, versionar y validar el snapshot OpenAPI canónico desde Zod | 1 |

---

## 4. Task Breakdown Summary

| Area | Number of Tasks | Notes |
|---|---:|---|
| Product / Analysis | 1 | Confirmar contratos disponibles y límites de PB-P0-005. |
| Backend | 3 | Setup tooling, registry/generator y docs local. |
| API Contract | 3 | Components comunes, route metadata y snapshot canónico. |
| Security / Authorization | 1 | Security schemes y escaneo de secretos/PII. |
| DevOps / Environment | 1 | CI gate generate/lint/diff. |
| Observability / Audit | 1 | Logs técnicos de generación sin secretos. |
| QA / Testing | 4 | Tests de generación, determinismo, lint/diff y security metadata. |
| Documentation / Traceability | 2 | README y alignment note JSON/YAML. |
| **Total** | **16** | |

---

## 5. Traceability Matrix

| Acceptance Criterion | Technical Spec Section | Task IDs |
|---|---|---|
| AC-01 Generación determinista de `openapi.json` | §7 Backend Technical Design, §13 Testing Strategy, §18 Implementation Guidance | TASK-PB-P0-005-US-098-BE-001, TASK-PB-P0-005-US-098-BE-002, TASK-PB-P0-005-US-098-API-003, TASK-PB-P0-005-US-098-QA-002 |
| AC-02 Snapshot versionado como contrato canónico | §3 Executive Summary, §12 Sensitive Data Handling, §16 Documentation Alignment | TASK-PB-P0-005-US-098-API-003, TASK-PB-P0-005-US-098-SEC-001, TASK-PB-P0-005-US-098-DOC-002 |
| AC-03 CI detecta drift entre código y snapshot | §13 CI Checks, §18 Implementation Guidance, §19 Task Generation Notes | TASK-PB-P0-005-US-098-OPS-001, TASK-PB-P0-005-US-098-QA-003 |
| AC-04 Componentes compartidos reflejan contrato base | §7 DTOs / Schemas, §9 API Contract Design | TASK-PB-P0-005-US-098-API-001, TASK-PB-P0-005-US-098-QA-001 |
| AC-05 Security schemes y rutas `/api/v1` documentadas | §12 Security & Authorization Design, §13 Security Tests | TASK-PB-P0-005-US-098-API-002, TASK-PB-P0-005-US-098-SEC-001, TASK-PB-P0-005-US-098-QA-004 |
| AC-06 Documentación local accesible | §8 Frontend Technical Design, §18 Implementation Guidance, §19 Documentation tasks | TASK-PB-P0-005-US-098-BE-003, TASK-PB-P0-005-US-098-DOC-001 |
| EC-01 Schema Zod no convertible | §7 Error Handling, §17 Risks | TASK-PB-P0-005-US-098-BE-002, TASK-PB-P0-005-US-098-QA-001 |
| EC-02 Diff contractual no comprometido | §13 CI Checks, §17 Risks | TASK-PB-P0-005-US-098-OPS-001, TASK-PB-P0-005-US-098-QA-003 |
| EC-03 Metadata OpenAPI incompleta | §7 Validation Rules, §12 Negative Authorization Scenarios | TASK-PB-P0-005-US-098-API-002, TASK-PB-P0-005-US-098-QA-004 |

---

## 6. Development Tasks

### TASK-PB-P0-005-US-098-PO-001 — Confirmar fuentes contractuales y límites de snapshot

| Field | Value |
|---|---|
| Area | Product / Analysis |
| Type | Review |
| Priority | Must |
| Estimate | XS |
| Depends On | PB-P0-004 |
| Source AC(s) | AC-01, AC-05 |
| Technical Spec Section(s) | §2 Backlog Execution Context, §4 Scope Boundary, §16 Documentation Alignment Required |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Confirmar que el snapshot de US-098 se genera únicamente sobre contratos MVP ya aprobados y que no reabre decisiones de rutas, endpoints o formato de artefacto.

#### Scope

##### Include

- Verificar que PB-P0-004 y US-094 a US-097 son las fuentes de endpoints iniciales.
- Confirmar que `backend/openapi.json` es el artefacto canónico.
- Confirmar que YAML, Swagger UI o Redoc son derivados.
- Confirmar out-of-scope: endpoints nuevos, SDKs de producción, portal público y contratos manuales paralelos.

##### Exclude

- No implementar código.
- No modificar Doc 16.
- No reabrir decisiones de endpoint de historias previas.

#### Implementation Notes

Usar `US-098-decision-resolution.md` como fuente para cerrar la discusión `openapi.json` vs `openapi.yaml`.

#### Acceptance Criteria Covered

AC-01, AC-05.

#### Definition of Done

- [ ] Fuentes contractuales de endpoints confirmadas.
- [ ] Decisión `backend/openapi.json` documentada en el handoff técnico.
- [ ] Scope boundaries confirmados.

---

### TASK-PB-P0-005-US-098-BE-001 — Instalar y configurar tooling OpenAPI desde Zod

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-005-US-098-PO-001 |
| Source AC(s) | AC-01 |
| Technical Spec Section(s) | §5 Backend Architecture, §7 Backend Technical Design, §18 Implementation Guidance |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Configurar `zod-to-openapi`, `@asteasolutions/zod-to-openapi` o herramienta equivalente para generar OpenAPI 3.x desde schemas Zod.

#### Scope

##### Include

- Agregar dependencia de generación OpenAPI.
- Crear estructura técnica para tooling, por ejemplo `backend/src/shared/interface/openapi/` o equivalente.
- Definir scripts base `openapi:generate`, `openapi:lint`, `openapi:check` y `openapi:docs` en el package correspondiente.
- Asegurar que la generación no requiere servidor levantado ni base de datos.

##### Exclude

- No crear endpoints runtime.
- No escribir manualmente el snapshot como fuente principal.
- No agregar dependencias runtime innecesarias si el tooling puede ser dev/build-time.

#### Implementation Notes

Preservar compatibilidad con CI sin servicios externos. La herramienta elegida debe soportar OpenAPI 3.x y schemas Zod estrictos.

#### Acceptance Criteria Covered

AC-01.

#### Definition of Done

- [ ] Tooling OpenAPI instalado/configurado.
- [ ] Estructura de generación creada.
- [ ] Scripts npm base definidos.
- [ ] Generación ejecutable sin servidor ni DB.

---

### TASK-PB-P0-005-US-098-API-001 — Registrar componentes comunes del contrato OpenAPI

| Field | Value |
|---|---|
| Area | API Contract |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-BE-001 |
| Source AC(s) | AC-01, AC-04 |
| Technical Spec Section(s) | §5 API Architecture, §7 DTOs / Schemas, §9 API Contract Design |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Crear el registry de componentes OpenAPI compartidos para envelopes, errores, paginación, correlation ID y security schemes.

#### Scope

##### Include

- `ErrorEnvelope`.
- Success envelope.
- `ListResponse` / pagination.
- `X-Correlation-Id` / `correlationId` metadata.
- Error responses 400, 401, 403, 404, 409, 422, 429 y 500 cuando aplique.
- `cookieAuth` conforme a Doc 16 §43.

##### Exclude

- No cambiar implementación runtime de envelopes.
- No redefinir reglas de error de US-093.

#### Implementation Notes

Componentes compartidos deben registrarse antes de route metadata para que las operaciones puedan referenciarlos por `$ref`.

#### Acceptance Criteria Covered

AC-01, AC-04.

#### Definition of Done

- [ ] Componentes comunes registrados.
- [ ] `cookieAuth` registrado.
- [ ] Error responses estándar disponibles por `$ref`.
- [ ] Correlation ID documentado en envelopes aplicables.

---

### TASK-PB-P0-005-US-098-API-002 — Anotar schemas y operaciones MVP con metadata OpenAPI

| Field | Value |
|---|---|
| Area | API Contract |
| Type | Implementation |
| Priority | Must |
| Estimate | L |
| Depends On | TASK-PB-P0-005-US-098-API-001 |
| Source AC(s) | AC-01, AC-04, AC-05 |
| Technical Spec Section(s) | §7 DTOs / Schemas, §9 API Contract Design, §12 Security & Authorization Design |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Agregar metadata OpenAPI a schemas Zod y operaciones MVP existentes para que el generador pueda producir paths, tags, operationIds, requests, responses y security metadata.

#### Scope

##### Include

- Anotar schemas Zod existentes con `.openapi(...)` o helper equivalente.
- Registrar operaciones de US-094, US-095, US-096 y US-097 bajo `/api/v1`.
- Agregar `operationId` con convención `verbResource`.
- Agregar tags por módulo.
- Declarar `security` para endpoints protegidos.
- Marcar endpoints públicos cuando aplique.

##### Exclude

- No cambiar semántica de DTOs salvo metadata documental.
- No crear endpoints faltantes.
- No agregar endpoints fuera de PB-P0-004.

#### Implementation Notes

Si una ruta aprobada tiene conflicto documental con docs anteriores, seguir la historia aprobada o decision resolution correspondiente y dejar nota, sin reabrir decisiones.

#### Acceptance Criteria Covered

AC-01, AC-04, AC-05.

#### Definition of Done

- [ ] Operaciones MVP registradas bajo `/api/v1`.
- [ ] Schemas request/response referenciados.
- [ ] `operationId` y tags definidos.
- [ ] Endpoints protegidos tienen `cookieAuth`.
- [ ] No se agregan endpoints fuera de scope.

---

### TASK-PB-P0-005-US-098-BE-002 — Implementar generador determinista de `backend/openapi.json`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-API-002 |
| Source AC(s) | AC-01, EC-01 |
| Technical Spec Section(s) | §7 Use Cases / Application Services, §7 Error Handling, §17 Technical Risks & Mitigations |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar el script de generación que produce `backend/openapi.json` de manera determinista y fail-fast ante schemas no convertibles.

#### Scope

##### Include

- Implementar `generateOpenApiSpec` o equivalente.
- Ordenar/normalizar salida para evitar diffs falsos.
- Evitar timestamps, paths locales o datos environment-specific.
- Fallar con exit code no cero ante schema/ruta inválida.
- Reportar schema/ruta/operación afectada.
- Evitar sobrescribir snapshot válido con output incompleto.

##### Exclude

- No generar YAML como artefacto canónico.
- No depender de base de datos ni servidor corriendo.

#### Implementation Notes

El output debe ser estable para ejecución local y CI. Si la herramienta no ordena determinísticamente, agregar normalización antes de escribir el archivo.

#### Acceptance Criteria Covered

AC-01, EC-01.

#### Definition of Done

- [ ] `openapi:generate` produce `backend/openapi.json`.
- [ ] Dos ejecuciones sin cambios no generan diff.
- [ ] Errores de conversión son accionables.
- [ ] No se escribe output parcial ante fallo.

---

### TASK-PB-P0-005-US-098-API-003 — Versionar snapshot canónico `backend/openapi.json`

| Field | Value |
|---|---|
| Area | API Contract |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-005-US-098-BE-002 |
| Source AC(s) | AC-01, AC-02 |
| Technical Spec Section(s) | §3 Executive Technical Summary, §4 Scope Boundary, §16 Documentation Alignment Required |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Generar y comprometer el snapshot canónico `backend/openapi.json` como artefacto versionado del contrato REST MVP.

#### Scope

##### Include

- Ejecutar generación completa.
- Revisar que `backend/openapi.json` contiene `info`, `servers`, `tags`, `paths`, `components.schemas`, `components.responses` y `components.securitySchemes`.
- Confirmar que todos los paths usan `/api/v1`.
- Confirmar que YAML/UI, si existen, son derivados.

##### Exclude

- No crear `openapi.yaml` como fuente paralela.
- No editar manualmente el snapshot para introducir paths no generados.

#### Implementation Notes

El snapshot versionado debe ser producto del generador. Cambios manuales solo son aceptables si se reflejan en la fuente generadora.

#### Acceptance Criteria Covered

AC-01, AC-02.

#### Definition of Done

- [ ] `backend/openapi.json` existe y está versionado.
- [ ] El archivo es generado, no fuente manual paralela.
- [ ] Contiene secciones OpenAPI requeridas.
- [ ] Todos los paths usan `/api/v1`.

---

### TASK-PB-P0-005-US-098-SEC-001 — Agregar checks de seguridad documental del snapshot

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-API-003 |
| Source AC(s) | AC-02, AC-05 |
| Technical Spec Section(s) | §12 Security & Authorization Design, §13 Security Tests, §17 Technical Risks & Mitigations |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Security / Backend |
| Status | To Do |

#### Objective

Prevenir exposición de secretos/PII y asegurar que la documentación OpenAPI representa correctamente security schemes y respuestas de autorización.

#### Scope

##### Include

- Check automatizado o script de inspección para API keys, cookies, tokens, session IDs y PII evidente.
- Verificación de que endpoints protegidos tienen `cookieAuth`.
- Verificación de respuestas 401/403 para endpoints protegidos.
- Verificación de que endpoints públicos se documentan explícitamente como públicos cuando aplique.

##### Exclude

- No implementar runtime authorization.
- No cambiar políticas RBAC/ownership de endpoints existentes.

#### Implementation Notes

El check puede ejecutarse como parte de `openapi:check` o como script separado invocado por CI.

#### Acceptance Criteria Covered

AC-02, AC-05.

#### Definition of Done

- [ ] Snapshot no contiene secretos/PII obvios.
- [ ] Endpoints protegidos tienen security metadata.
- [ ] 401/403 documentados donde aplica.
- [ ] Check falla con mensaje claro ante incumplimiento.

---

### TASK-PB-P0-005-US-098-BE-003 — Habilitar documentación local/demo desde snapshot generado

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Should |
| Estimate | S |
| Depends On | TASK-PB-P0-005-US-098-API-003 |
| Source AC(s) | AC-06 |
| Technical Spec Section(s) | §8 Frontend Technical Design, §15 Seed / Demo Data Impact, §18 Implementation Guidance |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Agregar un comando local/demo para visualizar el contrato OpenAPI mediante Swagger UI, Redoc o herramienta equivalente usando `backend/openapi.json`.

#### Scope

##### Include

- Implementar `openapi:docs` o comando equivalente.
- Asegurar que la UI consume `backend/openapi.json`.
- Mostrar mensaje claro si el snapshot no existe.
- Mantener el tooling fuera de rutas de producto.

##### Exclude

- No implementar portal público.
- No crear ruta Next.js de producto.
- No mantener definición OpenAPI manual paralela.

#### Implementation Notes

La documentación local/demo puede ser estática o dev-only; no debe formar parte de la superficie pública MVP salvo decisión futura.

#### Acceptance Criteria Covered

AC-06.

#### Definition of Done

- [ ] Comando de docs local/demo disponible.
- [ ] Consume `backend/openapi.json`.
- [ ] Falla con instrucción clara si falta snapshot.
- [ ] No introduce UI de producto.

---

### TASK-PB-P0-005-US-098-OPS-001 — Integrar OpenAPI check en GitHub Actions

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-SEC-001 |
| Source AC(s) | AC-03, EC-02 |
| Technical Spec Section(s) | §13 CI Checks, §18 Implementation Guidance, §19 Task Generation Notes |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | DevOps / Backend |
| Status | To Do |

#### Objective

Agregar el gate de OpenAPI al pipeline de CI para bloquear drift contractual o spec inválida.

#### Scope

##### Include

- Ejecutar generación en CI.
- Ejecutar lint/validación (`redocly lint` o equivalente).
- Ejecutar diff contra `backend/openapi.json`.
- Ejecutar security/documentation checks definidos.
- Mostrar instrucción clara para regenerar y commitear snapshot.

##### Exclude

- No auto-commitear cambios desde CI.
- No desplegar documentación pública.

#### Implementation Notes

El gate debe correr en PR y main según patrón de quality gates. Si falla, el merge/deploy queda bloqueado.

#### Acceptance Criteria Covered

AC-03, EC-02.

#### Definition of Done

- [ ] CI ejecuta `openapi:check` o pasos equivalentes.
- [ ] Drift contractual falla el pipeline.
- [ ] Spec inválida falla el pipeline.
- [ ] Mensaje de error indica regenerar y commitear snapshot.

---

### TASK-PB-P0-005-US-098-OBS-001 — Estandarizar logs técnicos de generación OpenAPI

| Field | Value |
|---|---|
| Area | Observability / Audit |
| Type | Implementation |
| Priority | Should |
| Estimate | XS |
| Depends On | TASK-PB-P0-005-US-098-BE-002 |
| Source AC(s) | AC-01, EC-01 |
| Technical Spec Section(s) | §7 Observability, §14 Observability & Audit |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Emitir logs técnicos útiles durante generación/lint/check sin exponer datos sensibles.

#### Scope

##### Include

- Log de inicio y fin de generación.
- Path de output generado.
- Conteo de paths/schemas si está disponible.
- Resultado de lint/check.
- Error accionable para schema/ruta inválida.

##### Exclude

- No crear métricas runtime.
- No crear `AdminAction`.
- No loggear payloads sensibles ni secrets.

#### Implementation Notes

Los logs deben funcionar localmente y en CI. Mantener salida concisa.

#### Acceptance Criteria Covered

AC-01, EC-01.

#### Definition of Done

- [ ] Logs técnicos agregados.
- [ ] Fallos muestran contexto accionable.
- [ ] No se imprimen secrets/PII.

---

### TASK-PB-P0-005-US-098-QA-001 — Probar generación válida y schemas no convertibles

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-BE-002, TASK-PB-P0-005-US-098-API-001 |
| Source AC(s) | AC-01, AC-04, EC-01 |
| Technical Spec Section(s) | §13 Unit Tests, §13 Integration Tests, §17 Technical Risks & Mitigations |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | QA / Backend |
| Status | To Do |

#### Objective

Validar que la generación produce una spec OpenAPI 3.x parseable y que fallos de schema no convertible son controlados.

#### Scope

##### Include

- Test de generación completa parseable.
- Test de componentes comunes presentes.
- Test de error controlado ante schema/ruta inválida, si puede simularse con fixture.
- Verificación de no sobrescritura con output incompleto cuando falla.

##### Exclude

- No testear endpoints runtime nuevos.
- No depender de servicios externos.

#### Implementation Notes

Usar Vitest o script de test equivalente según patrón del repo.

#### Acceptance Criteria Covered

AC-01, AC-04, EC-01.

#### Definition of Done

- [ ] Test de generación verde.
- [ ] Test de componentes comunes verde.
- [ ] Caso negativo de schema inválido cubierto o justificado.
- [ ] Tests no requieren DB ni network externa.

---

### TASK-PB-P0-005-US-098-QA-002 — Probar determinismo del snapshot OpenAPI

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-005-US-098-BE-002 |
| Source AC(s) | AC-01 |
| Technical Spec Section(s) | §13 Integration Tests, §17 Technical Risks & Mitigations |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | QA / Backend |
| Status | To Do |

#### Objective

Verificar que dos ejecuciones consecutivas sin cambios producen el mismo `backend/openapi.json`.

#### Scope

##### Include

- Ejecutar generación dos veces.
- Comparar output normalizado o archivo resultante.
- Fallar ante timestamps, orden variable o paths locales.

##### Exclude

- No validar semántica completa de cada endpoint en esta tarea.

#### Implementation Notes

Este test protege contra diffs falsos en CI.

#### Acceptance Criteria Covered

AC-01.

#### Definition of Done

- [ ] Test de determinismo agregado.
- [ ] Falla ante output no estable.
- [ ] No depende de timezone/local path.

---

### TASK-PB-P0-005-US-098-QA-003 — Probar drift detection y lint en CI

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-OPS-001 |
| Source AC(s) | AC-03, EC-02 |
| Technical Spec Section(s) | §13 CI Checks, §19 Task Generation Notes |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | QA / DevOps |
| Status | To Do |

#### Objective

Validar que el pipeline detecta specs inválidas y diffs contractuales no comprometidos.

#### Scope

##### Include

- Verificar que `openapi:lint` falla con spec inválida.
- Verificar que `openapi:check` falla cuando el snapshot generado difiere del versionado.
- Verificar que el mensaje de error indica regenerar y commitear snapshot.

##### Exclude

- No auto-commitear cambios desde CI.

#### Implementation Notes

Puede validarse con scripts locales equivalentes y revisión del workflow si no se ejecuta CI real en el entorno local.

#### Acceptance Criteria Covered

AC-03, EC-02.

#### Definition of Done

- [ ] Lint inválido falla.
- [ ] Drift falla.
- [ ] Mensaje de remediación claro.
- [ ] Workflow documentado/revisado.

---

### TASK-PB-P0-005-US-098-QA-004 — Probar security metadata y ausencia de secretos/PII

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-005-US-098-SEC-001 |
| Source AC(s) | AC-02, AC-05, EC-03 |
| Technical Spec Section(s) | §12 Negative Authorization Scenarios, §13 Security Tests |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | QA / Security |
| Status | To Do |

#### Objective

Validar que el snapshot no expone datos sensibles y que endpoints protegidos tienen metadata de autorización suficiente.

#### Scope

##### Include

- Test/check para secretos, tokens, cookies, session IDs y PII evidente.
- Check de `cookieAuth` en endpoints protegidos.
- Check de respuestas 401/403 en endpoints protegidos.
- Check de `operationId`, tags y responses mínimos.

##### Exclude

- No testear runtime RBAC/ownership.
- No modificar reglas de autorización de endpoints.

#### Implementation Notes

Este check puede formar parte de `openapi:check` y del CI gate.

#### Acceptance Criteria Covered

AC-02, AC-05, EC-03.

#### Definition of Done

- [ ] Secrets/PII scan agregado.
- [ ] Protected endpoints check agregado.
- [ ] Metadata incompleta falla con mensaje accionable.
- [ ] Casos públicos/protegidos diferenciados.

---

### TASK-PB-P0-005-US-098-DOC-001 — Documentar comandos de generación, validación y visualización

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-005-US-098-BE-003, TASK-PB-P0-005-US-098-OPS-001 |
| Source AC(s) | AC-03, AC-06 |
| Technical Spec Section(s) | §18 Implementation Guidance, §19 Task Generation Notes |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Backend / Documentation |
| Status | To Do |

#### Objective

Documentar cómo generar, validar, verificar drift y visualizar el contrato OpenAPI.

#### Scope

##### Include

- Instrucciones para `openapi:generate`.
- Instrucciones para `openapi:lint`.
- Instrucciones para `openapi:check`.
- Instrucciones para `openapi:docs`.
- Qué hacer cuando CI falla por drift.
- Advertencia de no editar manualmente `backend/openapi.json`.

##### Exclude

- No documentar portal público.
- No generar guía de SDKs de producción.

#### Implementation Notes

Ubicar la documentación en README técnico del backend o documentación de developer workflow ya existente.

#### Acceptance Criteria Covered

AC-03, AC-06.

#### Definition of Done

- [ ] Comandos documentados.
- [ ] Flujo de remediación de drift documentado.
- [ ] `backend/openapi.json` marcado como generado/canónico.
- [ ] No se promueve YAML como fuente paralela.

---

### TASK-PB-P0-005-US-098-DOC-002 — Registrar alineación documental `openapi.json` vs `openapi.yaml`

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Should |
| Estimate | XS |
| Depends On | TASK-PB-P0-005-US-098-DOC-001 |
| Source AC(s) | AC-02 |
| Technical Spec Section(s) | §16 Documentation Alignment Required, §17 Technical Risks & Mitigations |
| Backlog ID | PB-P0-005 |
| User Story ID | US-098 |
| Owner Role | Product Owner / Tech Lead |
| Status | To Do |

#### Objective

Evitar que el conflicto documental entre PB-P0-005 y Doc 16 reabra decisiones durante implementación o QA.

#### Scope

##### Include

- Registrar en documentación técnica que `backend/openapi.json` es canónico.
- Explicar que `openapi.yaml`, Swagger UI o Redoc son derivados opcionales.
- Referenciar `US-098-decision-resolution.md`.
- Recomendar futura actualización de Doc 16 §43.

##### Exclude

- No modificar Doc 16 si no forma parte del alcance del sprint.
- No crear ADR nuevo salvo que el equipo lo solicite.

#### Implementation Notes

Esta tarea es documental y no bloquea implementación si el decision resolution ya está disponible.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] Nota de alineación registrada.
- [ ] Decision resolution referenciado.
- [ ] YAML/UI descritos como derivados.
- [ ] No quedan instrucciones contradictorias en docs de implementación inmediata.

---

## 7. Dependency Map

| Task ID | Depends On |
|---|---|
| TASK-PB-P0-005-US-098-PO-001 | PB-P0-004 |
| TASK-PB-P0-005-US-098-BE-001 | TASK-PB-P0-005-US-098-PO-001 |
| TASK-PB-P0-005-US-098-API-001 | TASK-PB-P0-005-US-098-BE-001 |
| TASK-PB-P0-005-US-098-API-002 | TASK-PB-P0-005-US-098-API-001 |
| TASK-PB-P0-005-US-098-BE-002 | TASK-PB-P0-005-US-098-API-002 |
| TASK-PB-P0-005-US-098-API-003 | TASK-PB-P0-005-US-098-BE-002 |
| TASK-PB-P0-005-US-098-SEC-001 | TASK-PB-P0-005-US-098-API-003 |
| TASK-PB-P0-005-US-098-BE-003 | TASK-PB-P0-005-US-098-API-003 |
| TASK-PB-P0-005-US-098-OPS-001 | TASK-PB-P0-005-US-098-SEC-001 |
| TASK-PB-P0-005-US-098-OBS-001 | TASK-PB-P0-005-US-098-BE-002 |
| TASK-PB-P0-005-US-098-QA-001 | TASK-PB-P0-005-US-098-BE-002, TASK-PB-P0-005-US-098-API-001 |
| TASK-PB-P0-005-US-098-QA-002 | TASK-PB-P0-005-US-098-BE-002 |
| TASK-PB-P0-005-US-098-QA-003 | TASK-PB-P0-005-US-098-OPS-001 |
| TASK-PB-P0-005-US-098-QA-004 | TASK-PB-P0-005-US-098-SEC-001 |
| TASK-PB-P0-005-US-098-DOC-001 | TASK-PB-P0-005-US-098-BE-003, TASK-PB-P0-005-US-098-OPS-001 |
| TASK-PB-P0-005-US-098-DOC-002 | TASK-PB-P0-005-US-098-DOC-001 |

---

## 8. Required QA Coverage

| QA Area | Required Coverage | Task IDs |
|---|---|---|
| Generation | Spec parseable and common components present | TASK-PB-P0-005-US-098-QA-001 |
| Determinism | Repeated generation without changes has no diff | TASK-PB-P0-005-US-098-QA-002 |
| CI drift | Lint and diff checks fail appropriately | TASK-PB-P0-005-US-098-QA-003 |
| Security metadata | `cookieAuth`, 401/403 and sensitive data scan | TASK-PB-P0-005-US-098-QA-004 |
| Documentation local/demo | Docs command loads generated snapshot | TASK-PB-P0-005-US-098-DOC-001 |

---

## 9. Scope Guardrails for Implementation

- Do not create new API endpoints.
- Do not modify endpoint behavior.
- Do not create SDKs of production.
- Do not publish a public API portal.
- Do not create manual OpenAPI YAML/JSON parallel definitions.
- Do not introduce payments, contracts, WhatsApp, chat, push, RAG, native mobile, enterprise multi-tenancy or autonomous AI decisions.
- Do not move authorization source of truth out of backend runtime.
- Do not reopen `backend/openapi.json` as canonical snapshot decision.

---

## 10. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Development? |
|---|---|---|---|---|
| Product Backlog PB-P0-005 vs Doc 16 §43 | PB-P0-005 indica `openapi.json`; Doc 16 §43 menciona `/api/openapi.yaml`. | `backend/openapi.json` es el snapshot canónico versionado para US-098; YAML puede existir solo como derivado local/demo. | Registrar nota en docs inmediatas y actualizar Doc 16 §43 en futura alineación documental. | No |

---

## 11. Readiness for Sprint Planning

| Check | Status | Notes |
|---|---|---|
| User Story approved | Pass | US-098 está Approved. |
| Technical Specification used | Pass | `US-098-technical-spec.md` fue fuente primaria. |
| Product Backlog mapping found | Pass | PB-P0-005, P0, execution order 5. |
| Decision Resolution reviewed | Pass | `US-098-decision-resolution.md` usado. |
| All ACs mapped to tasks | Pass | AC-01 a AC-06 y EC-01 a EC-03 cubiertos. |
| QA tasks included | Pass | 4 tareas QA obligatorias. |
| Security tasks included | Pass | 1 tarea SEC + QA security checks. |
| Seed/demo tasks included or justified | Pass | No seed requerido; docs local/demo cubierto. |
| Documentation tasks included | Pass | README/comandos y alignment note. |
| No scope creep introduced | Pass | Tareas no crean endpoints ni features fuera del MVP. |
| Ready for Sprint Planning | Yes | |

---

## 12. Final Recommendation

`Ready for Sprint Planning`.

Las tareas cubren setup de tooling, registry OpenAPI, snapshot canónico `backend/openapi.json`, seguridad documental, CI drift detection, documentación local/demo, QA y trazabilidad. No hay blockers ni necesidad de split. PB-P0-005 contiene una sola User Story, por lo que no se genera `tasks.md` consolidado por defecto.
