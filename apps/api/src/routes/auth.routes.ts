import { Router } from "express";
import * as authController from "../controllers/auth.controller.ts";
import { asyncHandler } from "../middleware/async-handler.ts";

export const authRoutes = Router();

authRoutes.post("/register", asyncHandler(authController.register));
authRoutes.post("/login", asyncHandler(authController.login));
