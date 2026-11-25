export default function PagePlaceholder({ title, phase }) {
  return (
    <div>
      <h2 className="fw-bold mb-1">{title}</h2>
      <p className="text-muted">This page will be built in {phase}.</p>
      <div className="card-soft text-center text-muted py-5">
        Nothing here yet.
      </div>
    </div>
  );
}
