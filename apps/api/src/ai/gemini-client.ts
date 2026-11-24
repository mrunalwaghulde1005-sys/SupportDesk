import { env } from "../config/env.ts";
import { HttpError } from "../http/errors.ts";
import type { AiFeature, ProviderUsage } from "./usage.ts";

type JsonRecord = Record<string, unknown>;

interface ProviderErrorDetails {
  type: string | null;
  code: string | null;
  message: string | null;
}

const emptyProviderError: ProviderErrorDetails = { type: null, code: null, message: null };
const providerFieldLength = 400;
const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeProviderField(value: unknown, limit = providerFieldLength): string | null {
  if (typeof value !== "string") return null;
  let sanitized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi, "[REDACTED]")
    .replace(/\b(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*[^,\s;&]+/gi, "$1=[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]");
  if (env.GEMINI_API_KEY) sanitized = sanitized.split(env.GEMINI_API_KEY).join("[REDACTED]");
  return sanitized.replace(/\s+/g, " ").trim().slice(0, limit);
}

function readProviderError(value: unknown): ProviderErrorDetails {
  if (!isRecord(value)) return emptyProviderError;
  const providerError = isRecord(value.error) ? value.error : value;
  const code = typeof providerError.code === "string" || typeof providerError.code === "number"
    ? String(providerError.code)
    : null;
  return {
    type: sanitizeProviderField(providerError.type, 100),
    code: sanitizeProviderField(code, 100),
    message: sanitizeProviderField(providerError.message),
  };
}

function logProviderError(input: {
  feature: AiFeature;
  requestId?: string;
  upstreamStatus: number | null;
  failureKind: "http" | "fetch" | "response_parse" | "stream" | "stream_read";
  details?: ProviderErrorDetails;
}): void {
  console.error(JSON.stringify({
    event: "gemini_provider_error",
    feature: input.feature,
    requestId: input.requestId ?? null,
    upstreamStatus: input.upstreamStatus,
    failureKind: input.failureKind,
    errorType: input.details?.type ?? null,
    errorCode: input.details?.code ?? null,
    errorMessage: input.details?.message ?? null,
  }));
}

export interface TextGenerationResult {
  text: string;
  usage?: ProviderUsage;
}

export interface AiProvider {
  complete(input: {
    instructions: string;
    content: string;
    signal?: AbortSignal;
    requestId?: string;
    jsonSchema?: Record<string, unknown>;
  }): Promise<TextGenerationResult>;
  stream(input: {
    instructions: string;
    content: string;
    signal?: AbortSignal;
    requestId?: string;
    onDelta: (delta: string) => void;
  }): Promise<ProviderUsage | undefined>;
}

function readUsage(value: unknown): ProviderUsage | undefined {
  if (!isRecord(value)) return undefined;
  const usage: ProviderUsage = {};
  const readCount = (count: unknown): number | undefined =>
    Number.isSafeInteger(count) && (count as number) >= 0 ? count as number : undefined;
  const inputTokens = readCount(value.promptTokenCount);
  const outputTokens = readCount(value.candidatesTokenCount);
  const totalTokens = readCount(value.totalTokenCount);
  const reportedThinkingTokens = readCount(value.thoughtsTokenCount);
  if (inputTokens !== undefined) usage.input_tokens = inputTokens;
  if (outputTokens !== undefined) usage.output_tokens = outputTokens;
  if (totalTokens !== undefined) usage.total_tokens = totalTokens;
  if (reportedThinkingTokens !== undefined) {
    usage.thinking_tokens = reportedThinkingTokens;
  } else if (
    inputTokens !== undefined &&
    outputTokens !== undefined &&
    totalTokens !== undefined &&
    totalTokens >= inputTokens + outputTokens
  ) {
    // This request does not enable tools, so the remaining reported tokens are model thoughts.
    usage.thinking_tokens = totalTokens - inputTokens - outputTokens;
  }
  return Object.keys(usage).length ? usage : undefined;
}

function readCandidateText(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return "";
  const candidate = value.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) return "";
  return candidate.content.parts.flatMap((part) =>
    isRecord(part) && typeof part.text === "string" ? [part.text] : [],
  ).join("");
}

function configError(): HttpError {
  return new HttpError(503, "AI_UNAVAILABLE", "AI features are not configured.");
}

function requestBody(instructions: string, content: string, jsonSchema?: Record<string, unknown>): JsonRecord {
  return {
    systemInstruction: { parts: [{ text: instructions }] },
    contents: [{ role: "user", parts: [{ text: content }] }],
    ...(jsonSchema ? {
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    } : {}),
  };
}

async function post(
  body: JsonRecord,
  streaming: boolean,
  signal: AbortSignal | undefined,
  feature: AiFeature,
  requestId?: string,
): Promise<Response> {
  if (!env.GEMINI_API_KEY) throw configError();
  const streamQuery = streaming ? "?alt=sse" : "";
  const url = `${apiUrl}/${encodeURIComponent(env.GEMINI_MODEL)}:${streaming ? "streamGenerateContent" : "generateContent"}${streamQuery}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY,
        "Content-Type": "application/json",
        Accept: streaming ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      let details = emptyProviderError;
      try {
        details = readProviderError(await response.json());
      } catch {
        // Provider response bodies are never logged unless allow-listed fields parse successfully.
      }
      logProviderError({
        feature,
        requestId,
        upstreamStatus: response.status,
        failureKind: "http",
        details,
      });
      throw new HttpError(502, "AI_PROVIDER_ERROR", "AI generation failed. Please try again.");
    }
    return response;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (!signal?.aborted) {
      logProviderError({
        feature,
        requestId,
        upstreamStatus: null,
        failureKind: "fetch",
      });
    }
    throw new HttpError(502, "AI_PROVIDER_ERROR", "AI generation failed. Please try again.");
  }
}

export const geminiProvider: AiProvider = {
  async complete({ instructions, content, signal, requestId, jsonSchema }) {
    const response = await post(
      requestBody(instructions, content, jsonSchema),
      false,
      signal,
      "categorize_ticket",
      requestId,
    );
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      logProviderError({
        feature: "categorize_ticket",
        requestId,
        upstreamStatus: response.status,
        failureKind: "response_parse",
      });
      throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an invalid response.");
    }
    const text = readCandidateText(value);
    if (!text) {
      logProviderError({
        feature: "categorize_ticket",
        requestId,
        upstreamStatus: response.status,
        failureKind: "response_parse",
      });
      throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an empty response.");
    }
    const usage = isRecord(value) ? readUsage(value.usageMetadata) : undefined;
    return { text, ...(usage ? { usage } : {}) };
  },
  async stream({ instructions, content, signal, requestId, onDelta }): Promise<ProviderUsage | undefined> {
    const response = await post(
      requestBody(instructions, content),
      true,
      signal,
      "suggest_reply",
      requestId,
    );
    if (!response.body) {
      logProviderError({
        feature: "suggest_reply",
        requestId,
        upstreamStatus: response.status,
        failureKind: "stream",
      });
      throw new HttpError(502, "AI_PROVIDER_ERROR", "AI streaming is unavailable.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let usage: ProviderUsage | undefined;
    let completed = false;
    const processEvent = (eventText: string) => {
      const data = eventText.split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) return;

      let event: unknown;
      try {
        event = JSON.parse(data);
      } catch {
        logProviderError({
          feature: "suggest_reply",
          requestId,
          upstreamStatus: response.status,
          failureKind: "stream",
        });
        throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an invalid streaming response.");
      }
      if (!isRecord(event)) {
        logProviderError({
          feature: "suggest_reply",
          requestId,
          upstreamStatus: response.status,
          failureKind: "stream",
        });
        throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an invalid streaming response.");
      }
      if (isRecord(event.error)) {
        logProviderError({
          feature: "suggest_reply",
          requestId,
          upstreamStatus: response.status,
          failureKind: "stream",
          details: readProviderError(event),
        });
        throw new HttpError(502, "AI_PROVIDER_ERROR", "AI generation failed. Please try again.");
      }

      const eventUsage = readUsage(event.usageMetadata);
      if (eventUsage) usage = eventUsage;

      if (Array.isArray(event.candidates)) {
        const candidate = event.candidates[0];
        if (isRecord(candidate)) {
          if (isRecord(candidate.content) && Array.isArray(candidate.content.parts)) {
            for (const part of candidate.content.parts) {
              if (!isRecord(part) || !("text" in part)) continue;
              if (typeof part.text !== "string") {
                logProviderError({
                  feature: "suggest_reply",
                  requestId,
                  upstreamStatus: response.status,
                  failureKind: "stream",
                });
                throw new HttpError(502, "AI_INVALID_RESPONSE", "AI returned an invalid streaming response.");
              }
              onDelta(part.text);
            }
          }
          if (candidate.finishReason !== undefined) {
            if (candidate.finishReason !== "STOP") {
              logProviderError({
                feature: "suggest_reply",
                requestId,
                upstreamStatus: response.status,
                failureKind: "stream",
              });
              throw new HttpError(502, "AI_PROVIDER_ERROR", "AI generation failed. Please try again.");
            }
            completed = true;
          }
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const event of events) processEvent(event);
      }
      buffer += decoder.decode();
      if (buffer.trim()) processEvent(buffer);
      if (!completed && !signal?.aborted) {
        logProviderError({
          feature: "suggest_reply",
          requestId,
          upstreamStatus: response.status,
          failureKind: "stream",
        });
        throw new HttpError(502, "AI_PROVIDER_ERROR", "AI generation ended before completion.");
      }
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof HttpError) throw error;
      logProviderError({
        feature: "suggest_reply",
        requestId,
        upstreamStatus: response.status,
        failureKind: "stream_read",
      });
      throw new HttpError(502, "AI_PROVIDER_ERROR", "AI generation was interrupted. Please try again.");
    } finally {
      reader.releaseLock();
    }
    return usage;
  },
};

let provider: AiProvider = geminiProvider;
export function setAiProviderForTests(value: AiProvider): () => void {
  const previous = provider;
  provider = value;
  return () => { provider = previous; };
}
export function getAiProvider(): AiProvider { return provider; }
