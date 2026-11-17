import { describe, expect, it } from "vitest";
import { formatTicketDate } from "./format-ticket-date";

describe("formatTicketDate", () => {
  it("formats valid ticket timestamp strings for humans", () => {
    expect(formatTicketDate("2026-11-17T15:45:00.000Z")).toMatch(
      /^17 Nov 2026, \d{1,2}:\d{2} (AM|PM)$/,
    );
  });

  it.each([null, undefined, ""])("handles missing timestamp %s", (value) => {
    expect(formatTicketDate(value)).toBe("Date unavailable");
  });

  it("handles invalid timestamp strings without showing Invalid Date", () => {
    expect(formatTicketDate("not-a-date")).toBe("Date unavailable");
  });
});
