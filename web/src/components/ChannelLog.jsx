export default function ChannelLog({ log }) {
  return (
    <div className="panel log-panel">
      <h2>📡 Canal inseguro (log)</h2>
      <p className="hint">Tudo que trafega aqui é visível para qualquer um.</p>
      <ul className="log">
        {(log || []).length === 0 && <li className="log-empty">Sem eventos ainda…</li>}
        {(log || [])
          .slice()
          .reverse()
          .map((e, i) => (
            <li key={i} className={`log-item actor-${e.actor}`}>
              <span className="log-time">{e.t}</span>
              <span className="log-actor">{e.actor}</span>
              <span className="log-text">{e.text}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
