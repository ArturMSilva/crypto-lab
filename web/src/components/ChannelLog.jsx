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
          .map((evento, i) => (
            <li key={i} className={`log-item actor-${evento.actor}`}>
              <span className="log-time">{evento.t}</span>
              <span className="log-actor">{evento.actor}</span>
              <span className="log-text">{evento.text}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
