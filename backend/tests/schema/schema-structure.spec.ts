import { describe, it, expect } from 'vitest';
import {
  schema,
  modelBlock,
  enumBlock,
  declaredEnums,
  MVP_MODELS,
  SEED_MODELS,
  SOFT_DELETE_MODELS,
  BASE_ENUMS,
  STATUS_ENUMS,
} from './helpers.js';

// QA-001 (TS-03, NT-01) — 19 modelos MVP presentes.
describe('QA-001: modelos MVP', () => {
  it('declara los 19 modelos MVP', () => {
    for (const model of MVP_MODELS) {
      expect(modelBlock(model), `falta el modelo ${model}`).not.toBeNull();
    }
    expect(MVP_MODELS).toHaveLength(19);
  });
});

// QA-002 (TS-04, NT-03) — isSeed en modelos operativos; ausente en AIPromptVersion.
describe('QA-002: marca isSeed', () => {
  it('declara isSeed en cada modelo operativo', () => {
    for (const model of SEED_MODELS) {
      const body = modelBlock(model) ?? '';
      expect(body, `${model} sin isSeed`).toMatch(
        /isSeed\s+Boolean\s+@default\(false\)\s+@map\("is_seed"\)/,
      );
    }
  });

  it('NO declara isSeed en AIPromptVersion (append-only)', () => {
    const body = modelBlock('AIPromptVersion') ?? '';
    expect(body).not.toMatch(/isSeed/);
  });
});

// QA-003 (TS-05, NT-05) — deletedAt en los 7 modelos con soft delete.
describe('QA-003: soft delete deletedAt', () => {
  it('declara deletedAt en los 7 modelos con soft delete', () => {
    for (const model of SOFT_DELETE_MODELS) {
      const body = modelBlock(model) ?? '';
      expect(body, `${model} sin deletedAt`).toMatch(
        /deletedAt\s+DateTime\?\s+@map\("deleted_at"\)\s+@db\.Timestamptz\(6\)/,
      );
    }
    expect(SOFT_DELETE_MODELS).toHaveLength(7);
  });

  it('NO declara deletedAt en modelos sin soft delete (p. ej. Event, User)', () => {
    for (const model of ['User', 'Event', 'EventTask', 'Budget']) {
      expect(modelBlock(model) ?? '').not.toMatch(/deletedAt/);
    }
  });
});

// QA-004 (TS-06) — 4 enums base.
describe('QA-004: enums base', () => {
  it('declara los 4 enums base', () => {
    for (const e of BASE_ENUMS) {
      expect(enumBlock(e), `falta enum ${e}`).not.toBeNull();
    }
  });

  it('mapea los valores de LanguageCode con guion vía @map', () => {
    const body = enumBlock('LanguageCode') ?? '';
    expect(body).toMatch(/es_LATAM\s+@map\("es-LATAM"\)/);
    expect(body).toMatch(/es_ES\s+@map\("es-ES"\)/);
  });
});

// QA-005 (TS-07, NT-06) — 10 enums status por entidad + ausencia de enum genérico Status.
describe('QA-005: enums de status por entidad', () => {
  it('declara los 10 enums de status por entidad', () => {
    for (const e of STATUS_ENUMS) {
      expect(enumBlock(e), `falta enum ${e}`).not.toBeNull();
    }
    expect(STATUS_ENUMS).toHaveLength(10);
  });

  it('NO reutiliza un enum genérico `Status`', () => {
    expect(declaredEnums()).not.toContain('Status');
  });

  it('AIRecommendationStatus cubre el flujo HITL', () => {
    const body = enumBlock('AIRecommendationStatus') ?? '';
    for (const v of ['pending', 'accepted', 'edited', 'rejected', 'discarded']) {
      expect(body, `AIRecommendationStatus sin ${v}`).toMatch(new RegExp(`\\b${v}\\b`));
    }
  });
});

// QA-006 (TS-08, NT-07) — EventType.id UUID PK + code @unique.
describe('QA-006: EventType identificadores', () => {
  const body = modelBlock('EventType') ?? '';

  it('declara id como UUID Primary Key', () => {
    expect(body).toMatch(/id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid/);
  });

  it('declara code como identificador funcional único', () => {
    expect(body).toMatch(/code\s+String\s+@unique/);
  });

  it('NO usa code como Primary Key', () => {
    expect(body).not.toMatch(/code\s+String\s+@id/);
  });
});

// QA-007 (TS-09, NT-08) — AIPromptVersion declarado y relacionado.
describe('QA-007: AIPromptVersion', () => {
  it('declara el modelo AIPromptVersion con sus campos mínimos', () => {
    const body = modelBlock('AIPromptVersion');
    expect(body).not.toBeNull();
    const b = body ?? '';
    expect(b).toMatch(/promptKey\s+String/);
    expect(b).toMatch(/version\s+String/);
    expect(b).toMatch(/provider\s+LLMProvider/);
    expect(b).toMatch(/templateChecksum\s+String/);
  });

  it('relaciona AIRecommendation -> AIPromptVersion', () => {
    const rec = modelBlock('AIRecommendation') ?? '';
    expect(rec).toMatch(/aiPromptVersionId\s+String\s+@map\("ai_prompt_version_id"\)/);
    expect(rec).toMatch(
      /promptVersion\s+AIPromptVersion\s+@relation\(fields:\s*\[aiPromptVersionId\]/,
    );
  });
});

// QA-008 (TS-10, NT-02, NT-04) — @@map/@map + tipos PG + @relation explícito.
describe('QA-008: convenciones físicas y tipos PostgreSQL', () => {
  it('cada modelo MVP declara @@map("snake_case_plural")', () => {
    for (const model of MVP_MODELS) {
      const body = modelBlock(model) ?? '';
      expect(body, `${model} sin @@map`).toMatch(/@@map\("[a-z][a-z0-9_]*"\)/);
    }
  });

  it('timestamps con @db.Timestamptz(6)', () => {
    for (const model of MVP_MODELS) {
      const body = modelBlock(model) ?? '';
      expect(body, `${model} createdAt`).toMatch(
        /createdAt\s+DateTime\s+@default\(now\(\)\)\s+@map\("created_at"\)\s+@db\.Timestamptz\(6\)/,
      );
      expect(body, `${model} updatedAt`).toMatch(
        /updatedAt\s+DateTime\s+@updatedAt\s+@map\("updated_at"\)\s+@db\.Timestamptz\(6\)/,
      );
    }
  });

  it('campos monetarios con @db.Decimal(14, 2)', () => {
    const money: Array<[string, string]> = [
      ['Quote', 'amount'],
      ['VendorService', 'priceMin'],
      ['VendorService', 'priceMax'],
      ['Budget', 'totalPlanned'],
      ['Budget', 'totalCommitted'],
      ['BudgetItem', 'amountPlanned'],
      ['BudgetItem', 'amountCommitted'],
    ];
    for (const [model, field] of money) {
      const body = modelBlock(model) ?? '';
      expect(body, `${model}.${field} sin Decimal(14,2)`).toMatch(
        new RegExp(`${field}[\\s\\S]*?@db\\.Decimal\\(14, 2\\)`),
      );
    }
  });

  it('campos JSON con @db.JsonB', () => {
    const jsonFields: Array<[string, string]> = [
      ['QuoteRequest', 'aiBriefMeta'],
      ['Notification', 'payload'],
      ['AIRecommendation', 'inputPayload'],
      ['AIRecommendation', 'outputPayload'],
      ['AdminAction', 'metadata'],
    ];
    for (const [model, field] of jsonFields) {
      const body = modelBlock(model) ?? '';
      expect(body, `${model}.${field} sin JsonB`).toMatch(
        new RegExp(`${field}[\\s\\S]*?@db\\.JsonB`),
      );
    }
  });

  it('toda FK usa @relation explícito con onDelete', () => {
    const relationLines = [...schema.matchAll(/@relation\([^)]*\)/g)].map((m) => m[0]);
    expect(relationLines.length).toBeGreaterThan(0);
    for (const line of relationLines) {
      expect(line, `@relation sin onDelete: ${line}`).toMatch(/onDelete:\s*(Restrict|Cascade)/);
    }
  });

  it('onDelete: Cascade se usa exclusivamente en BudgetItem.budgetId', () => {
    const cascades = [...schema.matchAll(/@relation\([^)]*onDelete:\s*Cascade[^)]*\)/g)];
    expect(cascades).toHaveLength(1);
    const budgetItem = modelBlock('BudgetItem') ?? '';
    expect(budgetItem).toMatch(/budget\s+Budget\s+@relation\([^)]*onDelete:\s*Cascade[^)]*\)/);
  });
});
