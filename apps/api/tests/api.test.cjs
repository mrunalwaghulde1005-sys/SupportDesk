
const mockRepository = {
  findTickets: jest.fn(),
  findTicketById: jest.fn(),
  createTicket: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn(),
};

const mockUserRepository = {
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  findUsersByRole: jest.fn(),
};

const mockCommentRepository = {
  findComments: jest.fn(),
  createComment: jest.fn(),
};

jest.mock("../src/repositories/ticket.repository.ts", () => mockRepository);
jest.mock("../src/repositories/user.repository.ts", () => mockUserRepository);
jest.mock("../src/repositories/comment.repository.ts", () => mockCommentRepository);

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app } = require("../src/app.ts");
const { HttpError } = require("../src/http/errors.ts");
const { env } = require("../src/config/env.ts");
const { geminiProvider, setAiProviderForTests } = require("../src/ai/gemini-client.ts");

const customer = {
  id: 1,
  name: "Test Customer",
  email: "customer@example.com",
  role: "CUSTOMER",
};
const admin = { id: 3, name: "Admin", email: "admin@example.com", role: "ADMIN" };
const agent = { id: 4, name: "Agent", email: "agent@example.com", role: "AGENT" };

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

function withToken(testRequest, user = customer) {
  const token = jwt.sign(
    { sub: String(user.id) },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  mockUserRepository.findUserById.mockResolvedValue(user);

  return testRequest.set("Authorization", `Bearer ${token}`);
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

  test("rejects ticket requests without a valid JWT", async () => {
    const response = await request(app).get("/tickets/7").expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        data: null,
        error: expect.objectContaining({ code: "UNAUTHORIZED" }),
        meta: expect.objectContaining({
          requestId: expect.any(String),
        }),
      }),
    );

    expect(mockRepository.findTicketById).not.toHaveBeenCalled();
  });

  test("lists tickets with pagination metadata", async () => {
    mockRepository.findTickets.mockResolvedValue({
      data: [ticket],
      total: 1,
    });

    const response = await withToken(
      request(app).get("/tickets?page=1&limit=5"),
    ).expect(200);

    expectEnvelope(response);
    expect(response.body.data).toEqual([ticket]);
    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
    });

    expect(mockRepository.findTickets).toHaveBeenCalledWith(
      { page: 1, limit: 5 },
      customer.id,
      undefined,
    );
  });

  test("returns validation errors for invalid list filters and ids", async () => {
    const invalidFilter = await withToken(
      request(app).get("/tickets?status=unknown"),
    ).expect(400);

    expect(invalidFilter.body.error.code).toBe("VALIDATION_ERROR");

    const invalidId = await withToken(
      request(app).get("/tickets/not-a-number"),
    ).expect(400);

    expect(invalidId.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("retrieves a ticket and returns 404 when it does not exist", async () => {
    mockRepository.findTicketById
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce(null);

    const found = await withToken(
      request(app).get("/tickets/7"),
    ).expect(200);

    expectEnvelope(found);
    expect(found.body.data).toEqual(ticket);

    const missing = await withToken(
      request(app).get("/tickets/999"),
    ).expect(404);

    expect(missing.body.data).toBeNull();
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
    expect(missing.body.meta.requestId).toEqual(expect.any(String));
  });

  test("prevents a customer from reading another customer's ticket", async () => {
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, createdById: 2 });

    const response = await withToken(request(app).get("/tickets/7")).expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(response.body.data).toBeNull();
  });

  test("allows admins to list all tickets and denies agent access to admin APIs", async () => {
    mockRepository.findTickets.mockResolvedValue({ data: [ticket], total: 1 });
    const response = await withToken(request(app).get("/api/admin/tickets"), admin).expect(200);
    expect(response.body.data).toEqual([ticket]);
    expect(mockRepository.findTickets).toHaveBeenCalledWith({ page: 1, limit: 20 }, undefined, undefined);

    const denied = await withToken(request(app).get("/api/admin/tickets"), agent).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    const customerDenied = await withToken(request(app).get("/api/admin/users?role=CUSTOMER"), customer).expect(403);
    expect(customerDenied.body.error.code).toBe("FORBIDDEN");
  });

  test("returns only safe customer and agent fields to admin account management", async () => {
    const safeUser = { id: 12, name: "Agent One", email: "agent@example.com", role: "AGENT", createdAt: "2026-11-20T00:00:00.000Z" };
    mockUserRepository.findUsersByRole.mockResolvedValue([safeUser]);
    const response = await withToken(request(app).get("/api/admin/users?role=AGENT"), admin).expect(200);
    expect(response.body.data).toEqual([safeUser]);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(mockUserRepository.findUsersByRole).toHaveBeenCalledWith("AGENT");
  });

  test("limits ticket detail requests to tickets assigned to the authenticated agent", async () => {
    mockRepository.findTicketById.mockResolvedValueOnce({ ...ticket, assigneeId: agent.id });
    const allowed = await withToken(request(app).get("/tickets/7"), agent).expect(200);
    expect(allowed.body.data.assigneeId).toBe(agent.id);

    mockRepository.findTicketById.mockResolvedValueOnce({ ...ticket, assigneeId: 99 });
    const denied = await withToken(request(app).get("/tickets/7"), agent).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
  });

  test("restricts ticket assignment to admins and verifies the assignee is an agent", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    mockUserRepository.findUserById.mockResolvedValue(agent);
    mockRepository.updateTicket.mockResolvedValue({ ...ticket, assigneeId: agent.id });

    const denied = await withToken(
      request(app).patch("/api/admin/tickets/7/assignment").send({ assigneeId: agent.id }),
      agent,
    ).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    expect(mockRepository.updateTicket).not.toHaveBeenCalled();

    const assignmentRequest = withToken(
      request(app).patch("/api/admin/tickets/7/assignment").send({ assigneeId: agent.id }),
      admin,
    );
    mockUserRepository.findUserById.mockImplementation(async (id) => id === admin.id ? admin : agent);
    const assigned = await assignmentRequest.expect(200);
    expect(assigned.body.data.assigneeId).toBe(agent.id);
    expect(mockRepository.updateTicket).toHaveBeenCalledWith(7, { assigneeId: agent.id });
  });

  test("allows admins to change ticket status and denies that admin endpoint to agents", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    mockRepository.updateTicket.mockResolvedValue({ ...ticket, status: "RESOLVED" });

    const denied = await withToken(
      request(app).patch("/api/admin/tickets/7").send({ status: "RESOLVED" }),
      agent,
    ).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");

    const updated = await withToken(
      request(app).patch("/api/admin/tickets/7").send({ status: "RESOLVED" }),
      admin,
    ).expect(200);
    expect(updated.body.data.status).toBe("RESOLVED");
    expect(mockRepository.updateTicket).toHaveBeenCalledWith(7, { status: "RESOLVED" });
  });

  test("creates tickets and validates request bodies", async () => {
    mockRepository.createTicket.mockResolvedValue(ticket);

    const created = await withToken(
      request(app).post("/tickets").send({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
      }),
    ).expect(201);

    expectEnvelope(created);
    expect(created.body.data).toEqual(ticket);

    const invalid = await withToken(
      request(app).post("/tickets").send({ title: "Incomplete" }),
    ).expect(400);

    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(mockRepository.createTicket).toHaveBeenCalledTimes(1);
    const spoofed = await withToken(
  request(app).post("/tickets").send({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    createdById: 2,
  }),
).expect(400);

expect(spoofed.body.error.code).toBe("VALIDATION_ERROR");
  });

  test.each(["patch", "put"])("%s updates ticket fields", async (method) => {
    mockRepository.findTicketById.mockResolvedValue(ticket);

    mockRepository.updateTicket.mockResolvedValue({
      ...ticket,
      priority: "P1",
    });

    const updated = await withToken(
      request(app)[method]("/tickets/7").send({ priority: "P1" }),
    ).expect(200);

    expectEnvelope(updated);

    expect(mockRepository.updateTicket).toHaveBeenCalledWith(7, {
      priority: "P1",
    });
  });

  test("maps missing ticket updates and rejects empty updates", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);

    mockRepository.updateTicket.mockRejectedValue(
      new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found."),
    );

    const missing = await withToken(
      request(app).patch("/tickets/999").send({ title: "Updated" }),
    ).expect(404);

    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");

    const empty = await withToken(
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

    const closed = await withToken(
      request(app).patch("/tickets/7/close"),
      admin,
    ).expect(200);

    const reopened = await withToken(
      request(app).patch("/tickets/7/reopen"),
      admin,
    ).expect(200);

    expectEnvelope(closed);
    expectEnvelope(reopened);
    expect(closed.body.data.status).toBe("CLOSED");
    expect(reopened.body.data.status).toBe("OPEN");
  });

  test("deletes tickets using the existing endpoint", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    mockRepository.deleteTicket.mockResolvedValue(ticket);

    const response = await withToken(
      request(app).delete("/tickets/7"),
    ).expect(200);

    expectEnvelope(response);
    expect(response.body.data).toEqual(ticket);
  });

  test("returns safe standard errors for database failures and malformed JSON", async () => {
    mockRepository.findTickets.mockRejectedValue(
      new Error("sensitive database failure"),
    );

    const databaseError = await withToken(
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

    const malformed = await withToken(
      request(app)
        .post("/tickets")
        .set("Content-Type", "application/json")
        .send("{"),
    ).expect(400);

    expect(malformed.body.error.code).toBe("INVALID_JSON");
    expect(malformed.body.data).toBeNull();
  });

  test("rejects customer comment creation, even on an owned ticket", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    const response = await withToken(request(app).post("/tickets/7/comments").send({ body: "Please help", authorId: 99 }), customer).expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    const denied = await withToken(request(app).post("/tickets/7/comments").send({ body: "Please help" }), customer).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    expect(mockCommentRepository.createComment).not.toHaveBeenCalled();
  });

  test("returns only PUBLIC Agent comments to customers", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    mockCommentRepository.findComments.mockResolvedValue([{ id: 1, visibility: "PUBLIC", body: "Agent update", author: { id: agent.id, name: agent.name } }]);
    const response = await withToken(request(app).get("/tickets/7/comments"), customer).expect(200);
    expectEnvelope(response);
    expect(response.body.data).toEqual([{ id: 1, visibility: "PUBLIC", body: "Agent update", author: { id: agent.id, name: agent.name } }]);
    expect(mockCommentRepository.findComments).toHaveBeenCalledWith(7, "CUSTOMER");
  });

  test("rejects customer comment creation and access to another customer's comments", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    const createDenied = await withToken(request(app).post("/tickets/7/comments").send({ body: "Private", visibility: "INTERNAL" }), customer).expect(403);
    expect(createDenied.body.error.code).toBe("FORBIDDEN");
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, createdById: 88 });
    const denied = await withToken(request(app).get("/tickets/7/comments"), customer).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    const createDeniedForOtherTicket = await withToken(request(app).post("/tickets/7/comments").send({ body: "Private" }), customer).expect(403);
    expect(createDeniedForOtherTicket.body.error.code).toBe("FORBIDDEN");
    expect(mockCommentRepository.findComments).not.toHaveBeenCalled();
    expect(mockCommentRepository.createComment).not.toHaveBeenCalled();
  });

  test("forces assigned Agent comments to PUBLIC and denies unassigned agents", async () => {
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: agent.id });
    mockCommentRepository.createComment.mockResolvedValue({ id: 2, visibility: "PUBLIC" });
    const created = await withToken(request(app).post("/tickets/7/comments").send({ body: "Team note", visibility: "INTERNAL" }), agent).expect(201);
    expect(created.body.data.visibility).toBe("PUBLIC");
    expect(mockCommentRepository.createComment).toHaveBeenCalledWith(7, agent.id, { body: "Team note", visibility: "PUBLIC" });
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: 77 });
    const denied = await withToken(request(app).post("/tickets/7/comments").send({ body: "No access" }), agent).expect(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
  });

  test("forces Admin comments to INTERNAL and validates ticket IDs and bodies", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    mockCommentRepository.createComment.mockResolvedValue({ id: 3, visibility: "INTERNAL" });
    const created = await withToken(request(app).post("/tickets/7/comments").send({ body: "Admin note", visibility: "PUBLIC" }), admin).expect(201);
    expect(created.body.data.visibility).toBe("INTERNAL");
    expect(mockCommentRepository.createComment).toHaveBeenCalledWith(7, admin.id, { body: "Admin note", visibility: "INTERNAL" });
    mockCommentRepository.findComments.mockResolvedValue([{ id: 4, visibility: "INTERNAL" }]);
    const listed = await withToken(request(app).get("/tickets/7/comments"), admin).expect(200);
    expect(listed.body.data[0].visibility).toBe("INTERNAL");
    expect(mockCommentRepository.findComments).toHaveBeenCalledWith(7, "ADMIN");
    await withToken(request(app).get("/tickets/nope/comments"), admin).expect(400);
    await withToken(request(app).post("/tickets/7/comments").send({ body: "  " }), admin).expect(400);
    await withToken(request(app).post("/tickets/7/comments").send({ body: "Bad visibility", visibility: "SECRET" }), admin).expect(400);
    mockRepository.findTicketById.mockResolvedValue(null);
    const missing = await withToken(request(app).get("/tickets/999/comments"), admin).expect(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  test("requires authentication for comment routes", async () => {
    const missing = await request(app).get("/tickets/7/comments").expect(401);
    expect(missing.body.error.code).toBe("UNAUTHORIZED");
    const invalid = await request(app).get("/tickets/7/comments").set("Authorization", "Bearer invalid").expect(401);
    expect(invalid.body.error.code).toBe("UNAUTHORIZED");
  });

  test("completes the customer to agent public and internal comment API workflow", async () => {
    let workflowTicket = { ...ticket, assigneeId: null };
    const workflowComments = [{
      id: 1,
      ticketId: 7,
      authorId: customer.id,
      body: "Existing customer public update",
      visibility: "PUBLIC",
      createdAt: "2026-11-21T00:00:00.000Z",
      author: { id: customer.id, name: customer.name, role: customer.role },
    }];
    mockRepository.createTicket.mockImplementation(async (input) => ({ id: 7, ...input }));
    mockRepository.findTicketById.mockImplementation(async () => workflowTicket);
    mockRepository.updateTicket.mockImplementation(async (_id, input) => {
      workflowTicket = { ...workflowTicket, ...input };
      return workflowTicket;
    });
    mockUserRepository.findUserById.mockImplementation(async (id) => id === agent.id ? agent : admin);
    mockCommentRepository.createComment.mockImplementation(async (ticketId, authorId, input) => {
      const author = authorId === customer.id ? customer : authorId === agent.id ? agent : admin;
      const comment = { id: workflowComments.length + 1, ticketId, authorId, ...input, createdAt: "2026-11-21T00:00:00.000Z", author: { id: authorId, name: author.name, role: author.role } };
      workflowComments.push(comment);
      return comment;
    });
    mockCommentRepository.findComments.mockImplementation(async (_ticketId, viewerRole) =>
      workflowComments.filter((comment) =>
        viewerRole === "CUSTOMER"
          ? comment.visibility === "PUBLIC" && comment.author.role === "AGENT"
          : viewerRole === "ADMIN"
            ? comment.author.role !== "ADMIN"
            : true,
      ),
    );

    const createdTicket = await withToken(request(app).post("/tickets").send({
      title: "Workflow test", description: "Check customer and agent comments.", priority: "P2", category: "Account",
    }), customer).expect(201);
    expect(createdTicket.body.data.status).toBe("OPEN");

    const assignmentRequest = withToken(request(app).patch("/api/admin/tickets/7/assignment").send({ assigneeId: agent.id }), admin);
    mockUserRepository.findUserById.mockImplementation(async (id) => id === agent.id ? agent : admin);
    await assignmentRequest.expect(200);

    await withToken(request(app).post("/tickets/7/comments").send({ body: "Customer attempted update" }), customer).expect(403);
    const agentTicket = await withToken(request(app).get("/tickets/7"), agent).expect(200);
    expect(agentTicket.body.data.assigneeId).toBe(agent.id);
    const agentComments = await withToken(request(app).get("/tickets/7/comments"), agent).expect(200);
    expect(agentComments.body.data.map((comment) => comment.body)).toContain("Existing customer public update");

    const adminInternal = await withToken(request(app).post("/tickets/7/comments").send({ body: "Admin internal update", visibility: "INTERNAL" }), admin).expect(201);
    const adminSpoofedPublic = await withToken(request(app).post("/tickets/7/comments").send({ body: "Admin public update", visibility: "PUBLIC" }), admin).expect(201);
    expect(adminInternal.body.data.visibility).toBe("INTERNAL");
    expect(adminSpoofedPublic.body.data.visibility).toBe("INTERNAL");
    const afterAdminComments = await withToken(request(app).get("/tickets/7/comments"), agent).expect(200);
    expect(afterAdminComments.body.data.map((comment) => comment.body)).toEqual(expect.arrayContaining([
      "Existing customer public update",
      "Admin internal update",
      "Admin public update",
    ]));

    const agentPublic = await withToken(request(app).post("/tickets/7/comments").send({ body: "Agent public update", visibility: "PUBLIC" }), agent).expect(201);
    const agentSpoofedInternal = await withToken(request(app).post("/tickets/7/comments").send({ body: "Agent internal update", visibility: "INTERNAL" }), agent).expect(201);
    expect(agentPublic.body.data.visibility).toBe("PUBLIC");
    expect(agentSpoofedInternal.body.data.visibility).toBe("PUBLIC");
    const customerComments = await withToken(request(app).get("/tickets/7/comments"), customer).expect(200);
    expect(customerComments.body.data.map((comment) => comment.body)).toEqual([
      "Agent public update",
      "Agent internal update",
    ]);
    expect(JSON.stringify(customerComments.body)).not.toContain("Admin internal update");
    expect(JSON.stringify(customerComments.body)).not.toContain("Admin public update");
    expect(JSON.stringify(customerComments.body)).not.toContain("Existing customer public update");
    expect(customerComments.body.data.every((comment) => comment.author.role === "AGENT")).toBe(true);

    const adminComments = await withToken(request(app).get("/tickets/7/comments"), admin).expect(200);
    expect(adminComments.body.data).toHaveLength(3);
    expect(JSON.stringify(adminComments.body)).not.toContain("Admin internal update");
    expect(JSON.stringify(adminComments.body)).not.toContain("Admin public update");

    mockRepository.findTicketById.mockResolvedValue({ ...workflowTicket, assigneeId: 999 });
    await withToken(request(app).get("/tickets/7/comments"), agent).expect(403);
  });

  test("requires authentication and staff authorization for AI routes", async () => {
    const unauthenticated = await request(app).post("/tickets/7/ai/suggest-reply").expect(401);
    expect(unauthenticated.body.error.code).toBe("UNAUTHORIZED");
    const customerDenied = await withToken(
      request(app).post("/tickets/7/ai/categorize"),
      customer,
    ).expect(403);
    expect(customerDenied.body.error.code).toBe("FORBIDDEN");
    expect(mockRepository.findTicketById).not.toHaveBeenCalled();
  });

  test("streams a mocked reply only for the assigned Agent and never saves it", async () => {
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: agent.id });
    mockCommentRepository.findComments.mockResolvedValue([]);
    const provider = {
      complete: jest.fn(),
      stream: jest.fn(async ({ onDelta }) => {
        onDelta("A reviewed draft.");
        return { input_tokens: 18, output_tokens: 6, total_tokens: 24 };
      }),
    };
    const restoreProvider = setAiProviderForTests(provider);
    try {
      const response = await withToken(
        request(app).post("/tickets/7/ai/suggest-reply").buffer(true).parse((res, callback) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => callback(null, data));
        }),
        agent,
      ).expect(200);

      expect(response.headers["content-type"]).toMatch(/text\/event-stream/);
      expect(response.body).toContain('data: {"delta":"A reviewed draft."}');
      expect(response.body).toContain("data: [DONE]");
      expect(provider.stream).toHaveBeenCalledTimes(1);
      expect(mockCommentRepository.findComments).toHaveBeenCalledWith(7, "AGENT");
      expect(mockRepository.updateTicket).not.toHaveBeenCalled();
      expect(mockCommentRepository.createComment).not.toHaveBeenCalled();

      mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: 77 });
      await withToken(request(app).post("/tickets/7/ai/suggest-reply"), agent).expect(403);
      expect(provider.stream).toHaveBeenCalledTimes(1);
    } finally {
      restoreProvider();
    }
  });

  test("rejects an empty mocked reply instead of marking it complete", async () => {
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: agent.id });
    mockCommentRepository.findComments.mockResolvedValue([]);
    const restoreProvider = setAiProviderForTests({
      complete: jest.fn(),
      stream: jest.fn(async () => ({ input_tokens: 10, output_tokens: 0, total_tokens: 10 })),
    });
    try {
      const response = await withToken(
        request(app).post("/tickets/7/ai/suggest-reply"),
        agent,
      ).expect(502);
      expect(response.body.error.code).toBe("AI_INVALID_RESPONSE");
      expect(mockRepository.updateTicket).not.toHaveBeenCalled();
      expect(mockCommentRepository.createComment).not.toHaveBeenCalled();
    } finally {
      restoreProvider();
    }
  });

  test("validates mocked categorization strictly and returns suggestions without persisting", async () => {
    mockRepository.findTicketById.mockResolvedValue(ticket);
    mockCommentRepository.findComments.mockResolvedValue([]);
    const provider = {
      stream: jest.fn(),
      complete: jest.fn()
        .mockResolvedValueOnce({
          text: JSON.stringify({ category: "Billing", priority: "P1" }),
          usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 },
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({ category: "Billing", priority: "P1", applied: true }),
          usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 },
        }),
    };
    const restoreProvider = setAiProviderForTests(provider);
    try {
      const valid = await withToken(
        request(app).post("/tickets/7/ai/categorize").send({}),
        admin,
      ).expect(200);
      expectEnvelope(valid);
      expect(valid.body.data).toEqual({ category: "Billing", priority: "P1" });
      expect(mockRepository.updateTicket).not.toHaveBeenCalled();

      const invalid = await withToken(
        request(app).post("/tickets/7/ai/categorize").send({}),
        admin,
      ).expect(502);
      expect(invalid.body.error.code).toBe("AI_INVALID_RESPONSE");
      expect(mockRepository.updateTicket).not.toHaveBeenCalled();
    } finally {
      restoreProvider();
    }
  });

  test("sends a sanitized streaming error after the response has started", async () => {
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: agent.id });
    mockCommentRepository.findComments.mockResolvedValue([]);
    const restoreProvider = setAiProviderForTests({
      complete: jest.fn(),
      stream: jest.fn(async ({ onDelta }) => {
        onDelta("Partial draft");
        throw new HttpError(502, "AI_PROVIDER_ERROR", "Provider detail must not be sent to clients.");
      }),
    });
    try {
      const response = await withToken(
        request(app).post("/tickets/7/ai/suggest-reply").buffer(true).parse((res, callback) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => callback(null, data));
        }),
        agent,
      ).expect(200);
      expect(response.body).toContain("event: error");
      expect(response.body).toContain("AI generation failed. Please try again.");
      expect(response.body).not.toContain("Provider detail");
    } finally {
      restoreProvider();
    }
  });

  test("correlates provider diagnostics and unavailable usage logs with each AI request", async () => {
    const originalKey = env.GEMINI_API_KEY;
    const originalFetch = global.fetch;
    const testKey = "test-gemini-key-for-correlation";
    env.GEMINI_API_KEY = testKey;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: jest.fn().mockResolvedValue({
        error: {
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
          message: "Request rate limit exceeded.",
        },
      }),
    });
    const restoreProvider = setAiProviderForTests(geminiProvider);
    mockRepository.findTicketById.mockResolvedValue({ ...ticket, assigneeId: agent.id });
    mockCommentRepository.findComments.mockResolvedValue([]);

    try {
      const reply = await withToken(
        request(app).post("/tickets/7/ai/suggest-reply"),
        agent,
      ).expect(502);
      const category = await withToken(
        request(app).post("/tickets/7/ai/categorize").send({}),
        admin,
      ).expect(502);
      const requestIds = [
        reply.headers["x-request-id"],
        category.headers["x-request-id"],
      ];
      const diagnostics = console.error.mock.calls
        .map(([line]) => JSON.parse(line))
        .filter((entry) => entry.event === "gemini_provider_error");
      const usageLogs = console.info.mock.calls
        .map(([line]) => JSON.parse(line))
        .filter((entry) => entry.event === "ai_usage");

      expect(reply.body.error).toMatchObject({
        code: "AI_PROVIDER_ERROR",
        message: "AI generation failed. Please try again.",
      });
      expect(category.body.error).toMatchObject({
        code: "AI_PROVIDER_ERROR",
        message: "AI generation failed. Please try again.",
      });
      for (const requestId of requestIds) {
        expect(diagnostics).toEqual(expect.arrayContaining([
          expect.objectContaining({ requestId, upstreamStatus: 429, errorCode: "rate_limit_exceeded" }),
        ]));
        expect(usageLogs).toEqual(expect.arrayContaining([
          expect.objectContaining({ requestId, usageAvailable: false }),
        ]));
      }
      expect(JSON.stringify([...diagnostics, ...usageLogs])).not.toContain(testKey);
    } finally {
      restoreProvider();
      env.GEMINI_API_KEY = originalKey;
      global.fetch = originalFetch;
    }
  });
});
