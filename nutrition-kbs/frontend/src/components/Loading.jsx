export default function Loading({ text = "Loading..." }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div className="spinner-border text-success" role="status" />
      <div className="text-muted mt-2">{text}</div>
    </div>
  );
}
