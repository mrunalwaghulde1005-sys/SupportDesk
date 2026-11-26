const mockUserRepository = { provisionFirstAdmin: jest.fn() };
jest.mock("../src/repositories/user.repository.ts", () => mockUserRepository);

const bcrypt = require("bcryptjs");
const { provisionFirstAdmin, provisionAdminSchema } = require("../src/services/admin-provisioning.service.ts");

describe("secure first Admin provisioning", () => {
  beforeEach(() => jest.clearAllMocks());

  test("validates required input and enforces strong bounded password input", async () => {
    await expect(provisionFirstAdmin({ name: "", email: "bad", password: "short" })).rejects.toMatchObject({ name: "ZodError" });
    expect(() => provisionAdminSchema.parse({ name: "Admin", email: "admin@example.com", password: "x".repeat(73) })).toThrow();
    expect(mockUserRepository.provisionFirstAdmin).not.toHaveBeenCalled();
  });

  test("hashes the password and assigns ADMIN only through the provisioning repository", async () => {
    mockUserRepository.provisionFirstAdmin.mockResolvedValue({ id: 10, name: "Admin", email: "admin@example.com", role: "ADMIN" });
    await provisionFirstAdmin({ name: "Admin", email: "admin@example.com", password: "a-secure-password-123" });
    const repositoryInput = mockUserRepository.provisionFirstAdmin.mock.calls[0][0];
    expect(repositoryInput.email).toBe("admin@example.com");
    expect(repositoryInput.passwordHash).not.toBe("a-secure-password-123");
    await expect(bcrypt.compare("a-secure-password-123", repositoryInput.passwordHash)).resolves.toBe(true);
  });

  test("prevents duplicate provisioning without retrying or changing existing account data", async () => {
    const duplicateError = Object.assign(new Error("An Admin account has already been provisioned."), { code: "ADMIN_ALREADY_PROVISIONED" });
    mockUserRepository.provisionFirstAdmin.mockRejectedValue(duplicateError);
    await expect(provisionFirstAdmin({ name: "Admin", email: "admin@example.com", password: "a-secure-password-123" })).rejects.toBe(duplicateError);
    expect(mockUserRepository.provisionFirstAdmin).toHaveBeenCalledTimes(1);
  });
});
