import { CommentVisibility } from "../generated/prisma/enums.ts";
import { z } from "zod";

export const commentTicketIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  visibility: z.enum(CommentVisibility).default(CommentVisibility.PUBLIC),
}).strict();

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
