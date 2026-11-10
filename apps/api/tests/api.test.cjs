const mockRepository = {
  findTickets: jest.fn(),
  findTicketById: jest.fn(),
  createTicket: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn(),
};

jest.mock("../src/repositories/ticket.repository.ts", () => mockRepository);

const request = require("supertest");
const { app } = require("../src/app.ts");
const { HttpError } = require("../src/http/errors.ts");

const apiKey = process.env.API_KEY;
const ticket = {
  id: 7,
  title: "Cannot sign in",
  description: "The sign-in page rejects my credentials.",
  status: "OPEN",
  priority: "P2",
  category: "Account",
  createdById: 1,
  assigneeId: null,
  slaDueAt: null,
};

function withApiKey(testRequest) {
  return testRequest.set("Authorization", `Bearer ${apiKey}`);
}

function expectEnvelope(response) {
  expect(response.body).toEqual(
    expect.objectContaining({
      data: expect.anything(),
      error: null,
      meta: expect.objectContaining({
        requestId: expect.any(String),
        timestamp: expect.any(String),
      }),
    }),
  );
}

describe("SupportDesk API", () => {
  beforeAll(() => {
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("serves public health with the standard response envelope", async () => {
    const response = await request(app).get("/health").expect(200);
    expectEnvelope(response);
    expect(response.body.data).toEqual({ status: "ok" });
  });

  test("rejects ticket requests without a valid API key", async () => {
    const response = await request(app).get("/tickets/7").expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        data: null,
        error: expect.objectContaining({ code: "UNAUTHORIZED" }),
        meta: expect.objectContaining({ requestId: expect.any(String) }),
      }),
    );
    expect(mockRepository.findTicketById).not.toHaveBeenCalled();
  });

  test("lists tickets with pagination metadata", async () => {
    mockRepository.findTickets.mockResolvedValue({
      data: [ticket],
      total: 1,
    });

    const response = await withApiKey(request(app).get("/tickets?page=1&limit=5"))
      .expect(200);

    expectEnvelope(response);
    expect(response.body.data).toEqual([ticket]);
    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
  });

  test("returns validation errors for invalid list filters and ids", async () => {
    const invalidFilter = await withApiKey(
      request(app).get("/tickets?status=unknown"),
    ).expect(400);
    expect(invalidFilter.body.error.code).toBe("VALIDATION_ERROR");

    const invalidId = await withApiKey(
      request(app).get("/tickets/not-a-number"),
    ).expect(400);
    expect(invalidId.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("retrieves a ticket and returns 404 when it does not exist", async () => {
    mockRepository.findTicketById
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce(null);

    const found = await withApiKey(request(app).get("/tickets/7")).expect(200);
    expectEnvelope(found);
    expect(found.body.data).toEqual(ticket);

    const missing = await withApiKey(request(app).get("/tickets/999")).expect(404);
    expect(missing.body.data).toBeNull();
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
    expect(missing.body.meta.requestId).toEqual(expect.any(String));
  });

  test("creates tickets and validates request bodies", async () => {
    mockRepository.createTicket.mockResolvedValue(ticket);
    const created = await withApiKey(
      request(app).post("/tickets").send({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdById: ticket.createdById,
      }),
    ).expect(201);
    expectEnvelope(created);
    expect(created.body.data).toEqual(ticket);

    const invalid = await withApiKey(
      request(app).post("/tickets").send({ title: "Incomplete" }),
    ).expect(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockRepository.createTicket).toHaveBeenCalledTimes(1);
  });

  test.each(["patch", "put"])("%s updates ticket fields", async (method) => {
    mockRepository.updateTicket.mockResolvedValue({
      ...ticket,
      priority: "P1",
    });
    const updated = await withApiKey(
      request(app)[method]("/tickets/7").send({ priority: "P1" }),
    ).expect(200);
    expectEnvelope(updated);
    expect(mockRepository.updateTicket).toHaveBeenCalledWith(7, {
      priority: "P1",
    });
  });

  test("maps missing ticket updates and rejects empty updates", async () => {
    mockRepository.updateTicket.mockRejectedValue(
      new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found."),
    );
    const missing = await withApiKey(
      request(app).patch("/tickets/999").send({ title: "Updated" }),
    ).expect(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");

    const empty = await withApiKey(
      request(app).patch("/tickets/7").send({}),
    ).expect(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("closes and reopens tickets", async () => {
    mockRepository.findTicketById
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce({ ...ticket, status: "CLOSED" });
    mockRepository.updateTicket
      .mockResolvedValueOnce({ ...ticket, status: "CLOSED" })
      .mockResolvedValueOnce(ticket);

    const closed = await withApiKey(
      request(app).patch("/tickets/7/close"),
    ).expect(200);
    const reopened = await withApiKey(
      request(app).patch("/tickets/7/reopen"),
    ).expect(200);

    expectEnvelope(closed);
    expectEnvelope(reopened);
    expect(closed.body.data.status).toBe("CLOSED");
    expect(reopened.body.data.status).toBe("OPEN");
  });

  test("deletes tickets using the existing endpoint", async () => {
    mockRepository.deleteTicket.mockResolvedValue(ticket);

    const response = await withApiKey(
      request(app).delete("/tickets/7"),
    ).expect(200);
    expectEnvelope(response);
    expect(response.body.data).toEqual(ticket);
  });

  test("returns safe standard errors for database failures and malformed JSON", async () => {
    mockRepository.findTickets.mockRejectedValue(
      new Error("sensitive database failure"),
    );
    const databaseError = await withApiKey(
      request(app).get("/tickets"),
    ).expect(500);
    expect(databaseError.body).toMatchObject({
      data: null,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      meta: { requestId: expect.any(String) },
    });
    expect(JSON.stringify(databaseError.body)).not.toContain(
      "sensitive database failure",
    );

    const malformed = await withApiKey(
      request(app)
        .post("/tickets")
        .set("Content-Type", "application/json")
        .send("{"),
    ).expect(400);
    expect(malformed.body.error.code).toBe("INVALID_JSON");
    expect(malformed.body.data).toBeNull();
  });
});
