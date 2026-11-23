import { useQuery } from "@tanstack/react-query";
import { useAuthentication } from "../../auth/auth-context";
import { ticketApi } from "../api/tickets-api";

export function useTickets() {
  const { session } = useAuthentication();

  return useQuery({
    queryKey: ["tickets"],
    queryFn: () => {
      if (session === null) {
        throw new Error("An authenticated session is required to load tickets.");
      }

      return ticketApi.list(session.token);
    },
    enabled: session !== null,
    refetchInterval: 15_000,
  });
}
