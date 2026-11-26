import FoodPrice from "../models/FoodPrice.js";
import { NUTRIENT_KEYS, DEFAULT_PRICE_REGION } from "../utils/constants.js";

const DECIMALS = {
  calories: 0,
  vitaminB12: 2,
  vitaminD: 2,
};

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const scaleNutrients = (per100g, grams) => {
  const factor = grams / 100;
  const result = {};

  for (const key of NUTRIENT_KEYS) {
    result[key] = roundTo((per100g?.[key] ?? 0) * factor, DECIMALS[key] ?? 1);
  }

  return result;
};

export const toFoodView = (food, priceDoc) => ({
  id: food._id,

  fdcId: food.fdcId ?? null,
  fdcDataType: food.fdcDataType ?? null,

  name: food.name,
  category: food.category,
  mealTypes: food.mealTypes,
  foodGroup: food.foodGroup,
  dietType: food.dietType,
  allergens: food.allergens ?? [],
  ingredients: food.ingredients ?? [],
  region: food.region,

  serving: food.serving,

  per100g: scaleNutrients(food.per100g, 100),

  perServing: scaleNutrients(food.per100g, food.serving.grams),

  price: priceDoc
    ? {
        perServing: priceDoc.pricePerServing,
        currency: priceDoc.currency,
        isEstimate: priceDoc.isEstimate,
      }
    : null,

  verified: food.verified,
  source: food.source,
});

export const attachPrices = async (foods) => {
  if (!foods.length) {
    return [];
  }

  const prices = await FoodPrice.find({
    food: {
      $in: foods.map((food) => food._id),
    },
    region: DEFAULT_PRICE_REGION,
  }).lean();

  const priceByFood = new Map(
    prices.map((price) => [String(price.food), price]),
  );

  return foods.map((food) =>
    toFoodView(food, priceByFood.get(String(food._id))),
  );
};
