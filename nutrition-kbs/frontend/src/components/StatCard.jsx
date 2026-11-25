export default function StatCard({ icon, label, value, hint }) {
  return (
    <div className="card-soft hoverable d-flex align-items-center gap-3">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="text-muted small">{label}</div>
        <div className="fs-4 fw-bold">{value}</div>
        {hint && <div className="text-muted small">{hint}</div>}
      </div>
    </div>
  );
}
