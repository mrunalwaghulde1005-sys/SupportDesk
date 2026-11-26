import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "../../../lib/api-client";
import { ticketAiApi } from "./ai-api";

function streamingResponse(chunks: string[]) {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(new TextEncoder().encode(chunks[index++]));
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

describe("ticketAiApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("reads a split SSE stream, forwards deltas, and sends the session token", async () => {
    const text = 'data: {"delta":"Hello"}\r\n\r\ndata: {"delta":" there"}\r\n\r\ndata: [DONE]\r\n\r\n';
    const response = streamingResponse([text.slice(0, 17), text.slice(17, 44), text.slice(44)]);
    vi.mocked(fetch).mockResolvedValue(response);
    const deltas: string[] = [];

    await ticketAiApi.suggestReply(7, "session-jwt", (delta) => deltas.push(delta));

    expect(deltas.join("")).toBe("Hello there");
    expect(fetch).toHaveBeenCalledWith("/tickets/7/ai/suggest-reply", {
      method: "POST",
      headers: { Accept: "text/event-stream", Authorization: "Bearer session-jwt" },
      signal: undefined,
    });
  });

  it("rejects incomplete or malformed streams rather than treating them as successful drafts", async () => {
    const incomplete = streamingResponse(['data: {"delta":"partial"}\n\n']);
    vi.mocked(fetch).mockResolvedValueOnce(incomplete);
    await expect(ticketAiApi.suggestReply(7, "jwt", () => {}))
      .rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    const malformed = streamingResponse(["data: not-json\n\ndata: [DONE]\n\n"]);
    vi.mocked(fetch).mockResolvedValueOnce(malformed);
    await expect(ticketAiApi.suggestReply(7, "jwt", () => {}))
      .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("surfaces sanitized server errors for failed streams", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ error: { code: "AI_PROVIDER_ERROR", message: "AI generation failed." } }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    ));

    await expect(ticketAiApi.suggestReply(7, "jwt", () => {})).rejects.toMatchObject({
      code: "AI_REQUEST_FAILED",
      message: "AI generation failed.",
      status: 502,
    } satisfies Partial<ApiClientError>);
  });
});
