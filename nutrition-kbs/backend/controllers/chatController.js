import UserProfile from "../models/UserProfile.js";
import DailyNutritionLog from "../models/DailyNutritionLog.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateNutritionReply } from "../services/geminiService.js";

const asksAboutLoggedIntake = (message, history = []) =>
  /\b(today|diary|food log|nutrition log|logged|recorded|ate|eaten|consumed|my meals|my intake)\b/i
    .test([message, ...history.map((turn) => turn.text)].join(" "));

const logContext = (log) => ({
  date: log.dateKey,
  totals: log.entries.length ? log.entries.reduce((totals, entry) => {
    for (const [key, value] of Object.entries(entry.nutrients.toObject?.() ?? entry.nutrients)) {
      if (value == null || !Number.isFinite(value)) totals[key] = null;
      else if (totals[key] !== null) totals[key] = (totals[key] ?? 0) + value;
    }
    return totals;
  }, {}) : {},
  foods: log.entries.slice(-30).map((entry) => ({
    name: entry.foodSnapshot.name,
    meal: entry.mealType,
    quantity: entry.quantity,
    unit: entry.quantityUnit,
    nutrients: entry.nutrients.toObject?.() ?? entry.nutrients,
  })),
});

export const sendMessage = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id })
    .select("dietaryPreference allergies restrictions healthGoal")
    .lean();

  let dailyLog;
  if (req.body.trackingDate && asksAboutLoggedIntake(req.body.message, req.body.history)) {
    const log = await DailyNutritionLog.findOne({
      user: req.user._id,
      dateKey: req.body.trackingDate,
    });
    if (log) dailyLog = logContext(log);
  }

  const reply = await generateNutritionReply({
    message: req.body.message,
    history: req.body.history ?? [],
    profile,
    dailyLog,
  });

  res.json({
    success: true,
    reply,
    disclaimer:
      "Educational information only. This assistant cannot diagnose conditions or prescribe treatment.",
  });
});
