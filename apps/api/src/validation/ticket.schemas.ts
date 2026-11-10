import { TicketPriority, TicketStatus } from "../domain/ticket.ts";
import { z } from "zod";

const ticketFields = {
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  status: z.enum(TicketStatus),
  priority: z.enum(TicketPriority),
  category: z.string().trim().min(1),
  createdById: z.number().int().positive(),
  assigneeId: z.number().int().positive().nullable().optional(),
  slaDueAt: z
    .iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .nullable()
    .optional(),
};

export const createTicketSchema = z.object(ticketFields).strict();

export const updateTicketSchema = z
  .object(ticketFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one ticket field must be provided.",
  });

export const ticketIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const ticketListQuerySchema = z.object({
  status: z.enum(TicketStatus).optional(),
  priority: z.enum(TicketPriority).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
