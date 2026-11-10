import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.ts";
import { sendError } from "../http/response.ts";

const expectedKey = Buffer.from(env.API_KEY, "utf8");

export const apiKeyAuth: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    sendError(res, 401, "UNAUTHORIZED", "A valid API key is required.");
    return;
  }

  const providedKey = Buffer.from(match[1], "utf8");
  if (
    providedKey.length !== expectedKey.length ||
    !timingSafeEqual(providedKey, expectedKey)
  ) {
    sendError(res, 401, "UNAUTHORIZED", "A valid API key is required.");
    return;
  }

  next();
};
