import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commentApi } from "../api/comments-api";
import { CommentThread } from "./CommentThread";

vi.mock("../api/comments-api", () => ({
  commentApi: { list: vi.fn(), create: vi.fn() },
}));

const mockedList = vi.mocked(commentApi.list);

function renderThread(userId: number) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <CommentThread
        ticketId={7}
        userId={userId}
        token={`token-${userId}`}
        canCreateComment={userId === 2}
        showVisibility={userId !== 1}
      />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe("CommentThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue([
      {
        id: 10,
        ticketId: 7,
        authorId: 5,
        body: "Visible ticket update",
        visibility: "PUBLIC",
        createdAt: "2026-11-21T10:00:00.000Z",
        author: { id: 5, name: "Agent Author", role: "AGENT" },
      },
    ]);
  });

  it("opens the comment thread and shows the author and timestamp", async () => {
    renderThread(1);
    expect(mockedList).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View Comments" }));

    expect(await screen.findByText("Visible ticket update")).toBeInTheDocument();
    expect(screen.getByText("Agent Author")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add a comment")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post comment" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Visibility")).not.toBeInTheDocument();
    expect(document.querySelector('time[datetime="2026-11-21T10:00:00.000Z"]'))
      .toBeInTheDocument();
  });

  it("shows the Admin composer immediately without a visibility selector", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CommentThread ticketId={7} userId={3} token="admin-token" canCreateComment showVisibility defaultOpen />
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText("Add a comment")).toBeInTheDocument();
    expect(screen.queryByLabelText("Visibility")).not.toBeInTheDocument();
  });

  it("uses a separate cached comment query for each authenticated user", async () => {
    const view = renderThread(1);
    fireEvent.click(screen.getByRole("button", { name: "View Comments" }));
    await screen.findByText("Visible ticket update");

    view.rerender(
      <QueryClientProvider client={view.client}>
        <CommentThread ticketId={7} userId={2} token="token-2" canCreateComment showVisibility />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    expect(mockedList).toHaveBeenNthCalledWith(1, 7, "token-1");
    expect(mockedList).toHaveBeenNthCalledWith(2, 7, "token-2");
  });
});
