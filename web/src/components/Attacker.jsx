import { useEffect, useMemo, useRef, useState } from "react";
import { crackVigenere, candidatesRanked, PT_IC } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";
import BarChart from "./BarChart.jsx";

const ADVANCE_MS = 1500; // pausa entre tentativas (para a turma acompanhar)

export default function Attacker({ state }) {
  const channel = state?.channel;

  // Captura o texto cifrado ORIGINAL de Alice. As injeções do próprio atacante
  // (channel.injected) não devem sobrescrever o alvo da análise.
  const [captured, setCaptured] = useState(null);
  useEffect(() => {
    if (channel && !channel.injected && channel.ciphertext) {
      setCaptured(channel.ciphertext);
    }
  }, [channel?.ciphertext, channel?.injected]);

  // Análise "inteligente" (IC + qui-quadrado) usada nos gráficos.
  const smart = useMemo(() => (captured ? crackVigenere(captured, 10) : null), [captured]);
  // Candidatos do modo automático já REFINADOS por hill-climbing e ordenados
  // do mais provável ao menos provável (tenta primeiro o melhor palpite).
  const candidates = useMemo(() => (captured ? candidatesRanked(captured, 10) : []), [captured]);

  // ---- estado do modo automático -----------------------------------
  const [auto, setAuto] = useState(false);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState([]); // {keyLen, key, decrypted, result}
  const [phase, setPhase] = useState("idle"); // idle | waiting | advancing | success | exhausted
  const [status, setStatus] = useState(null);
  const indexRef = useRef(0);
  indexRef.current = index;

  // Novo texto interceptado → zera o modo automático.
  useEffect(() => {
    setAuto(false);
    setAttempts([]);
    setPhase("idle");
    setIndex(0);
  }, [captured]);

  async function tryCandidate(i) {
    const c = candidates[i];
    if (!c) {
      setPhase("exhausted");
      return;
    }
    setIndex(i);
    setAttempts((prev) => [
      ...prev,
      { keyLen: c.keyLen, key: c.key, baseKey: c.baseKey, decrypted: c.decrypted, result: "pending" },
    ]);
    setPhase("waiting");
    try {
      await broker.clearReply();
      await broker.inject(c.decrypted, `Auto: testando chave "${c.key}" (tamanho ${c.keyLen})`, c.keyLen);
    } catch (e) {
      setStatus("Erro ao injetar: " + e.message);
    }
  }

  function startAuto() {
    setAttempts([]);
    setPhase("idle");
    setAuto(true);
    tryCandidate(0);
  }

  function stopAuto() {
    setAuto(false);
    setPhase("idle");
  }

  // Reage à resposta do Bob enquanto aguarda.
  useEffect(() => {
    if (!auto || phase !== "waiting") return;
    const reply = state?.reply;
    if (!reply) return;
    const r = reply.trim().toUpperCase();

    setAttempts((prev) => markLast(prev, r === "SIM" ? "sim" : "nao"));

    if (r === "SIM") {
      setPhase("success");
      setAuto(false);
    } else {
      setPhase("advancing");
      const next = indexRef.current + 1;
      setTimeout(async () => {
        await broker.clearReply().catch(() => {});
        if (next < candidates.length) tryCandidate(next);
        else setPhase("exhausted");
      }, ADVANCE_MS);
    }
  }, [state?.reply, auto, phase]);

  if (!captured) {
    return (
      <div className="screen">
        <div className="panel">
          <h2>👂 Monitorando o canal…</h2>
          <p className="hint">Nenhuma mensagem interceptada ainda. Aguardando Alice enviar.</p>
        </div>
      </div>
    );
  }

  const current = attempts[attempts.length - 1];
  const discovered = phase === "success" ? current : null;

  return (
    <div className="screen">
      <div className="panel intercepted">
        <h2>🎯 Mensagem interceptada</h2>
        <p className="mono cipher-block">{captured}</p>
      </div>

      {/* ---- Modo automático ---- */}
      <div className={`panel ${phase === "success" ? "highlight" : ""}`}>
        <h2>🤖 Modo automático</h2>
        <p className="hint">
          O atacante refina cada palpite por <em>hill-climbing</em> (ajusta a chave
          maximizando o quanto o texto “parece português”) e tenta primeiro o mais
          provável. Avança sozinho a cada “NÃO” e para quando o Bob clica “SIM”.
        </p>
        <div className="row">
          {!auto && phase !== "success" && (
            <button className="primary-btn" onClick={startAuto}>
              ▶ Iniciar ataque automático
            </button>
          )}
          {auto && (
            <button className="primary-btn bad" onClick={stopAuto}>
              ⏸ Parar
            </button>
          )}
          {phase === "success" && (
            <button className="ghost" onClick={startAuto}>
              ↻ Rodar de novo
            </button>
          )}
        </div>

        {phase === "waiting" && (
          <p className="status">
            Tentando chave <strong>{current?.key}</strong> (tamanho {current?.keyLen})… aguardando
            Bob clicar SIM ou NÃO.
          </p>
        )}
        {phase === "advancing" && <p className="status">Bob recusou — preparando próxima tentativa…</p>}
        {phase === "exhausted" && (
          <p className="reply bad">Esgotaram-se os candidatos sem confirmação do Bob.</p>
        )}
        {status && <p className="status">{status}</p>}

        {attempts.length > 0 && (
          <ul className="attempts">
            {attempts.map((a, i) => (
              <li key={i} className={`attempt ${a.result}`}>
                <span className="attempt-icon">
                  {a.result === "sim" ? "✅" : a.result === "nao" ? "❌" : "⏳"}
                </span>
                <span className="attempt-key">
                  tam {a.keyLen} ·{" "}
                  {a.baseKey && a.baseKey !== a.key && (
                    <span className="attempt-base">{a.baseKey} →</span>
                  )}{" "}
                  <strong>{a.key}</strong>
                </span>
                <span className="attempt-text mono">{a.decrypted.slice(0, 48)}…</span>
              </li>
            ))}
          </ul>
        )}

        {discovered && (
          <div className="success-box">
            <p className="result big">🏆 Chave secreta descoberta: <strong>{discovered.key}</strong></p>
            <label>📄 Mensagem original</label>
            <p className="mono plain-block">{discovered.decrypted}</p>
          </div>
        )}
      </div>

      {/* ---- Análise criptográfica (sempre visível) ---- */}
      <div className="panel">
        <h2>① Índice de Coincidência por tamanho de chave</h2>
        <p className="hint">
          O tamanho correto faz cada grupo parecer português (IC ≈ {PT_IC}); tamanhos
          errados embaralham as letras (IC ≈ 0.038).
        </p>
        <BarChart
          data={smart.icSpectrum.map((d) => ({ label: String(d.keyLen), value: d.avgIc }))}
          highlight={smart.keyLen - 1}
          threshold={0.06}
          formatValue={(v) => v.toFixed(4)}
        />
        <p className="result">
          Tamanho mais provável pela análise: <strong>{smart.keyLen}</strong> → palpite por
          frequência <strong>{smart.key}</strong>
          {candidates[0] && candidates[0].key !== smart.key && (
            <> · refinado → <strong>{candidates[0].key}</strong></>
          )}
        </p>
      </div>

      <div className="panel">
        <h2>② Análise de frequência (qui-quadrado) por posição</h2>
        <p className="hint">
          Cada posição da chave é uma cifra de César; o deslocamento de menor χ² revela a letra.
        </p>
        <div className="positions">
          {smart.positions.map((pos) => (
            <PositionCard key={pos.index} pos={pos} />
          ))}
        </div>
      </div>
    </div>
  );
}

function markLast(attempts, result) {
  const out = attempts.slice();
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].result === "pending") {
      out[i] = { ...out[i], result };
      break;
    }
  }
  return out;
}

function PositionCard({ pos }) {
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
