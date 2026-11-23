import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { commentApi, type TicketComment } from "../features/tickets/api/comments-api";
import { adminApi, ticketApi, type Ticket } from "../features/tickets/api/tickets-api";
import { formatTicketDate } from "../lib/format-ticket-date";

interface CommentRow extends TicketComment {
  ticketTitle: string;
}

async function listRoleComments(
  role: "CUSTOMER" | "AGENT" | "ADMIN",
  token: string,
): Promise<CommentRow[]> {
  const tickets = role === "ADMIN"
    ? await adminApi.listTickets(token)
    : await ticketApi.list(token);
  const rows: CommentRow[] = [];

  for (let start = 0; start < tickets.length; start += 10) {
    const batch = tickets.slice(start, start + 10);
    const commentsByTicket = await Promise.all(
      batch.map(async (ticket: Ticket) => ({
        ticket,
        comments: await commentApi.list(ticket.id, token),
      })),
    );
    for (const { ticket, comments } of commentsByTicket) {
      rows.push(...comments.map((comment) => ({ ...comment, ticketTitle: ticket.title })));
    }
  }

  return rows;
}

export default function CommentsPage(): ReactElement {
  const { session } = useAuthentication();
  const role = session?.user.role;
  const query = useQuery({
    queryKey: ["role-comments", role, session?.user.id],
    queryFn: () => listRoleComments(role!, session!.token),
    enabled: Boolean(session),
  });
  const visibleComments = query.data?.filter((comment) =>
    role !== "CUSTOMER" ||
    (comment.visibility === "PUBLIC" && comment.author.role === "AGENT"),
  );
  const ticketPath = (ticketId: number): string =>
    role === "ADMIN"
      ? `/admin/tickets/${ticketId}`
      : role === "AGENT"
        ? `/agent/tickets/${ticketId}`
        : `/app/tickets/${ticketId}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
          Ticket conversations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Comments
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {role === "CUSTOMER"
            ? "Public updates from Agents on your tickets."
            : role === "AGENT"
              ? "Comments on tickets assigned to you."
              : "Comments across all SupportDesk tickets."}
        </p>
      </header>

      <section
        aria-label="Ticket comments"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]"
      >
        {query.isPending && (
          <p className="px-5 py-14 text-center text-sm text-slate-500" role="status">
            Loading comments…
          </p>
        )}
        {query.isError && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-rose-700" role="alert">
              {query.error.message}
            </p>
            <button
              className="mt-4 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-indigo-50"
              onClick={() => void query.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        )}
        {query.isSuccess && visibleComments?.length === 0 && (
          <p className="px-5 py-14 text-center text-sm text-slate-500">
            No comments to show yet.
          </p>
        )}
        {query.isSuccess && visibleComments && visibleComments.length > 0 && (
          <ol className="divide-y divide-slate-100">
            {visibleComments.map((comment) => (
              <li className="p-5 sm:px-6" key={`${comment.ticketId}-${comment.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                      to={ticketPath(comment.ticketId)}
                    >
                      Ticket #{comment.ticketId}
                    </Link>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {comment.ticketTitle}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {comment.author.name}
                      {role !== "CUSTOMER" && ` · ${comment.author.role}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {role !== "CUSTOMER" && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {comment.visibility}
                      </span>
                    )}
                    <time
                      className="text-xs text-slate-500"
                      dateTime={comment.createdAt}
                    >
                      {formatTicketDate(comment.createdAt)}
                    </time>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {comment.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
