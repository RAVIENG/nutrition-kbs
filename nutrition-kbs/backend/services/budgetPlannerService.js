import FoodItem from "../models/FoodItem.js";
import UserProfile from "../models/UserProfile.js";
import ApiError from "../utils/ApiError.js";
import { allowedDietTypes } from "../utils/diet.js";
import { attachPrices } from "./foodService.js";
import { calculateCalories } from "./calorieService.js";
import {
  extractGeminiText,
  requestGeminiInteraction,
} from "./geminiService.js";

const PORTIONS = [1, 0.75, 0.5];
const PROTEIN_GROUPS = ["pulse", "dairy", "egg", "meat_fish", "nuts_seeds"];
const norm = (value) => String(value ?? "").trim().toLowerCase();
const round = (value) => Math.round(value * 100) / 100;
const round1 = (value) => Math.round(value * 10) / 10;

const slotsFor = (mealsPerDay) =>
  mealsPerDay === 4
    ? ["breakfast", "lunch", "snack", "dinner"]
    : ["breakfast", "lunch", "dinner"];

const sharesFor = (slots) =>
  slots.length === 4
    ? { breakfast: 0.2, lunch: 0.35, snack: 0.12, dinner: 0.33 }
    : { breakfast: 0.25, lunch: 0.4, dinner: 0.35 };

const prepareFoods = (foods, { dietaryPreference, allergies, restrictions }) => {
  const allowed = allowedDietTypes(dietaryPreference);
  const allergySet = new Set(allergies.map(norm));
  const restrictionTerms = restrictions.map(norm).filter(Boolean);

  return foods.filter((food) => {
    if (!food.price || !Number.isFinite(food.price.perServing)) return false;
    if (!allowed.includes(food.dietType)) return false;

    const hasAllergy = (food.allergens ?? []).some((allergen) =>
      allergySet.has(norm(allergen)),
    );
    if (hasAllergy) return false;

    const searchable = [food.name, food.foodGroup, food.category]
      .map(norm)
      .join(" ");
    return !restrictionTerms.some((term) => searchable.includes(term));
  });
};

const preferenceScore = (food, preferences) => {
  const searchable = [food.name, food.foodGroup, food.category, food.region]
    .map(norm)
    .join(" ");
  return preferences.some((term) => searchable.includes(norm(term))) ? 4 : 0;
};

const choosePortion = (food, cap) => {
  for (const servings of PORTIONS) {
    const cost = food.price.perServing * servings;
    if (cost <= cap) return { servings, cost };
  }
  return null;
};

const scoreFood = (food, servings, preferences, selectedIds, purpose) => {
  const cost = Math.max(food.price.perServing * servings, 1);
  const nutrition = food.perServing;
  const efficiency =
    purpose === "starch"
      ? nutrition.calories / cost
      : nutrition.protein / cost;
  const novelty = selectedIds.has(String(food.id)) ? -3 : 1;
  const sourceQuality = food.verified ? 0.5 : 0;
  return preferenceScore(food, preferences) + efficiency + novelty + sourceQuality;
};

const pickFood = ({
  foods,
  slot,
  groups,
  cap,
  preferences,
  selectedIds,
  mealIds,
  purpose,
}) => {
  const choices = foods
    .filter(
      (food) =>
        food.mealTypes.includes(slot) &&
        !mealIds.has(String(food.id)) &&
        (!groups || groups.includes(food.foodGroup)),
    )
    .map((food) => {
      const portion = choosePortion(food, cap);
      if (!portion) return null;
      return {
        food,
        ...portion,
        score: scoreFood(food, portion.servings, preferences, selectedIds, purpose),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.cost - b.cost);

  return choices[0] ?? null;
};

const addItem = (mealItems, picked, selectedIds, mealIds) => {
  if (!picked) return;
  mealItems.push(picked);
  selectedIds.add(String(picked.food.id));
  mealIds.add(String(picked.food.id));
};

export const buildRuleBasedSelections = ({
  foods,
  dailyBudget,
  mealsPerDay,
  preferences,
}) => {
  const slots = slotsFor(mealsPerDay);
  const shares = sharesFor(slots);
  const selectedIds = new Set();
  let remaining = dailyBudget;
  let carry = 0;

  const meals = slots.map((slot) => {
    const cap = Math.min(remaining, dailyBudget * shares[slot] + carry);
    const items = [];
    const mealIds = new Set();
    const budgetLeft = () =>
      Math.max(0, cap - items.reduce((sum, item) => sum + item.cost, 0));
    const add = (groups, purpose = "protein") =>
      addItem(
        items,
        pickFood({
          foods,
          slot,
          groups,
          cap: budgetLeft(),
          preferences,
          selectedIds,
          mealIds,
          purpose,
        }),
        selectedIds,
        mealIds,
      );

    if (slot === "breakfast") {
      add(["cereal", "mixed_dish", "pulse"], "starch");
      add(PROTEIN_GROUPS);
      if (budgetLeft() >= 5) add(["fruit"]);
    } else if (slot === "lunch" || slot === "dinner") {
      add(["cereal"], "starch");
      add(PROTEIN_GROUPS);
      if (budgetLeft() >= 4) add(["vegetable"]);
      if (!items.length) add(null, "starch");
    } else {
      add(["fruit", "pulse", "dairy", "egg", "nuts_seeds", "vegetable"]);
      if (budgetLeft() >= 5) add(["fruit", "pulse", "dairy", "nuts_seeds"]);
    }

    if (!items.length) add(null, "starch");

    if (!items.length) {
      throw new ApiError(
        422,
        "There are not enough priced foods for every meal at this budget. Increase the budget or review the food database.",
      );
    }

    const cost = items.reduce((sum, item) => sum + item.cost, 0);
    remaining = Math.max(0, remaining - cost);
    carry = Math.max(0, cap - cost);
    return { slot, items };
  });

  return meals;
};

const buildAiPrompt = ({ foods, dailyBudget, mealsPerDay, dietaryPreference, preferences, calorieTarget }) => {
  const slots = slotsFor(mealsPerDay);
  const candidates = foods.map((food) => ({
    id: String(food.id),
    name: food.name,
    groups: [food.foodGroup],
    slots: food.mealTypes,
    estimatedPricePerServingINR: food.price.perServing,
    nutritionPerServing: food.perServing,
    serving: food.serving,
  }));

  return [
    "Create a practical Indian daily meal plan using only the supplied food IDs.",
    'Return only JSON in this shape: {"meals":[{"slot":"breakfast","items":[{"foodId":"...","servings":1}]}]}.',
    "Use each requested slot exactly once. Choose 1 to 3 foods per meal. Serving amounts must be exactly 0.5, 0.75, or 1.",
    "Every breakfast, lunch, and dinner must contain either one mixed_dish or both a cereal and at least one protein-group food (pulse, dairy, egg, meat_fish, or nuts_seeds).",
    "Never create food names, prices, quantities, or nutrient numbers. Do not include nutrition or cost values in the output.",
    "Prefer varied meals and a balanced mix of cereal, protein foods, vegetables, and fruit where the available options allow.",
    "The backend will verify every food and recalculate costs and nutrients from its local database. Any invalid or over-budget plan will be discarded.",
    JSON.stringify({
      dailyBudgetINR: dailyBudget,
      requestedSlots: slots,
      dietaryPreference,
      foodPreferences: preferences,
      estimatedDailyCaloriesFromProfile: calorieTarget,
      availableFoods: candidates,
    }),
  ].join("\n\n");
};

const buildBudgetResponseFormat = (slots) => ({
  type: "text",
  mime_type: "application/json",
  schema: {
    type: "object",
    properties: {
      meals: {
        type: "array",
        minItems: slots.length,
        maxItems: slots.length,
        items: {
          type: "object",
          properties: {
            slot: { type: "string", enum: slots },
            items: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  foodId: { type: "string" },
                  servings: { type: "number", enum: PORTIONS },
                },
                required: ["foodId", "servings"],
              },
            },
          },
          required: ["slot", "items"],
        },
      },
    },
    required: ["meals"],
  },
});

const parseAiSelection = (text) => {
  if (typeof text !== "string") return null;
  const cleaned = text
    .trim()
    .replace(/^\u0060{3}(?:json)?\s*/i, "")
    .replace(/\s*\u0060{3}$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

const selectionCost = (meal) =>
  meal.items.reduce((sum, item) => sum + item.cost, 0);

const parseAiMeal = (meal, slot, foodById) => {
  if (
    meal?.slot !== slot ||
    !Array.isArray(meal.items) ||
    meal.items.length < 1 ||
    meal.items.length > 3
  ) {
    return null;
  }

  const seen = new Set();
  const items = [];
  const groups = new Set();
  for (const item of meal.items) {
    const food = foodById.get(String(item.foodId));
    if (
      !food ||
      !food.mealTypes.includes(slot) ||
      !PORTIONS.includes(item.servings) ||
      seen.has(String(food.id))
    ) {
      return null;
    }
    seen.add(String(food.id));
    groups.add(food.foodGroup);
    items.push({
      food,
      servings: item.servings,
      cost: food.price.perServing * item.servings,
    });
  }

  const isMainMeal = ["breakfast", "lunch", "dinner"].includes(slot);
  const isBalanced =
    groups.has("mixed_dish") ||
    (groups.has("cereal") &&
      [...groups].some((group) => PROTEIN_GROUPS.includes(group)));
  if (isMainMeal && !isBalanced) return null;

  return { slot, items };
};

export const validateAiSelections = ({
  response,
  foods,
  dailyBudget,
  mealsPerDay,
}) => {
  if (!response || !Array.isArray(response.meals)) return null;

  const slots = slotsFor(mealsPerDay);
  if (response.meals.length !== slots.length) return null;
  const foodById = new Map(foods.map((food) => [String(food.id), food]));
  const mealBySlot = new Map();

  for (const meal of response.meals) {
    if (!slots.includes(meal.slot) || mealBySlot.has(meal.slot)) return null;
    const selection = parseAiMeal(meal, meal.slot, foodById);
    if (!selection) return null;
    mealBySlot.set(meal.slot, selection);
  }

  if (slots.some((slot) => !mealBySlot.has(slot))) return null;
  const selections = slots.map((slot) => mealBySlot.get(slot));
  const total = selections.reduce(
    (sum, meal) =>
      sum + meal.items.reduce((mealSum, item) => mealSum + item.cost, 0),
    0,
  );
  return total <= dailyBudget ? selections : null;
};

export const repairAiSelections = ({
  response,
  foods,
  dailyBudget,
  mealsPerDay,
  preferences = [],
}) => {
  if (!Array.isArray(response?.meals)) return null;

  const slots = slotsFor(mealsPerDay);
  const foodById = new Map(foods.map((food) => [String(food.id), food]));
  const aiMeals = new Map();
  const duplicateSlots = new Set();
  for (const meal of response.meals) {
    if (!slots.includes(meal?.slot) || aiMeals.has(meal.slot)) {
      if (slots.includes(meal?.slot)) duplicateSlots.add(meal.slot);
      continue;
    }
    aiMeals.set(meal.slot, meal);
  }

  const rules = buildRuleBasedSelections({
    foods,
    dailyBudget,
    mealsPerDay,
    preferences,
  });
  const rulesBySlot = new Map(rules.map((meal) => [meal.slot, meal]));
  const ruleUsed = new Set();
  const selections = slots.map((slot) => {
    const selection = duplicateSlots.has(slot)
      ? null
      : parseAiMeal(aiMeals.get(slot), slot, foodById);
    if (selection) return selection;
    ruleUsed.add(slot);
    return rulesBySlot.get(slot);
  });

  let total = selections.reduce((sum, meal) => sum + selectionCost(meal), 0);
  if (total > dailyBudget) {
    const replacements = slots
      .filter((slot) => !ruleUsed.has(slot))
      .map((slot) => {
        const index = slots.indexOf(slot);
        return {
          slot,
          index,
          savings:
            selectionCost(selections[index]) -
            selectionCost(rulesBySlot.get(slot)),
        };
      })
      .filter((item) => item.savings > 0)
      .sort((a, b) => b.savings - a.savings);

    for (const { slot, index, savings } of replacements) {
      if (total <= dailyBudget) break;
      selections[index] = rulesBySlot.get(slot);
      ruleUsed.add(slot);
      total -= savings;
    }
  }

  if (total > dailyBudget) return null;
  const validated = validateAiSelections({
    response: {
      meals: selections.map((meal) => ({
        slot: meal.slot,
        items: meal.items.map((item) => ({
          foodId: String(item.food.id),
          servings: item.servings,
        })),
      })),
    },
    foods,
    dailyBudget,
    mealsPerDay,
  });
  const usedAiSelections = slots.length - ruleUsed.size;
  return validated && usedAiSelections > 0
    ? { selections: validated, adjusted: ruleUsed.size > 0 }
    : null;
};

export const calculateMealTotals = (items) =>
  items.reduce(
    (total, item) => {
      total.cost += item.cost;
      for (const key of ["calories", "protein", "carbs", "fat"]) {
        total[key] += item.food.perServing[key] * item.servings;
      }
      return total;
    },
    { cost: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

const serializeItem = (item) => {
  const food = item.food;
  const servings = item.servings;
  return {
    id: String(food.id),
    name: food.name,
    servingDescription: food.serving.description,
    servings,
    quantityGrams: round1(food.serving.grams * servings),
    estimatedCost: round(item.cost),
    nutrition: {
      calories: round1(food.perServing.calories * servings),
      protein: round1(food.perServing.protein * servings),
      carbs: round1(food.perServing.carbs * servings),
      fat: round1(food.perServing.fat * servings),
    },
    foodGroup: food.foodGroup,
    source: food.source,
    verified: food.verified,
    priceIsEstimate: food.price.isEstimate,
  };
};

const findAlternatives = (item, slot, foods) =>
  foods
    .filter(
      (food) =>
        food.foodGroup === item.food.foodGroup &&
        food.mealTypes.includes(slot) &&
        String(food.id) !== String(item.food.id) &&
        food.price.perServing * item.servings < item.cost,
    )
    .sort(
      (a, b) =>
        a.price.perServing * item.servings -
        b.price.perServing * item.servings,
    )
    .slice(0, 2)
    .map((food) => ({
      id: String(food.id),
      name: food.name,
      servingDescription: food.serving.description,
      servings: item.servings,
      quantityGrams: round1(food.serving.grams * item.servings),
      estimatedCost: round(food.price.perServing * item.servings),
      estimatedSavings: round(item.cost - food.price.perServing * item.servings),
      nutrition: {
        calories: round1(food.perServing.calories * item.servings),
        protein: round1(food.perServing.protein * item.servings),
        carbs: round1(food.perServing.carbs * item.servings),
        fat: round1(food.perServing.fat * item.servings),
      },
      source: food.source,
      priceIsEstimate: food.price.isEstimate,
    }));

const calculateCalorieTarget = (profile) => {
  const fields = ["age", "gender", "heightCm", "weightKg", "activityLevel"];
  if (!profile || fields.some((field) => profile[field] == null)) return null;
  try {
    return calculateCalories(profile).estimatedDailyCalories;
  } catch {
    return null;
  }
};

export const findProteinSuggestions = ({ selections, foods, dailyBudget }) => {
  const currentCost = selections.reduce(
    (sum, meal) =>
      sum + meal.items.reduce((mealSum, item) => mealSum + item.cost, 0),
    0,
  );
  const suggestions = [];
  const seen = new Set();

  for (const meal of selections) {
    for (const item of meal.items) {
      if (!PROTEIN_GROUPS.includes(item.food.foodGroup)) continue;
      for (const candidate of foods) {
        const suggestionKey = `${meal.slot}:${candidate.id}`;
        if (
          candidate.foodGroup !== item.food.foodGroup ||
          !candidate.mealTypes.includes(meal.slot) ||
          String(candidate.id) === String(item.food.id) ||
          seen.has(suggestionKey)
        ) {
          continue;
        }

        const proteinIncrease =
          (candidate.perServing.protein - item.food.perServing.protein) *
          item.servings;
        const costChange =
          (candidate.price.perServing - item.food.price.perServing) *
          item.servings;
        const revisedCost = currentCost + costChange;
        if (proteinIncrease <= 0 || revisedCost > dailyBudget) continue;

        seen.add(suggestionKey);
        suggestions.push({
          slot: meal.slot,
          mealLabel:
            meal.slot === "snack"
              ? "Evening snacks"
              : meal.slot[0].toUpperCase() + meal.slot.slice(1),
          replaceFood: item.food.name,
          withFood: candidate.name,
          servingDescription: candidate.serving.description,
          quantityGrams: round1(candidate.serving.grams * item.servings),
          proteinIncrease: round1(proteinIncrease),
          costChange: round(costChange),
          revisedDailyCost: round(revisedCost),
          priceIsEstimate: candidate.price.isEstimate,
        });
      }
    }
  }

  return suggestions
    .sort(
      (a, b) =>
        b.proteinIncrease / Math.max(b.costChange, 0.25) -
          a.proteinIncrease / Math.max(a.costChange, 0.25) ||
        a.costChange - b.costChange,
    )
    .slice(0, 3);
};

export const generateBudgetPlan = async (
  user,
  input,
  {
    geminiRequest = requestGeminiInteraction,
    profileOverride,
    foodsOverride,
  } = {},
) => {
  const profile =
    profileOverride !== undefined
      ? profileOverride
      : await UserProfile.findOne({ user: user._id }).lean();
  const dietaryPreference = input.dietaryPreference || profile?.dietaryPreference;
  const allergies = [...new Set([...(profile?.allergies ?? [])])];
  const restrictions = [
    ...new Set([
      ...(profile?.restrictions ?? []),
      ...(input.restrictions ?? []),
    ]),
  ];
  const preferences = [
    ...new Set([
      ...(input.foodPreferences ?? []),
      ...(profile?.preferredRegionalFoods ?? []),
    ]),
  ];

  if (!dietaryPreference || !allowedDietTypes(dietaryPreference).length) {
    throw new ApiError(400, "Choose a valid dietary preference.");
  }

  const slots = slotsFor(input.mealsPerDay);
  const views =
    foodsOverride !== undefined
      ? foodsOverride
      : await attachPrices(
          await FoodItem.find({ mealTypes: { $in: slots } })
            .limit(300)
            .lean(),
        );
  const foods = prepareFoods(views, {
    dietaryPreference,
    allergies,
    restrictions,
  });

  if (!foods.length) {
    throw new ApiError(
      422,
      "No foods with prices match this diet and its restrictions. Review the food database or adjust the restrictions.",
    );
  }

  const calorieTarget = calculateCalorieTarget(profile);
  let selections = null;
  let generationMode = "rules";
  let aiNotice = "";
  let aiAdjusted = false;

  try {
    const aiRequest = {
      input: buildAiPrompt({
        foods,
        dailyBudget: input.dailyBudget,
        mealsPerDay: input.mealsPerDay,
        dietaryPreference,
        preferences,
        calorieTarget,
      }),
      systemInstruction:
        "You create educational meal plan selections from a supplied finite catalogue. Follow the requested JSON format exactly. Only choose supplied food IDs and allowed serving sizes. Never add or change prices or nutrition data. Do not make medical claims or prescribe treatment.",
      maxOutputTokens: 900,
      responseFormat: buildBudgetResponseFormat(slots),
    };
    const validateResponse = (data) =>
      validateAiSelections({
        response: parseAiSelection(extractGeminiText(data)),
        foods,
        dailyBudget: input.dailyBudget,
        mealsPerDay: input.mealsPerDay,
      });
    const validateParsedResponse = (response) =>
      validateAiSelections({
        response,
        foods,
        dailyBudget: input.dailyBudget,
        mealsPerDay: input.mealsPerDay,
      });

    selections = validateResponse(await geminiRequest(aiRequest));
    if (!selections) {
      const retry = await geminiRequest({
        ...aiRequest,
        input:
          aiRequest.input +
          "\n\nYour previous selection did not satisfy the backend constraints. Correct it: every requested slot exactly once; only food IDs that support that slot; portions 0.5, 0.75, or 1; each breakfast, lunch, and dinner must contain a mixed_dish or both cereal and a protein-group food; and total estimated cost must not exceed the daily budget. Return only the required JSON object.",
      });
      const retryText = parseAiSelection(extractGeminiText(retry));
      selections = validateParsedResponse(retryText);
      if (!selections) {
        const repaired = repairAiSelections({
          response: retryText,
          foods,
          dailyBudget: input.dailyBudget,
          mealsPerDay: input.mealsPerDay,
          preferences,
        });
        if (repaired) {
          selections = repaired.selections;
          aiAdjusted = repaired.adjusted;
        }
      }
    }
    if (selections) {
      generationMode = aiAdjusted ? "gemini_adjusted" : "gemini";
      if (aiAdjusted) {
        aiNotice = "Some meal selections were adjusted to meet the nutrition and budget rules.";
      }
    }
    // If all generated selections are discarded, the response badge identifies
    // the plan as rules-based without surfacing a validation error to the user.
  } catch {
    aiNotice = "Gemini was unavailable; a rules-based plan is shown.";
  }

  if (!selections) {
    selections = buildRuleBasedSelections({
      foods,
      dailyBudget: input.dailyBudget,
      mealsPerDay: input.mealsPerDay,
      preferences,
    });
  }

  const meals = selections.map((meal) => {
    const totals = calculateMealTotals(meal.items);
    return {
      slot: meal.slot,
      label: meal.slot === "snack" ? "Evening snacks" : meal.slot[0].toUpperCase() + meal.slot.slice(1),
      items: meal.items.map(serializeItem),
      totals: {
        estimatedCost: round(totals.cost),
        calories: round1(totals.calories),
        protein: round1(totals.protein),
        carbs: round1(totals.carbs),
        fat: round1(totals.fat),
      },
      explanation:
        "Selected from foods matching your diet and listed restrictions. Portions, nutrition, and estimated cost are recalculated from the local food database.",
      alternatives: meal.items.flatMap((item) =>
        findAlternatives(item, meal.slot, foods).map((alternative) => ({
          forFoodId: String(item.food.id),
          ...alternative,
        })),
      ),
    };
  });

  const totals = meals.reduce(
    (sum, meal) => {
      sum.cost += meal.totals.estimatedCost;
      for (const key of ["calories", "protein", "carbs", "fat"]) {
        sum[key] += meal.totals[key];
      }
      return sum;
    },
    { cost: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const proteinSuggestions = findProteinSuggestions({
    selections,
    foods,
    dailyBudget: input.dailyBudget,
  });

  return {
    generatedAt: new Date().toISOString(),
    generationMode,
    aiNotice,
    dietaryPreference,
    mealsPerDay: input.mealsPerDay,
    budget: {
      dailyBudget: round(input.dailyBudget),
      estimatedCost: round(totals.cost),
      remaining: round(Math.max(0, input.dailyBudget - totals.cost)),
      currency: "INR",
      isEstimate: true,
    },
    totals: {
      calories: round1(totals.calories),
      protein: round1(totals.protein),
      carbs: round1(totals.carbs),
      fat: round1(totals.fat),
    },
    estimatedDailyCaloriesFromProfile: calorieTarget,
    proteinSuggestions,
    meals,
    limitations: [
      "Prices are estimates from the local database and vary by market and season.",
      "Nutrition totals use stored food values scaled to the selected portions; recipes and preparation can change actual values.",
      "This planner is educational guidance, not a medical diet prescription.",
    ],
  };
};
