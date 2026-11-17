import type { ReactElement } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { ticketApi, type TicketInput, type TicketPriority, type TicketStatus } from "../features/tickets/api/tickets-api";

const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100";
export default function CreateTicketPage(): ReactElement {
  const { session } = useAuthentication(); const navigate = useNavigate(); const client = useQueryClient();
  const form = useForm<TicketInput>({ defaultValues: { status: "OPEN", priority: "P3" } });
  const mutation = useMutation({ mutationFn: (input: TicketInput) => ticketApi.create(input, session!.token), onSuccess: async (ticket) => { await client.invalidateQueries({ queryKey: ["tickets"] }); navigate(`/app/tickets/${ticket.id}`, { replace: true, state: { notice: "Ticket created successfully." } }); } });
  const submit: SubmitHandler<TicketInput> = (input) => mutation.mutate(input);
  return <div className="mx-auto max-w-3xl"><Link to="/app" className="text-sm font-semibold text-indigo-700">← Back to tickets</Link><h1 className="mt-5 text-3xl font-semibold text-slate-950">Create a ticket</h1><p className="mt-2 text-slate-600">Tell us what you need help with.</p>
    <form className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" noValidate onSubmit={form.handleSubmit(submit)}>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="title">Title</label><input id="title" className={inputClass} {...form.register("title", { setValueAs: (value: unknown) => typeof value === "string" ? value.trim() : value, required: "Title is required." })} />{form.formState.errors.title && <p className="mt-1 text-sm text-red-700">{form.formState.errors.title.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="category">Category</label><select id="category" className={inputClass} defaultValue="" {...form.register("category", { setValueAs: (value: unknown) => typeof value === "string" ? value.trim() : value, required: "Category is required." })}><option value="" disabled>Select a category</option><option value="Technical">Technical</option><option value="Account">Account</option><option value="Billing">Billing</option></select>{form.formState.errors.category && <p className="mt-1 text-sm text-red-700">{form.formState.errors.category.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="description">Description</label><textarea id="description" rows={5} className={inputClass} {...form.register("description", { setValueAs: (value: unknown) => typeof value === "string" ? value.trim() : value, required: "Description is required." })} />{form.formState.errors.description && <p className="mt-1 text-sm text-red-700">{form.formState.errors.description.message}</p>}</div>
      <div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium" htmlFor="priority">Priority</label><select id="priority" className={inputClass} {...form.register("priority", { required: true })}>{priorities.map((p) => <option key={p} value={p}>{p}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium" htmlFor="status">Status</label><select id="status" className={inputClass} {...form.register("status", { required: true })}>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></div></div>
      {mutation.isError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{mutation.error instanceof Error ? mutation.error.message : "Ticket could not be created."}</p>}
      <div className="flex justify-end gap-3"><Link className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold" to="/app">Cancel</Link><button disabled={mutation.isPending} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{mutation.isPending ? "Creating…" : "Create ticket"}</button></div>
    </form>
  </div>;
}
