
const mockRepository = {
  findTickets: jest.fn(),
  findTicketById: jest.fn(),
  createTicket: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn(),
};
const mockUserRepository = {
  findUserById: jest.fn(),
};

jest.mock("../src/repositories/ticket.repository.ts", () => mockRepository);
jest.mock("../src/repositories/user.repository.ts", () => mockUserRepository);

const ticketService = require("../src/services/ticket.service.ts");
const { HttpError } = require("../src/http/errors.ts");

const customer = {
  id: 1,
  role: "CUSTOMER",
};

const agent = {
  id: 2,
  role: "AGENT",
};

describe("ticket service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns paginated list metadata for a customer", async () => {
    mockRepository.findTickets.mockResolvedValue({
      data: [{ id: 1 }],
      total: 21,
    });

    await expect(
      ticketService.listTickets(
        { page: 2, limit: 20 },
        customer,
      ),
    ).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });

    expect(mockRepository.findTickets).toHaveBeenCalledWith(
      { page: 2, limit: 20 },
      customer.id,
      undefined,
    );
  });

  test("allows agents to list all tickets", async () => {
    mockRepository.findTickets.mockResolvedValue({
      data: [{ id: 1 }],
      total: 1,
    });

    await ticketService.listTickets(
      { page: 1, limit: 20 },
      agent,
    );

    expect(mockRepository.findTickets).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      undefined,
      agent.id,
    );
  });

  test("limits agent lists and ticket reads to assigned tickets", async () => {
    mockRepository.findTicketById.mockResolvedValue({ id: 8, assigneeId: agent.id });
    await expect(ticketService.getTicket(8, agent)).resolves.toEqual({ id: 8, assigneeId: agent.id });
    mockRepository.findTicketById.mockResolvedValue({ id: 9, assigneeId: 3 });
    await expect(ticketService.getTicket(9, agent)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  test("allows an admin to access tickets across the system", async () => {
    const admin = { id: 4, role: "ADMIN" };
    const ticket = { id: 10, createdById: 3, assigneeId: 2 };
    mockRepository.findTickets.mockResolvedValue({ data: [ticket], total: 1 });
    mockRepository.findTicketById.mockResolvedValue(ticket);
    await expect(ticketService.listTickets({ page: 1, limit: 20 }, admin)).resolves.toMatchObject({ data: [ticket] });
    await expect(ticketService.getTicket(10, admin)).resolves.toEqual(ticket);
    expect(mockRepository.findTickets).toHaveBeenCalledWith({ page: 1, limit: 20 }, undefined, undefined);
  });

  test("limits agents to status and priority updates and blocks non-admin assignment", async () => {
    mockRepository.findTicketById.mockResolvedValue({ id: 8, assigneeId: agent.id });
    mockRepository.updateTicket.mockResolvedValue({ id: 8, status: "RESOLVED" });
    await expect(ticketService.updateTicket(8, { status: "RESOLVED" }, agent)).resolves.toMatchObject({ status: "RESOLVED" });
    await expect(ticketService.updateTicket(8, { title: "Take ownership" }, agent)).rejects.toMatchObject({ status: 403 });
    await expect(ticketService.assignTicket(8, 5, agent)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  test("allows admins to assign tickets only to existing agents", async () => {
    const admin = { id: 4, role: "ADMIN" };
    mockRepository.findTicketById.mockResolvedValue({ id: 8 });
    mockUserRepository.findUserById.mockResolvedValue({ id: 5, role: "AGENT" });
    mockRepository.updateTicket.mockResolvedValue({ id: 8, assigneeId: 5 });
    await expect(ticketService.assignTicket(8, 5, admin)).resolves.toMatchObject({ assigneeId: 5 });
    expect(mockRepository.updateTicket).toHaveBeenCalledWith(8, { assigneeId: 5 });
    mockUserRepository.findUserById.mockResolvedValue({ id: 6, role: "CUSTOMER" });
    await expect(ticketService.assignTicket(8, 6, admin)).rejects.toMatchObject({ status: 400, code: "INVALID_ASSIGNEE" });
  });

  test("preserves customer edits but rejects customer-controlled assignment", async () => {
    mockRepository.findTicketById.mockResolvedValue({ id: 7, createdById: customer.id, assigneeId: null });
    mockRepository.updateTicket.mockResolvedValue({ id: 7, title: "Updated" });
    await expect(ticketService.updateTicket(7, { title: "Updated" }, customer)).resolves.toMatchObject({ title: "Updated" });
    await expect(ticketService.updateTicket(7, { assigneeId: 4 }, customer)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(ticketService.updateTicket(7, { status: "CLOSED" }, customer)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(ticketService.closeTicket(7, customer)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(() => ticketService.createTicket({ assigneeId: 4 }, customer)).toThrow(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
    expect(() => ticketService.createTicket({ status: "RESOLVED" }, customer)).toThrow(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
  });

  test("returns 404 for a missing ticket", async () => {
    mockRepository.findTicketById.mockResolvedValue(null);

    await expect(
      ticketService.getTicket(999, customer),
    ).rejects.toMatchObject({
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  });

  test("prevents customers from accessing another customer's ticket", async () => {
    mockRepository.findTicketById.mockResolvedValue({
      id: 7,
      createdById: 2,
      status: "OPEN",
    });

    await expect(
      ticketService.getTicket(7, customer),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  test("allows customers to access their own tickets", async () => {
    const ownTicket = {
      id: 7,
      createdById: customer.id,
      status: "OPEN",
    };

    mockRepository.findTicketById.mockResolvedValue(ownTicket);

    await expect(
      ticketService.getTicket(7, customer),
    ).resolves.toEqual(ownTicket);
  });

  test("rejects closing an already closed ticket", async () => {
    const admin = { id: 3, role: "ADMIN" };
    mockRepository.findTicketById.mockResolvedValue({
      id: 1,
      createdById: customer.id,
      status: "CLOSED",
    });

    await expect(
      ticketService.closeTicket(1, admin),
    ).rejects.toMatchObject({
      status: 400,
      code: "TICKET_ALREADY_CLOSED",
    });

    expect(mockRepository.updateTicket).not.toHaveBeenCalled();
  });

  test("closes and reopens tickets through repository updates", async () => {
    const admin = { id: 3, role: "ADMIN" };
    mockRepository.findTicketById
      .mockResolvedValueOnce({
        id: 1,
        createdById: customer.id,
        status: "OPEN",
      })
      .mockResolvedValueOnce({
        id: 1,
        createdById: customer.id,
        status: "CLOSED",
      });

    mockRepository.updateTicket
      .mockResolvedValueOnce({ id: 1, status: "CLOSED" })
      .mockResolvedValueOnce({ id: 1, status: "OPEN" });

    await expect(
      ticketService.closeTicket(1, admin),
    ).resolves.toMatchObject({
      status: "CLOSED",
    });

    await expect(
      ticketService.reopenTicket(1, admin),
    ).resolves.toMatchObject({
      status: "OPEN",
    });

    expect(mockRepository.updateTicket).toHaveBeenNthCalledWith(1, 1, {
      status: "CLOSED",
    });

    expect(mockRepository.updateTicket).toHaveBeenNthCalledWith(2, 1, {
      status: "OPEN",
    });
  });

  test("preserves repository errors", async () => {
    const error = new HttpError(409, "CONFLICT", "Conflict.");
    mockRepository.createTicket.mockRejectedValue(error);

    await expect(ticketService.createTicket({ status: "OPEN" }, customer)).rejects.toBe(error);
  });
});
