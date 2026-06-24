import { useState } from "react";
import { vigenereEncrypt } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";

const DEFAULT_MESSAGE =
  "OLA BOB ESTA E UMA MENSAGEM SECRETA ENVIADA POR ALICE ATRAVES DO CANAL " +
  "INSEGURO ESPERO QUE NINGUEM CONSIGA LER NOSSA CONVERSA POIS ESTAMOS USANDO " +
  "A CIFRA DE VIGENERE COM UMA CHAVE COMPARTILHADA APENAS ENTRE NOS DOIS SE " +
  "VOCE CONSEGUIR DECIFRAR ESTA MENSAGEM CORRETAMENTE RESPONDA COM SIM PARA " +
  "CONFIRMAR QUE A NOSSA COMUNICACAO SEGURA ESTA FUNCIONANDO PERFEITAMENTE BEM";

export default function Alice({ state }) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [key, setKey] = useState("SECRETO");
  const [status, setStatus] = useState(null);
  const [attempt, setAttempt] = useState(1);

  const ciphertext = vigenereEncrypt(message, key);

  async function send() {
    try {
      await broker.send(ciphertext, attempt);
      setStatus(`Mensagem cifrada entregue ao canal (tentativa ${attempt}).`);
      setAttempt((a) => a + 1);
    } catch (e) {
      setStatus("Erro ao enviar: " + e.message);
    }
  }

  const reply = state?.reply;

  return (
    <div className="screen">
      <div className="panel">
        <h2>✉️ Compor mensagem</h2>
        <label>Mensagem (texto claro)</label>
        <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />

        <label>Chave secreta (compartilhada só com Bob)</label>
        <input value={key} onChange={(e) => setKey(e.target.value)} />

        <button className="primary-btn" onClick={send}>
          🔒 Cifrar e enviar pelo canal
        </button>
        {status && <p className="status">{status}</p>}
      </div>

      <div className="panel">
        <h2>🔡 Texto cifrado (Vigenère)</h2>
        <CipherView plaintext={message.toUpperCase()} key_={key.toUpperCase()} ciphertext={ciphertext} />
      </div>

      <div className="panel">
        <h2>📬 Resposta de Bob</h2>
        {reply ? (
          <p className={`reply ${reply.trim().toUpperCase() === "SIM" ? "ok" : "bad"}`}>
            Bob respondeu: <strong>{reply}</strong>
            {reply.trim().toUpperCase() === "SIM"
              ? " ✅ comunicação compreendida"
              : " ⚠️ Bob não entendeu"}
          </p>
        ) : (
          <p className="hint">Aguardando resposta…</p>
        )}
      </div>
    </div>
  );
}

// Mostra a correspondência texto → chave → cifra, posição a posição.
function CipherView({ plaintext, key_, ciphertext }) {
  const cells = [];
  let k = 0;
  for (let i = 0; i < plaintext.length && cells.length < 120; i++) {
    const ch = plaintext[i];
    const isAlpha = ch >= "A" && ch <= "Z";
    cells.push({
      p: ch,
      k: isAlpha ? key_[k % key_.length] : "",
      c: ciphertext[i],
      alpha: isAlpha,
    });
    if (isAlpha) k++;
  }
  return (
    <div className="cipher-grid">
      {cells.map((c, i) => (
        <div key={i} className={`cipher-cell ${c.alpha ? "" : "space"}`}>
          <span className="plain">{c.p === " " ? "·" : c.p}</span>
          <span className="keych">{c.k}</span>
          <span className="cipher">{c.c === " " ? "·" : c.c}</span>
        </div>
      ))}
      {plaintext.length > 120 && <span className="hint">…(prévia das primeiras letras)</span>}
    </div>
  );
}
