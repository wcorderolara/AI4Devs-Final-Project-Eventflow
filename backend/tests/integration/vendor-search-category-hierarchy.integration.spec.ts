// Directorio de proveedores: filtrar por una categoría padre incluye a sus subcategorías, y cada
// fila trae la ubicación legible y los nombres de categoría (campos aditivos del listado).
//
// No vacía tablas: crea sus propias filas con códigos únicos y borra sólo lo que creó, para poder
// correr contra una base con datos sin destruirlos.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaVendorSearchRepository } from '../../src/modules/vendor-management/infrastructure/prisma-vendor-search.repository.js';
import { dbUp, getTestPrisma } from '../helpers/test-db.js';

const prisma = getTestPrisma();
const tag = randomUUID().slice(0, 8);

const ids = {
  parent: '',
  child: '',
  other: '',
  location: '',
  user: '',
  vendor: '',
};

describe.skipIf(!dbUp)('vendor search — jerarquía de categorías y nombres legibles', () => {
  beforeAll(async () => {
    const parent = await prisma.serviceCategory.create({
      data: { code: `t_music_${tag}`, label: `Música ${tag}` },
    });
    const child = await prisma.serviceCategory.create({
      data: { code: `t_marimba_${tag}`, label: `Marimba ${tag}`, parentId: parent.id, depthLevel: 2 },
    });
    const other = await prisma.serviceCategory.create({
      data: { code: `t_catering_${tag}`, label: `Catering ${tag}` },
    });
    const location = await prisma.location.create({
      data: { code: `T-${tag}`, country: 'Guatemala', region: 'Sacatepéquez', city: 'Antigua Guatemala' },
    });
    const user = await prisma.user.create({
      data: { email: `vendor-hierarchy-${tag}@eventflow.test`, role: 'vendor', fullName: 'Contacto prueba', passwordHash: 'x' },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        businessName: `Marimba Prueba ${tag}`,
        slug: `marimba-prueba-${tag}`,
        status: 'approved',
        locationId: location.id,
      },
    });
    await prisma.vendorProfileCategory.create({
      data: { vendorProfileId: vendor.id, serviceCategoryId: child.id },
    });
    Object.assign(ids, {
      parent: parent.id,
      child: child.id,
      other: other.id,
      location: location.id,
      user: user.id,
      vendor: vendor.id,
    });
  });

  afterAll(async () => {
    if (!ids.parent) return; // el setup no llegó a crear nada
    await prisma.vendorProfileCategory.deleteMany({ where: { vendorProfileId: ids.vendor } });
    await prisma.vendorProfile.deleteMany({ where: { id: ids.vendor } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.location.deleteMany({ where: { id: ids.location } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: [ids.child] } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: [ids.parent, ids.other] } } });
  });

  const search = (categoryId: string) =>
    new PrismaVendorSearchRepository(prisma).searchApprovedVendors({
      filters: { categoryId, locationId: null, priceMin: null, priceMax: null, currency: null },
      cursor: null,
      limit: 50,
      excludeUserId: null,
    });

  it('la categoría padre encuentra al proveedor de su subcategoría', async () => {
    const rows = await search(ids.parent);
    expect(rows.map((r) => r.id)).toContain(ids.vendor);
  });

  it('la subcategoría sigue encontrándolo por coincidencia exacta', async () => {
    const rows = await search(ids.child);
    expect(rows.map((r) => r.id)).toContain(ids.vendor);
  });

  it('una categoría no relacionada no lo encuentra', async () => {
    const rows = await search(ids.other);
    expect(rows.map((r) => r.id)).not.toContain(ids.vendor);
  });

  it('la fila trae ubicación legible y el nombre de la categoría', async () => {
    const row = (await search(ids.child)).find((r) => r.id === ids.vendor);
    expect(row?.locationCode).toBe(`T-${tag}`);
    expect(row?.locationDisplay).toBe('Antigua Guatemala, Sacatepéquez, Guatemala');
    expect(row?.categoryLabels).toEqual([{ code: `t_marimba_${tag}`, label: `Marimba ${tag}` }]);
  });
});
