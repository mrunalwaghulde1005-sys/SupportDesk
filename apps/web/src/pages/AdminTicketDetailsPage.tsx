import type { ReactElement } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { CommentThread } from "../features/tickets/components/CommentThread";
import { TicketAiAssist } from "../features/tickets/components/TicketAiAssist";
import { ticketApi } from "../features/tickets/api/tickets-api";

export default function AdminTicketDetailsPage(): ReactElement {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const { session } = useAuthentication();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["ticket", "admin", session?.user.id, id],
    queryFn: () => ticketApi.get(id, session!.token),
    enabled: validId && Boolean(session),
  });

  if (!validId) {
    return <p className="p-8">Invalid ticket ID.</p>;
  }
  if (query.isPending) {
    return <p className="p-8" role="status">Loading ticket…</p>;
  }
  if (query.isError) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Ticket unavailable</h1>
        <p className="mt-3 text-red-700" role="alert">{query.error.message}</p>
        <button
          className="mt-5 mr-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
          onClick={() => void query.refetch()}
          type="button"
        >
          Retry
        </button>
        <Link className="mt-5 inline-block text-indigo-700" to="/admin/comments">
          Back to comments
        </Link>
      </main>
    );
  }

  const ticket = query.data;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <Link className="text-sm font-semibold text-indigo-700" to="/admin/comments">
        ← Back to comments
      </Link>
      <p className="mt-6 text-sm text-slate-500">Ticket #{ticket.id}</p>
      <h1 className="mt-1 text-3xl font-semibold">{ticket.title}</h1>
      <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
        {ticket.description}
      </p>
      <dl className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Category</dt><dd className="mt-1 font-medium">{ticket.category}</dd></div>
        <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-medium">{ticket.status.replaceAll("_", " ")}</dd></div>
        <div><dt className="text-slate-500">Priority</dt><dd className="mt-1 font-medium">{ticket.priority}</dd></div>
      </dl>
      {session && (
        <TicketAiAssist
          ticketId={id}
          token={session.token}
          isAdmin
          onSaved={() => Promise.all([
            client.invalidateQueries({ queryKey: ["ticket", "admin", session.user.id, id] }),
            client.invalidateQueries({ queryKey: ["admin-tickets"] }),
          ])}
        />
      )}
      {session && (
        <CommentThread
          ticketId={id}
          userId={session.user.id}
          token={session.token}
          canCreateComment
          showVisibility
          defaultOpen
        />
      )}
    </main>
  );
}
