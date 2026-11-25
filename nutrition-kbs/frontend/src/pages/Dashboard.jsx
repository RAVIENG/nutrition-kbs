import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaWeight,
  FaFireAlt,
  FaDrumstickBite,
  FaSeedling,
} from "react-icons/fa";
import api from "../services/api";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/nutrition/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <h2 className="fw-bold mb-1">Hello, {user.name}</h2>
      <p className="text-muted">Your nutrition overview.</p>

      {error && <div className="alert alert-danger">{error}</div>}

      {summary && !summary.profileComplete && (
        <div className="alert alert-warning">
          Your profile is incomplete, so BMI and calories can't be calculated
          yet. <Link to="/profile">Complete your profile</Link>.
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6 col-xl-3">
          <StatCard
            icon={<FaWeight />}
            label="BMI"
            value={summary?.bmi ? summary.bmi.value : "--"}
            hint={summary?.bmi ? summary.bmi.category.label : "Needs profile"}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            icon={<FaFireAlt />}
            label="Daily calories (estimate)"
            value={
              summary?.calories
                ? `${summary.calories.estimatedDailyCalories.toLocaleString("en-IN")} kcal`
                : "--"
            }
            hint={summary?.calories ? "Maintenance estimate" : "Needs profile"}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            icon={<FaDrumstickBite />}
            label="Protein today"
            value="--"
            hint="From food logs, Phase 13"
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            icon={<FaSeedling />}
            label="Fiber today"
            value="--"
            hint="From food logs, Phase 13"
          />
        </div>
      </div>
    </div>
  );
}
