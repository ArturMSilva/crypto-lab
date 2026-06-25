import { useState } from "react";
import { MailOpen, Reply, Check, X, Eye, LockOpen, Zap } from "lucide-react";
import { decifrarVigenere } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";

export default function Bob({ estado, realista }) {
  const [chave, setChave] = useState("SECRETO");
  const [status, setStatus] = useState(null);

  const canal = estado?.channel;
  const textoCifrado = canal?.ciphertext || "";
  const injetado = !!canal?.injected;

  // Mensagem normal de Alice: Bob decifra com a chave.
  // Mensagem injetada pelo atacante: já vem "em claro" (palpite do atacante),
  // então Bob apenas julga se o texto faz sentido.
  const textoExibido = injetado ? textoCifrado : textoCifrado ? decifrarVigenere(textoCifrado, chave) : "";

  async function responder(texto) {
    try {
      await broker.responder(texto);
      setStatus(`Você respondeu: "${texto}"`);
    } catch (e) {
      setStatus("Erro: " + e.message);
    }
  }

  // Modo realista: Bob não é avisado de injeções. Recebe a mensagem e julga só
  // pelo conteúdo, sem qualquer pista de que o atacante manipulou o canal.
  if (realista) {
    return (
      <div className="screen">
        <div className="panel">
          <h2><MailOpen size={18} /> Mensagem recebida do canal</h2>
          {textoCifrado ? (
            <>
              <label>Sua chave secreta (compartilhada com Alice)</label>
              <input value={chave} onChange={(e) => setChave(e.target.value)} />
              <label>Conteúdo da mensagem</label>
              <p className="mono plain-block">{textoExibido || "—"}</p>
            </>
          ) : (
            <p className="hint">Nenhuma mensagem no canal ainda…</p>
          )}
        </div>

        <div className="panel">
          <h2><Reply size={18} /> Responder pelo canal</h2>
          <p className="hint">
            O texto acima faz sentido / é a mensagem que você esperava da Alice?
            Clique em SIM ou NÃO.
          </p>
          <div className="row">
            <button className="primary-btn ok" disabled={!textoCifrado} onClick={() => responder("SIM")}>
              <Check size={16} /> SIM
            </button>
            <button className="primary-btn bad" disabled={!textoCifrado} onClick={() => responder("NAO ENTENDI")}>
              <X size={16} /> NÃO
            </button>
          </div>
          {status && <p className="status">{status}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="panel">
        <h2><MailOpen size={18} /> Mensagem recebida do canal</h2>
        {textoCifrado ? (
          injetado ? (
            <p className="warn">
              <Zap size={16} />
              <span>Mensagem injetada pelo atacante. {canal.note}</span>
            </p>
          ) : (
            <>
              <label>Texto cifrado</label>
              <p className="mono cipher-block">{textoCifrado}</p>
            </>
          )
        ) : (
          <p className="hint">Nenhuma mensagem no canal ainda…</p>
        )}
      </div>

      <div className="panel">
        <h2>
          {injetado ? <Eye size={18} /> : <LockOpen size={18} />}
          {injetado ? "Texto recebido" : "Decifrar com a chave"}
        </h2>
        {!injetado && (
          <>
            <label>Chave secreta (compartilhada com Alice)</label>
            <input value={chave} onChange={(e) => setChave(e.target.value)} />
          </>
        )}
        <label>{injetado ? "É isto que o atacante afirma ser a mensagem:" : "Texto decifrado"}</label>
        <p className="mono plain-block">{textoExibido || "—"}</p>
      </div>

      <div className="panel">
        <h2><Reply size={18} /> Responder pelo canal</h2>
        <p className="hint">
          O texto acima faz sentido / é a mensagem esperada? Clique em SIM ou NÃO.
        </p>
        <div className="row">
          <button className="primary-btn ok" disabled={!textoCifrado} onClick={() => responder("SIM")}>
            <Check size={16} /> SIM
          </button>
          <button className="primary-btn bad" disabled={!textoCifrado} onClick={() => responder("NAO ENTENDI")}>
            <X size={16} /> NÃO
          </button>
        </div>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
