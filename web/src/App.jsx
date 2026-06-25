import { useEffect, useState } from "react";
import {
  UserRound,
  CircleUserRound,
  VenetianMask,
  Lock,
  RotateCcw,
  Glasses,
  GraduationCap,
  Check,
  X,
} from "lucide-react";
import { obterUrlBroker, definirUrlBroker, broker } from "./lib/broker.js";
import { useEstadoBroker } from "./hooks/useBrokerState.js";
import Alice from "./components/Alice.jsx";
import Bob from "./components/Bob.jsx";
import Attacker from "./components/Attacker.jsx";
import ChannelLog from "./components/ChannelLog.jsx";

const PAPEIS = {
  alice: { rotulo: "Alice", Icone: UserRound, descricao: "Cifra e envia a mensagem" },
  bob: { rotulo: "Bob", Icone: CircleUserRound, descricao: "Recebe e decifra a mensagem" },
  attacker: { rotulo: "Atacante", Icone: VenetianMask, descricao: "Intercepta e quebra a cifra" },
};

export default function App() {
  const [papel, setPapel] = useState(() => localStorage.getItem("role") || null);
  const [modo, setModo] = useState(() => localStorage.getItem("mode") || "didatico");
  const [urlBroker, setUrl] = useState(obterUrlBroker());
  const { estado, online, erro } = useEstadoBroker(papel ? 1000 : 4000);

  useEffect(() => {
    if (papel) localStorage.setItem("role", papel);
  }, [papel]);

  useEffect(() => {
    localStorage.setItem("mode", modo);
  }, [modo]);

  const realista = modo === "realista";

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
        modo={modo}
        aoMudarModo={setModo}
      />
    );
  }

  const Tela = { alice: Alice, bob: Bob, attacker: Attacker }[papel];
  const IconePapel = PAPEIS[papel].Icone;

  return (
    <div className={`app role-${papel}`}>
      <header className="topbar">
        <div className="brand">
          <IconePapel className="brand-emoji" size={34} strokeWidth={1.75} />
          <div>
            <h1>{PAPEIS[papel].rotulo}</h1>
            <small>
              {PAPEIS[papel].descricao}
              <span className={`mode-badge ${realista ? "realista" : "didatico"}`}>
                {realista ? <Glasses size={13} /> : <GraduationCap size={13} />}
                {realista ? "realista" : "didático"}
              </span>
            </small>
          </div>
        </div>
        <div className="topbar-right">
          <StatusBroker online={online} url={urlBroker} erro={erro} />
          <button className="ghost danger" onClick={reiniciarTudo} title="Limpa o canal e recomeça do zero">
            <RotateCcw size={16} /> Reiniciar tudo
          </button>
          <button className="ghost" onClick={() => setPapel(null)}>
            Trocar papel
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="primary">
          <Tela estado={estado} online={online} realista={realista} />
        </section>
        <aside className="sidebar">
          <ChannelLog log={estado.log} />
        </aside>
      </main>
    </div>
  );
}

function Inicio({ papeis, aoEscolher, urlBroker, salvarBroker, online, modo, aoMudarModo }) {
  const [rascunho, setRascunho] = useState(urlBroker);
  return (
    <div className="landing">
      <h1><Lock size={26} strokeWidth={2} /> Crypto Lab — Vigenère MitM</h1>
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
          {online ? (
            <span className="inline-ok"><Check size={14} /> conectado</span>
          ) : (
            <span className="inline-bad"><X size={14} /> sem conexão</span>
          )}
        </small>
      </div>

      <div className="mode-select">
        <label>Modo de exibição</label>
        <div className="mode-options">
          <button
            type="button"
            className={`mode-card ${modo === "didatico" ? "active" : ""}`}
            onClick={() => aoMudarModo("didatico")}
          >
            <strong><GraduationCap size={18} /> Didático</strong>
            <span>
              Mostra tudo para ensinar: grade texto→chave→cifra da Alice, a análise
              completa do atacante (IC e qui-quadrado) e avisa o Bob quando a mensagem
              foi injetada.
            </span>
          </button>
          <button
            type="button"
            className={`mode-card ${modo === "realista" ? "active" : ""}`}
            onClick={() => aoMudarModo("realista")}
          >
            <strong><Glasses size={18} /> Realista</strong>
            <span>
              Cada papel só vê o que veria na vida real: o Bob não sabe que foi
              injetado (julga pelo conteúdo), o atacante trabalha como caixa-preta
              (sem a análise) e a Alice não mostra a grade da cifra.
            </span>
          </button>
        </div>
      </div>

      <div className="role-cards">
        {Object.entries(papeis).map(([chave, p]) => {
          const Icone = p.Icone;
          return (
            <button key={chave} className={`role-card role-${chave}`} onClick={() => aoEscolher(chave)}>
              <Icone className="role-emoji" size={48} strokeWidth={1.5} />
              <strong>{p.rotulo}</strong>
              <span>{p.descricao}</span>
            </button>
          );
        })}
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
