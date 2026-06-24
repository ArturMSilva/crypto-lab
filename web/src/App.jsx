import { useEffect, useState } from "react";
import { getBrokerUrl, setBrokerUrl } from "./lib/broker.js";
import { useBrokerState } from "./hooks/useBrokerState.js";
import Alice from "./components/Alice.jsx";
import Bob from "./components/Bob.jsx";
import Attacker from "./components/Attacker.jsx";
import ChannelLog from "./components/ChannelLog.jsx";

const ROLES = {
  alice: { label: "Alice", emoji: "👩", desc: "Cifra e envia a mensagem" },
  bob: { label: "Bob", emoji: "🧑", desc: "Recebe e decifra a mensagem" },
  attacker: { label: "Atacante", emoji: "🕵️", desc: "Intercepta e quebra a cifra" },
};

export default function App() {
  const [role, setRole] = useState(() => localStorage.getItem("role") || null);
  const [brokerUrl, setUrl] = useState(getBrokerUrl());
  const { state, online, error } = useBrokerState(role ? 1000 : 4000);

  useEffect(() => {
    if (role) localStorage.setItem("role", role);
  }, [role]);

  function saveBroker(url) {
    setBrokerUrl(url);
    setUrl(getBrokerUrl());
  }

  if (!role) {
    return (
      <Landing
        roles={ROLES}
        onPick={setRole}
        brokerUrl={brokerUrl}
        saveBroker={saveBroker}
        online={online}
      />
    );
  }

  const Screen = { alice: Alice, bob: Bob, attacker: Attacker }[role];

  return (
    <div className={`app role-${role}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-emoji">{ROLES[role].emoji}</span>
          <div>
            <h1>{ROLES[role].label}</h1>
            <small>{ROLES[role].desc}</small>
          </div>
        </div>
        <div className="topbar-right">
          <BrokerStatus online={online} url={brokerUrl} error={error} />
          <button className="ghost" onClick={() => setRole(null)}>
            Trocar papel
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="primary">
          <Screen state={state} online={online} />
        </section>
        <aside className="sidebar">
          <ChannelLog log={state.log} />
        </aside>
      </main>
    </div>
  );
}

function Landing({ roles, onPick, brokerUrl, saveBroker, online }) {
  const [draft, setDraft] = useState(brokerUrl);
  return (
    <div className="landing">
      <h1>🔐 Crypto Lab — Vigenère MitM</h1>
      <p className="subtitle">
        Escolha o papel deste notebook. Os três se comunicam pelo mesmo
        <strong> canal inseguro</strong> (broker).
      </p>

      <div className="broker-config">
        <label>Endereço do broker (canal inseguro)</label>
        <div className="row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="http://192.168.0.10:5000"
          />
          <button onClick={() => saveBroker(draft)}>Salvar</button>
          <span className={`dot ${online ? "on" : "off"}`} title={online ? "online" : "offline"} />
        </div>
        <small>
          Use o IP da máquina que roda o broker na rede local. Status:{" "}
          {online ? "conectado ✅" : "sem conexão ❌"}
        </small>
      </div>

      <div className="role-cards">
        {Object.entries(roles).map(([key, r]) => (
          <button key={key} className={`role-card role-${key}`} onClick={() => onPick(key)}>
            <span className="role-emoji">{r.emoji}</span>
            <strong>{r.label}</strong>
            <span>{r.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrokerStatus({ online, url, error }) {
  return (
    <div className="broker-status" title={error || url}>
      <span className={`dot ${online ? "on" : "off"}`} />
      <span className="broker-url">{url.replace(/^https?:\/\//, "")}</span>
    </div>
  );
}
