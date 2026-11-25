import { useEffect, useState } from "react";
import api from "../services/api";
import useProfile from "../hooks/useProfile";
import Loading from "../components/Loading";
import FoodCard from "../components/FoodCard";
import { prettify } from "../utils/format";

const EMPTY_FILTERS = {
  q: "",
  category: "",
  mealType: "",
  diet: "",
  allergens: [],
  region: "",
};

const PAGE_SIZE = 12;

const USDA_NUTRIENTS = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbohydrates", "g"],
  ["fat", "Fat", "g"],
  ["fiber", "Fiber", "g"],
  ["iron", "Iron", "mg"],
  ["calcium", "Calcium", "mg"],
  ["vitaminC", "Vitamin C", "mg"],
  ["vitaminB12", "Vitamin B12", "mcg"],
  ["vitaminD", "Vitamin D", "mcg"],
];

export default function FoodDatabase() {
  const {
    profile,
    options,
    loading: optionsLoading,
    error: optionsError,
  } = useProfile();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // USDA search state
  const [usdaData, setUsdaData] = useState(null);
  const [usdaPage, setUsdaPage] = useState(1);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [usdaError, setUsdaError] = useState("");

  // Existing MongoDB food search
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);

      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.category) params.category = filters.category;
      if (filters.mealType) params.mealType = filters.mealType;
      if (filters.diet) params.diet = filters.diet;
      if (filters.allergens.length) {
        params.allergens = filters.allergens.join(",");
      }
      if (filters.region) params.region = filters.region;

      api
        .get("/foods", { params })
        .then((res) => {
          if (!cancelled) {
            setData(res.data);
            setError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.response?.data?.message || err.message);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, page]);

  // USDA FoodData Central search
  useEffect(() => {
    let cancelled = false;

    const query = filters.q.trim();

    if (query.length < 2) {
      setUsdaData(null);
      setUsdaError("");
      setUsdaLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setUsdaLoading(true);
      setUsdaError("");

      api
        .get("/foods/usda/search", {
          params: {
            q: query,
            page: usdaPage,
          },
        })
        .then((res) => {
          if (!cancelled) {
            setUsdaData(res.data);
            setUsdaError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setUsdaError(err.response?.data?.message || err.message);
          }
        })
        .finally(() => {
          if (!cancelled) setUsdaLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters.q, usdaPage]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPage(1);

    if (name === "q") {
      setUsdaPage(1);
    }
  };

  const toggleAllergen = (allergen) => {
    setFilters((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter((a) => a !== allergen)
        : [...prev.allergens, allergen],
    }));

    setPage(1);
  };

  const applyProfile = () => {
    setFilters((prev) => ({
      ...prev,
      diet: profile?.dietaryPreference || "",
      allergens: profile?.allergies || [],
      region: profile?.state || "",
    }));

    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setPage(1);
    setUsdaPage(1);
  };

  const select = (name, label, values, empty) => (
    <div className="col-md-4" key={name}>
      <label className="form-label small" htmlFor={name}>
        {label}
      </label>

      <select
        id={name}
        className="form-select"
        value={filters[name]}
        onChange={(e) => setFilter(name, e.target.value)}
      >
        <option value="">{empty}</option>

        {values.map((v) => (
          <option key={v} value={v}>
            {prettify(v)}
          </option>
        ))}
      </select>
    </div>
  );

  if (optionsLoading) {
    return <Loading text="Loading food database..." />;
  }

  if (!options) {
    return (
      <div className="alert alert-danger">
        {optionsError || "Could not load food options."}
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-1">Indian Food Database</h2>

      <p className="text-muted">
        Explore Indian foods with approximate nutritional values and estimated
        prices. You can also search the USDA FoodData Central catalog for
        additional food and nutrition information. This information is
        educational, not medical advice.
      </p>

      {/* Existing food filters */}
      <div className="card-soft mb-4">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label small" htmlFor="q">
              Search food
            </label>

            <input
              id="q"
              className="form-control"
              placeholder="Search dal, roti, paneer, rice, milk..."
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
            />

            <div className="form-text">
              Search your local database and USDA at the same time.
            </div>
          </div>

          {select(
            "category",
            "Category",
            options.foodCategories,
            "All categories",
          )}

          {select("mealType", "Meal type", options.mealTypes, "Any meal")}

          {select(
            "diet",
            "Suitable for",
            options.dietaryPreferences,
            "Any diet",
          )}

          {select(
            "region",
            "Food region",
            ["Pan-India", ...options.states],
            "All regions",
          )}

          <div className="col-12">
            <div className="form-label small mb-2">Hide foods containing</div>

            <div className="d-flex flex-wrap gap-3">
              {options.allergens.map((a) => (
                <div className="form-check" key={a}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`f-${a}`}
                    checked={filters.allergens.includes(a)}
                    onChange={() => toggleAllergen(a)}
                  />

                  <label className="form-check-label small" htmlFor={`f-${a}`}>
                    {prettify(a)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="col-12 d-flex flex-wrap gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={applyProfile}
              disabled={!profile}
              title={profile ? "" : "Save your profile first"}
            >
              Match my profile
            </button>

            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="col-12 small text-muted">
            Vegetarian includes vegan and vegetarian foods. Allergen information
            describes standard recipes; always verify ingredients yourself.
          </div>
        </div>
      </div>

      {/* Existing MongoDB foods */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Our Food Database</h4>

        {data && (
          <span className="text-muted small">{data.total} foods found</span>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && !data && <Loading text="Loading local foods..." />}

      {data && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">
              {data.total} {data.total === 1 ? "food" : "foods"} found
            </span>

            <span className="text-muted small">
              Showing {data.foods.length} of {data.total}
            </span>
          </div>

          {data.foods.length === 0 ? (
            <div className="card-soft text-center text-muted py-5">
              No local foods match these filters. Try removing a filter.
            </div>
          ) : (
            <div className="row g-3" style={{ opacity: loading ? 0.5 : 1 }}>
              {data.foods.map((food) => (
                <div className="col-md-6 col-xl-4" key={food.id}>
                  <FoodCard food={food} />
                </div>
              ))}
            </div>
          )}

          {data.pages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
              <button
                className="btn btn-outline-primary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>

              <span className="small text-muted">
                Page {data.page} of {data.pages}
              </span>

              <button
                className="btn btn-outline-primary btn-sm"
                disabled={page >= data.pages || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* USDA FoodData Central */}
      {filters.q.trim().length >= 2 && (
        <section className="mt-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h4 className="fw-bold mb-1">USDA FoodData Central</h4>

              <p className="text-muted small mb-0">
                Additional foods from the USDA nutrition database.
              </p>
            </div>

            {usdaData && (
              <span className="badge text-bg-success">
                {usdaData.total} results
              </span>
            )}
          </div>

          {usdaError && (
            <div className="alert alert-warning">
              USDA search unavailable: {usdaError}
            </div>
          )}

          {usdaLoading && (
            <div className="text-center py-3">
              <div
                className="spinner-border spinner-border-sm text-primary"
                role="status"
              />
              <span className="ms-2 small text-muted">
                Searching USDA foods...
              </span>
            </div>
          )}

          {!usdaLoading && usdaData && usdaData.results.length === 0 && (
            <div className="card-soft text-center text-muted py-4">
              No matching USDA foods found.
            </div>
          )}

          {usdaData && usdaData.results.length > 0 && (
            <>
              <div className="row g-3">
                {usdaData.results.map((food) => (
                  <div className="col-md-6 col-xl-4" key={food.fdcId}>
                    <div className="card-soft h-100 d-flex flex-column">
                      <div className="d-flex justify-content-between gap-2">
                        <h6 className="fw-semibold mb-2">{food.name}</h6>

                        <span className="badge text-bg-info flex-shrink-0">
                          USDA
                        </span>
                      </div>

                      <div className="text-muted small mb-3">
                        {food.foodCategory || "Food"} · {food.dataType}
                      </div>

                      {food.per100g ? (
                        <>
                          <div className="row g-2 text-center mb-3">
                            {[
                              ["Calories", food.per100g.calories, "kcal"],
                              ["Protein", food.per100g.protein, "g"],
                              ["Carbs", food.per100g.carbs, "g"],
                              ["Fat", food.per100g.fat, "g"],
                              ["Fiber", food.per100g.fiber, "g"],
                              ["Iron", food.per100g.iron, "mg"],
                            ].map(([label, value, unit]) => (
                              <div className="col-4" key={label}>
                                <div className="bg-light rounded py-2">
                                  <div className="fw-semibold small">
                                    {value} {unit}
                                  </div>
                                  <div
                                    className="text-muted"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    {label}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <details className="small mt-auto">
                            <summary className="text-primary">
                              View all nutrients per 100 g
                            </summary>

                            <table className="table table-sm small mt-2 mb-0">
                              <tbody>
                                {USDA_NUTRIENTS.map(([key, label, unit]) => (
                                  <tr key={key}>
                                    <td>{label}</td>
                                    <td className="text-end">
                                      {food.per100g[key]} {unit}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        </>
                      ) : (
                        <div className="text-muted small mb-3">
                          Nutrition details are unavailable for this search
                          result.
                        </div>
                      )}

                      <div className="small text-muted mt-3">
                        Serving basis: 100 g
                      </div>

                      <div className="small text-muted">
                        FDC ID: {food.fdcId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {usdaData.pages > 1 && (
                <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    disabled={usdaPage <= 1 || usdaLoading}
                    onClick={() => setUsdaPage(usdaPage - 1)}
                  >
                    Previous
                  </button>

                  <span className="small text-muted">
                    Page {usdaData.page} of {usdaData.pages}
                  </span>

                  <button
                    className="btn btn-outline-primary btn-sm"
                    disabled={usdaPage >= usdaData.pages || usdaLoading}
                    onClick={() => setUsdaPage(usdaPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          <div className="small text-muted mt-3">
            Source: USDA FoodData Central. Nutritional values are provided per
            100 g and may vary by food record.
          </div>
        </section>
      )}
    </div>
  );
}
