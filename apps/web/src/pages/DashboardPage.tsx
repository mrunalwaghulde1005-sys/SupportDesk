import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { ticketApi, type Ticket } from "../features/tickets/api/tickets-api";
import { formatTicketDate } from "../lib/format-ticket-date";

function label(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function TicketRow({ ticket }: { ticket: Ticket }): ReactElement {
  return <Link to={`/app/tickets/${ticket.id}`} className="grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center">
    <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{ticket.title}</p><p className="mt-1 text-xs text-slate-500">#{ticket.id} · {ticket.category} · Updated {formatTicketDate(ticket.updatedAt)}</p></div>
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${ticket.status === "CLOSED" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"}`}>{label(ticket.status)}</span>
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${ticket.priority === "P1" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{ticket.priority}</span>
  </Link>;
}
export default function DashboardPage(): ReactElement {
  const { session } = useAuthentication();
  const query = useQuery({ queryKey: ["tickets"], queryFn: () => ticketApi.list(session!.token), enabled: Boolean(session) });
  return <div>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-indigo-700">Overview</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Welcome to SupportDesk</h1><p className="mt-2 text-slate-600">Track your support tickets and follow up with the support team.</p></div><Link className="rounded-xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-800" to="/app/tickets/new">Create ticket</Link></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">All tickets</h2></div>
      {query.isPending && <p className="px-5 py-12 text-center text-sm text-slate-500" role="status">Loading tickets…</p>}
      {query.isError && <div className="px-5 py-10 text-center"><p className="text-sm text-red-700" role="alert">{query.error instanceof Error ? query.error.message : "Tickets could not be loaded."}</p><button className="mt-3 text-sm font-semibold text-indigo-700" onClick={() => void query.refetch()}>Try again</button></div>}
      {query.isSuccess && query.data.length === 0 && <div className="px-5 py-12 text-center"><h3 className="font-semibold text-slate-900">No tickets yet</h3><p className="mt-2 text-sm text-slate-600">Create a ticket and the support team will follow up.</p><Link to="/app/tickets/new" className="mt-4 inline-block text-sm font-semibold text-indigo-700">Create your first ticket →</Link></div>}
      {query.isSuccess && query.data.length > 0 && query.data.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)}
    </section>
  </div>;
}
