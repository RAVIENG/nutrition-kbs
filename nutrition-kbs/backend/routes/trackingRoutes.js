import express from "express";
import rateLimit from "express-rate-limit";
import { createRateLimitHandler } from "../utils/apiRateLimit.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../validators/validate.js";
import {
  addEntriesRules,
  dayQueryRules,
  deleteEntryRules,
  editEntryRules,
  foodSearchRules,
  historyQueryRules,
} from "../validators/trackingValidator.js";
import {
  addEntries,
  editEntry,
  getDay,
  getFoodTalesDetails,
  getHistory,
  removeEntry,
  searchFoodTales,
  searchFoods,
} from "../controllers/trackingController.js";

const router = express.Router();
const foodTalesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  handler: createRateLimitHandler("foodtales-local"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Food catalogue search limit reached." },
});

router.use(protect);
router.get("/day", dayQueryRules, validate, getDay);
router.get("/history", historyQueryRules, validate, getHistory);
router.get("/foods", foodSearchRules, validate, searchFoods);
router.get("/foodtales/search", foodTalesLimiter, foodSearchRules, validate, searchFoodTales);
router.get("/foodtales/:sku", foodTalesLimiter, getFoodTalesDetails);
router.post("/entries", addEntriesRules, validate, addEntries);
router.patch("/entries/:entryId", editEntryRules, validate, editEntry);
router.delete("/entries/:entryId", deleteEntryRules, validate, removeEntry);

export default router;
