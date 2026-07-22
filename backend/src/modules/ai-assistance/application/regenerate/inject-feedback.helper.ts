// US-026 (PB-P2-003 / BE-005) — Helper PromptOps shared para inyección de feedback en
// regeneración cross-cutting.
//
// Formato estable (D6/AC-03) `[USER_FEEDBACK_FOR_REGENERATION]…[END_FEEDBACK]` que rodea el
// texto libre del usuario. Placeholder `(sin feedback adicional)` cuando el usuario no aporta
// texto (EC-04 whitespace-only → tratado como vacío por `.trim()` en el use case). El helper
// es puro: no accede a red, no muta estado, no depende del feature — la misma firma sirve
// para los 9 features AI del MVP.
export const FEEDBACK_BLOCK_START = '[USER_FEEDBACK_FOR_REGENERATION]';
export const FEEDBACK_BLOCK_END = '[END_FEEDBACK]';
export const FEEDBACK_EMPTY_PLACEHOLDER = '(sin feedback adicional)';

export function injectFeedbackForRegeneration(
  originalTemplate: string,
  feedback: string,
): string {
  const body = feedback.length > 0 ? feedback : FEEDBACK_EMPTY_PLACEHOLDER;
  return `${originalTemplate}\n\n${FEEDBACK_BLOCK_START}\n${body}\n${FEEDBACK_BLOCK_END}`;
}
