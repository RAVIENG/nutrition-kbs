import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import useProfile from "../hooks/useProfile";
import Loading from "../components/Loading";
import BMIIndicator from "../components/BMIIndicator";

export default function BMICalculator() {
  const { profile, loading: profileLoading } = useProfile();
  const [form, setForm] = useState({ heightCm: "", weightKg: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);

  const calculate = async (values) => {
    setError("");
    setCalculating(true);
    try {
      const res = await api.post("/nutrition/bmi", values);
      setResult(res.data.result);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  // When the saved profile arrives, fill the form and calculate from it
  useEffect(() => {
    if (profile?.heightCm && profile?.weightKg) {
      setForm({ heightCm: profile.heightCm, weightKg: profile.weightKg });
      calculate({}); // empty body: the backend uses the saved profile
    }
  }, [profile]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.heightCm === "" || form.weightKg === "")
      return setError("Enter both height and weight");
    calculate({
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
    });
  };

  if (profileLoading) return <Loading />;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 className="fw-bold mb-1">BMI Calculator</h2>
      <p className="text-muted">
        Starts with the height and weight saved in your{" "}
        <Link to="/profile">profile</Link>. Change the numbers to try a
        different value; this will not change your saved profile.
      </p>

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="card-soft" onSubmit={handleSubmit}>
            <div className="mb-3">
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
            <div className="mb-3">
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
            <button className="btn btn-primary w-100" disabled={calculating}>
              {calculating ? "Calculating..." : "Calculate BMI"}
            </button>
          </form>
        </div>

        <div className="col-lg-8">
          {error && <div className="alert alert-danger">{error}</div>}

          {!result && !error && (
            <div className="card-soft text-center text-muted py-5">
              Enter your height and weight, or complete your profile, to see
              your BMI.
            </div>
          )}

          {result && (
            <div className="card-soft">
              <div className="row g-3 mb-4 text-center">
                <div className="col-6 col-md-3">
                  <div className="text-muted small">BMI</div>
                  <div className="fs-2 fw-bold text-success">{result.bmi}</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">
                    Category (Asia-Pacific)
                  </div>
                  <div className="fw-semibold">{result.category.label}</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Height</div>
                  <div className="fw-semibold">{result.heightCm} cm</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Weight</div>
                  <div className="fw-semibold">{result.weightKg} kg</div>
                </div>
              </div>

              <BMIIndicator
                bmi={result.bmi}
                segments={result.segments}
                scale={result.scale}
              />

              <div className="mt-4 small">
                <p className="mb-1">
                  <strong>Standard WHO category:</strong>{" "}
                  {result.whoCategory.label}.
                  {result.category.label !== result.whoCategory.label &&
                    " The two differ because Asian populations tend to carry more health risk at a lower BMI, so the Asia-Pacific cut-offs start earlier."}
                </p>
                <p className="mb-0">
                  <strong>
                    Weight range for the normal BMI range at your height:
                  </strong>{" "}
                  {result.healthyWeightRangeKg.min} to{" "}
                  {result.healthyWeightRangeKg.max} kg.
                </p>
              </div>

              <div className="alert alert-light border mt-4 mb-0 small">
                <strong>Limitations</strong>
                <ul className="mb-2 mt-1">
                  {result.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                {result.references.map((r) => (
                  <div key={r} className="text-muted">
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
