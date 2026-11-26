import type { ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthentication } from "../features/auth/auth-context";
import { ticketApi, type TicketPriority, type TicketStatus } from "../features/tickets/api/tickets-api";
import { CommentThread } from "../features/tickets/components/CommentThread";
import { TicketAiAssist } from "../features/tickets/components/TicketAiAssist";

const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];

export default function AgentTicketDetailsPage(): ReactElement {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { session } = useAuthentication();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["ticket", id], queryFn: () => ticketApi.get(id, session!.token), enabled: Boolean(session) && Number.isSafeInteger(id) && id > 0 });
  const [status, setStatus] = useState<TicketStatus>();
  const [priority, setPriority] = useState<TicketPriority>();
  const mutation = useMutation({
    mutationFn: () => ticketApi.updateAgentTicket(id, { ...(status ? { status } : {}), ...(priority ? { priority } : {}) }, session!.token),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["ticket", id] }), client.invalidateQueries({ queryKey: ["agent-tickets"] })]); setStatus(undefined); setPriority(undefined); },
  });
  if (!Number.isSafeInteger(id) || id <= 0) return <p className="p-8">Invalid ticket ID.</p>;
  if (query.isPending) return <p className="p-8" role="status">Loading ticket…</p>;
  if (query.isError) return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-semibold">Ticket unavailable</h1><p className="mt-3 text-red-700" role="alert">{query.error.message}</p><button className="mt-5 mr-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" type="button" onClick={() => void query.refetch()}>Retry</button><Link className="mt-5 inline-block text-indigo-700" to="/agent/dashboard">Back to dashboard</Link></main>;
  const ticket = query.data;
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8"><Link className="text-sm font-semibold text-indigo-700" to="/agent/dashboard">← Back to assigned tickets</Link><p className="mt-6 text-sm text-slate-500">Ticket #{ticket.id}</p><h1 className="mt-1 text-3xl font-semibold">{ticket.title}</h1><p className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">{ticket.description}</p><dl className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Category</dt><dd className="mt-1 font-medium">{ticket.category}</dd></div><div><dt className="text-slate-500">Current status</dt><dd className="mt-1 font-medium">{ticket.status.replaceAll("_", " ")}</dd></div><div><dt className="text-slate-500">Current priority</dt><dd className="mt-1 font-medium">{ticket.priority}</dd></div></dl>{session && <TicketAiAssist ticketId={id} token={session.token} isAdmin={false} onSaved={() => Promise.all([client.invalidateQueries({ queryKey: ["ticket", id] }), client.invalidateQueries({ queryKey: ["agent-tickets"] })])} />}<form className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><h2 className="font-semibold">Update ticket</h2><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium" htmlFor="agent-status">Status</label><select id="agent-status" className="w-full rounded-lg border border-slate-300 p-3" value={status ?? ticket.status} onChange={(event) => setStatus(event.target.value as TicketStatus)}>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><div><label className="mb-1 block text-sm font-medium" htmlFor="agent-priority">Priority</label><select id="agent-priority" className="w-full rounded-lg border border-slate-300 p-3" value={priority ?? ticket.priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</select></div></div>{mutation.isError && <p className="text-sm text-red-700" role="alert">{mutation.error.message}</p>}<button className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={mutation.isPending || (!status && !priority)}>{mutation.isPending ? "Saving…" : "Save changes"}</button></form>{session && <CommentThread ticketId={id} userId={session.user.id} token={session.token} canCreateComment showVisibility />}</main>;
}
