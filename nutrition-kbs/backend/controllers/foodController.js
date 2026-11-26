import FoodItem from "../models/FoodItem.js";
import FoodPrice from "../models/FoodPrice.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

import { allowedDietTypes } from "../utils/diet.js";
import { DEFAULT_PRICE_REGION } from "../utils/constants.js";

import { attachPrices } from "../services/foodService.js";
import { foodRegionFilter } from "../utils/foodFilters.js";

// Query values must be plain strings
const str = (value) => (typeof value === "string" ? value : undefined);

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only these fields can be written through admin endpoints
const FOOD_FIELDS = [
  "name",
  "category",
  "mealTypes",
  "foodGroup",
  "dietType",
  "allergens",
  "ingredients",
  "serving",
  "per100g",
  "region",
  "source",
  "verified",
];

const pickFoodFields = (body) =>
  FOOD_FIELDS.reduce(
    (acc, field) =>
      body[field] !== undefined ? { ...acc, [field]: body[field] } : acc,
    {},
  );

// Save food price in the default region
const savePrice = (foodId, price) =>
  FoodPrice.findOneAndUpdate(
    {
      food: foodId,
      region: DEFAULT_PRICE_REGION,
    },
    {
      $set: {
        pricePerServing: price,
        isEstimate: true,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

// GET /api/foods
export const listFoods = asyncHandler(async (req, res) => {
  const q = str(req.query.q);
  const category = str(req.query.category);
  const mealType = str(req.query.mealType);
  const diet = str(req.query.diet);
  const allergens = str(req.query.allergens);
  const region = str(req.query.region);

  const page = Math.max(parseInt(str(req.query.page), 10) || 1, 1);

  const limit = Math.min(
    Math.max(parseInt(str(req.query.limit), 10) || 20, 1),
    100,
  );

  const filter = {};

  if (q) {
    filter.name = {
      $regex: escapeRegex(q.trim()),
      $options: "i",
    };
  }

  if (category) filter.category = category;

  if (mealType) filter.mealTypes = mealType;

  if (region) filter.region = foodRegionFilter(region);

  // Vegetarian users can also eat vegan foods
  if (diet) {
    filter.dietType = {
      $in: allowedDietTypes(diet),
    };
  }

  // Exclude foods containing selected allergens
  if (allergens) {
    filter.allergens = {
      $nin: allergens
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };
  }

  const [total, foods] = await Promise.all([
    FoodItem.countDocuments(filter),

    FoodItem.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    foods: await attachPrices(foods),
  });
});

// GET /api/foods/:id
export const getFood = asyncHandler(async (req, res) => {
  const food = await FoodItem.findById(req.params.id).lean();

  if (!food) {
    throw new ApiError(404, "Food not found");
  }

  const [view] = await attachPrices([food]);

  res.json({
    success: true,
    food: view,
  });
});

// POST /api/foods (admin)
export const createFood = asyncHandler(async (req, res) => {
  const food = await FoodItem.create({
    source: "Added by administrator",
    ...pickFoodFields(req.body),
  });

  if (req.body.price !== undefined) {
    await savePrice(food._id, req.body.price);
  }

  const [view] = await attachPrices([food.toObject()]);

  res.status(201).json({
    success: true,
    food: view,
  });
});

// PUT /api/foods/:id (admin)
export const updateFood = asyncHandler(async (req, res) => {
  const food = await FoodItem.findByIdAndUpdate(
    req.params.id,
    {
      $set: pickFoodFields(req.body),
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!food) {
    throw new ApiError(404, "Food not found");
  }

  if (req.body.price !== undefined) {
    await savePrice(food._id, req.body.price);
  }

  const [view] = await attachPrices([food.toObject()]);

  res.json({
    success: true,
    food: view,
  });
});

// DELETE /api/foods/:id (admin)
export const deleteFood = asyncHandler(async (req, res) => {
  const food = await FoodItem.findByIdAndDelete(req.params.id);

  if (!food) {
    throw new ApiError(404, "Food not found");
  }

  await FoodPrice.deleteMany({
    food: food._id,
  });

  res.json({
    success: true,
    message: "Food deleted",
  });
});
