export function generateTicketId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `SD-${timestamp}-${randomPart}`;
}

// Generate 50 Ticket IDs
export function generate50TicketIds(): string[] {
  return Array.from({ length: 50 }, () => generateTicketId());
}

