import { Router } from "express";
import { submitContact } from "../controllers/contact.controller.js";

const router = Router();

// POST /api/contact/submit - Submit contact form
router.post("/submit", submitContact);

export default router;