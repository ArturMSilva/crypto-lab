import { useEffect, useState } from "react";
import { obterUrlBroker, definirUrlBroker, broker } from "./lib/broker.js";
import { useEstadoBroker } from "./hooks/useBrokerState.js";
import Alice from "./components/Alice.jsx";
import Bob from "./components/Bob.jsx";
import Attacker from "./components/Attacker.jsx";
import ChannelLog from "./components/ChannelLog.jsx";

const PAPEIS = {
  alice: { rotulo: "Alice", emoji: "👩", descricao: "Cifra e envia a mensagem" },
  bob: { rotulo: "Bob", emoji: "🧑", descricao: "Recebe e decifra a mensagem" },
  attacker: { rotulo: "Atacante", emoji: "🕵️", descricao: "Intercepta e quebra a cifra" },
};

export default function App() {
  const [papel, setPapel] = useState(() => localStorage.getItem("role") || null);
  const [urlBroker, setUrl] = useState(obterUrlBroker());
  const { estado, online, erro } = useEstadoBroker(papel ? 1000 : 4000);

  useEffect(() => {
    if (papel) localStorage.setItem("role", papel);
  }, [papel]);

  function salvarBroker(url) {
    definirUrlBroker(url);
    setUrl(obterUrlBroker());
  }

  // Zera o canal compartilhado (mensagem, resposta e log) e recarrega a página
  // para reiniciar também o estado local de cada papel — começa tudo do zero.
  async function reiniciarTudo() {
    const ok = window.confirm(
      "Reiniciar tudo? Isso limpa o canal (mensagem, resposta e histórico) para TODOS os papéis e recomeça do zero."
    );
    if (!ok) return;
    try {
      await broker.reiniciar();
    } catch {
      // mesmo se o broker estiver offline, recarregamos para limpar o estado local
    } finally {
      window.location.reload();
    }
  }

  if (!papel) {
    return (
      <Inicio
        papeis={PAPEIS}
        aoEscolher={setPapel}
        urlBroker={urlBroker}
        salvarBroker={salvarBroker}
        online={online}
      />
    );
  }

  const Tela = { alice: Alice, bob: Bob, attacker: Attacker }[papel];

  return (
    <div className={`app role-${papel}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-emoji">{PAPEIS[papel].emoji}</span>
          <div>
            <h1>{PAPEIS[papel].rotulo}</h1>
            <small>{PAPEIS[papel].descricao}</small>
          </div>
        </div>
        <div className="topbar-right">
          <StatusBroker online={online} url={urlBroker} erro={erro} />
          <button className="ghost danger" onClick={reiniciarTudo} title="Limpa o canal e recomeça do zero">
            🔄 Reiniciar tudo
          </button>
          <button className="ghost" onClick={() => setPapel(null)}>
            Trocar papel
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="primary">
          <Tela estado={estado} online={online} />
        </section>
        <aside className="sidebar">
          <ChannelLog log={estado.log} />
        </aside>
      </main>
    </div>
  );
}

function Inicio({ papeis, aoEscolher, urlBroker, salvarBroker, online }) {
  const [rascunho, setRascunho] = useState(urlBroker);
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
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder="http://192.168.0.10:5000"
          />
          <button onClick={() => salvarBroker(rascunho)}>Salvar</button>
          <span className={`dot ${online ? "on" : "off"}`} title={online ? "online" : "offline"} />
        </div>
        <small>
          Use o IP da máquina que roda o broker na rede local. Status:{" "}
          {online ? "conectado ✅" : "sem conexão ❌"}
        </small>
      </div>

      <div className="role-cards">
        {Object.entries(papeis).map(([chave, p]) => (
          <button key={chave} className={`role-card role-${chave}`} onClick={() => aoEscolher(chave)}>
            <span className="role-emoji">{p.emoji}</span>
            <strong>{p.rotulo}</strong>
            <span>{p.descricao}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBroker({ online, url, erro }) {
  return (
    <div className="broker-status" title={erro || url}>
      <span className={`dot ${online ? "on" : "off"}`} />
      <span className="broker-url">{url.replace(/^https?:\/\//, "")}</span>
    </div>
  );
}
