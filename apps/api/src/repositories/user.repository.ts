import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.ts";
import { HttpError } from "../http/errors.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: "CUSTOMER",
    },
  });
}

export function findUsersByRole(role: "CUSTOMER" | "AGENT") {
  return prisma.user.findMany({
    where: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { id: "asc" },
  });
}

export async function provisionFirstAdmin(input: { name: string; email: string; passwordHash: string }) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const adminCount = await transaction.user.count({ where: { role: "ADMIN" } });
      if (adminCount > 0) {
        throw new HttpError(409, "ADMIN_ALREADY_PROVISIONED", "An Admin account has already been provisioned.");
      }

      const existingUser = await transaction.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existingUser) {
        throw new HttpError(409, "ADMIN_EMAIL_ALREADY_EXISTS", "That email already belongs to an account. No account was changed.");
      }

      return transaction.user.create({
        data: { ...input, role: "ADMIN" },
        select: { id: true, name: true, email: true, role: true },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") {
        throw new HttpError(409, "ADMIN_EMAIL_ALREADY_EXISTS", "That email already belongs to an account. No account was changed.");
      }
      if (error.code === "P2034") {
        throw new HttpError(409, "ADMIN_PROVISIONING_CONFLICT", "Admin provisioning conflicted with another account change. Retry once.");
      }
    }
    throw error;
  }
}

export async function updateAgentPasswordHash(input: {
  email: string;
  passwordHash: string;
}): Promise<number> {
  const result = await prisma.user.updateMany({
    where: {
      email: input.email,
      role: "AGENT",
    },
    data: {
      passwordHash: input.passwordHash,
    },
  });

  return result.count;
}

export async function disconnectUserDatabase(): Promise<void> {
  await prisma.$disconnect();
}
