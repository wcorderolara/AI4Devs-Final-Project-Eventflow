// PromptRegistry — escáner de secrets / PII real (US-121 / SEC-001, AC-06 / VR-09 / EC-05).
// Rechaza que templates o metadata incluyan tokens, API keys, cookies o ejemplos con PII real.
// No es un DLP empresarial: cubre patrones comunes secret-like y PII evidente. Los ejemplos DEBEN
// ser sintéticos. Este helper corre en validación de registry y en tests de seguridad (SEC-TS-01).
import type { PromptTemplate } from './prompt-template.js';
import { promptStableId } from './prompt-template.js';

export interface SecretPiiFinding {
  promptStableId: string;
  field: string;
  pattern: string;
}

/** Patrones secret-like / PII. Nombres estables para reporte seguro (sin exponer el match). */
const PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: 'openai_api_key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'aws_access_key_id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'bearer_token', re: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/ },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/ },
  { name: 'private_key_block', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'generic_secret_assignment', re: /\b(?:api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*["'][^"'\s]{8,}["']/i },
  // PII real: email no-sintético (excluye dominios de ejemplo reservados RFC 2606).
  { name: 'real_email', re: /\b[A-Za-z0-9._%+-]+@(?!example\.(?:com|org|net)\b)(?!test\b)(?!localhost\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

/** Concatena los campos de texto a escanear de un template. */
function scannableFields(template: PromptTemplate): { field: string; value: string }[] {
  return [
    { field: 'systemInstructions', value: template.systemInstructions },
    ...template.developerRules.map((rule, i) => ({ field: `developerRules[${i}]`, value: rule })),
    { field: 'metadata.changeReason', value: template.metadata.changeReason },
    ...template.metadata.relatedRules.map((rule, i) => ({ field: `metadata.relatedRules[${i}]`, value: rule })),
  ];
}

/** Escanea un template y devuelve findings (vacío = limpio). No expone el valor coincidente. */
export function scanTemplateForSecretsAndPii(template: PromptTemplate): SecretPiiFinding[] {
  const findings: SecretPiiFinding[] = [];
  const stableId = promptStableId(template);
  for (const { field, value } of scannableFields(template)) {
    for (const { name, re } of PATTERNS) {
      if (re.test(value)) {
        findings.push({ promptStableId: stableId, field, pattern: name });
      }
    }
  }
  return findings;
}

/** Escanea un conjunto de templates. */
export function scanTemplatesForSecretsAndPii(templates: readonly PromptTemplate[]): SecretPiiFinding[] {
  return templates.flatMap((t) => scanTemplateForSecretsAndPii(t));
}
