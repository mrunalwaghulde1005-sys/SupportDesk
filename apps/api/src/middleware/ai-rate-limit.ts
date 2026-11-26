import { rateLimit } from "express-rate-limit";
import type { Request } from "express";
import { sendError } from "../http/response.ts";

export const aiRateLimit = rateLimit({
  windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60000),
  limit: Number(process.env.AI_RATE_LIMIT_MAX ?? 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user ? `user:${req.user.id}` : "authenticated-required",
  handler: (_req, res) => {
    sendError(res, 429, "AI_RATE_LIMITED", "Too many AI requests. Please wait and try again.");
  },
});
