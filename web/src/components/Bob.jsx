import { useState } from "react";
import { vigenereDecrypt } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";

export default function Bob({ state }) {
  const [key, setKey] = useState("SECRETO");
  const [status, setStatus] = useState(null);

  const channel = state?.channel;
  const ciphertext = channel?.ciphertext || "";
  const injected = !!channel?.injected;

  // Mensagem normal de Alice: Bob decifra com a chave.
  // Mensagem injetada pelo atacante: já vem "em claro" (palpite do atacante),
  // então Bob apenas julga se o texto faz sentido.
  const shownText = injected ? ciphertext : ciphertext ? vigenereDecrypt(ciphertext, key) : "";

  async function reply(text) {
    try {
      await broker.reply(text);
      setStatus(`Você respondeu: "${text}"`);
    } catch (e) {
      setStatus("Erro: " + e.message);
    }
  }

  return (
    <div className="screen">
      <div className="panel">
        <h2>📨 Mensagem recebida do canal</h2>
        {ciphertext ? (
          injected ? (
            <p className="warn">
              ⚡ Mensagem injetada pelo atacante. {channel.note}
            </p>
          ) : (
            <>
              <label>Texto cifrado</label>
              <p className="mono cipher-block">{ciphertext}</p>
            </>
          )
        ) : (
          <p className="hint">Nenhuma mensagem no canal ainda…</p>
        )}
      </div>

      <div className="panel">
        <h2>{injected ? "👀 Texto recebido" : "🔓 Decifrar com a chave"}</h2>
        {!injected && (
          <>
            <label>Chave secreta (compartilhada com Alice)</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} />
          </>
        )}
        <label>{injected ? "É isto que o atacante afirma ser a mensagem:" : "Texto decifrado"}</label>
        <p className="mono plain-block">{shownText || "—"}</p>
      </div>

      <div className="panel">
        <h2>↩️ Responder pelo canal</h2>
        <p className="hint">
          O texto acima faz sentido / é a mensagem esperada? Clique em SIM ou NÃO.
        </p>
        <div className="row">
          <button className="primary-btn ok" disabled={!ciphertext} onClick={() => reply("SIM")}>
            ✅ SIM
          </button>
          <button className="primary-btn bad" disabled={!ciphertext} onClick={() => reply("NAO ENTENDI")}>
            ❌ NÃO
          </button>
        </div>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
