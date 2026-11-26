import api from "../services/api";

export const todayDateKey = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

const makeRequestId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `entry_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

export const logCatalogFoods = (foods, date = todayDateKey()) =>
  api.post("/tracking/entries", {
    date,
    entries: foods.map(({ foodId, mealType, quantity }) => ({
      requestId: makeRequestId(),
      sourceType: "food_database",
      foodId: String(foodId),
      mealType,
      quantity,
    })),
  });
