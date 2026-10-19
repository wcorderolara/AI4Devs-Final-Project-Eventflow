// Ruta pública de imágenes de portafolio (`GET /api/v1/public/portfolio/:imageId`): sirve las
// fotos de trabajos activos de proveedores aprobados y visibles; cualquier otro caso es 404.
//
// No vacía tablas: crea sus propias filas y un archivo temporal, y borra sólo lo que creó.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';
import { dbUp, getTestPrisma } from '../helpers/test-db.js';

const app = createApp();
const prisma = getTestPrisma();
const tag = randomUUID().slice(0, 8);
const storageDir = `test-public-portfolio-${tag}`;
// JPEG mínimo válido (cabecera SOI + EOI): basta para comprobar que se sirve el binario.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);

const ids = { users: [] as string[], vendors: [] as string[], attachments: {} as Record<string, string> };

async function vendor(name: string, data: { status: 'approved' | 'pending'; isHidden?: boolean }) {
  const user = await prisma.user.create({
    data: { email: `portfolio-${name}-${tag}@eventflow.test`, role: 'vendor', passwordHash: 'x' },
  });
  const profile = await prisma.vendorProfile.create({
    data: { userId: user.id, businessName: `Portafolio ${name} ${tag}`, slug: `portafolio-${name}-${tag}`, ...data },
  });
  ids.users.push(user.id);
  ids.vendors.push(profile.id);
  return profile.id;
}

async function image(key: string, ownerId: string, opts: { file: boolean; deleted?: boolean }) {
  const url = `${storageDir}/${key}.jpg`;
  if (opts.file) {
    const target = path.resolve(config.FILE_STORAGE_PATH, url);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JPEG);
  }
  const row = await prisma.attachment.create({
    data: {
      ownerType: 'vendor_work',
      ownerId,
      status: 'active',
      url,
      fileName: `${key}.jpg`,
      mimeType: 'image/jpeg',
      workLabel: 'boda-2025',
      deletedAt: opts.deleted ? new Date() : null,
    },
  });
  ids.attachments[key] = row.id;
}

describe.skipIf(!dbUp)('GET /api/v1/public/portfolio/:imageId', () => {
  beforeAll(async () => {
    const visible = await vendor('visible', { status: 'approved' });
    const hidden = await vendor('oculto', { status: 'approved', isHidden: true });
    const pending = await vendor('pendiente', { status: 'pending' });
    await image('ok', visible, { file: true });
    await image('sin-archivo', visible, { file: false });
    await image('borrada', visible, { file: true, deleted: true });
    await image('oculto', hidden, { file: true });
    await image('pendiente', pending, { file: true });
  });

  afterAll(async () => {
    await prisma.attachment.deleteMany({ where: { id: { in: Object.values(ids.attachments) } } });
    await prisma.vendorProfile.deleteMany({ where: { id: { in: ids.vendors } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    fs.rmSync(path.resolve(config.FILE_STORAGE_PATH, storageDir), { recursive: true, force: true });
  });

  it('sirve la imagen de un proveedor aprobado y visible, con caché larga', async () => {
    const res = await request(app).get(`/api/v1/public/portfolio/${ids.attachments.ok}`).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=604800, immutable');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(res.body as Buffer).equals(JPEG)).toBe(true);
  });

  it.each([
    ['proveedor oculto', 'oculto'],
    ['proveedor no aprobado', 'pendiente'],
    ['imagen borrada', 'borrada'],
    ['registro sin binario en disco', 'sin-archivo'],
  ])('%s → 404 uniforme', async (_label, key) => {
    const res = await request(app).get(`/api/v1/public/portfolio/${ids.attachments[key]}`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('ATTACHMENT_NOT_FOUND');
  });

  it('id inexistente → 404 e id inválido → 400', async () => {
    expect((await request(app).get(`/api/v1/public/portfolio/${randomUUID()}`)).status).toBe(404);
    expect((await request(app).get('/api/v1/public/portfolio/no-es-uuid')).status).toBe(400);
  });
});
