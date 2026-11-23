import { Router } from "express";
import * as commentController from "../controllers/comment.controller.ts";
import { asyncHandler } from "../middleware/async-handler.ts";

export const commentRoutes = Router({ mergeParams: true });

commentRoutes.get("/", asyncHandler(commentController.listComments));
commentRoutes.post("/", asyncHandler(commentController.createComment));
