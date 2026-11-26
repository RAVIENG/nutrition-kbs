import { calculateCalories } from "./calorieService.js";

export const getNutritionTargets = (profile) => {
  const custom = profile?.nutritionTargets ?? {};
  let estimatedCalories = null;
  if (
    profile?.age != null &&
    profile?.gender &&
    profile?.heightCm != null &&
    profile?.weightKg != null &&
    profile?.activityLevel
  ) {
    try {
      estimatedCalories = calculateCalories(profile).estimatedDailyCalories;
    } catch {
      estimatedCalories = null;
    }
  }

  const estimatedProtein =
    profile?.weightKg != null ? Math.round(profile.weightKg * 0.83 * 10) / 10 : null;

  return {
    calories: {
      value: custom.calories ?? estimatedCalories,
      isEstimate: custom.calories == null && estimatedCalories != null,
      source: custom.calories == null && estimatedCalories != null
        ? "Mifflin-St Jeor TDEE estimate"
        : custom.calories != null
          ? "User-set target"
          : null,
    },
    protein: {
      value: custom.protein ?? estimatedProtein,
      isEstimate: custom.protein == null && estimatedProtein != null,
      source: custom.protein == null && estimatedProtein != null
        ? "ICMR-NIN adult RDA: 0.83 g/kg/day"
        : custom.protein != null
          ? "User-set target"
          : null,
    },
    carbs: {
      value: custom.carbs ?? null,
      isEstimate: false,
      source: custom.carbs != null ? "User-set target" : null,
    },
    fat: {
      value: custom.fat ?? null,
      isEstimate: false,
      source: custom.fat != null ? "User-set target" : null,
    },
    fiber: {
      value: custom.fiber ?? 25,
      isEstimate: custom.fiber == null,
      source: custom.fiber == null
        ? "WHO recommendation for adults and people over 10 years"
        : "User-set target",
    },
  };
};
