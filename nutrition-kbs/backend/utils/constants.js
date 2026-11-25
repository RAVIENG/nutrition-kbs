export const GENDERS = ["male", "female"];

export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
];

export const DIETARY_PREFERENCES = [
  "vegetarian",
  "vegan",
  "eggetarian",
  "non_vegetarian",
];

export const HEALTH_GOALS = [
  "balanced_nutrition",
  "weight_management",
  "muscle_development",
  "dietary_diversity",
  "nutrition_awareness",
];

// Common food allergens. Foods in the knowledge base will use these same keys.
export const ALLERGENS = [
  "peanuts",
  "tree_nuts",
  "milk",
  "egg",
  "soy",
  "gluten",
  "fish",
  "shellfish",
  "sesame",
  "mustard",
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const FOOD_CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "regional",
  "street_food",
  "fast_food",
  "non_vegetarian",
];

// Which planner slot a food can fill ("snack" covers both snack slots)
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export const FOOD_GROUPS = [
  "cereal",
  "pulse",
  "vegetable",
  "fruit",
  "dairy",
  "egg",
  "meat_fish",
  "nuts_seeds",
  "mixed_dish",
];

export const FOOD_REGIONS = ["Pan-India", ...INDIAN_STATES];

// Every nutrient we store, per 100 g of food
export const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "iron",
  "calcium",
  "vitaminC",
  "vitaminB12",
  "vitaminD",
];

export const DEFAULT_PRICE_REGION = "India (average)";

export const RULE_TYPES = ["filter", "score"];

export const RULE_OPERATORS = [
  "equals",
  "notEquals",
  "in",
  "notIn",
  "exists",
  "notEmpty",
  "gt",
  "gte",
  "lt",
  "lte",
  "intersects",
  "contains",
  "textMatchesAny",
];
