import type { Request, Response } from "express";
import { sendSuccess } from "../http/response.ts";
import * as adminService from "../services/admin.service.ts";
import { userListSchema } from "../validation/admin.schemas.ts";

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { role } = userListSchema.parse(req.query);
  const users = await adminService.listUsers(role);
  sendSuccess(res, users);
}
