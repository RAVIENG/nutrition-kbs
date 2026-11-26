import asyncHandler from "../utils/asyncHandler.js";
import {
  addNutritionEntries,
  deleteNutritionEntry,
  editNutritionEntry,
  getDailyNutritionLog,
  getRegionalFoodDetails,
  getNutritionHistory,
  searchDailyFoods,
  searchRegionalFoods,
} from "../services/dailyNutritionService.js";

export const getDay = asyncHandler(async (req, res) => {
  const day = await getDailyNutritionLog(req.user._id, req.query.date);
  res.json({ success: true, day });
});

export const getHistory = asyncHandler(async (req, res) => {
  const history = await getNutritionHistory(req.user._id, req.query.date, req.query.period);
  res.json({ success: true, history });
});

export const searchFoods = asyncHandler(async (req, res) => {
  const foods = await searchDailyFoods(req.query.q);
  res.json({ success: true, foods });
});

export const searchFoodTales = asyncHandler(async (req, res) => {
  const result = await searchRegionalFoods(req.query.q);
  res.json({ success: true, ...result });
});

export const getFoodTalesDetails = asyncHandler(async (req, res) => {
  const food = await getRegionalFoodDetails(req.params.sku);
  res.json({ success: true, food });
});

export const addEntries = asyncHandler(async (req, res) => {
  await addNutritionEntries(req.user._id, req.body);
  const day = await getDailyNutritionLog(req.user._id, req.body.date);
  res.status(201).json({ success: true, day });
});

export const editEntry = asyncHandler(async (req, res) => {
  await editNutritionEntry(req.user._id, req.params.entryId, req.body);
  const day = await getDailyNutritionLog(req.user._id, req.body.date);
  res.json({ success: true, day });
});

export const removeEntry = asyncHandler(async (req, res) => {
  await deleteNutritionEntry(req.user._id, req.params.entryId, req.query.date);
  const day = await getDailyNutritionLog(req.user._id, req.query.date);
  res.json({ success: true, day });
});
