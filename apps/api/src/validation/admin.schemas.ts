import { z } from "zod";

export const assignTicketSchema = z.object({
  assigneeId: z.number().int().positive().nullable(),
}).strict();

export const userListSchema = z.object({
  role: z.enum(["CUSTOMER", "AGENT"]).default("CUSTOMER"),
});
