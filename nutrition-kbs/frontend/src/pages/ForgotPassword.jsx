import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <form className="card-soft" onSubmit={handleSubmit} noValidate>
        <h3 className="fw-bold mb-3">Forgot password</h3>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {message && (
          <div className="alert alert-success py-2">
            {message}
            <div className="small mt-1">
              Demo version: the link is printed in the backend terminal instead
              of being emailed.
            </div>
          </div>
        )}
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            Registered email
          </label>
          <input
            id="email"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? "Please wait..." : "Generate reset link"}
        </button>
        <p className="text-center mt-3 mb-0">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
