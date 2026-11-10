import { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.ts";
import { HttpError } from "../http/errors.ts";
import type {
  CreateTicketInput,
  TicketListQuery,
  UpdateTicketInput,
} from "../validation/ticket.schemas.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      throw new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found.");
    }

    if (error.code === "P2002") {
      throw new HttpError(
        409,
        "CONFLICT",
        "A record with the provided unique value already exists.",
      );
    }

    if (error.code === "P2003") {
      throw new HttpError(
        409,
        "RELATED_RECORD_CONFLICT",
        "Ticket references are invalid or related records prevent this change.",
      );
    }
  }

  throw error;
}

export async function findTickets(query: TicketListQuery) {
  const where: Prisma.TicketWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
  };
  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { id: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return { data, total };
}

export async function findTicketById(id: number) {
  return prisma.ticket.findUnique({ where: { id } });
}

export async function createTicket(input: CreateTicketInput) {
  try {
    return await prisma.ticket.create({
      data: input satisfies Prisma.TicketUncheckedCreateInput,
    });
  } catch (error: unknown) {
    return translatePrismaError(error);
  }
}

export async function updateTicket(id: number, input: UpdateTicketInput) {
  try {
    return await prisma.ticket.update({
      where: { id },
      data: input satisfies Prisma.TicketUncheckedUpdateInput,
    });
  } catch (error: unknown) {
    return translatePrismaError(error);
  }
}

export async function deleteTicket(id: number) {
  try {
    return await prisma.ticket.delete({ where: { id } });
  } catch (error: unknown) {
    return translatePrismaError(error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
