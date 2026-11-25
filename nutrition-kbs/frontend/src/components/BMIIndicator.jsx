const COLORS = {
  underweight: "#5bc0de",
  normal: "#2e9e5b",
  overweight: "#f0ad4e",
  obese: "#d9534f",
};

// Draws the coloured scale from the segments the backend sends. No BMI rules live here.
export default function BMIIndicator({ bmi, segments, scale }) {
  const span = scale.max - scale.min;
  const position = Math.min(100, Math.max(0, ((bmi - scale.min) / span) * 100));

  return (
    <div
      role="img"
      aria-label={`BMI ${bmi} on a scale from ${scale.min} to ${scale.max}`}
    >
      <div className="bmi-track-wrap">
        <div className="bmi-marker" style={{ left: `${position}%` }}>
          <span className="bmi-marker-label">{bmi}</span>
        </div>
        <div className="d-flex rounded overflow-hidden" style={{ height: 14 }}>
          {segments.map((s) => (
            <div
              key={s.key}
              style={{
                width: `${((s.to - s.from) / span) * 100}%`,
                background: COLORS[s.key],
              }}
            />
          ))}
        </div>
      </div>
      <div className="d-flex flex-wrap gap-3 mt-3 small">
        {segments.map((s) => (
          <div key={s.key} className="d-flex align-items-center gap-1">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: COLORS[s.key],
                display: "inline-block",
              }}
            />
            <span>
              {s.label}: <span className="text-muted">{s.rangeText}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
