import { Router } from "express";
import * as adminController from "../controllers/admin.controller.ts";
import * as ticketController from "../controllers/ticket.controller.ts";
import { asyncHandler } from "../middleware/async-handler.ts";
import { requireRole } from "../middleware/require-role.ts";

export const adminRoutes = Router();
adminRoutes.use(requireRole("ADMIN"));
adminRoutes.get("/tickets", asyncHandler(ticketController.listTickets));
adminRoutes.patch("/tickets/:id", asyncHandler(ticketController.updateTicket));
adminRoutes.patch("/tickets/:id/assignment", asyncHandler(ticketController.assignTicket));
adminRoutes.get("/users", asyncHandler(adminController.listUsers));
