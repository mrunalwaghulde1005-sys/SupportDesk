
const mockRepository = {
  findTickets: jest.fn(),
  findTicketById: jest.fn(),
  createTicket: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn(),
};

jest.mock("../src/repositories/ticket.repository.ts", () => mockRepository);

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
    );
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
    mockRepository.findTicketById.mockResolvedValue({
      id: 1,
      createdById: customer.id,
      status: "CLOSED",
    });

    await expect(
      ticketService.closeTicket(1, customer),
    ).rejects.toMatchObject({
      status: 400,
      code: "TICKET_ALREADY_CLOSED",
    });

    expect(mockRepository.updateTicket).not.toHaveBeenCalled();
  });

  test("closes and reopens tickets through repository updates", async () => {
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
      ticketService.closeTicket(1, customer),
    ).resolves.toMatchObject({
      status: "CLOSED",
    });

    await expect(
      ticketService.reopenTicket(1, customer),
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

    await expect(ticketService.createTicket({})).rejects.toBe(error);
  });
});
