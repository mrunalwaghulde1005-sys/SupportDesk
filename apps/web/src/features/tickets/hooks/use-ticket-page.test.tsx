import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TicketListPage, TicketListParams } from "../api/tickets-api";

const mocks = vi.hoisted(() => ({
  auth: { session: null as null | { token: string; user: { id: number; role: "CUSTOMER" | "AGENT" | "ADMIN" } } },
  listPage: vi.fn(),
  listAll: vi.fn(),
}));

vi.mock("../../auth/auth-context", () => ({ useAuthentication: () => ({ session: mocks.auth.session }) }));
vi.mock("../api/tickets-api", () => ({ ticketApi: { listPage: mocks.listPage, listAll: mocks.listAll } }));

import { useTicketPage } from "./use-ticket-page";

const params: TicketListParams = { page: 1, limit: 20 };

function pageFor(id: number): TicketListPage {
  return {
    data: [{ id, title: `Ticket ${id}`, description: "Details", status: "OPEN", priority: "P2", category: "Account", assigneeId: null, slaDueAt: null, createdById: id, createdAt: null, updatedAt: null }],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };
}

describe("useTicketPage identity isolation", () => {
  afterEach(() => {
    mocks.auth.session = null;
    mocks.listPage.mockReset();
    mocks.listAll.mockReset();
  });

  it("does not show previous-user data as placeholder after an account change or logout", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    let finishSecondRequest: ((data: TicketListPage) => void) | undefined;
    mocks.listPage.mockResolvedValueOnce(pageFor(1)).mockImplementationOnce(() => new Promise<TicketListPage>((resolve) => { finishSecondRequest = resolve; }));
    mocks.auth.session = { token: "first", user: { id: 1, role: "CUSTOMER" } };

    const { result, rerender, unmount } = renderHook(() => useTicketPage(params, "all", false), { wrapper });
    await waitFor(() => expect(result.current.pageQuery.data?.data[0]?.id).toBe(1));

    mocks.auth.session = { token: "second", user: { id: 2, role: "CUSTOMER" } };
    rerender();
    await waitFor(() => expect(mocks.listPage).toHaveBeenCalledTimes(2));
    expect(result.current.pageQuery.data).toBeUndefined();
    finishSecondRequest?.(pageFor(2));
    await waitFor(() => expect(result.current.pageQuery.data?.data[0]?.id).toBe(2));

    mocks.auth.session = null;
    rerender();
    expect(result.current.pageQuery.data).toBeUndefined();
    unmount();
    client.clear();
  });
});
