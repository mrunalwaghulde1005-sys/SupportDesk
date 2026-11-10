import type { Response } from "express";

interface ApiError {
  code: string;
  message: string;
  details?: Array<{ path: string[]; message: string }>;
}

interface ApiEnvelope<T> {
  data: T | null;
  error: ApiError | null;
  meta: Record<string, unknown>;
}

function getMeta(res: Response, extra: Record<string, unknown> = {}) {
  return {
    requestId: res.getHeader("X-Request-ID") ?? null,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  meta: Record<string, unknown> = {},
): void {
  const body: ApiEnvelope<T> = {
    data,
    error: null,
    meta: getMeta(res, meta),
  };
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Array<{ path: string[]; message: string }>,
): void {
  const error: ApiError = { code, message };
  if (details) {
    error.details = details;
  }

  const body: ApiEnvelope<never> = {
    data: null,
    error,
    meta: getMeta(res),
  };
  res.status(status).json(body);
}
