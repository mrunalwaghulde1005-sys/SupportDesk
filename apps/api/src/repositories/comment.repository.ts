import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.ts";
import type { CreateCommentInput } from "../validation/comment.schemas.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

export async function findComments(ticketId: number, viewerRole: "CUSTOMER" | "AGENT" | "ADMIN") {
  return prisma.comment.findMany({
    where: {
      ticketId,
      ...(viewerRole === "CUSTOMER"
        ? { visibility: "PUBLIC", author: { role: "AGENT" } }
        : viewerRole === "ADMIN"
          ? { author: { role: { not: "ADMIN" } } }
          : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
}

export async function createComment(
  ticketId: number,
  authorId: number,
  input: CreateCommentInput,
) {
  return prisma.comment.create({
    data: { ticketId, authorId, body: input.body, visibility: input.visibility },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
}
