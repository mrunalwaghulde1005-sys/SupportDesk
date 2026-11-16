import express from "express";
import { errorHandler } from "./middleware/error-handler.ts";
import { requestLogger } from "./middleware/request-logger.ts";
import { sendError, sendSuccess } from "./http/response.ts";
import { requireAuth } from "./middleware/require-auth.ts";
import { ticketRoutes } from "./routes/ticket.routes.ts";
import { authRoutes } from "./routes/auth.routes.ts";

export const app = express();

app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  sendSuccess(res, { message: "Welcome to SupportDesk API" });
});

app.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/tickets", requireAuth, ticketRoutes);

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found.");
});

app.use(errorHandler);
