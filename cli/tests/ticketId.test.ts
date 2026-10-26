
import { generateTicketId } from "../src/ticketId";

describe("generateTicketId", () => {
  test("should return a ticket ID with SD prefix", () => {
    const ticketId = generateTicketId();

    expect(ticketId).toMatch(/^SD-/);
  });

  test("should return a string", () => {
    expect(typeof generateTicketId()).toBe("string");
  });

  test("should generate a non-empty ticket ID", () => {
    expect(generateTicketId().length).toBeGreaterThan(0);
  });

  test("should generate IDs with three parts", () => {
    const ticketId = generateTicketId();

    expect(ticketId.split("-")).toHaveLength(3);
  });
});
