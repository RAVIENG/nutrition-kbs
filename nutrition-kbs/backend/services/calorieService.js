import ApiError from "../utils/ApiError.js";
import { GENDERS, ACTIVITY_LEVELS } from "../utils/constants.js";

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const ACTIVITY_DESCRIPTIONS = {
  sedentary: "little or no exercise, desk-based routine",
  lightly_active: "light exercise or sports 1-3 days a week",
  moderately_active: "moderate exercise or sports 3-5 days a week",
  very_active: "hard exercise or sports 6-7 days a week",
};

export const calculateCalories = ({
  age,
  gender,
  heightCm,
  weightKg,
  activityLevel,
}) => {
  const a = Number(age);
  const h = Number(heightCm);
  const w = Number(weightKg);

  if (!(Number.isInteger(a) && a >= 18 && a <= 100))
    throw new ApiError(400, "Age must be a whole number between 18 and 100");
  if (!GENDERS.includes(gender)) throw new ApiError(400, "Invalid gender");
  if (!(h >= 100 && h <= 250))
    throw new ApiError(400, "Height must be between 100 and 250 cm");
  if (!(w >= 25 && w <= 300))
    throw new ApiError(400, "Weight must be between 25 and 300 kg");
  if (!ACTIVITY_LEVELS.includes(activityLevel))
    throw new ApiError(400, "Invalid activity level");

  // Mifflin-St Jeor: BMR = 10*weight + 6.25*height - 5*age + s   (s = +5 male, -161 female)
  const constant = gender === "male" ? 5 : -161;
  const bmr = 10 * w + 6.25 * h - 5 * a + constant;

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = bmr * multiplier;

  return {
    inputs: { age: a, gender, heightCm: h, weightKg: w, activityLevel },
    formula: "Mifflin-St Jeor equation",
    bmr: Math.round(bmr),
    activityLevel,
    activityDescription: ACTIVITY_DESCRIPTIONS[activityLevel],
    activityMultiplier: multiplier,
    tdee: Math.round(tdee),
    estimatedDailyCalories: Math.round(tdee),
    isEstimate: true,
    steps: [
      `BMR = 10 x ${w} + 6.25 x ${h} - 5 x ${a} ${constant >= 0 ? "+" : "-"} ${Math.abs(constant)} = ${Math.round(bmr)} kcal/day`,
      `TDEE = BMR x activity factor = ${Math.round(bmr)} x ${multiplier} = ${Math.round(tdee)} kcal/day`,
    ],
    reference: "Mifflin MD et al., Am J Clin Nutr, 1990.",
    limitations: [
      "This is an estimate. Real energy needs can differ by 10% or more between individuals.",
      "The activity factor is a rough category, not a measurement of your actual movement.",
      "The equation was developed for healthy adults. It is not suitable for pregnancy, breastfeeding, medical conditions or elite athletes.",
      "The equation uses separate constants for male and female, so it cannot reflect every body type.",
      "It is educational guidance, not a diet prescription. Consult a doctor or dietitian for personal plans.",
    ],
  };
};
