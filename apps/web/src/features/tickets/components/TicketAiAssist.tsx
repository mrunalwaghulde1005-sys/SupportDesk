import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ticketAiApi, type TicketAiSuggestion } from "../api/ai-api";
import { ticketApi } from "../api/tickets-api";

interface Props {
  ticketId: number;
  token: string;
  isAdmin: boolean;
  onSaved: () => Promise<unknown>;
}

export function TicketAiAssist({ ticketId, token, isAdmin, onSaved }: Props) {
  const [draft, setDraft] = useState("");
  const [suggestion, setSuggestion] = useState<TicketAiSuggestion | null>(null);
  const reply = useMutation({
    mutationFn: (signal: AbortSignal) => ticketAiApi.suggestReply(ticketId, token, (delta) => setDraft((current) => current + delta), signal),
    onMutate: () => setDraft(""),
  });
  const categorize = useMutation({
    mutationFn: () => ticketAiApi.categorize(ticketId, token),
    onMutate: () => setSuggestion(null),
    onSuccess: setSuggestion,
  });
  const apply = useMutation({
    mutationFn: () => isAdmin
      ? ticketApi.update(ticketId, { category: suggestion!.category, priority: suggestion!.priority }, token)
      : ticketApi.updateAgentTicket(ticketId, { priority: suggestion!.priority }, token),
    onSuccess: async () => { setSuggestion(null); await onSaved(); },
  });
  const isBusy = reply.isPending || categorize.isPending || apply.isPending;
  return (
    <section
      className="mt-5 space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5"
      aria-label="AI ticket assistance"
      aria-busy={isBusy}
    >
      <h2 className="font-semibold">AI assistance</h2>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={isBusy}
          onClick={() => reply.mutate(new AbortController().signal)}
        >
          {reply.isPending ? "Generating reply…" : "Suggest reply"}
        </button>
        <button
          className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 disabled:opacity-50"
          type="button"
          disabled={isBusy}
          onClick={() => categorize.mutate()}
        >
          {categorize.isPending ? "Suggesting…" : "Auto-categorise + priority"}
        </button>
      </div>
      {reply.isPending && <p role="status" className="text-sm text-indigo-800">Generating a reply draft…</p>}
      {categorize.isPending && <p role="status" className="text-sm text-indigo-800">Suggesting a category and priority…</p>}
      {reply.isError && <p role="alert" className="text-sm text-red-700">{reply.error.message}</p>}
      {draft && (
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="ai-reply-draft">
            Suggested reply draft (review, edit, and manually send when ready)
          </label>
          <textarea
            id="ai-reply-draft"
            rows={5}
            className="w-full rounded-lg border border-slate-300 bg-white p-3"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
      )}
      {categorize.isError && <p role="alert" className="text-sm text-red-700">{categorize.error.message}</p>}
      {suggestion && (
        <div className="space-y-3 rounded-xl bg-white p-4">
          <p className="font-semibold">AI suggestions</p>
          <p>Category: <strong>{suggestion.category}</strong></p>
          <p>Priority: <strong>{suggestion.priority}</strong></p>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => apply.mutate()}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {apply.isPending ? "Applying…" : isAdmin ? "Apply suggestions" : "Apply priority"}
          </button>
          {!isAdmin && <p className="text-xs text-slate-600">Category changes require an administrator. Your priority change will use the normal ticket update flow.</p>}
          {apply.isError && <p role="alert" className="text-sm text-red-700">{apply.error.message}</p>}
        </div>
      )}
    </section>
  );
}
