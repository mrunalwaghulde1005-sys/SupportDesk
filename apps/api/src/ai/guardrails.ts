import { z } from "zod";
import { suggestedTicketSchema } from "./schemas.ts";

export const AI_TITLE_MAX_LENGTH = 120;
export const AI_DESCRIPTION_MAX_LENGTH = 5000;
export const AI_COMMENT_CONTEXT_MAX_LENGTH = 4000;
export const AI_REPLY_MAX_LENGTH = 5000;
export const AI_TIMEOUT_MS = 15000;

export const aiTicketTextSchema = z.object({
  title: z.string().trim().min(1).max(AI_TITLE_MAX_LENGTH),
  description: z.string().trim().min(1).max(AI_DESCRIPTION_MAX_LENGTH),
});

export function limitText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function maskPii(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]")
    .replace(/\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD_REDACTED]")
    .replace(/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g, "[SSN_REDACTED]")
    .replace(/(?<!\d)(?:\+?\d[\d ().-]{7,}\d)(?!\d)/g, "[PHONE_REDACTED]")
    .replace(/\b(password|passcode|passphrase)\s*(?:is|=|:)\s*[^,\s.;]+/gi, "$1 [PASSWORD_REDACTED]")
    .replace(/\b(?:AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{8,})\b/g, "[SECRET_REDACTED]");
}

export function buildGuardedContext(ticket: unknown, comments: unknown[]): string {
  const maskedTicket = maskPii(JSON.stringify(ticket));
  const maskedComments = comments
    .slice(-10)
    .map((comment) => limitText(maskPii(JSON.stringify(comment)), AI_COMMENT_CONTEXT_MAX_LENGTH));
  return [
    "<UNTRUSTED_TICKET_AND_COMMENT_DATA>",
    limitText(maskedTicket, AI_DESCRIPTION_MAX_LENGTH + AI_TITLE_MAX_LENGTH),
    JSON.stringify(maskedComments),
    "</UNTRUSTED_TICKET_AND_COMMENT_DATA>",
  ].join("\n");
}

const unsafePatterns = [
  /\b(kill|harm|suicide)\b.{0,20}\b(self|someone|a person)\b/i,
  /\b(how to|help me)\b.{0,30}\b(make|build|buy)\b.{0,20}\b(bomb|weapon)\b/i,
  /\b(leak|reveal|print|show)\b.{0,20}\b(api[_ -]?key|password|system prompt|environment variable|secret)\b/i,
];

export function moderationCheck(value: string): { safe: boolean; reason: string | null } {
  if (!value.trim()) return { safe: false, reason: "Empty content" };
  if (unsafePatterns.some((pattern) => pattern.test(value))) {
    return { safe: false, reason: "Unsafe content" };
  }
  return { safe: true, reason: null };
}

export function validateCategorizationJson(text: string): z.infer<typeof suggestedTicketSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Malformed AI JSON");
  }
  return suggestedTicketSchema.parse(parsed);
}
