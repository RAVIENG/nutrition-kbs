export const summarizeNutritionHistory = (days = []) => {
  const loggedDays = days.filter((day) => day.entryCount > 0);
  const calorieDays = loggedDays.filter((day) => Number.isFinite(day.totals?.calories));
  const averageRecordedCalories = calorieDays.length
    ? Math.round(calorieDays.reduce((sum, day) => sum + day.totals.calories, 0) / calorieDays.length)
    : null;
  return {
    loggedDays: loggedDays.length,
    calorieDataDays: calorieDays.length,
    averageRecordedCalories,
    partialCalorieDays: loggedDays.filter((day) => day.coverage?.calories?.status === "partial").length,
    unavailableCalorieDays: loggedDays.filter((day) => day.coverage?.calories?.status === "unavailable").length,
  };
};
