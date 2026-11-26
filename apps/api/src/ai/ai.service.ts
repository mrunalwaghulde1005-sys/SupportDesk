import * as commentService from "../services/comment.service.ts";
import * as ticketService from "../services/ticket.service.ts";
import { HttpError } from "../http/errors.ts";
import { categorizeTicketPromptV1 } from "./prompts/categorize-ticket.v1.ts";
import { suggestReplyPromptV1 } from "./prompts/suggest-reply.v1.ts";
import { getAiProvider } from "./gemini-client.ts";
import { suggestedTicketJsonSchema } from "./schemas.ts";
import { logUsage } from "./usage.ts";
import { AI_TIMEOUT_MS, buildGuardedContext, limitText, moderationCheck, validateCategorizationJson } from "./guardrails.ts";

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
  return buildGuardedContext({
    ticket: { title: ticket.title, description: ticket.description, status: ticket.status },
  }, recentComments);
}

function aiFallbackError(): HttpError {
  return new HttpError(502, "AI_FALLBACK", "AI unavailable — reply manually.");
}

function getFallbackError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    if (error.code === "AI_CONTENT_BLOCKED") return aiFallbackError();
  }
  return aiFallbackError();
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
    const moderation = moderationCheck(context);
    if (!moderation.safe) throw new HttpError(422, "AI_CONTENT_BLOCKED", "AI content moderation blocked this request.");
    usage = await getAiProvider().stream({
      instructions: suggestReplyPromptV1.instructions,
      content: context,
      signal,
      requestId,
      onDelta: (delta) => {
        generatedText += delta;
      },
    });
    if (!signal.aborted && !generatedText.trim()) {
      throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an empty reply.");
    }
    generatedText = limitText(generatedText, 5000);
    const outputModeration = moderationCheck(generatedText);
    if (!outputModeration.safe) throw new HttpError(422, "AI_CONTENT_BLOCKED", "AI content moderation blocked this response.");
    if (!signal.aborted) onDelta(generatedText);
  } catch (error) {
    if (signal.aborted) throw aiFallbackError();
    throw getFallbackError(error);
  } finally {
    logUsage("suggest_reply", usage, requestId);
  }
}

export async function categorizeTicket(ticketId: number, user: AiUser, requestId?: string, signal?: AbortSignal) {
  const context = await loadContext(ticketId, user);
  let usage;
  try {
    const moderation = moderationCheck(context);
    if (!moderation.safe) throw new HttpError(422, "AI_CONTENT_BLOCKED", "AI content moderation blocked this request.");
    const result = await getAiProvider().complete({
      instructions: categorizeTicketPromptV1.instructions,
      content: context,
      signal,
      requestId,
      jsonSchema: suggestedTicketJsonSchema,
    });
    usage = result.usage;
    const validated = validateCategorizationJson(result.text);
    const outputModeration = moderationCheck(result.text);
    if (!outputModeration.safe) throw new HttpError(422, "AI_CONTENT_BLOCKED", "AI content moderation blocked this response.");
    return validated;
  } catch (error) {
    if (signal?.aborted) throw aiFallbackError();
    throw getFallbackError(error);
  } finally {
    logUsage("categorize_ticket", usage, requestId);
  }
}
