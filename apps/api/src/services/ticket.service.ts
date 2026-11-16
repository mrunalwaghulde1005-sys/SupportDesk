
import { TicketStatus } from "../domain/ticket.ts";
import { HttpError } from "../http/errors.ts";
import * as ticketRepository from "../repositories/ticket.repository.ts";
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

  return ticket;
}

export async function listTickets(
  query: TicketListQuery,
  user: AuthenticatedUser,
) {
  const result = await ticketRepository.findTickets(
    query,
    isCustomer(user) ? user.id : undefined,
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

export function createTicket(input: CreateTicketInput) {
  return ticketRepository.createTicket(input);
}

export async function updateTicket(
  id: number,
  input: UpdateTicketInput,
  user: AuthenticatedUser,
) {
  await getTicketForUser(id, user);
  return ticketRepository.updateTicket(id, input);
}

export async function deleteTicket(
  id: number,
  user: AuthenticatedUser,
) {
  await getTicketForUser(id, user);
  return ticketRepository.deleteTicket(id);
}

export async function closeTicket(
  id: number,
  user: AuthenticatedUser,
) {
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
  const ticket = await getTicketForUser(id, user);

  if (ticket.status === TicketStatus.OPEN) {
    throw new HttpError(400, "TICKET_ALREADY_OPEN", "Ticket is already open.");
  }

  return ticketRepository.updateTicket(id, {
    status: TicketStatus.OPEN,
  });
}
