// PromptRegistry — hash/checksum determinístico (US-121 / BE-004, AC-08). Disciplina de versión:
// el hash cubre el CONTENIDO RELEVANTE (identidad, schema refs, instrucciones, reglas, safety) y
// EXCLUYE campos volátiles (metadata de reviewers/timestamps/changeReason) y el `status` (una
// transición de ciclo de vida active→deprecated NO es un cambio de contenido). Un cambio de
// comportamiento/schema/safety/language sin nueva versión produce drift detectable.
import { createHash } from 'node:crypto';
import type { PromptSafetyConstraints, PromptTemplate } from './prompt-template.js';
import { REQUIRED_SAFETY_CONSTRAINTS } from './prompt-template.js';

/** Serialización canónica y estable (orden de claves fijo) del contenido relevante para el hash. */
function canonicalContent(template: PromptTemplate): string {
  const safety: Record<string, boolean> = {};
  for (const key of REQUIRED_SAFETY_CONSTRAINTS) {
    safety[key] = template.safetyConstraints[key as keyof PromptSafetyConstraints];
  }
  const relevant = {
    promptKey: template.promptKey,
    version: template.version,
    featureType: template.featureType,
    languageSupport: [...template.languageSupport].sort(),
    inputSchemaRef: template.inputSchemaRef,
    outputSchemaRef: template.outputSchemaRef,
    systemInstructions: template.systemInstructions,
    developerRules: template.developerRules,
    safetyConstraints: safety,
  };
  return JSON.stringify(relevant);
}

/** Calcula el hash `sha256:<hex>` del contenido relevante de un template. */
export function computeTemplateHash(template: PromptTemplate): string {
  const digest = createHash('sha256').update(canonicalContent(template), 'utf8').digest('hex');
  return `sha256:${digest}`;
}

/** Compara el hash declarado contra el recalculado. `true` si coinciden (sin drift). */
export function isTemplateHashValid(template: PromptTemplate): boolean {
  return computeTemplateHash(template) === template.templateHash;
}
