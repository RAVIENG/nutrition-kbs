import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Quick client-side checks (the backend validates again: never trust the client)
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match");

    setSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <form className="card-soft" onSubmit={handleSubmit} noValidate>
        <h3 className="fw-bold mb-3">Create your account</h3>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="mb-3">
          <label className="form-label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            className="form-control"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-control"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
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
          <div className="form-text">
            At least 8 characters, with a letter and a number.
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="form-control"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
        <p className="text-center text-muted mt-3 mb-0">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
