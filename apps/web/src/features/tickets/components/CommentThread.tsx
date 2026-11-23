import { useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "../api/comments-api";
import { Button } from "../../../components/ui-components";

interface Props {
  ticketId: number;
  userId: number;
  token: string;
  canCreateComment: boolean;
  showVisibility: boolean;
  defaultOpen?: boolean;
}

export function CommentThread({
  ticketId,
  userId,
  token,
  canCreateComment,
  showVisibility,
  defaultOpen = false,
}: Props): ReactElement {
  const client = useQueryClient();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [body, setBody] = useState("");
  const queryKey = ["ticket-comments", userId, ticketId];
  const query = useQuery({
    queryKey,
    queryFn: () => commentApi.list(ticketId, token),
    enabled: isOpen,
  });
  const mutation = useMutation({
    mutationFn: () =>
      commentApi.create(
        ticketId,
        { body },
        token,
      ),
    onSuccess: async () => {
      setBody("");
      await client.invalidateQueries({ queryKey });
    },
  });

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
      aria-labelledby={`comments-heading-${ticketId}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`comments-heading-${ticketId}`} className="text-xl font-semibold">
          Comments
        </h2>
        <Button
          variant="secondary"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          aria-expanded={isOpen}
          aria-controls={`comments-content-${ticketId}`}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? "Hide Comments" : "View Comments"}
        </Button>
      </div>

      {isOpen && (
        <div id={`comments-content-${ticketId}`}>
          {query.isPending && (
            <p className="mt-4 text-sm text-slate-600" role="status">
              Loading comments…
            </p>
          )}
          {query.isError && (
            <div className="mt-4" role="alert">
              <p className="text-sm text-red-700">{query.error.message}</p>
              <Button
                variant="secondary"
                className="mt-2 border-0 px-0 text-indigo-700 hover:bg-white"
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          {query.data?.length === 0 && (
            <p className="mt-4 text-sm text-slate-600">No comments yet.</p>
          )}
          {query.data && query.data.length > 0 && (
            <ol className="mt-4 space-y-3">
              {query.data.map((comment) => (
                <li key={comment.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{comment.author.name}</span>
                    <time
                      className="text-slate-500"
                      dateTime={comment.createdAt}
                    >
                      {new Date(comment.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {comment.body}
                  </p>
                  {showVisibility && (
                    <span className="mt-2 inline-block text-xs font-medium text-slate-500">
                      {comment.visibility}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          {canCreateComment && <form
            className="mt-5 space-y-3 border-t border-slate-200 pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <label
              className="block text-sm font-medium"
              htmlFor={`comment-body-${ticketId}`}
            >
              Add a comment
            </label>
            <textarea
              id={`comment-body-${ticketId}`}
              className="w-full rounded-xl border border-slate-300 p-3"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
            />
            {mutation.isError && (
              <p className="text-sm text-red-700" role="alert">
                {mutation.error.message}
              </p>
            )}
          {mutation.isSuccess && (
            <p className="text-sm text-emerald-800" role="status">Your comment was posted.</p>
          )}
            <Button
              type="submit"
              disabled={mutation.isPending || body.trim().length === 0}
              loading={mutation.isPending}
            >
              {mutation.isPending ? "Posting…" : "Post comment"}
            </Button>
          </form>}
        </div>
      )}
    </section>
  );
}
