import express from "express";

import { protect } from "../middleware/authMiddleware.js";

import validate from "../validators/validate.js";

import { generateRules } from "../validators/recommendationValidator.js";

import {
  generate,
  history,
  listRules,
} from "../controllers/recommendationController.js";

const router = express.Router();

router.use(protect);

router.post("/generate", generateRules, validate, generate);

router.get("/history", history);

router.get("/rules", listRules);

export default router;
