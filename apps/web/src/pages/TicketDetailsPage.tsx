import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { formatTicketDate } from "../lib/format-ticket-date";
import { ticketApi, type TicketInput, type TicketPriority, type TicketStatus } from "../features/tickets/api/tickets-api";

const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100";
export default function TicketDetailsPage(): ReactElement {
  const { id: rawId } = useParams(); const id = Number(rawId); const validId = Number.isSafeInteger(id) && id > 0;
  const { session } = useAuthentication(); const navigate = useNavigate(); const location = useLocation(); const client = useQueryClient();
  const query = useQuery({ queryKey: ["ticket", id], queryFn: () => ticketApi.get(id, session!.token), enabled: Boolean(session) && validId });
  const form = useForm<TicketInput>();
  useEffect(() => { if (query.data) form.reset({ title: query.data.title, description: query.data.description, category: query.data.category, status: query.data.status, priority: query.data.priority }); }, [query.data, form]);
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["ticket", id] }), client.invalidateQueries({ queryKey: ["tickets"] })]); };
  const update = useMutation({ mutationFn: (input: TicketInput) => ticketApi.update(id, input, session!.token), onSuccess: refresh });
  const action = useMutation({ mutationFn: (kind: "close" | "reopen") => ticketApi[kind](id, session!.token), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => ticketApi.remove(id, session!.token), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["tickets"] }); navigate("/app", { replace: true }); } });
  const submit: SubmitHandler<TicketInput> = (input) => update.mutate(input);
  const notice = (location.state as { notice?: string } | null)?.notice;
  if (!validId) return <section className="rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Invalid ticket ID</h1><p className="mt-2 text-slate-600">Ticket IDs must be positive numbers.</p><Link className="mt-4 inline-block text-indigo-700" to="/app">Back to tickets</Link></section>;
  if (query.isPending) return <p role="status" className="py-16 text-center text-slate-600">Loading ticket…</p>;
  if (query.isError) return <section className="rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Ticket unavailable</h1><p role="alert" className="mt-2 text-red-700">{query.error instanceof Error ? query.error.message : "This ticket could not be loaded."}</p><Link className="mt-4 inline-block text-indigo-700" to="/app">Back to tickets</Link></section>;
  const ticket = query.data;
  return <div className="mx-auto max-w-3xl"><Link to="/app" className="text-sm font-semibold text-indigo-700">← Back to tickets</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-slate-500">Ticket #{ticket.id}</p><h1 className="mt-1 text-3xl font-semibold text-slate-950">{ticket.title}</h1></div><div className="flex gap-2">{ticket.status === "CLOSED" ? <button className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => action.mutate("reopen")} disabled={action.isPending}>Reopen</button> : <button className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => action.mutate("close")} disabled={action.isPending}>Close ticket</button>}<button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => { if (window.confirm(`Delete ticket #${ticket.id}? This cannot be undone.`)) remove.mutate(); }}>Delete</button></div></div>
    {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
    {(update.isError || action.isError || remove.isError) && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{[update.error, action.error, remove.error].find(Boolean)?.message ?? "The action could not be completed."}</p>}
    <form className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" onSubmit={form.handleSubmit(submit)}>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="title">Title</label><input id="title" className={inputClass} {...form.register("title", { required: "Title is required." })} /></div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="category">Category</label><input id="category" className={inputClass} {...form.register("category", { required: "Category is required." })} /></div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="description">Description</label><textarea id="description" rows={5} className={inputClass} {...form.register("description", { required: "Description is required." })} /></div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium" htmlFor="priority">Priority</label><select id="priority" className={inputClass} {...form.register("priority")}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium" htmlFor="status">Status</label><select id="status" className={inputClass} {...form.register("status")}>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></div></div>
      <p className="text-xs text-slate-500">Created {formatTicketDate(ticket.createdAt)} · Last updated {formatTicketDate(ticket.updatedAt)}</p>
      <div className="flex justify-end"><button disabled={update.isPending} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{update.isPending ? "Saving…" : "Save changes"}</button></div>
    </form>
  </div>;
}
