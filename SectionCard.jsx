export default function SectionCard({ title, content, confidence, source, warning }) {
  const pct = Math.round((confidence || 0) * 100);
  const tone = pct >= 85 ? 'good' : pct >= 70 ? 'warn' : 'low';

  return (
    <div className="section-card">
      <div className="section-head">
        <h3>{title}</h3>
        <span className={`badge ${tone}`}>{pct}% confidence</span>
      </div>
      <div className="confidence-track">
        <div className={`confidence-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="section-source">Source: {source}</p>
      <pre>{content}</pre>
      {warning ? <p className="warning">{warning}</p> : null}
    </div>
  );
}
