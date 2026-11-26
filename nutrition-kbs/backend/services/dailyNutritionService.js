import FoodItem from "../models/FoodItem.js";
import UserProfile from "../models/UserProfile.js";
import DailyNutritionLog from "../models/DailyNutritionLog.js";
import ApiError from "../utils/ApiError.js";
import { NUTRIENT_KEYS } from "../utils/constants.js";
import { getFoodTalesDishNutrition, searchFoodTalesDishes } from "./foodTalesService.js";
import { getNutritionTargets } from "./nutritionTargetsService.js";

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"];
const round = (number) => Math.round(number * 1000) / 1000;

export const validateDateKey = (dateKey) => {
  if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new ApiError(400, "Date must use YYYY-MM-DD format.");
  }
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new ApiError(400, "Choose a valid calendar date.");
  }
  return dateKey;
};

const optionalNutrientsFromFood = (food) => {
  const nutrients = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const rawValue = food.per100g?.[key];
      const value = Number(rawValue);
      return [key, rawValue != null && Number.isFinite(value) && value >= 0 ? value : null];
    }),
  );

  // USDA's importer stores unreported optional values as zero due to the
  // existing FoodItem schema. Recover the missing marker from its source note.
  const marker = food.source?.match(/Not reported by USDA \(stored as 0\): ([^|]+)/i);
  if (marker) {
    for (const key of marker[1].split(",").map((item) => item.trim())) {
      if (NUTRIENT_KEYS.includes(key)) nutrients[key] = null;
    }
  }
  return nutrients;
};

export const scaleTrackedNutrients = (nutrients, quantity, basis) =>
  Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      nutrients[key] == null
        ? null
        : round(nutrients[key] * (basis === "per_100g" ? quantity / 100 : quantity)),
    ]),
  );

const checkQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0.1 || quantity > 100000) {
    throw new ApiError(400, "Quantity must be at least 0.1 and no more than 100000.");
  }
  return quantity;
};

const checkMealType = (value) => {
  if (!MEAL_TYPES.includes(value)) throw new ApiError(400, "Choose breakfast, lunch, snacks, or dinner.");
  return value;
};

const makeEntry = ({ requestId, mealType, sourceType, sourceId, quantity, food }) => {
  const quantityValue = checkQuantity(quantity);
  const unit = food.nutritionBasis === "per_100g" ? "g" : "serving";
  const calculated = scaleTrackedNutrients(food.nutrientsPerBasis, quantityValue, food.nutritionBasis);
  return {
    requestId,
    mealType: checkMealType(mealType),
    sourceType,
    sourceId,
    quantity: quantityValue,
    quantityUnit: unit,
    foodSnapshot: {
      name: food.name,
      region: food.region ?? null,
      source: food.source ?? "",
      verified: Boolean(food.verified),
      nutritionBasis: food.nutritionBasis,
      nutrientsPerBasis: food.nutrientsPerBasis,
    },
    nutrients: calculated,
  };
};

const foodDatabaseSnapshot = (food) => ({
  name: food.name,
  region: food.region,
  source: food.source,
  verified: food.verified,
  nutritionBasis: "per_100g",
  nutrientsPerBasis: optionalNutrientsFromFood(food),
});

const foodTalesSnapshot = async (sku) => getFoodTalesDishNutrition(sku);

const addForUser = async (userId, dateKey, entries) => {
  let log = await DailyNutritionLog.findOne({ user: userId, dateKey });
  if (!log) {
    try {
      log = await DailyNutritionLog.create({ user: userId, dateKey, entries });
      return log;
    } catch (error) {
      if (error.code !== 11000) throw error;
      log = await DailyNutritionLog.findOne({ user: userId, dateKey });
    }
  }

  const requestIds = new Set(log.entries.map((entry) => entry.requestId));
  const fresh = entries.filter((entry) => !requestIds.has(entry.requestId));
  if (log.entries.length + fresh.length > 200) {
    throw new ApiError(400, "A daily food log can contain at most 200 entries.");
  }
  if (fresh.length) {
    log.entries.push(...fresh);
    await log.save();
  }
  return log;
};

export const addNutritionEntries = async (userId, input) => {
  const dateKey = validateDateKey(input.date);
  if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 20) {
    throw new ApiError(400, "Add between 1 and 20 foods per request.");
  }
  const ids = new Set();
  const requests = input.entries.map((entry) => {
    if (!entry || typeof entry !== "object") throw new ApiError(400, "Each food entry must be an object.");
    if (typeof entry.requestId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(entry.requestId)) {
      throw new ApiError(400, "Each entry needs a valid request ID.");
    }
    if (ids.has(entry.requestId)) throw new ApiError(400, "Duplicate request IDs are not allowed.");
    ids.add(entry.requestId);
    return entry;
  });

  const dbIds = requests.filter((entry) => entry.sourceType === "food_database").map((entry) => entry.foodId);
  if (dbIds.some((id) => typeof id !== "string")) throw new ApiError(400, "A food database ID is required.");
  const docs = dbIds.length ? await FoodItem.find({ _id: { $in: dbIds } }).lean() : [];
  const foodById = new Map(docs.map((food) => [String(food._id), food]));

  const prepared = await Promise.all(requests.map(async (entry) => {
    if (entry.sourceType === "food_database") {
      const food = foodById.get(entry.foodId);
      if (!food) throw new ApiError(404, "A selected food is no longer in the database.");
      return makeEntry({
        requestId: entry.requestId,
        mealType: entry.mealType,
        sourceType: entry.sourceType,
        sourceId: String(food._id),
        quantity: entry.quantity,
        food: foodDatabaseSnapshot(food),
      });
    }
    if (entry.sourceType === "foodtales") {
      if (typeof entry.foodTalesSku !== "string") throw new ApiError(400, "A FoodTales dish SKU is required.");
      const food = await foodTalesSnapshot(entry.foodTalesSku);
      if (!food.name) throw new ApiError(422, "FoodTales did not provide a dish name.");
      return makeEntry({
        requestId: entry.requestId,
        mealType: entry.mealType,
        sourceType: entry.sourceType,
        sourceId: food.sourceId,
        quantity: entry.quantity,
        food,
      });
    }
    throw new ApiError(400, "Choose a supported food source.");
  }));

  const log = await addForUser(userId, dateKey, prepared);
  return log;
};

export const editNutritionEntry = async (userId, entryId, input) => {
  const dateKey = validateDateKey(input.date);
  const log = await DailyNutritionLog.findOne({ user: userId, dateKey });
  const entry = log?.entries.id(entryId);
  if (!entry) throw new ApiError(404, "Nutrition entry not found for this account and date.");
  if (input.mealType !== undefined) entry.mealType = checkMealType(input.mealType);
  if (input.quantity !== undefined) entry.quantity = checkQuantity(input.quantity);
  if (input.quantityUnit !== undefined && input.quantityUnit !== entry.quantityUnit) {
    throw new ApiError(400, "Quantity unit cannot be changed; select the matching food source.");
  }
  entry.nutrients = scaleTrackedNutrients(
    entry.foodSnapshot.nutrientsPerBasis,
    entry.quantity,
    entry.foodSnapshot.nutritionBasis,
  );
  await log.save();
  return log;
};

export const deleteNutritionEntry = async (userId, entryId, date) => {
  const dateKey = validateDateKey(date);
  const log = await DailyNutritionLog.findOne({ user: userId, dateKey });
  if (!log?.entries.id(entryId)) throw new ApiError(404, "Nutrition entry not found for this account and date.");
  log.entries.pull({ _id: entryId });
  await log.save();
  return log;
};

export const summarizeTrackedNutrients = (entries) => {
  const totals = {};
  const coverage = {};
  for (const key of NUTRIENT_KEYS) {
    const available = entries
      .map((entry) => entry.nutrients?.[key])
      .filter(Number.isFinite);
    const missingEntries = entries.length - available.length;
    totals[key] = entries.length === 0
      ? 0
      : available.length === 0
        ? null
        : round(available.reduce((sum, value) => sum + value, 0));
    coverage[key] = {
      availableEntries: available.length,
      missingEntries,
      status: entries.length === 0
        ? "empty"
        : available.length === 0
          ? "unavailable"
          : missingEntries > 0
            ? "partial"
            : "complete",
    };
  }
  return { totals, coverage };
};

export const totalTrackedNutrients = (entries) => summarizeTrackedNutrients(entries).totals;

const summarize = (log) => {
  const entries = log?.entries ?? [];
  const meals = Object.fromEntries(
    MEAL_TYPES.map((mealType) => {
      const mealEntries = entries.filter((entry) => entry.mealType === mealType);
      return [mealType, { entries: mealEntries, ...summarizeTrackedNutrients(mealEntries) }];
    }),
  );
  return { date: log?.dateKey, entries, meals, ...summarizeTrackedNutrients(entries) };
};

export const getDailyNutritionLog = async (userId, date) => {
  const dateKey = validateDateKey(date);
  const [log, profile] = await Promise.all([
    DailyNutritionLog.findOne({ user: userId, dateKey }).lean(),
    UserProfile.findOne({ user: userId }).lean(),
  ]);
  return {
    ...summarize(log),
    targets: getNutritionTargets(profile),
  };
};

export const searchDailyFoods = async (query) => {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2 || q.length > 80) throw new ApiError(400, "Food search must be 2-80 characters.");
  const foods = await FoodItem.find({ name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })
    .sort({ name: 1 }).limit(20).lean();
  return foods.map((food) => ({
    id: String(food._id),
    name: food.name,
    region: food.region,
    serving: food.serving,
    source: food.source,
    verified: food.verified,
    per100g: optionalNutrientsFromFood(food),
  }));
};

export const searchRegionalFoods = async (query) => searchFoodTalesDishes(query);

export const getRegionalFoodDetails = async (sku) => foodTalesSnapshot(sku);

export const getNutritionHistory = async (userId, date, period) => {
  const anchor = new Date(`${validateDateKey(date)}T00:00:00.000Z`);
  const start = new Date(anchor);
  const end = new Date(anchor);
  if (period === "week") {
    const day = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - day);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
  } else if (period === "month") {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else {
    throw new ApiError(400, "History period must be week or month.");
  }
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  const docs = await DailyNutritionLog.find({ user: userId, dateKey: { $gte: from, $lte: to } }).lean();
  const byDate = new Map(docs.map((doc) => [doc.dateKey, summarize(doc)]));
  const days = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const summary = byDate.get(dateKey);
    days.push({
      date: dateKey,
      entryCount: summary?.entries.length ?? 0,
      totals: summary?.totals ?? totalTrackedNutrients([]),
      coverage: summary?.coverage ?? summarizeTrackedNutrients([]).coverage,
    });
  }
  return { period, from, to, days };
};
