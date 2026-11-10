import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../http/errors.ts";
import { sendError } from "../http/response.ts";

function isMalformedJsonError(
  error: unknown,
): error is SyntaxError & { status: 400; type: "entity.parse.failed" } {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  _next,
) => {
  const requestId = res.getHeader("X-Request-ID") ?? null;

  if (error instanceof HttpError) {
    sendError(res, error.status, error.code, error.message);
    return;
  }

  if (error instanceof ZodError) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Request validation failed.",
      error.issues.map((issue) => ({
        path: issue.path.map(String),
        message: issue.message,
      })),
    );
    return;
  }

  if (isMalformedJsonError(error)) {
    sendError(res, 400, "INVALID_JSON", "Request body contains invalid JSON.");
    return;
  }

  console.error(
    JSON.stringify({
      event: "request_error",
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  sendError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred.",
  );
};
