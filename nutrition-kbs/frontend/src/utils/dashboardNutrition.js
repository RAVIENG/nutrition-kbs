const nutrientNames = { protein: "protein", fiber: "fibre" };

export const dateKeyInTimeZone = (date = new Date(), timeZone = "Asia/Kolkata") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const todayDateKeyIndia = () => dateKeyInTimeZone(new Date(), "Asia/Kolkata");

const formatGrams = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);

export const getDashboardNutrientCard = (day, nutrient) => {
  const label = nutrientNames[nutrient] || nutrient;
  if (!day) return { value: "Loading...", hint: "Loading today's food log." };

  const entries = Array.isArray(day.entries) ? day.entries : [];
  const coverage = day.coverage?.[nutrient];
  if (entries.length === 0 || coverage?.status === "empty") {
    return { value: "0 g", hint: "No food logged today." };
  }

  const value = day.totals?.[nutrient];
  if (coverage?.status === "partial" && Number.isFinite(value)) {
    const missing = coverage.missingEntries;
    const available = coverage.availableEntries;
    return {
      value: "Partial",
      hint: `${formatGrams(value)} g reported from ${available} of ${entries.length} foods; ${missing} ${missing === 1 ? "food lacks" : "foods lack"} ${label} data.`,
    };
  }
  if (coverage?.status === "unavailable" || !Number.isFinite(value)) {
    return {
      value: "Unavailable",
      hint: `No reliable ${label} total is available for today's food log.`,
    };
  }
  return { value: `${formatGrams(value)} g`, hint: "From all logged meals today." };
};
