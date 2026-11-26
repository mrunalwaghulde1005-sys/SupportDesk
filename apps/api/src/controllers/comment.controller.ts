import type { Request, Response } from "express";
import * as commentService from "../services/comment.service.ts";
import { sendSuccess } from "../http/response.ts";
import { commentTicketIdSchema, createCommentSchema } from "../validation/comment.schemas.ts";

function getUser(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing.");
  return req.user;
}

export async function listComments(req: Request, res: Response): Promise<void> {
  const { id } = commentTicketIdSchema.parse(req.params);
  const comments = await commentService.listComments(id, getUser(req));
  sendSuccess(res, comments);
}

export async function createComment(req: Request, res: Response): Promise<void> {
  const { id } = commentTicketIdSchema.parse(req.params);
  const input = createCommentSchema.parse(req.body);
  const comment = await commentService.createComment(id, input, getUser(req));
  sendSuccess(res, comment, 201);
}
