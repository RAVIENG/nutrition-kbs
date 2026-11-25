import Recommendation from "../models/Recommendation.js";
import RecommendationRule from "../models/RecommendationRule.js";

import asyncHandler from "../utils/asyncHandler.js";

import { generateRecommendations } from "../services/recommendationEngine.js";

// POST /api/recommendations/generate

export const generate = asyncHandler(async (req, res) => {
  const result = await generateRecommendations(req.user, req.body);

  res.json({
    success: true,
    ...result,
  });
});

// GET /api/recommendations/history

export const history = asyncHandler(async (req, res) => {
  const records = await Recommendation.find({
    user: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,

    history: records.map((record) => ({
      id: record._id,
      createdAt: record.createdAt,
      request: record.request,
      count: record.results.length,
      topFoods: record.results.slice(0, 3).map((item) => item.name),
    })),
  });
});

// GET /api/recommendations/rules

export const listRules = asyncHandler(async (req, res) => {
  const rules = await RecommendationRule.find()
    .sort({ priority: 1 })
    .select("key name ifThen type weight active locked reason -_id")
    .lean();

  res.json({
    success: true,
    rules,
  });
});
