import express from "express";
import {
  listEmailTemplates,
  createEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../controllers/email.controller.js";

const router = express.Router();

router.get("/", listEmailTemplates);
router.post("/", createEmailTemplate);
router.get("/:id", getEmailTemplate);
router.put("/:id", updateEmailTemplate);
router.delete("/:id", deleteEmailTemplate);

export default router;
