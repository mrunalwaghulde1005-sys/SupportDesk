import { z } from "zod";

export const ticketCategories = ["Technical", "Account", "Billing"] as const;
export const suggestedTicketSchema = z.object({
  category: z.enum(ticketCategories),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
}).strict();

export const suggestedTicketJsonSchema = {
  type: "object",
  properties: {
    category: { type: "string", enum: [...ticketCategories] },
    priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
  },
  required: ["category", "priority"],
  additionalProperties: false,
} as const;

export type SuggestedTicket = z.infer<typeof suggestedTicketSchema>;
