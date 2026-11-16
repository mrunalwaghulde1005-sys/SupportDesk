import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import { HttpError } from "../http/errors.ts";
import {
  createUser,
  findUserByEmail,
} from "../repositories/user.repository.ts";
import type {
  RegisterInput,
  LoginInput,
} from "../validation/auth.schemas.ts";

function createToken(userId: number): string {
  return jwt.sign(
    { sub: String(userId) },
    env.JWT_SECRET,
    { expiresIn: 3600 },
  );
}

function publicUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "Email is already registered.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return {
    user: publicUser(user),
    token: createToken(user.id),
  };
}

export async function loginUser(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  return {
    user: publicUser(user),
    token: createToken(user.id),
  };
}
