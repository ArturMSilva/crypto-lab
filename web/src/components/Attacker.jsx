import { useMemo, useState } from "react";
import { crackVigenere, PT_IC } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";
import BarChart from "./BarChart.jsx";

export default function Attacker({ state }) {
  const [status, setStatus] = useState(null);
  const channel = state?.channel;
  const ciphertext = channel?.ciphertext || "";

  // Recalcula o ataque sempre que o texto cifrado muda.
  const attack = useMemo(
    () => (ciphertext ? crackVigenere(ciphertext, 10) : null),
    [ciphertext]
  );

  const reply = state?.reply;

  async function inject() {
    try {
      await broker.inject(
        attack.decrypted,
        `Injetado pelo atacante — chave tentada: ${attack.key}`
      );
      setStatus("Texto decifrado injetado no canal.");
    } catch (e) {
      setStatus("Erro ao injetar: " + e.message);
    }
  }

  if (!ciphertext) {
    return (
      <div className="screen">
        <div className="panel">
          <h2>👂 Monitorando o canal…</h2>
          <p className="hint">Nenhuma mensagem interceptada ainda. Aguardando Alice enviar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="panel intercepted">
        <h2>🎯 Mensagem interceptada</h2>
        <p className="mono cipher-block">{ciphertext}</p>
      </div>

      <div className="panel">
        <h2>① Índice de Coincidência por tamanho de chave</h2>
        <p className="hint">
          O tamanho correto faz cada grupo parecer português (IC ≈ {PT_IC}). Tamanhos
          errados embaralham as letras (IC ≈ 0.038). Menor pico → tamanho da chave.
        </p>
        <BarChart
          data={attack.icSpectrum.map((d) => ({ label: String(d.keyLen), value: d.avgIc }))}
          highlight={attack.keyLen - 1}
          threshold={0.06}
          formatValue={(v) => v.toFixed(4)}
        />
        <p className="result">
          Tamanho de chave estimado: <strong>{attack.keyLen}</strong>
        </p>
      </div>

      <div className="panel">
        <h2>② Análise de frequência (qui-quadrado) por posição</h2>
        <p className="hint">
          Cada posição da chave é uma cifra de César. O deslocamento que mais aproxima
          a distribuição do português (menor χ²) revela a letra da chave.
        </p>
        <div className="positions">
          {attack.positions.map((pos) => (
            <PositionCard key={pos.index} pos={pos} />
          ))}
        </div>
      </div>

      <div className="panel highlight">
        <h2>③ Resultado do ataque</h2>
        <p className="result big">
          🔑 Chave descoberta: <strong>{attack.key}</strong>
        </p>
        <label>📄 Texto decifrado</label>
        <p className="mono plain-block">{attack.decrypted}</p>

        <div className="row">
          <button className="primary-btn" onClick={inject}>
            ⚡ Injetar texto decifrado no canal (MitM ativo)
          </button>
        </div>
        {status && <p className="status">{status}</p>}
        {reply && (
          <p className={`reply ${reply.trim().toUpperCase() === "SIM" ? "ok" : "bad"}`}>
            Bob respondeu: <strong>{reply}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

function PositionCard({ pos }) {
  // Mostra só os deslocamentos com menor χ² (mais relevantes) em forma compacta.
  const top = pos.chiByShift
    .map((d) => ({ ...d, letter: String.fromCharCode(65 + d.shift) }))
    .sort((a, b) => a.chi - b.chi)
    .slice(0, 5);
  return (
    <div className="position-card">
      <div className="position-head">
        <span>Posição {pos.index + 1}</span>
        <span className="key-letter">{pos.keyChar}</span>
      </div>
      <BarChart
        data={top.map((d) => ({ label: d.letter, value: d.chi }))}
        highlight={0}
        formatValue={(v) => v.toFixed(1)}
      />
    </div>
  );
}
