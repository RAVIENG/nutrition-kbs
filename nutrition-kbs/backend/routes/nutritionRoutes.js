import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../validators/validate.js";
import { bmiRules, calorieRules } from "../validators/nutritionValidator.js";
import {
  getBMI,
  getCalories,
  getSummary,
} from "../controllers/nutritionController.js";

const router = express.Router();

router.use(protect);

router.post("/bmi", bmiRules, validate, getBMI);
router.post("/calories", calorieRules, validate, getCalories);
router.get("/summary", getSummary);

export default router;
