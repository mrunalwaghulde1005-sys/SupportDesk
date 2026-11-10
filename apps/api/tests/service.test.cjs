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

describe("ticket service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns paginated list metadata", async () => {
    mockRepository.findTickets.mockResolvedValue({ data: [{ id: 1 }], total: 21 });

    await expect(
      ticketService.listTickets({ page: 2, limit: 20 }),
    ).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });
  });

  test("returns 404 for a missing ticket", async () => {
    mockRepository.findTicketById.mockResolvedValue(null);

    await expect(ticketService.getTicket(999)).rejects.toMatchObject({
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  });

  test("rejects closing an already closed ticket", async () => {
    mockRepository.findTicketById.mockResolvedValue({ id: 1, status: "CLOSED" });

    await expect(ticketService.closeTicket(1)).rejects.toMatchObject({
      status: 400,
      code: "TICKET_ALREADY_CLOSED",
    });
    expect(mockRepository.updateTicket).not.toHaveBeenCalled();
  });

  test("closes and reopens tickets through repository updates", async () => {
    mockRepository.findTicketById
      .mockResolvedValueOnce({ id: 1, status: "OPEN" })
      .mockResolvedValueOnce({ id: 1, status: "CLOSED" });
    mockRepository.updateTicket
      .mockResolvedValueOnce({ id: 1, status: "CLOSED" })
      .mockResolvedValueOnce({ id: 1, status: "OPEN" });

    await expect(ticketService.closeTicket(1)).resolves.toMatchObject({
      status: "CLOSED",
    });
    await expect(ticketService.reopenTicket(1)).resolves.toMatchObject({
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
