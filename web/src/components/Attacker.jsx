import { useEffect, useMemo, useRef, useState } from "react";
import { quebrarVigenere, candidatosOrdenados, IC_PT } from "../lib/vigenere.js";
import { broker } from "../lib/broker.js";
import BarChart from "./BarChart.jsx";

const AVANCO_MS = 1500; // pausa entre tentativas (para a turma acompanhar)

export default function Attacker({ estado }) {
  const canal = estado?.channel;

  // Captura o texto cifrado ORIGINAL de Alice. As injeções do próprio atacante
  // (canal.injected) não devem sobrescrever o alvo da análise.
  const [capturado, setCapturado] = useState(null);
  useEffect(() => {
    if (canal && !canal.injected && canal.ciphertext) {
      setCapturado(canal.ciphertext);
    }
  }, [canal?.ciphertext, canal?.injected]);

  // Análise "inteligente" (IC + qui-quadrado) usada nos gráficos.
  const analise = useMemo(() => (capturado ? quebrarVigenere(capturado, 10) : null), [capturado]);
  // Candidatos do modo automático já REFINADOS por hill-climbing e ordenados
  // do mais provável ao menos provável (tenta primeiro o melhor palpite).
  const candidatos = useMemo(() => (capturado ? candidatosOrdenados(capturado, 10) : []), [capturado]);

  // ---- estado do modo automático -----------------------------------
  const [automatico, setAutomatico] = useState(false);
  const [indice, setIndice] = useState(0);
  const [tentativas, setTentativas] = useState([]); // {tamChave, chave, decifrado, resultado}
  const [fase, setFase] = useState("ocioso"); // ocioso | aguardando | avancando | sucesso | esgotado
  const [status, setStatus] = useState(null);
  const indiceRef = useRef(0);
  indiceRef.current = indice;

  // Novo texto interceptado → zera o modo automático.
  useEffect(() => {
    setAutomatico(false);
    setTentativas([]);
    setFase("ocioso");
    setIndice(0);
  }, [capturado]);

  async function tentarCandidato(i) {
    const c = candidatos[i];
    if (!c) {
      setFase("esgotado");
      return;
    }
    setIndice(i);
    setTentativas((prev) => [
      ...prev,
      { tamChave: c.tamChave, chave: c.chave, chaveBase: c.chaveBase, decifrado: c.decifrado, resultado: "pendente" },
    ]);
    setFase("aguardando");
    try {
      await broker.limparResposta();
      await broker.injetar(c.decifrado, `Auto: testando chave "${c.chave}" (tamanho ${c.tamChave})`, c.tamChave);
    } catch (e) {
      setStatus("Erro ao injetar: " + e.message);
    }
  }

  function iniciarAuto() {
    setTentativas([]);
    setFase("ocioso");
    setAutomatico(true);
    tentarCandidato(0);
  }

  function pararAuto() {
    setAutomatico(false);
    setFase("ocioso");
  }

  // Reage à resposta do Bob enquanto aguarda.
  useEffect(() => {
    if (!automatico || fase !== "aguardando") return;
    const resposta = estado?.reply;
    if (!resposta) return;
    const r = resposta.trim().toUpperCase();

    setTentativas((prev) => marcarUltima(prev, r === "SIM" ? "sim" : "nao"));

    if (r === "SIM") {
      setFase("sucesso");
      setAutomatico(false);
    } else {
      setFase("avancando");
      const proximo = indiceRef.current + 1;
      setTimeout(async () => {
        await broker.limparResposta().catch(() => {});
        if (proximo < candidatos.length) tentarCandidato(proximo);
        else setFase("esgotado");
      }, AVANCO_MS);
    }
  }, [estado?.reply, automatico, fase]);

  if (!capturado) {
    return (
      <div className="screen">
        <div className="panel">
          <h2>👂 Monitorando o canal…</h2>
          <p className="hint">Nenhuma mensagem interceptada ainda. Aguardando Alice enviar.</p>
        </div>
      </div>
    );
  }

  const atual = tentativas[tentativas.length - 1];
  const descoberto = fase === "sucesso" ? atual : null;

  return (
    <div className="screen">
      <div className="panel intercepted">
        <h2>🎯 Mensagem interceptada</h2>
        <p className="mono cipher-block">{capturado}</p>
      </div>

      {/* ---- Modo automático ---- */}
      <div className={`panel ${fase === "sucesso" ? "highlight" : ""}`}>
        <h2>🤖 Modo automático</h2>
        <p className="hint">
          O atacante refina cada palpite por <em>hill-climbing</em> (ajusta a chave
          maximizando o quanto o texto “parece português”) e tenta primeiro o mais
          provável. Avança sozinho a cada “NÃO” e para quando o Bob clica “SIM”.
        </p>
        <div className="row">
          {!automatico && fase !== "sucesso" && (
            <button className="primary-btn" onClick={iniciarAuto}>
              ▶ Iniciar ataque automático
            </button>
          )}
          {automatico && (
            <button className="primary-btn bad" onClick={pararAuto}>
              ⏸ Parar
            </button>
          )}
          {fase === "sucesso" && (
            <button className="ghost" onClick={iniciarAuto}>
              ↻ Rodar de novo
            </button>
          )}
        </div>

        {fase === "aguardando" && (
          <p className="status">
            Tentando chave <strong>{atual?.chave}</strong> (tamanho {atual?.tamChave})… aguardando
            Bob clicar SIM ou NÃO.
          </p>
        )}
        {fase === "avancando" && <p className="status">Bob recusou — preparando próxima tentativa…</p>}
        {fase === "esgotado" && (
          <p className="reply bad">Esgotaram-se os candidatos sem confirmação do Bob.</p>
        )}
        {status && <p className="status">{status}</p>}

        {tentativas.length > 0 && (
          <ul className="attempts">
            {tentativas.map((a, i) => (
              <li key={i} className={`attempt ${a.resultado}`}>
                <span className="attempt-icon">
                  {a.resultado === "sim" ? "✅" : a.resultado === "nao" ? "❌" : "⏳"}
                </span>
                <span className="attempt-key">
                  tam {a.tamChave} ·{" "}
                  {a.chaveBase && a.chaveBase !== a.chave && (
                    <span className="attempt-base">{a.chaveBase} →</span>
                  )}{" "}
                  <strong>{a.chave}</strong>
                </span>
                <span className="attempt-text mono">{a.decifrado.slice(0, 48)}…</span>
              </li>
            ))}
          </ul>
        )}

        {descoberto && (
          <div className="success-box">
            <p className="result big">🏆 Chave secreta descoberta: <strong>{descoberto.chave}</strong></p>
            <label>📄 Mensagem original</label>
            <p className="mono plain-block">{descoberto.decifrado}</p>
          </div>
        )}
      </div>

      {/* ---- Análise criptográfica (sempre visível) ---- */}
      <div className="panel">
        <h2>① Índice de Coincidência por tamanho de chave</h2>
        <p className="hint">
          O tamanho correto faz cada grupo parecer português (IC ≈ {IC_PT}); tamanhos
          errados embaralham as letras (IC ≈ 0.038).
        </p>
        <BarChart
          dados={analise.espectroIc.map((d) => ({ rotulo: String(d.tamChave), valor: d.icMedio }))}
          destaque={analise.tamChave - 1}
          limiar={0.06}
          formatarValor={(v) => v.toFixed(4)}
        />
        <p className="result">
          Tamanho mais provável pela análise: <strong>{analise.tamChave}</strong> → palpite por
          frequência <strong>{analise.chave}</strong>
          {candidatos[0] && candidatos[0].chave !== analise.chave && (
            <> · refinado → <strong>{candidatos[0].chave}</strong></>
          )}
        </p>
      </div>

      <div className="panel">
        <h2>② Análise de frequência (qui-quadrado) por posição</h2>
        <p className="hint">
          Cada posição da chave é uma cifra de César; o deslocamento de menor χ² revela a letra.
        </p>
        <div className="positions">
          {analise.posicoes.map((pos) => (
            <CartaoPosicao key={pos.indice} pos={pos} />
          ))}
        </div>
      </div>
    </div>
  );
}

function marcarUltima(tentativas, resultado) {
  const saida = tentativas.slice();
  for (let i = saida.length - 1; i >= 0; i--) {
    if (saida[i].resultado === "pendente") {
      saida[i] = { ...saida[i], resultado };
      break;
    }
  }
  return saida;
}

function CartaoPosicao({ pos }) {
  const top = pos.quiPorDeslocamento
    .map((d) => ({ ...d, letra: String.fromCharCode(65 + d.deslocamento) }))
    .sort((a, b) => a.qui - b.qui)
    .slice(0, 5);
  return (
    <div className="position-card">
      <div className="position-head">
        <span>Posição {pos.indice + 1}</span>
        <span className="key-letter">{pos.letraChave}</span>
      </div>
      <BarChart
        dados={top.map((d) => ({ rotulo: d.letra, valor: d.qui }))}
        destaque={0}
        formatarValor={(v) => v.toFixed(1)}
      />
    </div>
  );
}
