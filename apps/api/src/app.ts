import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { errorHandler } from "./middleware/error-handler.ts";
import { requestLogger } from "./middleware/request-logger.ts";
import { sendError, sendSuccess } from "./http/response.ts";
import { requireAuth } from "./middleware/require-auth.ts";
import { ticketRoutes } from "./routes/ticket.routes.ts";
import { authRoutes } from "./routes/auth.routes.ts";
import { adminRoutes } from "./routes/admin.routes.ts";
import { commentRoutes } from "./routes/comment.routes.ts";

export const app = express();
const frontendDistPath = path.resolve(__dirname, "../../web/dist");

app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res, next) => {
  if (existsSync(frontendDistPath)) {
    res.sendFile(path.join(frontendDistPath, "index.html"), (error) => {
      if (error) next(error);
    });
    return;
  }

  sendSuccess(res, { message: "Welcome to SupportDesk API" });
});

app.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/tickets", requireAuth, ticketRoutes);
app.use("/tickets/:id/comments", requireAuth, commentRoutes);
app.use("/api/admin", requireAuth, adminRoutes);

// Keep unknown API paths in the JSON API error format, even when a frontend
// build is present.
app.use((req, res, next) => {
  const isApiPath = ["/auth", "/tickets", "/api/admin", "/health"].some(
    (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`),
  );
  if (isApiPath) {
    sendError(res, 404, "NOT_FOUND", "Route not found.");
    return;
  }
  next();
});

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.accepts("html")) {
      res.sendFile(path.join(frontendDistPath, "index.html"), (error) => {
        if (error) next(error);
      });
      return;
    }

    next();
  });
}

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found.");
});

app.use(errorHandler);
