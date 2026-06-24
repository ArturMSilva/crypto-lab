// Gráfico de barras horizontal simples, sem dependências.
// data: [{ label, value }], highlight: índice destacado, lowerIsBetter inverte cor.
export default function BarChart({ data, highlight, formatValue, threshold }) {
  const max = Math.max(...data.map((d) => d.value), 1e-9);
  return (
    <div className="barchart">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const isBest = i === highlight;
        return (
          <div key={i} className={`bar-row ${isBest ? "best" : ""}`}>
            <span className="bar-label">{d.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
              {threshold != null && (
                <div className="bar-threshold" style={{ left: `${(threshold / max) * 100}%` }} />
              )}
            </div>
            <span className="bar-value">{formatValue ? formatValue(d.value) : d.value}</span>
          </div>
        );
      })}
    </div>
  );
}
