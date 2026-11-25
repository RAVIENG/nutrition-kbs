import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

import validate from "../validators/validate.js";
import { listFoodRules, foodRules } from "../validators/foodValidator.js";

import {
  listFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
} from "../controllers/foodController.js";

import {
  searchUSDAFoods,
  importUSDAFood,
} from "../controllers/usdaController.js";

const router = express.Router();

// All food routes require authentication
router.use(protect);

// Get all foods
router.get("/", listFoodRules, validate, listFoods);

// USDA FoodData Central integration
router.get("/usda/search", searchUSDAFoods);
router.post("/usda/import", adminOnly, importUSDAFood);

// Get food by ID
router.get("/:id", getFood);

// Admin-only food management
router.post("/", adminOnly, foodRules, validate, createFood);
router.put("/:id", adminOnly, foodRules, validate, updateFood);
router.delete("/:id", adminOnly, deleteFood);

export default router;
