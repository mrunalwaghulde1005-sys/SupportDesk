const mockPrisma = {
  ticket: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn(),
};

class MockKnownRequestError extends Error {
  constructor(code) {
    super("database error");
    this.code = code;
  }
}

jest.mock("../src/generated/prisma/client.ts", () => ({
  Prisma: { PrismaClientKnownRequestError: MockKnownRequestError },
  PrismaClient: jest.fn(() => mockPrisma),
}));
jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor(options) {
      this.options = options;
    }
  },
}));

const repository = require("../src/repositories/ticket.repository.ts");

describe("ticket repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("applies pagination and filters when listing tickets", async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([{ id: 2 }]);
    mockPrisma.ticket.count.mockResolvedValue(1);

    await expect(
      repository.findTickets({
        page: 2,
        limit: 10,
        status: "OPEN",
        priority: "P1",
      }),
    ).resolves.toEqual({ data: [{ id: 2 }], total: 1 });
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "OPEN", priority: "P1" },
        skip: 10,
        take: 10,
      }),
    );
  });

  test("maps missing records and relational conflicts to safe HTTP errors", async () => {
    const missing = new MockKnownRequestError("P2025");
    mockPrisma.ticket.update.mockRejectedValueOnce(missing);
    await expect(repository.updateTicket(100, { title: "Changed" })).rejects.toMatchObject({
      status: 404,
      code: "TICKET_NOT_FOUND",
    });

    mockPrisma.ticket.delete.mockRejectedValueOnce(
      new MockKnownRequestError("P2003"),
    );
    await expect(repository.deleteTicket(1)).rejects.toMatchObject({
      status: 409,
      code: "RELATED_RECORD_CONFLICT",
    });
  });

  test("rethrows unexpected database failures for centralized handling", async () => {
    const failure = new Error("database connection unavailable");
    mockPrisma.ticket.findUnique.mockRejectedValue(failure);

    await expect(repository.findTicketById(1)).rejects.toBe(failure);
  });
});
