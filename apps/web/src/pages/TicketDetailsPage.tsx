import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { formatTicketDate } from "../lib/format-ticket-date";
import { ticketApi, type TicketInput, type TicketPriority } from "../features/tickets/api/tickets-api";
import { CommentThread } from "../features/tickets/components/CommentThread";
import { Button, Modal } from "../components/ui-components";

type CustomerTicketUpdate = Omit<TicketInput, "status">;
const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100";
export default function TicketDetailsPage(): ReactElement {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { id: rawId } = useParams(); const id = Number(rawId); const validId = Number.isSafeInteger(id) && id > 0;
  const { session } = useAuthentication(); const navigate = useNavigate(); const location = useLocation(); const client = useQueryClient();
  const query = useQuery({ queryKey: ["ticket", id], queryFn: () => ticketApi.get(id, session!.token), enabled: Boolean(session) && validId, refetchInterval: 15_000 });
  const form = useForm<CustomerTicketUpdate>();
  useEffect(() => { if (query.data) form.reset({ title: query.data.title, description: query.data.description, category: query.data.category, priority: query.data.priority }); }, [query.data, form]);
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["ticket", id] }), client.invalidateQueries({ queryKey: ["tickets"] })]); };
  const update = useMutation({ mutationFn: (input: CustomerTicketUpdate) => ticketApi.update(id, input, session!.token), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => ticketApi.remove(id, session!.token), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["tickets"] }); navigate("/app", { replace: true }); } });
  const submit: SubmitHandler<CustomerTicketUpdate> = (input) => update.mutate(input);
  const notice = (location.state as { notice?: string } | null)?.notice;
  if (!validId) return <section className="rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Invalid ticket ID</h1><p className="mt-2 text-slate-600">Ticket IDs must be positive numbers.</p><Link className="mt-4 inline-block text-indigo-700" to="/app">Back to tickets</Link></section>;
  if (query.isPending) return <p role="status" className="py-16 text-center text-slate-600">Loading ticket…</p>;
  if (query.isError) return <section className="rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Ticket unavailable</h1><p role="alert" className="mt-2 text-red-700">{query.error instanceof Error ? query.error.message : "This ticket could not be loaded."}</p><button className="mt-4 mr-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" type="button" onClick={() => void query.refetch()}>Retry</button><Link className="mt-4 inline-block text-indigo-700" to="/app">Back to tickets</Link></section>;
  const ticket = query.data;
  return <div className="mx-auto max-w-3xl"><Link to="/app" className="text-sm font-semibold text-indigo-700">← Back to tickets</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-slate-500">Ticket #{ticket.id}</p><h1 className="mt-1 text-3xl font-semibold text-slate-950">{ticket.title}</h1><p className="mt-2 text-sm text-slate-600">Status: <span className="font-semibold">{ticket.status.replaceAll("_", " ")}</span></p></div><Button variant="danger" className="shrink-0 whitespace-nowrap" onClick={() => setDeleteOpen(true)}>Delete</Button></div>
    {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
    {(update.isError || remove.isError) && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{[update.error, remove.error].find(Boolean)?.message ?? "The action could not be completed."}</p>}
    <form className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" onSubmit={form.handleSubmit(submit)}>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="title">Title</label><input id="title" aria-invalid={Boolean(form.formState.errors.title)} aria-describedby={form.formState.errors.title ? "title-error" : undefined} className={inputClass} {...form.register("title", { required: "Title is required." })} />{form.formState.errors.title && <p className="mt-1 text-sm text-rose-700" id="title-error" role="alert">{form.formState.errors.title.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="category">Category</label><input id="category" aria-invalid={Boolean(form.formState.errors.category)} aria-describedby={form.formState.errors.category ? "category-error" : undefined} className={inputClass} {...form.register("category", { required: "Category is required." })} />{form.formState.errors.category && <p className="mt-1 text-sm text-rose-700" id="category-error" role="alert">{form.formState.errors.category.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="description">Description</label><textarea id="description" rows={5} aria-invalid={Boolean(form.formState.errors.description)} aria-describedby={form.formState.errors.description ? "description-error" : undefined} className={inputClass} {...form.register("description", { required: "Description is required." })} />{form.formState.errors.description && <p className="mt-1 text-sm text-rose-700" id="description-error" role="alert">{form.formState.errors.description.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="priority">Priority</label><select id="priority" className={inputClass} {...form.register("priority")}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></div>
      <p className="text-xs text-slate-500">Created {formatTicketDate(ticket.createdAt)} · Last updated {formatTicketDate(ticket.updatedAt)}</p>
      <div className="flex justify-end"><button disabled={update.isPending} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{update.isPending ? "Saving…" : "Save changes"}</button></div>
    </form>
    {session && <CommentThread ticketId={id} userId={session.user.id} token={session.token} canCreateComment={false} showVisibility={false} />}
    <Modal open={deleteOpen} onOpenChange={setDeleteOpen} title={`Delete ticket #${ticket.id}?`} description="This action cannot be undone. The ticket and its details will be removed." actions={<><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete ticket</Button></>}>
      <p className="text-sm text-slate-700">Are you sure you want to delete “{ticket.title}”?</p>
    </Modal>
  </div>;
}
