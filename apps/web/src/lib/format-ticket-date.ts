const unavailableDate = "Date unavailable";

export function formatTicketDate(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return unavailableDate;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return unavailableDate;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")} ${part("dayPeriod").toUpperCase()}`;
}
