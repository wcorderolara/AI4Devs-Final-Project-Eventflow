// PromptOps — recalcula el `templateHash` de cada template (US-121 / BE-004, DOC-001).
// Uso: `npm run promptops:hash` imprime `promptKey@version  sha256:<hex>`. Cuando cambies el
// contenido relevante de un prompt, crea una NUEVA versión y pega aquí el hash actualizado; el
// registry falla con PROMPT_HASH_DRIFT si el hash declarado no coincide (disciplina de versión).
import { ALL_PROMPT_TEMPLATES } from '../src/modules/ai-assistance/infrastructure/prompt-registry/prompts/index.js';
import { computeTemplateHash } from '../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-hash.js';
import { promptStableId } from '../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-template.js';

for (const t of ALL_PROMPT_TEMPLATES) {
  process.stdout.write(`${promptStableId(t)}\t${computeTemplateHash(t)}\n`);
}
