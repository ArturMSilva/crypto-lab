import { useState } from "react";
import { vigenereDecrypt } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";

export default function Bob({ state }) {
  const [key, setKey] = useState("SECRETO");
  const [status, setStatus] = useState(null);

  const channel = state?.channel;
  const ciphertext = channel?.ciphertext || "";
  const decrypted = ciphertext ? vigenereDecrypt(ciphertext, key) : "";

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
          <>
            <p className="mono cipher-block">{ciphertext}</p>
            {channel?.injected && (
              <p className="warn">⚡ Esta mensagem foi injetada pelo atacante! {channel.note}</p>
            )}
          </>
        ) : (
          <p className="hint">Nenhuma mensagem no canal ainda…</p>
        )}
      </div>

      <div className="panel">
        <h2>🔓 Decifrar com a chave</h2>
        <label>Chave secreta (compartilhada com Alice)</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} />
        <label>Texto decifrado</label>
        <p className="mono plain-block">{decrypted || "—"}</p>
      </div>

      <div className="panel">
        <h2>↩️ Responder a Alice</h2>
        <p className="hint">A mensagem faz sentido? Responda pelo canal.</p>
        <div className="row">
          <button className="primary-btn ok" disabled={!ciphertext} onClick={() => reply("SIM")}>
            ✅ SIM, entendi
          </button>
          <button className="primary-btn bad" disabled={!ciphertext} onClick={() => reply("NAO ENTENDI")}>
            ❌ NÃO entendi
          </button>
        </div>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
