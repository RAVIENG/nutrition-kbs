import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/dashboard";
  const notice = location.state?.message;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      {notice && <div className="alert alert-success py-2">{notice}</div>}

      <form className="card-soft" onSubmit={handleSubmit} noValidate>
        <h3 className="fw-bold mb-3">Welcome back</h3>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            className="form-control"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-2">
          <label className="form-label" htmlFor="password">
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            className="form-control"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="text-end mb-3">
          <Link to="/forgot-password" className="small">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={submitting}
        >
          {submitting ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-muted mt-3 mb-0">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
