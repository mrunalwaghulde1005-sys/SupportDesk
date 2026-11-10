import { Router } from "express";
import * as ticketController from "../controllers/ticket.controller.ts";
import { asyncHandler } from "../middleware/async-handler.ts";

export const ticketRoutes = Router();

ticketRoutes.get("/", asyncHandler(ticketController.listTickets));
ticketRoutes.post("/", asyncHandler(ticketController.createTicket));
ticketRoutes.get("/:id", asyncHandler(ticketController.getTicket));
ticketRoutes.put("/:id", asyncHandler(ticketController.updateTicket));
ticketRoutes.patch("/:id", asyncHandler(ticketController.updateTicket));
ticketRoutes.delete("/:id", asyncHandler(ticketController.deleteTicket));
ticketRoutes.patch("/:id/close", asyncHandler(ticketController.closeTicket));
ticketRoutes.patch("/:id/reopen", asyncHandler(ticketController.reopenTicket));
