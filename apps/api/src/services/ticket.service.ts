import { TicketStatus } from "../domain/ticket.ts";
import { HttpError } from "../http/errors.ts";
import * as ticketRepository from "../repositories/ticket.repository.ts";
import type {
  CreateTicketInput,
  TicketListQuery,
  UpdateTicketInput,
} from "../validation/ticket.schemas.ts";

export async function listTickets(query: TicketListQuery) {
  const result = await ticketRepository.findTickets(query);
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

export async function getTicket(id: number) {
  const ticket = await ticketRepository.findTicketById(id);
  if (!ticket) {
    throw new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  }
  return ticket;
}

export function createTicket(input: CreateTicketInput) {
  return ticketRepository.createTicket(input);
}

export function updateTicket(id: number, input: UpdateTicketInput) {
  return ticketRepository.updateTicket(id, input);
}

export function deleteTicket(id: number) {
  return ticketRepository.deleteTicket(id);
}

export async function closeTicket(id: number) {
  const ticket = await getTicket(id);
  if (ticket.status === TicketStatus.CLOSED) {
    throw new HttpError(400, "TICKET_ALREADY_CLOSED", "Ticket is already closed.");
  }
  return ticketRepository.updateTicket(id, { status: TicketStatus.CLOSED });
}

export async function reopenTicket(id: number) {
  const ticket = await getTicket(id);
  if (ticket.status === TicketStatus.OPEN) {
    throw new HttpError(400, "TICKET_ALREADY_OPEN", "Ticket is already open.");
  }
  return ticketRepository.updateTicket(id, { status: TicketStatus.OPEN });
}
