// US-121 / QA-005 + SEED-002 (AC-07, AC-10) — export/sync de metadata AIPromptVersion.
// Verifica matching entre prompts en código y metadata exportada, determinismo/idempotencia,
// exclusión de drafts (Future/P4), y detectabilidad de mismatch. Sin red ni secrets.
import { describe, it, expect } from 'vitest';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import { exportAIPromptVersionMetadata } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/aipromptversion-export.js';
import { promptStableId } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-template.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('US-121 AC-07 — export matchea prompts active/deprecated en código', () => {
  it('exporta exactamente las versiones active+deprecated (excluye drafts Future/P4)', () => {
    const rows = exportAIPromptVersionMetadata(promptRegistry);
    const expected = promptRegistry.all().filter((t) => t.status === 'active' || t.status === 'deprecated');
    expect(rows).toHaveLength(expected.length);
    // vendor_bio (draft) NO aparece.
    expect(rows.some((r) => r.promptKey.startsWith('vendor_bio'))).toBe(false);
  });

  it('cada fila mapea a columnas AIPromptVersion con checksum coincidente', () => {
    const rows = exportAIPromptVersionMetadata(promptRegistry);
    for (const row of rows) {
      const template = promptRegistry.resolveSpecificById(`${row.promptKey}@${row.version}`);
      expect(row.templateChecksum).toBe(template.templateHash);
      expect(row.status).toMatch(/^(active|deprecated)$/);
      expect(row.provider).toBe('mock');
      expect(row.id).toMatch(UUID_RE);
      expect(row.promptId).toMatch(UUID_RE);
      // description es metadata segura, sin contenido de instrucciones.
      expect(row.description).not.toContain('assistant');
    }
  });

  it('US-122 puede referenciar prompt_version_id: cada active tiene un id determinístico', () => {
    const rows = exportAIPromptVersionMetadata(promptRegistry);
    const active = promptRegistry.resolveActive('event_plan', 'es-LATAM');
    const row = rows.find((r) => r.promptKey === active.promptKey && r.version === active.version);
    expect(row).toBeDefined();
    expect(row!.id).toMatch(UUID_RE);
  });
});

describe('US-121 SEED-002 (AC-07) — idempotencia y estabilidad', () => {
  it('el export es determinístico entre ejecuciones (deep-equal)', () => {
    const a = exportAIPromptVersionMetadata(promptRegistry);
    const b = exportAIPromptVersionMetadata(promptRegistry);
    expect(a).toEqual(b);
  });

  it('no hay duplicados (promptKey, version) ni ids en el dataset', () => {
    const rows = exportAIPromptVersionMetadata(promptRegistry);
    const keys = new Set(rows.map((r) => `${r.promptKey}@${r.version}`));
    const ids = new Set(rows.map((r) => r.id));
    expect(keys.size).toBe(rows.length);
    expect(ids.size).toBe(rows.length);
  });

  it('un mismatch de checksum contra el código es detectable (check de sync)', () => {
    const rows = exportAIPromptVersionMetadata(promptRegistry);
    const tampered = rows.map((r, i) => (i === 0 ? { ...r, templateChecksum: 'sha256:tampered' } : r));
    const mismatches = tampered.filter((r) => {
      const t = promptRegistry.resolveSpecificById(`${r.promptKey}@${r.version}`);
      return r.templateChecksum !== t.templateHash;
    });
    expect(mismatches).toHaveLength(1);
  });

  it('todas las active en código tienen fila en el export (missing row detectable)', () => {
    const rows = exportAIPromptVersionMetadata(promptRegistry);
    const rowKeys = new Set(rows.map((r) => `${r.promptKey}@${r.version}`));
    const missing = promptRegistry
      .all()
      .filter((t) => t.status === 'active')
      .map((t) => promptStableId(t))
      .filter((id) => !rowKeys.has(id));
    expect(missing).toEqual([]);
  });
});
