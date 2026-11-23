import bcrypt from "bcryptjs";
import { z } from "zod";
import * as userRepository from "../repositories/user.repository.ts";

const updateAgentPasswordSchema = z.object({
  email: z.literal("agent1@demo.local"),
  password: z.string().min(12).max(72).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72
  ),
}).strict();

export async function updateAgentPassword(input: unknown): Promise<number> {
  const validInput = updateAgentPasswordSchema.parse(input);
  const passwordHash = await bcrypt.hash(validInput.password, 12);

  return userRepository.updateAgentPasswordHash({
    email: validInput.email,
    passwordHash,
  });
}