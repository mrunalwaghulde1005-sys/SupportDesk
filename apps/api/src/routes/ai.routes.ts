import { Router } from "express";
import * as aiController from "../controllers/ai.controller.ts";
import { asyncHandler } from "../middleware/async-handler.ts";
import { requireRole } from "../middleware/require-role.ts";

export const aiRoutes = Router({ mergeParams: true });
aiRoutes.use(requireRole("ADMIN", "AGENT"));
aiRoutes.post("/suggest-reply", asyncHandler(aiController.suggestReply));
aiRoutes.post("/categorize", asyncHandler(aiController.categorizeTicket));
