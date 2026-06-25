// Gráfico de barras horizontal simples, sem dependências.
// dados: [{ rotulo, valor }], destaque: índice destacado, limiar desenha a marca.
export default function BarChart({ dados, destaque, formatarValor, limiar }) {
  const max = Math.max(...dados.map((d) => d.valor), 1e-9);
  return (
    <div className="barchart">
      {dados.map((d, i) => {
        const pct = (d.valor / max) * 100;
        const ehMelhor = i === destaque;
        return (
          <div key={i} className={`bar-row ${ehMelhor ? "best" : ""}`}>
            <span className="bar-label">{d.rotulo}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
              {limiar != null && (
                <div className="bar-threshold" style={{ left: `${(limiar / max) * 100}%` }} />
              )}
            </div>
            <span className="bar-value">{formatarValor ? formatarValor(d.valor) : d.valor}</span>
          </div>
        );
      })}
    </div>
  );
}
