import bcrypt from "bcryptjs";
import { z } from "zod";
import * as userRepository from "../repositories/user.repository.ts";

export const provisionAdminSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72),
}).strict();

export async function provisionFirstAdmin(input: unknown) {
  const validInput = provisionAdminSchema.parse(input);
  const passwordHash = await bcrypt.hash(validInput.password, 12);
  return userRepository.provisionFirstAdmin({
    name: validInput.name,
    email: validInput.email,
    passwordHash,
  });
}
