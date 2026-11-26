import { afterEach, describe, expect, it, vi } from "vitest";
import { ticketApi } from "./tickets-api";

describe("ticketApi.listPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends existing pagination and combined filter parameters and returns response metadata", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [],
      error: null,
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ticketApi.listPage("jwt", { page: 2, limit: 20, status: "OPEN", priority: "P1" })).resolves.toEqual({
      data: [],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });

    expect(fetchMock).toHaveBeenCalledWith("/tickets?page=2&limit=20&status=OPEN&priority=P1", expect.objectContaining({ method: "GET" }));
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer jwt");
  });

  it("loads all matching category-filter source records through the supported paginated route", async () => {
    const ticket = (id: number) => ({ id, title: `Ticket ${id}`, description: "Details", status: "OPEN", priority: "P1", category: "Billing", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: null, updatedAt: null });
    const envelope = (page: number, item: ReturnType<typeof ticket>) => new Response(JSON.stringify({ data: [item], error: null, meta: { page, limit: 100, total: 101, totalPages: 2 } }), { status: 200, headers: { "Content-Type": "application/json" } });
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(envelope(1, ticket(1)))
      .mockResolvedValueOnce(envelope(2, ticket(101)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ticketApi.listAll("jwt", { status: "OPEN", priority: "P1" })).resolves.toEqual([ticket(1), ticket(101)]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/tickets?page=1&limit=100&status=OPEN&priority=P1",
      "/tickets?page=2&limit=100&status=OPEN&priority=P1",
    ]);
  });
});
