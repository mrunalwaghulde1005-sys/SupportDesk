import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const path = req.path;
  const startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(
      JSON.stringify({
        event: "http_request",
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      }),
    );
  });

  next();
};
