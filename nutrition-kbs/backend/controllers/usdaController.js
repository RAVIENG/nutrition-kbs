import FoodItem from "../models/FoodItem.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  FOOD_CATEGORIES,
  MEAL_TYPES,
  FOOD_GROUPS,
  FOOD_REGIONS,
  DIETARY_PREFERENCES,
  ALLERGENS,
} from "../utils/constants.js";
import { toFoodView } from "../services/foodService.js";

const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

// Use nutrition-focused datasets.
// Branded products are excluded because their serving data can differ.
const ALLOWED_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

const getApiKey = () => {
  const key = process.env.USDA_API_KEY?.trim();

  if (!key) {
    throw new ApiError(500, "USDA_API_KEY is missing from backend .env");
  }

  return key;
};

const usdaRequest = async (path, method = "GET", body) => {
  const url = new URL(`${USDA_BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());

  let response;

  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(502, "Could not connect to USDA FoodData Central.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 429) {
      throw new ApiError(503, "USDA rate limit reached. Try again later.");
    }

    if ([401, 403].includes(response.status)) {
      throw new ApiError(
        502,
        "USDA rejected the API key. Check USDA_API_KEY in backend .env.",
      );
    }

    throw new ApiError(502, `USDA request failed (${response.status}).`);
  }

  return data;
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getNutrient = (food, ids) => {
  for (const id of ids) {
    const item = (food.foodNutrients || []).find(
      (n) => Number(n.nutrient?.id ?? n.nutrientId) === id,
    );

    if (!item) continue;

    const value = Number(item.amount ?? item.value);

    if (Number.isFinite(value)) {
      return {
        value,
        unit: item.nutrient?.unitName ?? item.unitName ?? "",
      };
    }
  }

  return null;
};

const round = (value) => Math.round(value * 100) / 100;

const extractNutrients = (food) => {
  const energy = getNutrient(food, [1008, 2048, 2047, 1062]);

  let calories = energy?.value ?? null;

  // Convert kJ to kcal if the selected energy value is reported in kJ.
  if (energy?.unit && energy.unit.toLowerCase() === "kj") {
    calories = calories / 4.184;
  } else if (energy === null) {
    calories = null;
  }

  const values = {
    calories,
    protein: getNutrient(food, [1003])?.value ?? null,
    carbs: getNutrient(food, [1005])?.value ?? null,
    fat: getNutrient(food, [1004])?.value ?? null,
    fiber: getNutrient(food, [1079, 2033])?.value ?? null,
    iron: getNutrient(food, [1089])?.value ?? null,
    calcium: getNutrient(food, [1087])?.value ?? null,
    vitaminC: getNutrient(food, [1162])?.value ?? null,
    vitaminB12: getNutrient(food, [1178])?.value ?? null,
    vitaminD: getNutrient(food, [1114])?.value ?? null,
  };

  // The existing FoodItem schema requires these four core values.
  const required = ["calories", "protein", "carbs", "fat"];
  const missingRequired = required.filter((key) => values[key] === null);

  if (missingRequired.length) {
    throw new ApiError(
      422,
      `USDA record is missing required nutrients: ${missingRequired.join(", ")}`,
    );
  }

  // The existing schema requires all nutrient fields.
  // Missing optional measurements are stored as zero and noted in source.
  const missing = Object.keys(values).filter((key) => values[key] === null);

  for (const key of missing) {
    values[key] = 0;
  }

  return {
    per100g: Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, round(value)]),
    ),
    missing,
  };
};

// GET /api/foods/usda/search?q=rice&page=1
export const searchUSDAFoods = asyncHandler(async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (query.length < 2) {
    throw new ApiError(400, "Enter at least 2 characters to search.");
  }

  const requestedPage = Number(req.query.page);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 1000)
      : 1;

  const data = await usdaRequest("/foods/search", "POST", {
    query,
    pageSize: 20,
    pageNumber: page,
    dataType: ALLOWED_DATA_TYPES,
  });

  const results = (data.foods || []).map((food) => {
    let nutrition = null;

    try {
      nutrition = extractNutrients(food).per100g;
    } catch {
      // Some USDA search results may not contain all required nutrients.
    }

    return {
      fdcId: food.fdcId,
      name: food.description,
      dataType: food.dataType,
      foodCategory: food.foodCategory || "",
      per100g: nutrition,
    };
  });

  res.json({
    success: true,
    query,
    total: data.totalHits || 0,
    page: data.currentPage || page,
    pages: data.totalPages || 0,
    results,
  });
});

// POST /api/foods/usda/import (admin only)
export const importUSDAFood = asyncHandler(async (req, res) => {
  const fdcId = Number(req.body.fdcId);

  if (!Number.isSafeInteger(fdcId) || fdcId <= 0) {
    throw new ApiError(400, "A valid USDA fdcId is required.");
  }

  // Validate the admin-provided classification.
  const { category, mealTypes, foodGroup, dietType } = req.body;

  if (!FOOD_CATEGORIES.includes(category)) {
    throw new ApiError(400, "Select a valid food category.");
  }

  if (
    !Array.isArray(mealTypes) ||
    mealTypes.length === 0 ||
    mealTypes.some((value) => !MEAL_TYPES.includes(value))
  ) {
    throw new ApiError(400, "Select at least one valid meal type.");
  }

  if (!FOOD_GROUPS.includes(foodGroup)) {
    throw new ApiError(400, "Select a valid food group.");
  }

  if (!DIETARY_PREFERENCES.includes(dietType)) {
    throw new ApiError(400, "Select a valid dietary type.");
  }

  const allergens = req.body.allergens ?? [];

  if (
    !Array.isArray(allergens) ||
    allergens.some((value) => !ALLERGENS.includes(value))
  ) {
    throw new ApiError(400, "One or more allergens are invalid.");
  }

  const region = req.body.region || "Pan-India";

  if (!FOOD_REGIONS.includes(region)) {
    throw new ApiError(400, "Select a valid food region.");
  }

  const serving = req.body.serving || {
    description: "100 g",
    grams: 100,
  };

  if (
    typeof serving.description !== "string" ||
    !serving.description.trim() ||
    !Number.isFinite(Number(serving.grams)) ||
    Number(serving.grams) < 1 ||
    Number(serving.grams) > 2000
  ) {
    throw new ApiError(400, "Enter a valid serving description and weight.");
  }

  // Never overwrite an existing imported record.
  const alreadyImported = await FoodItem.findOne({ fdcId });

  if (alreadyImported) {
    throw new ApiError(409, "This USDA food has already been imported.");
  }

  const usdaFood = await usdaRequest(`/food/${fdcId}`);

  if (!ALLOWED_DATA_TYPES.includes(usdaFood.dataType)) {
    throw new ApiError(
      400,
      "This food type is not supported for per-100g importing.",
    );
  }

  const name =
    typeof req.body.name === "string" && req.body.name.trim()
      ? req.body.name.trim()
      : usdaFood.description;

  if (!name || name.length > 80) {
    throw new ApiError(400, "Food name must be between 1 and 80 characters.");
  }

  // Avoid duplicate food names, including case differences.
  const existingName = await FoodItem.findOne({
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
  });

  if (existingName) {
    throw new ApiError(
      409,
      "A food with this name already exists. Choose a distinct name.",
    );
  }

  const { per100g, missing } = extractNutrients(usdaFood);

  const sourceNote =
    `USDA FoodData Central | ${usdaFood.dataType} | FDC ID: ${fdcId}` +
    (missing.length
      ? ` | Not reported by USDA (stored as 0): ${missing.join(", ")}`
      : "");

  let savedFood;

  try {
    savedFood = await FoodItem.create({
      fdcId,
      fdcDataType: usdaFood.dataType,
      name,
      category,
      mealTypes,
      foodGroup,
      dietType,
      allergens,
      serving: {
        description: serving.description.trim(),
        grams: Number(serving.grams),
      },
      per100g,
      region,
      source: sourceNote,
      verified: false,
    });
  } catch (error) {
    // Handles a duplicate import caused by two requests at the same time.
    if (error.code === 11000) {
      throw new ApiError(409, "This food already exists in the database.");
    }

    throw error;
  }

  const foodView = toFoodView(savedFood.toObject(), undefined);

  res.status(201).json({
    success: true,
    message: "USDA food imported successfully.",
    food: foodView,
  });
});
