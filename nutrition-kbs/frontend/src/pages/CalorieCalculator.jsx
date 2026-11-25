import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import useProfile from "../hooks/useProfile";
import Loading from "../components/Loading";
import { prettify } from "../utils/format";

const empty = {
  age: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
};

export default function CalorieCalculator() {
  const { profile, options, loading: profileLoading } = useProfile();
  const [form, setForm] = useState(empty);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);

  const calculate = async (values) => {
    setError("");
    setCalculating(true);
    try {
      const res = await api.post("/nutrition/calories", values);
      setResult(res.data.result);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    setForm({
      age: profile.age ?? "",
      gender: profile.gender ?? "",
      heightCm: profile.heightCm ?? "",
      weightKg: profile.weightKg ?? "",
      activityLevel: profile.activityLevel ?? "",
    });
    const complete = [
      "age",
      "gender",
      "heightCm",
      "weightKg",
      "activityLevel",
    ].every((f) => profile[f]);
    if (complete) calculate({}); // the backend uses the saved profile
  }, [profile]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Object.values(form).some((v) => v === ""))
      return setError("Fill in all fields");
    calculate({
      age: Number(form.age),
      gender: form.gender,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      activityLevel: form.activityLevel,
    });
  };

  if (profileLoading) return <Loading />;
  if (!options)
    return (
      <div className="alert alert-danger">
        Could not load options. Is the backend running?
      </div>
    );

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 className="fw-bold mb-1">Calorie Calculator</h2>
      <p className="text-muted">
        Estimates how many calories your body uses in a day. Starts from your{" "}
        <Link to="/profile">profile</Link>; change values to try a what-if
        without saving.
      </p>

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="card-soft" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="age">
                Age (years)
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="18"
                max="100"
                className="form-control"
                value={form.age}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                className="form-select"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                {options.genders.map((g) => (
                  <option key={g} value={g}>
                    {prettify(g)}
                  </option>
                ))}
              </select>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label" htmlFor="heightCm">
                  Height (cm)
                </label>
                <input
                  id="heightCm"
                  name="heightCm"
                  type="number"
                  min="100"
                  max="250"
                  step="0.1"
                  className="form-control"
                  value={form.heightCm}
                  onChange={handleChange}
                />
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="weightKg">
                  Weight (kg)
                </label>
                <input
                  id="weightKg"
                  name="weightKg"
                  type="number"
                  min="25"
                  max="300"
                  step="0.1"
                  className="form-control"
                  value={form.weightKg}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="activityLevel">
                Activity level
              </label>
              <select
                id="activityLevel"
                name="activityLevel"
                className="form-select"
                value={form.activityLevel}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                {options.activityLevels.map((a) => (
                  <option key={a} value={a}>
                    {prettify(a)}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary w-100" disabled={calculating}>
              {calculating ? "Calculating..." : "Calculate"}
            </button>
          </form>
        </div>

        <div className="col-lg-8">
          {error && <div className="alert alert-danger">{error}</div>}

          {!result && !error && (
            <div className="card-soft text-center text-muted py-5">
              Fill in the form, or complete your profile, to see your estimate.
            </div>
          )}

          {result && (
            <div className="card-soft">
              <div className="text-center mb-4">
                <div className="text-muted small">
                  Estimated daily calorie requirement
                </div>
                <div className="display-5 fw-bold text-success">
                  {result.estimatedDailyCalories.toLocaleString("en-IN")}
                  <span className="fs-5 text-muted"> kcal/day</span>
                </div>
                <span className="badge text-bg-warning">Estimate only</span>
              </div>

              <div className="row g-3 text-center mb-4">
                <div className="col-4">
                  <div className="text-muted small">BMR</div>
                  <div className="fw-semibold">
                    {result.bmr.toLocaleString("en-IN")} kcal
                  </div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Activity factor</div>
                  <div className="fw-semibold">
                    x {result.activityMultiplier}
                  </div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">TDEE</div>
                  <div className="fw-semibold">
                    {result.tdee.toLocaleString("en-IN")} kcal
                  </div>
                </div>
              </div>

              <p className="small mb-2">
                <strong>Activity level:</strong>{" "}
                {prettify(result.activityLevel)} ({result.activityDescription})
              </p>

              <div className="bg-light rounded p-3 small mb-3">
                <strong>How it was calculated ({result.formula})</strong>
                {result.steps.map((s) => (
                  <div key={s} className="font-monospace">
                    {s}
                  </div>
                ))}
                <div className="text-muted mt-1">
                  BMR = energy at complete rest. TDEE = total daily energy
                  expenditure.
                </div>
              </div>

              <div className="alert alert-light border mb-0 small">
                <strong>Limitations</strong>
                <ul className="mb-2 mt-1">
                  {result.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <div className="text-muted">{result.reference}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
