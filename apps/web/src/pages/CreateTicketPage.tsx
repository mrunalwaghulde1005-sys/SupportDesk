import type { ReactElement } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/ui-components";
import { useAuthentication } from "../features/auth/auth-context";
import { ticketApi, type TicketCreateInput, type TicketPriority } from "../features/tickets/api/tickets-api";
import { createTicketSchema, type CustomerTicketFormInput, type CustomerTicketFormOutput } from "../../../api/src/validation/ticket.schemas.ts";

const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100";

const ticketFormResolver: Resolver<CustomerTicketFormInput, unknown, CustomerTicketFormOutput> = async (values) => {
  const result = createTicketSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };

  const errors: FieldErrors<CustomerTicketFormInput> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field === "title" || field === "description" || field === "category" || field === "priority") {
      errors[field] = { type: issue.code, message: issue.message };
    }
  }
  return { values: {}, errors };
};

export default function CreateTicketPage(): ReactElement {
  const { session } = useAuthentication(); const navigate = useNavigate(); const client = useQueryClient();
  const form = useForm<CustomerTicketFormInput, unknown, CustomerTicketFormOutput>({ defaultValues: { priority: "P3" }, resolver: ticketFormResolver });
  const mutation = useMutation({ mutationFn: (input: TicketCreateInput) => ticketApi.create(input, session!.token), onSuccess: async (ticket) => { await client.invalidateQueries({ queryKey: ["tickets"] }); navigate(`/app/tickets/${ticket.id}`, { replace: true, state: { notice: "Ticket created successfully." } }); } });
  const submit: SubmitHandler<CustomerTicketFormOutput> = ({ title, description, category, priority }) => mutation.mutate({ title, description, category, priority } satisfies TicketCreateInput);
  return <div className="mx-auto max-w-3xl"><Link to="/app" className="text-sm font-semibold text-indigo-700">← Back to tickets</Link><h1 className="mt-5 text-3xl font-semibold text-slate-950">Create a ticket</h1><p className="mt-2 text-slate-600">Tell us what you need help with.</p>
    <form className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8" noValidate onSubmit={form.handleSubmit(submit)}>
      <Input id="title" label="Title" required error={form.formState.errors.title?.message} {...form.register("title")} />
      <div><label className="mb-2 block text-sm font-medium" htmlFor="category">Category</label><select id="category" className={inputClass} defaultValue="" {...form.register("category")}><option value="" disabled>Select a category</option><option value="Technical">Technical</option><option value="Account">Account</option><option value="Billing">Billing</option></select>{form.formState.errors.category && <p className="mt-1 text-sm text-red-700">{form.formState.errors.category.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="description">Description</label><textarea id="description" rows={5} className={inputClass} {...form.register("description")} />{form.formState.errors.description && <p className="mt-1 text-sm text-red-700">{form.formState.errors.description.message}</p>}</div>
      <div><label className="mb-2 block text-sm font-medium" htmlFor="priority">Priority</label><select id="priority" className={inputClass} {...form.register("priority")}>{priorities.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
      {mutation.isError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800"><p role="alert">{mutation.error instanceof Error ? mutation.error.message : "Ticket could not be created."}</p><button className="mt-2 font-semibold underline" type="button" onClick={() => void form.handleSubmit(submit)()}>Retry</button></div>}
      <div className="flex justify-end gap-3"><Link className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold" to="/app">Cancel</Link><button disabled={mutation.isPending} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{mutation.isPending ? "Creating…" : "Create ticket"}</button></div>
    </form>
  </div>;
}
