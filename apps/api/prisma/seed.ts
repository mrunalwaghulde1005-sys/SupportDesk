import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "../src/generated/prisma/client";

interface SeedTicket {
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdByEmail: string;
  assigneeEmail: string;
}

const requiredFields: (keyof SeedTicket)[] = [
  "title",
  "description",
  "status",
  "priority",
  "category",
  "createdByEmail",
  "assigneeEmail",
];

const validStatuses = new Set<string>(Object.values(TicketStatus));
const validPriorities = new Set<string>(Object.values(TicketPriority));

function loadTickets(): SeedTicket[] {
  const filePath = resolve(
    process.cwd(),
    "../../cli/sample-tickets.json"
  );

  const data: unknown = JSON.parse(readFileSync(filePath, "utf8"));

  if (!Array.isArray(data) || data.length !== 50) {
    throw new Error("Expected exactly 50 ticket records.");
  }

  const tickets = data as SeedTicket[];

  for (const [index, ticket] of tickets.entries()) {
    if (
      ticket === null ||
      typeof ticket !== "object" ||
      requiredFields.some(
        (field) =>
          typeof ticket[field] !== "string" ||
          ticket[field].trim() === ""
      )
    ) {
      throw new Error(`Invalid or missing fields in ticket ${index + 1}.`);
    }

    if (!ticket.title.startsWith("[SEED]")) {
      throw new Error(`Ticket ${index + 1} does not have the [SEED] prefix.`);
    }

    if (!validStatuses.has(ticket.status)) {
      throw new Error(`Invalid status in ticket ${index + 1}.`);
    }

    if (!validPriorities.has(ticket.priority)) {
      throw new Error(`Invalid priority in ticket ${index + 1}.`);
    }
  }

  if (new Set(tickets.map((ticket) => ticket.title)).size !== 50) {
    throw new Error("Duplicate ticket titles found.");
  }

  return tickets;
}

function getDisplayName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const match = /^(customer|agent)(\d+)$/i.exec(localPart);

  if (!match) {
    throw new Error(`Unexpected demo user email: ${email}`);
  }

  const roleName = match[1] === "customer" ? "Customer" : "Agent";
  return `${roleName} ${match[2]}`;
}

async function main(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const tickets = loadTickets();

  const customerEmails = new Set(
    tickets.map((ticket) => ticket.createdByEmail)
  );
  const agentEmails = new Set(
    tickets.map((ticket) => ticket.assigneeEmail)
  );

  for (const email of customerEmails) {
    if (agentEmails.has(email)) {
      throw new Error(`User has conflicting roles: ${email}`);
    }
  }

  if (customerEmails.size !== 5 || agentEmails.size !== 3) {
    throw new Error("Expected 5 customers and 3 agents.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      const userIds = new Map<string, number>();

      const demoUsers = [
        ...[...customerEmails].map((email) => ({
          email,
          role: UserRole.CUSTOMER,
        })),
        ...[...agentEmails].map((email) => ({
          email,
          role: UserRole.AGENT,
        })),
      ];

      for (const user of demoUsers) {
        const passwordHash = await hash(
          randomBytes(32).toString("hex"),
          12
        );

        const savedUser = await tx.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            name: getDisplayName(user.email),
            email: user.email,
            passwordHash,
            role: user.role,
          },
        });

        if (savedUser.role !== user.role) {
          throw new Error(`Existing user has an unexpected role: ${user.email}`);
        }

        userIds.set(user.email, savedUser.id);
      }

      const expectedTickets = tickets.map((ticket) => {
        const createdById = userIds.get(ticket.createdByEmail);
        const assigneeId = userIds.get(ticket.assigneeEmail);

        if (createdById === undefined || assigneeId === undefined) {
          throw new Error(`User reference not found for: ${ticket.title}`);
        }

        return {
          title: ticket.title,
          description: ticket.description,
          status: ticket.status as TicketStatus,
          priority: ticket.priority as TicketPriority,
          category: ticket.category,
          createdById,
          assigneeId,
        };
      });

      const existingTickets = await tx.ticket.findMany({
        where: { title: { startsWith: "[SEED]" } },
        select: {
          title: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          createdById: true,
          assigneeId: true,
        },
      });

      if (existingTickets.length > 0) {
        if (existingTickets.length !== 50) {
          throw new Error(
            `Found ${existingTickets.length} existing seed tickets. Expected 0 or 50. No changes made.`
          );
        }

        const sortByTitle = <T extends { title: string }>(items: T[]) =>
          [...items].sort((a, b) => a.title.localeCompare(b.title));

        const existing = JSON.stringify(sortByTitle(existingTickets));
        const expected = JSON.stringify(sortByTitle(expectedTickets));

        if (existing !== expected) {
          throw new Error(
            "Existing seed tickets do not match the JSON file. No changes made."
          );
        }

        console.log("The 50 seed tickets already exist. Skipping insertion.");
        return;
      }

      const result = await tx.ticket.createMany({
        data: expectedTickets,
      });

      if (result.count !== 50) {
        throw new Error(`Expected 50 inserted tickets, got ${result.count}.`);
      }

      console.log(`Successfully inserted ${result.count} tickets.`);
    });

    const [userCount, ticketCount] = await Promise.all([
      prisma.user.count({
        where: {
          email: {
            in: [
              ...customerEmails,
              ...agentEmails,
            ],
          },
        },
      }),
      prisma.ticket.count({
        where: { title: { startsWith: "[SEED]" } },
      }),
    ]);

    console.log("Seed verification:");
    console.log("Demo users:", userCount);
    console.log("Seed tickets:", ticketCount);

    if (userCount !== 8 || ticketCount !== 50) {
      throw new Error("Seed verification failed.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
