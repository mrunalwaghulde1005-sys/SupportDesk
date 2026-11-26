const { env } = require("../src/config/env.ts");
const { geminiProvider } = require("../src/ai/gemini-client.ts");
const { estimateCostUsd } = require("../src/ai/pricing.ts");
const { logUsage } = require("../src/ai/usage.ts");

function providerResponse({ status = 200, json = {}, body = null, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(json),
    body,
    headers: {
      get: jest.fn((name) => headers[name.toLowerCase()] ?? null),
    },
  };
}

function streamResponse(text, chunkSizes = [text.length]) {
  const encoder = new TextEncoder();
  let offset = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (offset >= text.length) {
        controller.close();
        return;
      }
      const size = chunkSizes.shift() ?? text.length;
      controller.enqueue(encoder.encode(text.slice(offset, offset + size)));
      offset += size;
    },
  });
  return providerResponse({ body });
}

describe("Gemini GenerateContent HTTP adapter", () => {
  const originalFetch = global.fetch;
  const originalKey = env.GEMINI_API_KEY;
  const originalModel = env.GEMINI_MODEL;

  beforeEach(() => {
    env.GEMINI_API_KEY = "test-gemini-key";
    env.GEMINI_MODEL = "gemini-3.5-flash-lite";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    env.GEMINI_API_KEY = originalKey;
    env.GEMINI_MODEL = originalModel;
    jest.restoreAllMocks();
  });

  test("sends a strict JSON-schema GenerateContent request and parses output plus actual usage", async () => {
    global.fetch.mockResolvedValue(providerResponse({
      json: {
        candidates: [{
          content: { parts: [{ text: "{\"category\":\"Billing\",\"priority\":\"P2\"}" }] },
          finishReason: "STOP",
        }],
        usageMetadata: { promptTokenCount: 31, candidatesTokenCount: 12, totalTokenCount: 47 },
      },
    }));
    const schema = { type: "object", properties: { category: { type: "string" } } };

    await expect(geminiProvider.complete({
      instructions: "Classify the ticket.",
      content: "{\"title\":\"Invoice\"}",
      jsonSchema: schema,
    })).resolves.toEqual({
      text: "{\"category\":\"Billing\",\"priority\":\"P2\"}",
      usage: { input_tokens: 31, output_tokens: 12, thinking_tokens: 4, total_tokens: 47 },
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({
      "x-goog-api-key": "test-gemini-key",
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    const requestBody = JSON.parse(options.body);
    expect(requestBody).toMatchObject({
      systemInstruction: { parts: [{ text: "Classify the ticket." }] },
      contents: [{ role: "user", parts: [{ text: "{\"title\":\"Invoice\"}" }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema },
    });
    expect(requestBody.safetySettings).toHaveLength(4);
  });

  test("does not fabricate token usage or cost when the provider omits usage", async () => {
    global.fetch.mockResolvedValue(providerResponse({
      json: { candidates: [{ content: { parts: [{ text: "Draft" }] }, finishReason: "STOP" }] },
    }));
    const log = jest.spyOn(console, "info").mockImplementation(() => {});
    await geminiProvider.complete({ instructions: "Draft.", content: "Ticket." });

    expect(log).not.toHaveBeenCalled();
    expect(estimateCostUsd("gemini-3.5-flash-lite", null, 12, 0)).toBeNull();
    expect(estimateCostUsd("gemini-3.5-flash-lite", 31, 12, null)).toBeNull();
    expect(estimateCostUsd("unknown-model", 31, 12, 0)).toBeNull();
  });

  test("retries 429 and succeeds, respecting Gemini retry delay", async () => {
    global.fetch
      .mockResolvedValueOnce(providerResponse({
        status: 429,
        json: { error: { details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "0s" }] } },
      }))
      .mockResolvedValueOnce(providerResponse({
        json: { candidates: [{ content: { parts: [{ text: "Draft" }] }, finishReason: "STOP" }] },
      }));

    await expect(geminiProvider.complete({ instructions: "Draft.", content: "Ticket." }))
      .resolves.toMatchObject({ text: "Draft" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("retries 503 and succeeds, respecting Retry-After", async () => {
    global.fetch
      .mockResolvedValueOnce(providerResponse({ status: 503, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(providerResponse({
        json: { candidates: [{ content: { parts: [{ text: "Draft" }] }, finishReason: "STOP" }] },
      }));

    await expect(geminiProvider.complete({ instructions: "Draft.", content: "Ticket." }))
      .resolves.toMatchObject({ text: "Draft" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("stops after the configured bounded retry count", async () => {
    global.fetch.mockResolvedValue(providerResponse({
      status: 429,
      headers: { "retry-after": "0" },
    }));

    await expect(geminiProvider.complete({ instructions: "Draft.", content: "Ticket." }))
      .rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test("does not retry non-retryable HTTP errors", async () => {
    global.fetch.mockResolvedValue(providerResponse({ status: 401 }));

    await expect(geminiProvider.complete({ instructions: "Draft.", content: "Ticket." }))
      .rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("aborts during retry delay without issuing another request", async () => {
    global.fetch.mockResolvedValue(providerResponse({
      status: 503,
      headers: { "retry-after": "10" },
    }));
    const controller = new AbortController();
    const pending = geminiProvider.complete({
      instructions: "Draft.",
      content: "Ticket.",
      signal: controller.signal,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();

    await expect(pending).rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("maps malformed success JSON to a sanitized error without retrying", async () => {

    global.fetch.mockResolvedValue({
      ...providerResponse(),
      json: jest.fn().mockRejectedValue(new Error("provider response details")),
    });
    await expect(geminiProvider.complete({ instructions: "Draft.", content: "Ticket." }))
      .rejects.toMatchObject({ status: 502, code: "AI_INVALID_RESPONSE" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("logs only bounded, sanitized upstream error fields and preserves the generic API error", async () => {
    const secret = env.GEMINI_API_KEY;
    global.fetch.mockResolvedValue(providerResponse({
      status: 401,
      json: {
        error: {
          code: 401,
          message: `Invalid key ${secret}\nBearer ${secret} api_key=separate-secret ${"x".repeat(500)}`,
          authorization: `Bearer ${secret}`,
          request_body: secret,
        },
        raw_response: secret,
      },
    }));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(geminiProvider.complete({
      instructions: "Draft.",
      content: "Ticket.",
      requestId: "request-401",
    })).rejects.toMatchObject({
      status: 502,
      code: "AI_PROVIDER_ERROR",
      message: "AI generation failed. Please try again.",
    });

    expect(log).toHaveBeenCalledTimes(1);
    const diagnostic = JSON.parse(log.mock.calls[0][0]);
    expect(diagnostic).toMatchObject({
      event: "gemini_provider_error",
      feature: "categorize_ticket",
      requestId: "request-401",
      upstreamStatus: 401,
      failureKind: "http",
      errorType: null,
      errorCode: "401",
    });
    expect(diagnostic.errorMessage).toContain("[REDACTED]");
    expect(diagnostic.errorMessage.length).toBeLessThanOrEqual(400);
    expect(JSON.stringify(diagnostic)).not.toContain(secret);
    expect(JSON.stringify(diagnostic)).not.toContain("separate-secret");
    expect(diagnostic.authorization).toBeUndefined();
    expect(diagnostic.request_body).toBeUndefined();
    expect(diagnostic.raw_response).toBeUndefined();
  });

  test("logs fetch failures by safe error name without exception messages", async () => {
    const secret = env.GEMINI_API_KEY;
    const failure = new TypeError(`Request failed with Bearer ${secret} and customer@example.com`, {
      cause: Object.assign(new Error(`Sensitive fetch detail ${secret}`), { code: "ECONNRESET" }),
    });
    failure.name = "FetchError";
    global.fetch.mockRejectedValue(failure);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(geminiProvider.complete({
      instructions: "Draft.",
      content: "Ticket.",
      requestId: "request-fetch",
    })).rejects.toMatchObject({
      status: 502,
      code: "AI_PROVIDER_ERROR",
      message: "AI generation failed. Please try again.",
    });

    const diagnostic = JSON.parse(log.mock.calls[0][0]);
    expect(diagnostic).toMatchObject({
      event: "gemini_provider_error",
      requestId: "request-fetch",
      upstreamStatus: null,
      failureKind: "fetch",
      errorType: "FetchError",
      errorCode: "ECONNRESET",
      errorMessage: null,
    });
    expect(JSON.stringify(diagnostic)).not.toContain(secret);
    expect(JSON.stringify(diagnostic)).not.toContain("Request failed");
    expect(JSON.stringify(diagnostic)).not.toContain("customer@example.com");
    expect(JSON.stringify(diagnostic)).not.toContain("Sensitive fetch detail");
    expect(diagnostic.fetchErrorType).toBeUndefined();
  });

  test("does not log unrecognized fetch error names or cause codes", async () => {
    const failure = new Error("Do not log this message");
    failure.name = "Bearer secret-name";
    failure.code = "PRIVATE_CONTENT";
    global.fetch.mockRejectedValue(failure);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(geminiProvider.complete({
      instructions: "Draft.",
      content: "PII: customer@example.com",
    })).rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });

    const diagnostic = JSON.parse(log.mock.calls[0][0]);
    expect(diagnostic.errorType).toBe("UnknownError");
    expect(diagnostic.errorCode).toBeNull();
    expect(JSON.stringify(diagnostic)).not.toContain("Do not log");
    expect(JSON.stringify(diagnostic)).not.toContain("customer@example.com");
    expect(JSON.stringify(diagnostic)).not.toContain("PRIVATE_CONTENT");
    expect(JSON.stringify(diagnostic)).not.toContain("Bearer secret-name");
  });

  test("logs allow-listed fields from failed streaming events and safely handles stream-read errors", async () => {
    const secret = env.GEMINI_API_KEY;
    const streamFailure = [
      'data: {"error":{"type":"server_error","code":"overloaded","message":"',
      secret,
      '\\nPlease retry"}}\n\n',
    ].join("");
    global.fetch.mockResolvedValue(streamResponse(streamFailure));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(geminiProvider.stream({
      instructions: "Draft.",
      content: "Ticket.",
      requestId: "request-stream",
      onDelta: () => {},
    })).rejects.toMatchObject({
      status: 502,
      code: "AI_PROVIDER_ERROR",
      message: "AI generation failed. Please try again.",
    });

    const providerDiagnostic = JSON.parse(log.mock.calls[0][0]);
    expect(providerDiagnostic).toMatchObject({
      event: "gemini_provider_error",
      requestId: "request-stream",
      upstreamStatus: 200,
      failureKind: "stream",
      errorType: "server_error",
      errorCode: "overloaded",
    });
    expect(providerDiagnostic.errorMessage).toContain("[REDACTED]");
    expect(JSON.stringify(providerDiagnostic)).not.toContain(secret);

    global.fetch.mockResolvedValue(providerResponse({
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error(`stream read failed ${secret}`));
        },
      }),
    }));
    await expect(geminiProvider.stream({
      instructions: "Draft.",
      content: "Ticket.",
      requestId: "request-stream-read",
      onDelta: () => {},
    })).rejects.toMatchObject({
      status: 502,
      code: "AI_PROVIDER_ERROR",
      message: "AI generation was interrupted. Please try again.",
    });

    const readDiagnostic = JSON.parse(log.mock.calls[1][0]);
    expect(readDiagnostic).toMatchObject({
      event: "gemini_provider_error",
      requestId: "request-stream-read",
      upstreamStatus: 200,
      failureKind: "stream_read",
      errorMessage: null,
    });
    expect(JSON.stringify(readDiagnostic)).not.toContain(secret);
    expect(JSON.stringify(readDiagnostic)).not.toContain("stream read failed");
    expect(readDiagnostic.fetchErrorType).toBeUndefined();
  });

  test("fails closed when no API key is configured", async () => {
    env.GEMINI_API_KEY = undefined;
    await expect(geminiProvider.complete({ instructions: "Draft.", content: "Ticket." }))
      .rejects.toMatchObject({ status: 503, code: "AI_UNAVAILABLE" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("streams deltas across split chunks and returns provider-reported usage", async () => {
    const eventText = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"index":0}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":" there"}]},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":20,"candidatesTokenCount":5,"totalTokenCount":27}}\n\n',
    ].join("");
    global.fetch.mockResolvedValue(streamResponse(eventText, [11, 9, 17, 3, 5, 2, 1, 13]));
    const deltas = [];

    await expect(geminiProvider.stream({
      instructions: "Draft.",
      content: "Ticket.",
      onDelta: (delta) => deltas.push(delta),
    })).resolves.toEqual({ input_tokens: 20, output_tokens: 5, thinking_tokens: 2, total_tokens: 27 });

    expect(deltas.join("")).toBe("Hello there");
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse");
    expect(options.headers.Accept).toBe("text/event-stream");
    expect(options.headers["x-goog-api-key"]).toBe("test-gemini-key");
    const streamBody = JSON.parse(options.body);
    expect(streamBody).toMatchObject({
      systemInstruction: { parts: [{ text: "Draft." }] },
      contents: [{ role: "user", parts: [{ text: "Ticket." }] }],
    });
    expect(streamBody.safetySettings).toHaveLength(4);
  });

  test("rejects malformed, failed, and prematurely ended streams", async () => {
    global.fetch.mockResolvedValue(streamResponse('data: {"candidates":[{"content":{"parts":[{"text":7}]}}]}\n\n'));
    await expect(geminiProvider.stream({ instructions: "Draft.", content: "Ticket.", onDelta: () => {} }))
      .rejects.toMatchObject({ status: 502, code: "AI_INVALID_RESPONSE" });

    global.fetch.mockResolvedValue(streamResponse('data: {"error":{"code":503,"message":"Provider unavailable"}}\n\n'));
    await expect(geminiProvider.stream({ instructions: "Draft.", content: "Ticket.", onDelta: () => {} }))
      .rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });

    global.fetch.mockResolvedValue(streamResponse('data: {"candidates":[{"content":{"parts":[{"text":"partial"}]}}]}\n\n'));
    await expect(geminiProvider.stream({ instructions: "Draft.", content: "Ticket.", onDelta: () => {} }))
      .rejects.toMatchObject({ status: 502, code: "AI_PROVIDER_ERROR" });
  });
});

describe("AI usage logging", () => {
  const originalModel = env.GEMINI_MODEL;

  afterEach(() => {
    env.GEMINI_MODEL = originalModel;
    jest.restoreAllMocks();
  });

  test("logs provider usage and computes cost only from configured prices and actual counts", () => {
    env.GEMINI_MODEL = "gemini-3.5-flash-lite";
    const log = jest.spyOn(console, "info").mockImplementation(() => {});
    logUsage("categorize_ticket", { input_tokens: 100, output_tokens: 25, thinking_tokens: 5, total_tokens: 130 }, "request-usage");

    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      event: "ai_usage",
      feature: "categorize_ticket",
      requestId: "request-usage",
      model: "gemini-3.5-flash-lite",
      inputTokens: 100,
      outputTokens: 25,
      thinkingTokens: 5,
      totalTokens: 130,
      inputUsdPerMillion: 0.3,
      outputUsdPerMillion: 2.5,
      estimatedCostUsd: 0.000105,
      usageAvailable: true,
    });
  });

  test("logs missing usage and unknown model prices as null rather than estimated values", () => {
    env.GEMINI_MODEL = "unconfigured-model";
    const log = jest.spyOn(console, "info").mockImplementation(() => {});
    logUsage("suggest_reply", undefined, "request-no-usage");

    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      requestId: "request-no-usage",
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
      totalTokens: null,
      inputUsdPerMillion: null,
      outputUsdPerMillion: null,
      estimatedCostUsd: null,
      usageAvailable: false,
    });
  });
});
