import type { Request, Response } from "express";
import { sendSuccess } from "../http/response.ts";
import * as authService from "../services/auth.service.ts";
import {
  registerSchema,
  loginSchema,
} from "../validation/auth.schemas.ts";

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const result = await authService.registerUser(input);

  sendSuccess(res, result, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const result = await authService.loginUser(input);

  sendSuccess(res, result);
}
