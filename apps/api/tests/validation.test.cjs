const {
  createTicketSchema,
  ticketIdSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} = require("../src/validation/ticket.schemas.ts");
const { envSchema } = require("../src/config/env.ts");

const validTicket = {
  title: "Cannot sign in",
  description: "The sign-in page rejects my credentials.",
  status: "OPEN",
  priority: "P2",
  category: "Account",
  createdById: 1,
};

describe("environment validation", () => {
  test("requires database URL and API key without echoing values", () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
    const messages = result.error.issues.map((issue) => issue.message).join(" ");
    expect(messages).toContain("DATABASE_URL is required");
    expect(messages).toContain("API_KEY is required");
    expect(messages).not.toContain("postgresql://");
  });

  test("rejects malformed configuration and accepts valid values/defaults", () => {
    expect(
      envSchema.safeParse({
        DATABASE_URL: "not-a-postgres-url",
        API_KEY: "too-short",
        PORT: "70000",
      }).success,
    ).toBe(false);

    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://localhost:5432/supportdesk_test",
      API_KEY: "test-api-key-for-jest-only-1234567890",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe("development");
    }
  });
});

describe("ticket request validation", () => {
  test("accepts a complete ticket and rejects unknown fields", () => {
    expect(createTicketSchema.safeParse(validTicket).success).toBe(true);
    expect(
      createTicketSchema.safeParse({ ...validTicket, internalNote: "private" })
        .success,
    ).toBe(false);
  });

  test("rejects invalid ticket values and missing required fields", () => {
    expect(
      createTicketSchema.safeParse({ ...validTicket, priority: "urgent" })
        .success,
    ).toBe(false);
    expect(
      createTicketSchema.safeParse({ ...validTicket, createdById: 0 }).success,
    ).toBe(false);
    expect(createTicketSchema.safeParse({ title: "Only a title" }).success).toBe(
      false,
    );
  });

  test("requires at least one valid update field", () => {
    expect(updateTicketSchema.safeParse({ priority: "P1" }).success).toBe(true);
    expect(updateTicketSchema.safeParse({}).success).toBe(false);
    expect(updateTicketSchema.safeParse({ status: "unknown" }).success).toBe(
      false,
    );
  });

  test("validates ids and applies list query defaults", () => {
    expect(ticketIdSchema.safeParse({ id: "4" }).success).toBe(true);
    expect(ticketIdSchema.safeParse({ id: "0" }).success).toBe(false);
    expect(ticketListQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 20,
    });
    expect(ticketListQuerySchema.safeParse({ limit: "101" }).success).toBe(
      false,
    );
  });
});
