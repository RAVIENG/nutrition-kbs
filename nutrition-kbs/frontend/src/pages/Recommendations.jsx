import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import useProfile from "../hooks/useProfile";

import Loading from "../components/Loading";
import RecommendationCard from "../components/RecommendationCard";

import { prettify } from "../utils/format";

const requestLabel = (request) =>
  [
    request.mealType ? prettify(request.mealType) : "Any meal",

    request.proteinRich ? "protein-rich" : null,

    request.maxPricePerServing ? `up to ₹${request.maxPricePerServing}` : null,
  ]
    .filter(Boolean)
    .join(", ");

export default function Recommendations() {
  const { options, loading: optionsLoading } = useProfile();

  const [form, setForm] = useState({
    mealType: "",
    proteinRich: false,
    maxPrice: "",
    limit: 10,
  });

  const [result, setResult] = useState(null);
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = () =>
    api
      .get("/recommendations/history")
      .then((res) => setHistory(res.data.history))
      .catch(() => {});

  useEffect(() => {
    api
      .get("/recommendations/rules")
      .then((res) => setRules(res.data.rules))
      .catch(() => {});

    loadHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setGenerating(true);

    const payload = {
      proteinRich: form.proteinRich,
      limit: Number(form.limit),
    };

    if (form.mealType) {
      payload.mealType = form.mealType;
    }

    if (form.maxPrice !== "") {
      payload.maxPricePerServing = Number(form.maxPrice);
    }

    try {
      const res = await api.post("/recommendations/generate", payload);

      setResult(res.data);

      loadHistory();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate recommendations.",
      );

      setResult(null);
    } finally {
      setGenerating(false);
    }
  };

  if (optionsLoading) {
    return <Loading />;
  }

  const incomplete = error.startsWith("Complete your profile");

  return (
    <div>
      <h2 className="fw-bold mb-1">Personalized Recommendations</h2>

      <p className="text-muted">
        Get personalized food suggestions based on your dietary preference,
        allergies, nutrition needs and available food database, including USDA
        foods.
      </p>

      <form className="card-soft mb-4" onSubmit={handleSubmit}>
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label small" htmlFor="mealType">
              Meal
            </label>

            <select
              id="mealType"
              className="form-select"
              value={form.mealType}
              onChange={(e) =>
                setForm({
                  ...form,
                  mealType: e.target.value,
                })
              }
            >
              <option value="">Any meal</option>

              {options?.mealTypes?.map((meal) => (
                <option key={meal} value={meal}>
                  {prettify(meal)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small" htmlFor="maxPrice">
              Max price per serving (₹)
            </label>

            <input
              id="maxPrice"
              type="number"
              min="1"
              max="5000"
              className="form-control"
              placeholder="No limit"
              value={form.maxPrice}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxPrice: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-2">
            <label className="form-label small" htmlFor="limit">
              How many?
            </label>

            <select
              id="limit"
              className="form-select"
              value={form.limit}
              onChange={(e) =>
                setForm({
                  ...form,
                  limit: e.target.value,
                })
              }
            >
              {[5, 10, 15, 20].map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <div className="form-check">
              <input
                id="protein"
                className="form-check-input"
                type="checkbox"
                checked={form.proteinRich}
                onChange={(e) =>
                  setForm({
                    ...form,
                    proteinRich: e.target.checked,
                  })
                }
              />

              <label className="form-check-label small" htmlFor="protein">
                Protein-rich
              </label>
            </div>
          </div>

          <div className="col-md-2">
            <button className="btn btn-primary w-100" disabled={generating}>
              {generating ? "Thinking..." : "Get recommendations"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="alert alert-danger">
          {error}{" "}
          {incomplete && <Link to="/profile">Complete your profile</Link>}
        </div>
      )}

      {result && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-lg-3">
              <div className="card-soft text-center">
                <div className="text-muted small">BMI</div>

                <div className="fw-bold">{result.summary.bmi.value}</div>

                <div className="small text-muted">
                  {result.summary.bmi.category}
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="card-soft text-center">
                <div className="text-muted small">
                  Daily calories (estimate)
                </div>

                <div className="fw-bold">
                  {result.summary.estimatedDailyCalories.toLocaleString(
                    "en-IN",
                  )}{" "}
                  kcal
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="card-soft text-center">
                <div className="text-muted small">Diet</div>

                <div className="fw-bold">
                  {prettify(result.summary.dietaryPreference)}
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="card-soft text-center">
                <div className="text-muted small">Allergies</div>

                <div className="fw-bold small">
                  {result.summary.allergies.length
                    ? result.summary.allergies.map(prettify).join(", ")
                    : "None listed"}
                </div>
              </div>
            </div>
          </div>

          <details className="card-soft mb-3">
            <summary className="fw-semibold" style={{ cursor: "pointer" }}>
              How the system reached these results
            </summary>

            <ol className="small mt-3 mb-3">
              {result.trace.map((item, index) => (
                <li key={index}>
                  <strong>{item.title}:</strong> {item.detail}
                </li>
              ))}
            </ol>

            {result.excluded.length > 0 && (
              <>
                <div className="fw-semibold small mb-1">
                  Foods removed by safety rules
                </div>

                <ul className="small mb-0">
                  {result.excluded.map((item) => (
                    <li key={item.rule.key}>
                      <strong>{item.rule.name}:</strong> {item.count} foods (for
                      example {item.examples.join(", ")})
                    </li>
                  ))}
                </ul>
              </>
            )}
          </details>

          {result.recommendations.length === 0 ? (
            <div className="card-soft text-center text-muted py-5">
              No foods matched. Try a different meal type or review your
              profile.
            </div>
          ) : (
            <div className="row g-3">
              {result.recommendations.map((item, index) => (
                <div className="col-lg-6" key={item.food.id}>
                  <RecommendationCard
                    item={item}
                    rank={index + 1}
                    mealType={form.mealType || item.food.mealTypes?.[0]}
                  />
                </div>
              ))}
            </div>
          )}

          <p className="small text-muted mt-3">{result.disclaimer}</p>
        </>
      )}

      <details className="card-soft mt-4">
        <summary className="fw-semibold" style={{ cursor: "pointer" }}>
          Knowledge-base rules ({rules.length})
        </summary>

        <p className="small text-muted mt-3">
          Rules are stored in MongoDB. Filter rules exclude foods, while score
          rules change their ranking. Rules can be updated without changing the
          recommendation engine.
        </p>

        <div className="table-responsive">
          <table className="table table-sm small align-middle mb-0">
            <thead>
              <tr>
                <th>Rule</th>
                <th>IF ... THEN ...</th>
                <th>Type</th>
                <th className="text-end">Points</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((rule) => (
                <tr key={rule.key}>
                  <td className="fw-semibold">
                    {rule.name}

                    {rule.locked && (
                      <span className="badge text-bg-secondary ms-1">
                        Safety
                      </span>
                    )}
                  </td>

                  <td>{rule.ifThen}</td>

                  <td>{prettify(rule.type)}</td>

                  <td className="text-end">
                    {rule.type === "score"
                      ? rule.weight > 0
                        ? `+${rule.weight}`
                        : rule.weight
                      : "Exclude"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {history.length > 0 && (
        <details className="card-soft mt-3">
          <summary className="fw-semibold" style={{ cursor: "pointer" }}>
            Previous recommendations
          </summary>

          <ul className="small mt-3 mb-0">
            {history.map((item) => (
              <li key={item.id}>
                {new Date(item.createdAt).toLocaleString("en-IN")}

                {" · "}

                {requestLabel(item.request)}

                {" · Top: "}

                {item.topFoods.join(", ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
