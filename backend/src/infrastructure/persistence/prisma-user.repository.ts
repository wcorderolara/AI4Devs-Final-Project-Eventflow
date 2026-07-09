// Adapter Prisma — UserRepository (US-094 / BE-003). Traduce entre el modelo Prisma `User`
// (snake_case, enum `LanguageCode` con guion bajo, `fullName`) y la vista de dominio `AuthUser`
// (contrato API: `name`, idioma con guion). Nunca expone `passwordHash` en las vistas públicas.
import { Prisma, type PrismaClient, type User as PrismaUser } from '@prisma/client';
import type { UserRepository } from '../../shared/auth/ports.js';
import type { AuthUser, AuthUserWithSecret, CreateUserInput, UpdateProfileInput } from '../../shared/auth/types.js';
import {
  API_TO_PRISMA_LANGUAGE,
  PRISMA_TO_API_LANGUAGE,
  type PrismaLanguage,
} from '../../shared/constants/languages.js';
import { EmailTakenError } from '../../shared/domain/errors/email-taken.error.js';
import { prisma as defaultPrisma } from '../prisma/client.js';

function toAuthUser(u: PrismaUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.fullName ?? '',
    phone: u.phone ?? null,
    role: u.role,
    status: u.status,
    preferredLanguage: PRISMA_TO_API_LANGUAGE[u.preferredLanguage as PrismaLanguage],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function toAuthUserWithSecret(u: PrismaUser): AuthUserWithSecret {
  return { ...toAuthUser(u), passwordHash: u.passwordHash };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findByEmailNormalized(email: string): Promise<AuthUserWithSecret | null> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return user ? toAuthUserWithSecret(user) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toAuthUser(user) : null;
  }

  async findByIdWithSecret(id: string): Promise<AuthUserWithSecret | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toAuthUserWithSecret(user) : null;
  }

  async create(input: CreateUserInput): Promise<AuthUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          fullName: input.name,
          phone: input.phone ?? null,
          role: input.role,
          status: 'active',
          preferredLanguage: API_TO_PRISMA_LANGUAGE[input.preferredLanguage],
        },
      });
      return toAuthUser(user);
    } catch (err) {
      // Constraint único de email (P2002) → conflicto de dominio (defensa en profundidad).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new EmailTakenError();
      }
      throw err;
    }
  }

  async updateProfile(userId: string, fields: UpdateProfileInput): Promise<AuthUser> {
    const data: Prisma.UserUpdateInput = {};
    if (fields.name !== undefined) data.fullName = fields.name;
    if (fields.phone !== undefined) data.phone = fields.phone;
    if (fields.preferredLanguage !== undefined) {
      data.preferredLanguage = API_TO_PRISMA_LANGUAGE[fields.preferredLanguage];
    }
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return toAuthUser(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
