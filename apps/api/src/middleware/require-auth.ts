import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env.ts";
import { sendError } from "../http/response.ts";
import { findUserById } from "../repositories/user.repository.ts";

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    sendError(res, 401, "UNAUTHORIZED", "Authentication is required.");
    return;
  }

  void (async () => {
    try {
      const payload = jwt.verify(match[1], env.JWT_SECRET);

      if (
        typeof payload === "string" ||
        typeof payload.sub !== "string"
      ) {
        sendError(res, 401, "UNAUTHORIZED", "Invalid authentication token.");
        return;
      }

      const userId = Number(payload.sub);

      if (!Number.isSafeInteger(userId) || userId <= 0) {
        sendError(res, 401, "UNAUTHORIZED", "Invalid authentication token.");
        return;
      }

      const user = await findUserById(userId);

      if (!user) {
        sendError(res, 401, "UNAUTHORIZED", "User account not found.");
        return;
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        sendError(res, 401, "UNAUTHORIZED", "Invalid or expired token.");
        return;
      }

      next(error);
    }
  })();
};
