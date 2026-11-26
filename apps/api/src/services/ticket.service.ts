
import { TicketStatus } from "../domain/ticket.ts";
import { HttpError } from "../http/errors.ts";
import * as ticketRepository from "../repositories/ticket.repository.ts";
import * as userRepository from "../repositories/user.repository.ts";
import type {
  CreateTicketInput,
  TicketListQuery,
  UpdateTicketInput,
} from "../validation/ticket.schemas.ts";

type AuthenticatedUser = {
  id: number;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
};

function isCustomer(user: AuthenticatedUser): boolean {
  return user.role === "CUSTOMER";
}

async function getTicketForUser(
  id: number,
  user: AuthenticatedUser,
) {
  const ticket = await ticketRepository.findTicketById(id);

  if (!ticket) {
    throw new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }

  if (isCustomer(user) && ticket.createdById !== user.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "You do not have permission to access this ticket.",
    );
  }

  if (user.role === "AGENT" && ticket.assigneeId !== user.id) {
    throw new HttpError(403, "FORBIDDEN", "Agents may access only tickets assigned to them.");
  }

  return ticket;
}

export async function listTickets(
  query: TicketListQuery,
  user: AuthenticatedUser,
) {
  const result = await ticketRepository.findTickets(
    query,
    isCustomer(user) ? user.id : undefined,
    user.role === "AGENT" ? user.id : undefined,
  );

  return {
    data: result.data,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getTicket(
  id: number,
  user: AuthenticatedUser,
) {
  return getTicketForUser(id, user);
}

export function createTicket(input: CreateTicketInput, user: AuthenticatedUser) {
  if (user.role !== "CUSTOMER") {
    throw new HttpError(403, "FORBIDDEN", "Only customers may create tickets.");
  }
  if (input.assigneeId !== undefined) {
    throw new HttpError(403, "FORBIDDEN", "Ticket assignment is restricted to admins.");
  }
  if (input.status !== TicketStatus.OPEN) {
    throw new HttpError(403, "FORBIDDEN", "Customer tickets must start in OPEN status.");
  }
  return ticketRepository.createTicket(input);
}

export async function updateTicket(
  id: number,
  input: UpdateTicketInput,
  user: AuthenticatedUser,
) {
  await getTicketForUser(id, user);
  const fields = Object.keys(input);
  const allowedFields = user.role === "AGENT"
    ? new Set(["status", "priority"])
    : user.role === "CUSTOMER"
      ? new Set(["title", "description", "priority", "category", "slaDueAt"])
      : new Set(["title", "description", "status", "priority", "category", "slaDueAt"]);
  if (fields.some((field) => !allowedFields.has(field))) {
    const message = user.role === "AGENT"
      ? "Agents may update ticket status and priority only."
      : fields.includes("assigneeId")
        ? "Ticket assignment is restricted to admins."
        : "Customers can track ticket status but may not change it.";
    throw new HttpError(403, "FORBIDDEN", message);
  }
  return ticketRepository.updateTicket(id, input);
}

export async function deleteTicket(
  id: number,
  user: AuthenticatedUser,
) {
  if (user.role === "AGENT") {
    throw new HttpError(403, "FORBIDDEN", "Agents may not delete tickets.");
  }
  await getTicketForUser(id, user);
  return ticketRepository.deleteTicket(id);
}

export async function assignTicket(id: number, assigneeId: number | null, user: AuthenticatedUser) {
  if (user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Only admins may assign tickets.");
  }
  const ticket = await ticketRepository.findTicketById(id);
  if (!ticket) throw new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  if (assigneeId !== null) {
    const assignee = await userRepository.findUserById(assigneeId);
    if (!assignee || assignee.role !== "AGENT") {
      throw new HttpError(400, "INVALID_ASSIGNEE", "Tickets can be assigned only to existing agents.");
    }
  }
  return ticketRepository.updateTicket(id, { assigneeId });
}

export async function closeTicket(
  id: number,
  user: AuthenticatedUser,
) {
  if (user.role === "CUSTOMER") {
    throw new HttpError(403, "FORBIDDEN", "Customers can track ticket status but may not change it.");
  }
  const ticket = await getTicketForUser(id, user);

  if (ticket.status === TicketStatus.CLOSED) {
    throw new HttpError(400, "TICKET_ALREADY_CLOSED", "Ticket is already closed.");
  }

  return ticketRepository.updateTicket(id, {
    status: TicketStatus.CLOSED,
  });
}

export async function reopenTicket(
  id: number,
  user: AuthenticatedUser,
) {
  if (user.role === "CUSTOMER") {
    throw new HttpError(403, "FORBIDDEN", "Customers can track ticket status but may not change it.");
  }
  const ticket = await getTicketForUser(id, user);

  if (ticket.status === TicketStatus.OPEN) {
    throw new HttpError(400, "TICKET_ALREADY_OPEN", "Ticket is already open.");
  }

  return ticketRepository.updateTicket(id, {
    status: TicketStatus.OPEN,
  });
}
