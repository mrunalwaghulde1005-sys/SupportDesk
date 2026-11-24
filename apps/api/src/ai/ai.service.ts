import * as commentService from "../services/comment.service.ts";
import * as ticketService from "../services/ticket.service.ts";
import { HttpError } from "../http/errors.ts";
import { categorizeTicketPromptV1 } from "./prompts/categorize-ticket.v1.ts";
import { suggestReplyPromptV1 } from "./prompts/suggest-reply.v1.ts";
import { getAiProvider } from "./gemini-client.ts";
import { suggestedTicketJsonSchema, suggestedTicketSchema } from "./schemas.ts";
import { logUsage } from "./usage.ts";

export type AiUser = { id: number; role: "CUSTOMER" | "AGENT" | "ADMIN" };

export async function loadContext(ticketId: number, user: AiUser): Promise<string> {
  const ticket = await ticketService.getTicket(ticketId, user);
  const comments = await commentService.listComments(ticketId, user);
  const recentComments = comments.slice(-10).map((comment) => ({
    body: comment.body,
    visibility: comment.visibility,
    authorRole: comment.author.role,
  }));
  if (!ticket.title.trim() && !ticket.description.trim() && recentComments.length === 0) {
    throw new HttpError(400, "EMPTY_TICKET_CONTEXT", "Ticket context is empty.");
  }
  return JSON.stringify({
    ticket: { title: ticket.title, description: ticket.description, status: ticket.status },
    comments: recentComments,
  });
}

export async function suggestReply(
  context: string,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
  requestId?: string,
): Promise<void> {
  let usage;
  let generatedText = "";
  try {
    usage = await getAiProvider().stream({
      instructions: suggestReplyPromptV1.instructions,
      content: context,
      signal,
      requestId,
      onDelta: (delta) => {
        generatedText += delta;
        onDelta(delta);
      },
    });
    if (!signal.aborted && !generatedText.trim()) {
      throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an empty reply.");
    }
  } finally {
    logUsage("suggest_reply", usage, requestId);
  }
}

export async function categorizeTicket(ticketId: number, user: AiUser, requestId?: string) {
  const context = await loadContext(ticketId, user);
  let usage;
  try {
    const result = await getAiProvider().complete({
      instructions: categorizeTicketPromptV1.instructions,
      content: context,
      requestId,
      jsonSchema: suggestedTicketJsonSchema,
    });
    usage = result.usage;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(result.text);
    } catch {
      throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an invalid suggestion.");
    }
    const validation = suggestedTicketSchema.safeParse(parsedJson);
    if (!validation.success) {
      throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an invalid suggestion.");
    }
    return validation.data;
  } finally {
    logUsage("categorize_ticket", usage, requestId);
  }
}
