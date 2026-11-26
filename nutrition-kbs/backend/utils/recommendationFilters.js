export const isWithinServingBudget = (food, budget) => {
  if (budget === undefined) return true;
  const price = food.price?.perServing;
  return Number.isFinite(price) && price <= budget;
};
