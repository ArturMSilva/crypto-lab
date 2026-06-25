import { useState } from "react";
import { cifrarVigenere } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";

const MENSAGEM_PADRAO =
  "OLA BOB ESTA E UMA MENSAGEM SECRETA ENVIADA POR ALICE ATRAVES DO CANAL " +
  "INSEGURO ESPERO QUE NINGUEM CONSIGA LER NOSSA CONVERSA POIS ESTAMOS USANDO " +
  "A CIFRA DE VIGENERE COM UMA CHAVE COMPARTILHADA APENAS ENTRE NOS DOIS SE " +
  "VOCE CONSEGUIR DECIFRAR ESTA MENSAGEM CORRETAMENTE RESPONDA COM SIM PARA " +
  "CONFIRMAR QUE A NOSSA COMUNICACAO SEGURA ESTA FUNCIONANDO PERFEITAMENTE BEM";

export default function Alice({ estado, realista }) {
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [chave, setChave] = useState("SECRETO");
  const [status, setStatus] = useState(null);
  const [tentativa, setTentativa] = useState(1);

  const textoCifrado = cifrarVigenere(mensagem, chave);

  async function enviar() {
    try {
      await broker.enviar(textoCifrado, tentativa);
      setStatus(`Mensagem cifrada entregue ao canal (tentativa ${tentativa}).`);
      setTentativa((t) => t + 1);
    } catch (e) {
      setStatus("Erro ao enviar: " + e.message);
    }
  }

  const resposta = estado?.reply;

  return (
    <div className="screen">
      <div className="panel">
        <h2>✉️ Compor mensagem</h2>
        <label>Mensagem (texto claro)</label>
        <textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />

        <label>Chave secreta (compartilhada só com Bob)</label>
        <input value={chave} onChange={(e) => setChave(e.target.value)} />

        <button className="primary-btn" onClick={enviar}>
          🔒 Cifrar e enviar pelo canal
        </button>
        {status && <p className="status">{status}</p>}
      </div>

      <div className="panel">
        <h2>🔡 Texto cifrado (Vigenère)</h2>
        {realista ? (
          <>
            <label>É isto que trafega pelo canal:</label>
            <p className="mono cipher-block">{textoCifrado || "—"}</p>
          </>
        ) : (
          <VisaoCifra textoClaro={mensagem.toUpperCase()} chave={chave.toUpperCase()} textoCifrado={textoCifrado} />
        )}
      </div>

      <div className="panel">
        <h2>📬 Resposta de Bob</h2>
        {resposta ? (
          <p className={`reply ${resposta.trim().toUpperCase() === "SIM" ? "ok" : "bad"}`}>
            Bob respondeu: <strong>{resposta}</strong>
            {resposta.trim().toUpperCase() === "SIM"
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
function VisaoCifra({ textoClaro, chave, textoCifrado }) {
  const celulas = [];
  let k = 0;
  for (let i = 0; i < textoClaro.length && celulas.length < 120; i++) {
    const ch = textoClaro[i];
    const ehLetra = ch >= "A" && ch <= "Z";
    celulas.push({
      p: ch,
      k: ehLetra ? chave[k % chave.length] : "",
      c: textoCifrado[i],
      letra: ehLetra,
    });
    if (ehLetra) k++;
  }
  return (
    <div className="cipher-grid">
      {celulas.map((c, i) => (
        <div key={i} className={`cipher-cell ${c.letra ? "" : "space"}`}>
          <span className="plain">{c.p === " " ? "·" : c.p}</span>
          <span className="keych">{c.k}</span>
          <span className="cipher">{c.c === " " ? "·" : c.c}</span>
        </div>
      ))}
      {textoClaro.length > 120 && <span className="hint">…(prévia das primeiras letras)</span>}
    </div>
  );
}
