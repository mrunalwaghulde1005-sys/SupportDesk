const mockPrisma = {
  user: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  ticket: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comment: {
    findMany: jest.fn(),
  },
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback({ user: mockPrisma.user })),
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
const commentRepository = require("../src/repositories/comment.repository.ts");
const userRepository = require("../src/repositories/user.repository.ts");

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

  test("applies authenticated agent assignment scope at the database query", async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([{ id: 7, assigneeId: 4 }]);
    mockPrisma.ticket.count.mockResolvedValue(1);
    await repository.findTickets({ page: 1, limit: 20 }, undefined, 4);
    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { assigneeId: 4 } }));
    expect(mockPrisma.ticket.count).toHaveBeenCalledWith({ where: { assigneeId: 4 } });
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

  test("allows exactly one first Admin and never overwrites existing users", async () => {
    const input = { name: "Admin", email: "admin@example.com", passwordHash: "hashed-only" };
    mockPrisma.user.count.mockResolvedValueOnce(1);
    await expect(userRepository.provisionFirstAdmin(input)).rejects.toMatchObject({ code: "ADMIN_ALREADY_PROVISIONED" });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();

    mockPrisma.user.count.mockResolvedValueOnce(0);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 9 });
    await expect(userRepository.provisionFirstAdmin(input)).rejects.toMatchObject({ code: "ADMIN_EMAIL_ALREADY_EXISTS" });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();

    mockPrisma.user.count.mockResolvedValueOnce(0);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({ id: 10, name: input.name, email: input.email, role: "ADMIN" });
    await expect(userRepository.provisionFirstAdmin(input)).resolves.toMatchObject({ role: "ADMIN" });
    expect(mockPrisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { ...input, role: "ADMIN" },
      select: { id: true, name: true, email: true, role: true },
    }));
  });

  test("selects safe user fields for admin customer and agent directories", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    await userRepository.findUsersByRole("CUSTOMER");
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { id: "asc" },
    });
  });
});

describe("comment repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("limits customer-visible comments to public comments authored by agents", async () => {
    mockPrisma.comment.findMany.mockResolvedValue([]);

    await commentRepository.findComments(7, "CUSTOMER");

    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        ticketId: 7,
        visibility: "PUBLIC",
        author: { role: "AGENT" },
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    }));
  });

  test("hides Admin-authored comments from Admin viewers", async () => {
    mockPrisma.comment.findMany.mockResolvedValue([]);

    await commentRepository.findComments(7, "ADMIN");

    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ticketId: 7, author: { role: { not: "ADMIN" } } },
    }));
  });

  test("preserves complete comment history for assigned Agent viewers", async () => {
    mockPrisma.comment.findMany.mockResolvedValue([]);

    await commentRepository.findComments(7, "AGENT");

    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ticketId: 7 },
    }));
  });
});
