// PromptRegistry — colección de todos los templates registrados (US-121 / AI-001).
import type { PromptTemplate } from '../prompt-template.js';
import { MVP_PROMPT_TEMPLATES } from './mvp-prompts.prompt.js';

/** Conjunto completo de templates cargados por el registry por defecto. */
export const ALL_PROMPT_TEMPLATES: readonly PromptTemplate[] = [...MVP_PROMPT_TEMPLATES];
