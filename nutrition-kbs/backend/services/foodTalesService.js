import ApiError from "../utils/ApiError.js";

const KNOWLEDGE_URL = "https://knowledge.foodtales.ai/v1";
const REQUEST_TIMEOUT_MS = 12_000;

const getKey = () => {
  const key = process.env.FOODTALES_API_KEY?.trim();
  if (!key) throw new ApiError(503, "FoodTales is not configured.");
  return key;
};

const request = async (url) => {
  let response;
  try {
    response = await fetch(url, {
      headers: { "X-Api-Key": getKey(), Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (["TimeoutError", "AbortError"].includes(error.name)) {
      throw new ApiError(504, "FoodTales took too long to respond.");
    }
    throw new ApiError(502, "Could not connect to FoodTales.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if ([401, 403].includes(response.status)) {
      throw new ApiError(503, "FoodTales rejected its backend API key.");
    }
    if (response.status === 429) {
      throw new ApiError(503, "FoodTales rate or credit limit reached.");
    }
    throw new ApiError(502, "FoodTales could not complete the request.");
  }
  if (!data || typeof data !== "object") {
    throw new ApiError(502, "FoodTales returned invalid data.");
  }
  return { data, response };
};

export const searchFoodTalesDishes = async (query) => {
  const url = new URL(`${KNOWLEDGE_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  const { data, response } = await request(url);
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    results: results.map((dish) => ({
      sku: typeof dish.sku === "string" ? dish.sku : null,
      name: typeof dish.name === "string" ? dish.name : null,
      region: typeof dish.cuisine === "string" ? dish.cuisine : null,
      course: dish.course ?? null,
      description: dish.short_description ?? "",
    })).filter((dish) => dish.sku && dish.name),
    creditsRemaining: response.headers.get("x-ft-credits-remaining"),
  };
};

const numberOrNull = (value) => {
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) && number >= 0
    ? number
    : null;
};

export const getFoodTalesDishNutrition = async (sku) => {
  if (!/^[A-Za-z0-9_-]{2,80}$/.test(sku)) {
    throw new ApiError(400, "Select a valid FoodTales dish.");
  }
  const { data } = await request(`${KNOWLEDGE_URL}/dishes/${encodeURIComponent(sku)}`);
  const dish = data.dish ?? data.data ?? data;
  const nutrition = dish.nutrition;
  const basis = nutrition?.basis;
  if (!nutrition || !["per_serving", "per_100g"].includes(basis)) {
    throw new ApiError(422, "This FoodTales dish has no supported nutrition serving basis.");
  }

  return {
    sourceId: String(dish.sku ?? sku).slice(0, 100),
    name: typeof dish.name === "string" ? dish.name.slice(0, 160) : null,
    region: typeof dish.region === "string" ? dish.region.slice(0, 80) : null,
    source: `FoodTales - ${nutrition.source ?? "nutrition record"} - ${nutrition.confidence ?? "unspecified confidence"}`.slice(0, 300),
    verified: false,
    nutritionBasis: basis,
    nutrientsPerBasis: {
      calories: numberOrNull(nutrition.calories_kcal),
      protein: numberOrNull(nutrition.protein_g),
      carbs: numberOrNull(nutrition.carbs_g),
      fat: numberOrNull(nutrition.fat_g),
      fiber: numberOrNull(nutrition.fiber_g),
      iron: numberOrNull(nutrition.iron_mg),
      calcium: numberOrNull(nutrition.calcium_mg),
      vitaminC: numberOrNull(nutrition.vitamin_c_mg),
      vitaminB12: numberOrNull(nutrition.vitamin_b12_mcg),
      vitaminD: numberOrNull(nutrition.vitamin_d_mcg),
    },
  };
};
