// ListServiceCategoriesUseCase (US-075 / BE-007). Tech Spec §7 List. AC-05 + AC-06.
//
// Ejecuta el listado del catálogo en dos variantes:
//   - admin  (`includeInactive=true`)  → todas las filas vivas (`deletedAt IS NULL`),
//                                         activas y desactivadas por soft delete.
//   - public (`includeInactive=false`) → solo activas (`is_active=true`).
//
// Response shape `{tree, flat}` (Decisión PO D2):
//   - `flat`: array plano en orden de árbol determinista
//             `parent_id NULLS FIRST, sort_order ASC, label ASC` — cursor-friendly
//             para futuras iteraciones (pagination del panel admin).
//   - `tree`: raíces con `children[]` anidados. Máximo 2 niveles enforceados a nivel
//             modelo (US-075 §5) y CHECK SQL `depth_level BETWEEN 1 AND 2`.
//
// Rendimiento (NFR-PERF-001 < 500ms p95): 1 query total. El árbol se construye en
// memoria con un `Map<parentId, children>` (O(N)). El catálogo es "cold" y N << 1k
// filas incluso a escala LATAM — no requiere pagination servidor.
import { type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { toServiceCategoryView, type ServiceCategoryView } from './service-category.view.js';

export interface ServiceCategoryTreeNode extends ServiceCategoryView {
  children: ServiceCategoryTreeNode[];
}

export interface ListServiceCategoriesResult {
  tree: ServiceCategoryTreeNode[];
  flat: ServiceCategoryView[];
}

export class ListServiceCategoriesUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(opts: { includeInactive?: boolean } = {}): Promise<ListServiceCategoriesResult> {
    const includeInactive = opts.includeInactive ?? false;
    const where = includeInactive
      ? { deletedAt: null }
      : { deletedAt: null, isActive: true };

    // Orden determinista: roots primero (parent_id NULL), luego subs ordenadas por
    // `sort_order` y `label`. `parent_id ASC NULLS FIRST` es el default de Postgres
    // cuando `ORDER BY ... ASC`.
    const rows = await this.prisma.serviceCategory.findMany({
      where,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });

    const flat = rows.map(toServiceCategoryView);
    const tree = buildTree(flat);
    return { tree, flat };
  }
}

function buildTree(flat: ServiceCategoryView[]): ServiceCategoryTreeNode[] {
  const nodeById = new Map<string, ServiceCategoryTreeNode>();
  for (const row of flat) {
    nodeById.set(row.id, { ...row, children: [] });
  }
  const roots: ServiceCategoryTreeNode[] = [];
  for (const row of flat) {
    const node = nodeById.get(row.id)!;
    if (row.parent_id === null) {
      roots.push(node);
    } else {
      const parent = nodeById.get(row.parent_id);
      // Si el parent está filtrado (público sin inactivo) el hijo queda huérfano y
      // se retira del tree (pero permanece en `flat`). Comportamiento consistente
      // con Decisión PO D2 — el árbol público refleja solo lo que se puede reservar.
      if (parent) parent.children.push(node);
    }
  }
  return roots;
}
