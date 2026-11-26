import type { Request, Response } from "express";
import { sendError, sendSuccess } from "../http/response.ts";
import { ticketIdSchema } from "../validation/ticket.schemas.ts";
import * as aiService from "../ai/ai.service.ts";

function parseTicketId(req: Request): number {
  return ticketIdSchema.parse(req.params).id;
}
function getUser(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing.");
  return req.user;
}

function getRequestId(res: Response): string | undefined {
  const requestId = res.getHeader("X-Request-ID");
  return typeof requestId === "string" ? requestId : undefined;
}

export async function suggestReply(req: Request, res: Response): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let streamStarted = false;
  const requestId = getRequestId(res);
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const ticketId = parseTicketId(req);
    const context = await aiService.loadContext(ticketId, getUser(req));
    if (controller.signal.aborted) return;
    await aiService.suggestReply(context, controller.signal, (delta) => {
      if (controller.signal.aborted || res.destroyed || !delta) return;
      if (!streamStarted) {
        streamStarted = true;
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
      }
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }, requestId);
    if (!controller.signal.aborted) {
      clearTimeout(timeout);
      res.end("data: [DONE]\n\n");
    }
  } catch (error) {
    clearTimeout(timeout);
    if (res.destroyed) return;
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: "AI unavailable — reply manually." })}\n\n`);
      res.end();
      return;
    }
    if (controller.signal.aborted) {
      sendError(res, 502, "AI_FALLBACK", "AI unavailable — reply manually.");
      return;
    }
    throw error;
  }
}

export async function categorizeTicket(req: Request, res: Response): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const result = await aiService.categorizeTicket(
      parseTicketId(req),
      getUser(req),
      getRequestId(res),
      controller.signal,
    );
    clearTimeout(timeout);
    sendSuccess(res, result);
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
