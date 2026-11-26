const rules = [
  // SAFETY FILTERS

  {
    key: "allergy-exclusion",
    name: "Allergy exclusion",
    type: "filter",
    priority: 10,
    locked: true,
    weight: 0,

    ifThen:
      "IF the user lists an allergy THEN exclude foods containing that allergen",

    when: [
      {
        field: "profile.allergies",
        op: "notEmpty",
      },
    ],

    match: [
      {
        field: "food.allergens",
        op: "intersects",
        value: {
          ref: "profile.allergies",
        },
      },
    ],

    reason: "Contains an allergen from your profile.",
  },

  {
    key: "diet-preference",
    name: "Dietary preference",
    type: "filter",
    priority: 20,
    locked: true,
    weight: 0,

    ifThen:
      "IF the user selects a dietary preference THEN exclude incompatible foods",

    when: [
      {
        field: "profile.dietaryPreference",
        op: "exists",
      },
    ],

    match: [
      {
        field: "food.dietType",
        op: "notIn",
        value: {
          ref: "context.allowedDietTypes",
        },
      },
    ],

    reason: "Does not fit your dietary preference.",
  },

  {
    key: "personal-restrictions",
    name: "Personal food restrictions",
    type: "filter",
    priority: 30,
    locked: true,
    weight: 0,

    ifThen: "IF the user lists food restrictions THEN exclude matching foods",

    when: [
      {
        field: "profile.restrictions",
        op: "notEmpty",
      },
    ],

    match: [
      {
        field: "food.restrictionTerms",
        op: "intersects",
        value: {
          ref: "profile.restrictions",
        },
      },
    ],

    reason: "Matches a food restriction from your profile.",
  },

  // SCORING RULES

  {
    key: "budget-limit",
    name: "Budget limit",
    type: "filter",
    priority: 40,
    locked: true,
    weight: 0,

    ifThen: "IF a food exceeds the user's budget THEN exclude it",

    when: [
      {
        field: "request.maxPricePerServing",
        op: "exists",
      },
    ],

    match: [
      {
        field: "food.price.perServing",
        op: "gt",
        value: {
          ref: "request.maxPricePerServing",
        },
      },
    ],

    reason: "Costs more than your per-serving budget.",
  },

  {
    key: "protein-priority",
    name: "Protein priority",
    type: "score",
    priority: 50,
    weight: 20,

    ifThen:
      "IF the user wants protein-rich food THEN rank foods with 8 g or more protein higher",

    when: [
      {
        field: "context.wantsProtein",
        op: "equals",
        value: true,
      },
    ],

    match: [
      {
        field: "food.perServing.protein",
        op: "gte",
        value: 8,
      },
    ],

    reason: "Provides at least 8 g protein per serving.",
  },

  {
    key: "seasonal-boost",
    name: "Seasonal food",
    type: "score",
    priority: 60,
    weight: 15,

    ifThen: "IF seasonal foods are recorded THEN rank matching foods higher",

    when: [
      {
        field: "context.seasonalFoodNames",
        op: "notEmpty",
      },
    ],

    match: [
      {
        field: "food.name",
        op: "in",
        value: {
          ref: "context.seasonalFoodNames",
        },
      },
    ],

    reason: "In season for your region.",
  },

  {
    key: "kitchen-ingredients",
    name: "Available kitchen ingredients",
    type: "score",
    priority: 70,
    weight: 15,

    ifThen:
      "IF kitchen ingredients are available THEN rank matching foods higher",

    when: [
      {
        field: "context.kitchenItems",
        op: "notEmpty",
      },
    ],

    match: [
      {
        field: "food.keywords",
        op: "textMatchesAny",
        value: {
          ref: "context.kitchenItems",
        },
      },
    ],

    reason: "Uses ingredients already available in your kitchen.",
  },

  {
    key: "fiber-gap",
    name: "Nutrition gap: fiber",
    type: "score",
    priority: 80,
    weight: 20,

    ifThen: "IF the user has a fiber gap THEN rank fiber-rich foods higher",

    when: [
      {
        field: "context.gapNutrients",
        op: "contains",
        value: "fiber",
      },
    ],

    match: [
      {
        field: "food.perServing.fiber",
        op: "gte",
        value: 3,
      },
    ],

    reason: "Fiber-rich food that helps address a recorded fiber gap.",
  },

  {
    key: "regional-preference",
    name: "Preferred regional food",
    type: "score",
    priority: 90,
    weight: 10,

    ifThen:
      "IF the user lists regional food preferences THEN rank matching foods higher",

    when: [
      {
        field: "profile.preferredRegionalFoods",
        op: "notEmpty",
      },
    ],

    match: [
      {
        field: "food.keywords",
        op: "textMatchesAny",
        value: {
          ref: "profile.preferredRegionalFoods",
        },
      },
    ],

    reason: "Matches a regional food you prefer.",
  },

  {
    key: "weight-management-fit",
    name: "Weight management fit",
    type: "score",
    priority: 100,
    weight: 15,

    ifThen:
      "IF the user's goal is weight management THEN rank moderate-calorie, fiber-rich foods higher",

    when: [
      {
        field: "profile.healthGoal",
        op: "equals",
        value: "weight_management",
      },
    ],

    match: [
      {
        field: "food.perServing.calories",
        op: "lte",
        value: 200,
      },
      {
        field: "food.perServing.fiber",
        op: "gte",
        value: 2,
      },
    ],

    reason: "Moderate in calories and contains fiber.",
  },

  {
    key: "fiber-baseline",
    name: "Fiber source",
    type: "score",
    priority: 110,
    weight: 5,

    ifThen:
      "IF a food contains at least 3 g fiber per serving THEN give it a small boost",

    when: [],

    match: [
      {
        field: "food.perServing.fiber",
        op: "gte",
        value: 3,
      },
    ],

    reason: "Provides at least 3 g fiber per serving.",
  },
];

export default rules;
