import { HttpError } from "../http/errors.ts";
import * as commentRepository from "../repositories/comment.repository.ts";
import * as ticketRepository from "../repositories/ticket.repository.ts";
import type { CreateCommentInput } from "../validation/comment.schemas.ts";

type AuthenticatedUser = { id: number; role: "CUSTOMER" | "AGENT" | "ADMIN" };

async function getAuthorizedTicket(ticketId: number, user: AuthenticatedUser) {
  const ticket = await ticketRepository.findTicketById(ticketId);
  if (!ticket) throw new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found.");
  if (user.role === "CUSTOMER" && ticket.createdById !== user.id) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to access this ticket.");
  }
  if (user.role === "AGENT" && ticket.assigneeId !== user.id) {
    throw new HttpError(403, "FORBIDDEN", "Agents may access only tickets assigned to them.");
  }
  return ticket;
}

export async function listComments(ticketId: number, user: AuthenticatedUser) {
  await getAuthorizedTicket(ticketId, user);
  return commentRepository.findComments(ticketId, user.role);
}

export async function createComment(
  ticketId: number,
  input: CreateCommentInput,
  user: AuthenticatedUser,
) {
  await getAuthorizedTicket(ticketId, user);
  if (user.role === "CUSTOMER") {
    throw new HttpError(403, "FORBIDDEN", "Customers cannot add comments.");
  }
  // Admin notes are for the assigned agent; agent replies are customer-facing.
  const visibility = user.role === "ADMIN" ? "INTERNAL" : "PUBLIC";
  return commentRepository.createComment(ticketId, user.id, { ...input, visibility });
}
