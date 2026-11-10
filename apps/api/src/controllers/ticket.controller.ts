import type { Request, Response } from "express";
import * as ticketService from "../services/ticket.service.ts";
import { sendSuccess } from "../http/response.ts";
import {
  createTicketSchema,
  ticketIdSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from "../validation/ticket.schemas.ts";

function parseTicketId(req: Request): number {
  return ticketIdSchema.parse(req.params).id;
}

export async function listTickets(req: Request, res: Response): Promise<void> {
  const query = ticketListQuerySchema.parse(req.query);
  const result = await ticketService.listTickets(query);
  sendSuccess(res, result.data, 200, result.meta);
}

export async function createTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const input = createTicketSchema.parse(req.body);
  const ticket = await ticketService.createTicket(input);
  sendSuccess(res, ticket, 201);
}

export async function getTicket(req: Request, res: Response): Promise<void> {
  const ticket = await ticketService.getTicket(parseTicketId(req));
  sendSuccess(res, ticket);
}

export async function updateTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseTicketId(req);
  const input = updateTicketSchema.parse(req.body);
  const ticket = await ticketService.updateTicket(id, input);
  sendSuccess(res, ticket);
}

export async function deleteTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const ticket = await ticketService.deleteTicket(parseTicketId(req));
  sendSuccess(res, ticket);
}

export async function closeTicket(req: Request, res: Response): Promise<void> {
  const ticket = await ticketService.closeTicket(parseTicketId(req));
  sendSuccess(res, ticket);
}

export async function reopenTicket(
  req: Request,
  res: Response,
): Promise<void> {
  const ticket = await ticketService.reopenTicket(parseTicketId(req));
  sendSuccess(res, ticket);
}
