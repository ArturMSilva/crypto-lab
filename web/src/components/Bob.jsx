import { useState } from "react";
import { decifrarVigenere } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";

export default function Bob({ estado }) {
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

  return (
    <div className="screen">
      <div className="panel">
        <h2>📨 Mensagem recebida do canal</h2>
        {textoCifrado ? (
          injetado ? (
            <p className="warn">
              ⚡ Mensagem injetada pelo atacante. {canal.note}
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
        <h2>{injetado ? "👀 Texto recebido" : "🔓 Decifrar com a chave"}</h2>
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
        <h2>↩️ Responder pelo canal</h2>
        <p className="hint">
          O texto acima faz sentido / é a mensagem esperada? Clique em SIM ou NÃO.
        </p>
        <div className="row">
          <button className="primary-btn ok" disabled={!textoCifrado} onClick={() => responder("SIM")}>
            ✅ SIM
          </button>
          <button className="primary-btn bad" disabled={!textoCifrado} onClick={() => responder("NAO ENTENDI")}>
            ❌ NÃO
          </button>
        </div>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
