import { useQuery } from "@tanstack/react-query";
import { useAuthentication } from "../../auth/auth-context";
import { ticketApi, type TicketListParams } from "../api/tickets-api";

export function useTicketPage(
  params: TicketListParams,
  category: string,
  loadCategoryOptions: boolean,
) {
  const { session } = useAuthentication();
  const queryScope = [session?.user.id ?? null, session?.user.role ?? null] as const;
  const pageQuery = useQuery({
    queryKey: ["tickets", ...queryScope, "page", params],
    queryFn: () => {
      if (session === null) throw new Error("An authenticated session is required to load tickets.");
      return ticketApi.listPage(session.token, params);
    },
    enabled: session !== null && category === "all",
    placeholderData: (previousData, previousQuery) =>
      session !== null &&
      previousQuery?.queryKey[1] === session.user.id &&
      previousQuery.queryKey[2] === session.user.role
        ? previousData
        : undefined,
    staleTime: 15_000,
  });

  const categoryQuery = useQuery({
    queryKey: ["tickets", ...queryScope, "category-source", params.status ?? null, params.priority ?? null],
    queryFn: () => {
      if (session === null) throw new Error("An authenticated session is required to load tickets.");
      return ticketApi.listAll(session.token, {
        ...(params.status ? { status: params.status } : {}),
        ...(params.priority ? { priority: params.priority } : {}),
      });
    },
    enabled: session !== null && (category !== "all" || loadCategoryOptions),
    staleTime: 15_000,
  });

  return { pageQuery, categoryQuery };
}
