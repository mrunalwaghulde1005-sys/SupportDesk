export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_ON_CUSTOMER: "WAITING_ON_CUSTOMER",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export const TicketPriority = {
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
} as const;
