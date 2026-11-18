import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  apiClient,
  setUnauthorizedHandler,
} from "./api-client";

function response(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("shared API client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setUnauthorizedHandler(() => undefined);
  });

  it("uses the login route through the configured same-origin proxy", async () => {
    fetchMock.mockResolvedValue(
      response(200, {
        data: {
          token: "jwt",
          user: {
            id: 1,
            name: "Agent",
            email: "agent@example.com",
            role: "AGENT",
          },
        },
        error: null,
        meta: {},
      }),
    );

    await apiClient.post("/auth/login", {
      email: "agent@example.com",
      password: "password",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "agent@example.com",
          password: "password",
        }),
      }),
    );
  });

  it("sends bearer tokens and clears auth after a protected request returns 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(
      response(401, {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token.",
        },
        meta: {},
      }),
    );

    await expect(apiClient.get("/tickets", "expired-token")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    } satisfies Partial<ApiClientError>);

    expect(fetchMock).toHaveBeenCalledWith(
      "/tickets",
      expect.objectContaining({
        headers: expect.objectContaining({}),
      }),
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestOptions?.headers).get("Authorization")).toBe(
      "Bearer expired-token",
    );
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
