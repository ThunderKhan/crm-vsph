import express from "express";
import { create, reissue, accept, preview } from "../controllers/invitation.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, create);
router.post("/reissue", authMiddleware, reissue);
router.get("/:token", preview);
router.post("/accept", accept);

export default router;
