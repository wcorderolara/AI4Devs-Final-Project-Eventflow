// Singleton del Prisma Client (US-099 / BE-001).
// Instanciación pura: no abre conexión hasta la primera query.
// La inyección real de PrismaClient vía DI pertenece a historias backend futuras.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
