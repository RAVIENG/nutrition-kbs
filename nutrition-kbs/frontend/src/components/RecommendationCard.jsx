import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";

import { prettify, DIET_COLOR } from "../utils/format";
import { logCatalogFoods } from "../utils/nutritionTracking";

export default function RecommendationCard({ item, rank, mealType }) {
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");
  const { food, serving, nutrition: n, price } = item;

  const addToLog = async () => {
    setAdding(true);
    setStatus("");
    try {
      await logCatalogFoods([{
        foodId: food.id,
        mealType: mealType || food.mealTypes?.[0] || "lunch",
        quantity: serving.grams,
      }]);
      setStatus("Added to today’s nutrition log.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Could not add this food to your log.");
    } finally {
      setAdding(false);
    }
  };

  const tiles = [
    ["Calories", `${n.calories} kcal`],
    ["Protein", `${n.protein} g`],
    ["Carbs", `${n.carbs} g`],
    ["Fat", `${n.fat} g`],
    ["Fiber", `${n.fiber} g`],
    [
      "Price (est.)",
      price ? `${price.currency || "₹"}${price.perServing}` : "Unavailable",
    ],
  ];

  return (
    <div className="card-soft h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
        <h5 className="fw-semibold mb-0">
          <span className="text-muted me-2">#{rank}</span>

          {food.name}
        </h5>

        <span
          className={`badge text-bg-${
            DIET_COLOR[food.dietType] || "secondary"
          } flex-shrink-0`}
        >
          {prettify(food.dietType)}
        </span>
      </div>

      <div className="text-muted small mb-3">
        {serving.description} ({serving.grams} g)
        {" · "}
        {prettify(food.category)}
        {food.region !== "Pan-India" && <> · {food.region}</>}
        {" · "}
        {item.caloriePercentOfDaily}% of estimated daily calories
      </div>

      {food.fdcId && (
        <div className="small text-muted mb-2">
          USDA Food ID: {food.fdcId}
          {food.fdcDataType && <> · {prettify(food.fdcDataType)}</>}
        </div>
      )}

      <div className="row g-2 text-center mb-3">
        {tiles.map(([label, value]) => (
          <div className="col-4" key={label}>
            <div className="bg-light rounded py-2">
              <div className="fw-semibold small">{value}</div>

              <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <div className="fw-semibold small mb-1">Why this food?</div>

        <div className="small">{item.reason}</div>
      </div>

      <div className="d-flex flex-wrap gap-1 mb-3">
        {item.rulesApplied.length === 0 ? (
          <span className="badge text-bg-light border">
            No preference rule applied
          </span>
        ) : (
          item.rulesApplied.map((rule) => (
            <span
              key={rule.key}
              className={`badge ${
                rule.points >= 0 ? "text-bg-success" : "text-bg-danger"
              }`}
              title={rule.reason}
            >
              {rule.points > 0 ? "+" : ""}
              {rule.points} {rule.name}
            </span>
          ))
        )}
      </div>

      <div className="small mt-auto">
        <div className="fw-semibold mb-1">Safety checks</div>

        {[item.checks.allergy, item.checks.diet, item.checks.restrictions].map(
          (check) => (
            <div key={check.label} className="d-flex gap-2 align-items-start">
              <FaCheckCircle className="text-success mt-1 flex-shrink-0" />

              <span>
                <strong>{check.label}:</strong> {check.note}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="small text-muted mt-3">
        Source: {food.source || "Food database"}
      </div>
      <div className="d-flex align-items-center gap-2 mt-3">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addToLog} disabled={adding}>
          {adding ? "Adding..." : "Add consumed food to today’s log"}
        </button>
        {status && <span className="small text-muted" role="status">{status}</span>}
      </div>
    </div>
  );
}
