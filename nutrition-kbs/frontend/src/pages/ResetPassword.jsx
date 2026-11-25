import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match");

    setSubmitting(true);
    try {
      await api.post(`/auth/reset-password/${token}`, form);
      navigate("/login", {
        state: { message: "Password updated. Please log in." },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <form className="card-soft" onSubmit={handleSubmit} noValidate>
        <h3 className="fw-bold mb-3">Set a new password</h3>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="mb-3">
          <label className="form-label" htmlFor="password">
            New password
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
            Confirm new password
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
          {submitting ? "Saving..." : "Update password"}
        </button>
        <p className="text-center mt-3 mb-0">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
