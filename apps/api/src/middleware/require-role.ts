import type { RequestHandler } from "express";
import { sendError } from "../http/response.ts";

type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication is required.");
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 403, "FORBIDDEN", "You do not have permission to access this resource.");
      return;
    }

    next();
  };
}
