// Porte em JavaScript de shared/vigenere.py.
// A cifra e o ataque rodam no navegador — o broker apenas repassa mensagens.

const A = "A".charCodeAt(0);

const apenasLetras = (texto) =>
  texto
    .toUpperCase()
    .split("")
    .filter((c) => c >= "A" && c <= "Z")
    .join("");

export function cifrarVigenere(textoClaro, chave) {
  textoClaro = textoClaro.toUpperCase();
  chave = chave.toUpperCase();
  const saida = [];
  let k = 0;
  for (const ch of textoClaro) {
    if (ch >= "A" && ch <= "Z") {
      const deslocamento = chave.charCodeAt(k % chave.length) - A;
      saida.push(String.fromCharCode(((ch.charCodeAt(0) - A + deslocamento) % 26) + A));
      k++;
    } else {
      saida.push(ch); // mantém espaços e pontuação
    }
  }
  return saida.join("");
}

export function decifrarVigenere(textoCifrado, chave) {
  textoCifrado = textoCifrado.toUpperCase();
  chave = chave.toUpperCase();
  const saida = [];
  let k = 0;
  for (const ch of textoCifrado) {
    if (ch >= "A" && ch <= "Z") {
      const deslocamento = chave.charCodeAt(k % chave.length) - A;
      saida.push(String.fromCharCode(((ch.charCodeAt(0) - A - deslocamento + 26) % 26) + A));
      k++;
    } else {
      saida.push(ch);
    }
  }
  return saida.join("");
}

export function indiceDeCoincidencia(texto) {
  texto = apenasLetras(texto);
  const n = texto.length;
  if (n < 2) return 0;
  const freq = {};
  for (const c of texto) freq[c] = (freq[c] || 0) + 1;
  const soma = Object.values(freq).reduce((s, f) => s + f * (f - 1), 0);
  return soma / (n * (n - 1));
}

// Frequência relativa das letras em português (%), sem acentos.
export const FREQ_PT = {
  A: 14.63, B: 1.04, C: 3.88, D: 4.99, E: 12.57, F: 1.02,
  G: 1.3, H: 1.28, I: 6.18, J: 0.4, K: 0.02, L: 2.78,
  M: 4.74, N: 5.05, O: 10.73, P: 2.52, Q: 1.2, R: 6.53,
  S: 7.81, T: 4.34, U: 4.63, V: 1.67, W: 0.01, X: 0.21,
  Y: 0.01, Z: 0.47,
};

export const IC_PT = 0.072;
const LIMIAR = 0.06; // acima disso, consideramos "idioma natural"
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Calcula o IC médio para cada tamanho de chave candidato (para o gráfico).
export function icPorTamanhoChave(textoCifrado, tamMaxChave = 10) {
  const texto = apenasLetras(textoCifrado);
  const resultado = [];
  for (let tamChave = 1; tamChave <= tamMaxChave; tamChave++) {
    const grupos = [];
    for (let i = 0; i < tamChave; i++) {
      let g = "";
      for (let j = i; j < texto.length; j += tamChave) g += texto[j];
      grupos.push(g);
    }
    const icMedio = grupos.reduce((s, g) => s + indiceDeCoincidencia(g), 0) / tamChave;
    resultado.push({ tamChave, icMedio });
  }
  return resultado;
}

export function tamanhoChaveKasiski(textoCifrado, tamMaxChave = 10) {
  const ics = icPorTamanhoChave(textoCifrado, tamMaxChave);
  for (const { tamChave, icMedio } of ics) {
    if (icMedio >= LIMIAR) return tamChave; // menor tamanho que já parece idioma natural
  }
  // nenhum cruzou o limiar: devolve o de maior IC
  return ics.reduce((melhor, atual) => (atual.icMedio > melhor.icMedio ? atual : melhor)).tamChave;
}

// Quebra uma cifra de César (um grupo da Vigenère) por qui-quadrado.
// Retorna o detalhe de todos os 26 deslocamentos para visualização.
export function ataqueFrequenciaGrupo(grupo) {
  const letras = apenasLetras(grupo);
  const n = letras.length;
  const quiPorDeslocamento = [];
  if (n === 0) {
    for (let s = 0; s < 26; s++) quiPorDeslocamento.push({ deslocamento: s, qui: 0 });
    return { letraChave: "A", melhorDeslocamento: 0, quiPorDeslocamento };
  }

  let melhorDeslocamento = 0;
  let melhorQui = Infinity;
  for (let deslocamento = 0; deslocamento < 26; deslocamento++) {
    const contagens = {};
    for (const c of letras) {
      const d = String.fromCharCode(((c.charCodeAt(0) - A - deslocamento + 26) % 26) + A);
      contagens[d] = (contagens[d] || 0) + 1;
    }
    let qui = 0;
    for (const letra of ALFABETO) {
      const esperado = (FREQ_PT[letra] / 100) * n;
      const observado = contagens[letra] || 0;
      qui += ((observado - esperado) ** 2) / esperado;
    }
    quiPorDeslocamento.push({ deslocamento, qui });
    if (qui < melhorQui) {
      melhorQui = qui;
      melhorDeslocamento = deslocamento;
    }
  }
  return { letraChave: String.fromCharCode(melhorDeslocamento + A), melhorDeslocamento, quiPorDeslocamento };
}

// Deriva a melhor chave para um tamanho FIXO, via análise de frequência por grupo.
export function ataqueComTamanhoChave(textoCifrado, tamChave) {
  const texto = apenasLetras(textoCifrado);
  const posicoes = [];
  let chave = "";
  for (let i = 0; i < tamChave; i++) {
    let grupo = "";
    for (let j = i; j < texto.length; j += tamChave) grupo += texto[j];
    const res = ataqueFrequenciaGrupo(grupo);
    posicoes.push({ indice: i, grupo, ...res });
    chave += res.letraChave;
  }
  return { tamChave, posicoes, chave, decifrado: decifrarVigenere(textoCifrado, chave) };
}

// Ataque completo: estima o tamanho da chave e quebra cada posição.
export function quebrarVigenere(textoCifrado, tamMaxChave = 10) {
  const espectroIc = icPorTamanhoChave(textoCifrado, tamMaxChave);
  const tamChave = tamanhoChaveKasiski(textoCifrado, tamMaxChave);
  return { espectroIc, ...ataqueComTamanhoChave(textoCifrado, tamChave) };
}

// Lista de candidatos (um por tamanho de chave 1..tamMaxChave), em ordem crescente.
export function candidatosPorTamanho(textoCifrado, tamMaxChave = 10) {
  const candidatos = [];
  for (let L = 1; L <= tamMaxChave; L++) {
    candidatos.push(ataqueComTamanhoChave(textoCifrado, L));
  }
  return candidatos;
}

/* ------------------------------------------------------------------ *
 * REFINAMENTO — corrige o "chega perto mas erra" do ataque puro de
 * frequência. A análise por qui-quadrado dá um palpite; o hill-climbing
 * ajusta cada letra da chave maximizando o quanto o texto decifrado
 * "parece português" (modelo de trigramas de um corpus de referência).
 * ------------------------------------------------------------------ */

// Corpus de referência em português (sem acentos). Quanto mais texto natural,
// melhor o modelo estatístico que distingue uma decifração correta de lixo.
const CORPUS_PT = `
A criptografia e a ciencia de proteger a informacao transformando mensagens
em codigos que apenas as partes autorizadas conseguem ler. Desde a antiguidade
as pessoas usam cifras para esconder segredos militares politicos e comerciais.
A cifra de cesar substitui cada letra por outra deslocada um numero fixo de
posicoes no alfabeto e por isso e facil de quebrar com analise de frequencia.
A cifra de vigenere usa uma palavra chave que se repete ao longo do texto e por
muito tempo foi considerada indecifravel. No entanto a repeticao da chave cria
padroes estatisticos que permitem estimar o tamanho da chave e depois recuperar
cada letra. A seguranca de um sistema nao deve depender do segredo do algoritmo
mas apenas do segredo da chave. Hoje usamos algoritmos modernos como o aes que
resistem a esse tipo de ataque quando a chave e suficientemente longa e aleatoria.
O canal de comunicacao tambem precisa ser autenticado e protegido para evitar
que um atacante intercepte altere ou injete mensagens sem que ninguem perceba.
A confidencialidade a integridade e a autenticidade sao pilares da seguranca da
informacao. As pessoas trocam mensagens todos os dias e esperam que a conversa
permaneca privada. Por isso o estudo das cifras e dos ataques e fundamental para
quem deseja construir sistemas confiaveis e proteger os dados dos usuarios contra
adversarios que tentam descobrir a chave secreta usada para cifrar o conteudo.
`;

let NGRAMA = null;
function construirNgrama() {
  const texto = apenasLetras(CORPUS_PT);
  const tri = {};
  for (let i = 0; i + 3 <= texto.length; i++) {
    const t = texto.slice(i, i + 3);
    tri[t] = (tri[t] || 0) + 1;
  }
  const total = Math.max(1, texto.length - 2);
  NGRAMA = { tri, total, piso: Math.log(0.01 / total) };
}

// Pontua o quanto um texto "parece português" (soma de log-prob dos trigramas).
// Maior = mais natural. Serve de função objetivo do refinamento.
export function aptidaoTexto(texto) {
  if (!NGRAMA) construirNgrama();
  const s = apenasLetras(texto);
  let pontuacao = 0;
  for (let i = 0; i + 3 <= s.length; i++) {
    const c = NGRAMA.tri[s.slice(i, i + 3)];
    pontuacao += c != null ? Math.log(c / NGRAMA.total) : NGRAMA.piso;
  }
  return pontuacao;
}

// A partir de uma chave inicial, ajusta cada posição (A..Z) mantendo a troca
// que mais aumenta a "naturalidade" do texto, repetindo até estabilizar.
export function subidaEncostaChave(textoCifrado, tamChave, chaveInicial) {
  const chave = chaveInicial.padEnd(tamChave, "A").slice(0, tamChave).split("");
  let melhor = aptidaoTexto(decifrarVigenere(textoCifrado, chave.join("")));
  let melhorou = true;
  while (melhorou) {
    melhorou = false;
    for (let i = 0; i < tamChave; i++) {
      let melhorLetra = chave[i];
      let melhorPontuacao = melhor;
      const original = chave[i];
      for (let c = 0; c < 26; c++) {
        chave[i] = String.fromCharCode(65 + c);
        const pontuacao = aptidaoTexto(decifrarVigenere(textoCifrado, chave.join("")));
        if (pontuacao > melhorPontuacao) {
          melhorPontuacao = pontuacao;
          melhorLetra = chave[i];
        }
      }
      chave[i] = melhorLetra;
      if (melhorLetra !== original) {
        melhor = melhorPontuacao;
        melhorou = true;
      }
    }
  }
  return chave.join("");
}

// Ataque a um tamanho fixo, já com refinamento por hill-climbing.
export function ataqueRefinado(textoCifrado, tamChave) {
  const base = ataqueComTamanhoChave(textoCifrado, tamChave);
  const chave = subidaEncostaChave(textoCifrado, tamChave, base.chave);
  const decifrado = decifrarVigenere(textoCifrado, chave);
  return { tamChave, chaveBase: base.chave, chave, decifrado, aptidao: aptidaoTexto(decifrado) };
}

// Penalidade por letra de chave: chaves longas têm mais graus de liberdade e
// tendem a "overfitar" textos curtos. Penalizar o tamanho evita escolher uma
// chave longa só porque ela ajusta melhor um texto pequeno.
const PENALIDADE_TAMANHO = 3.0;
const pontuacaoRanking = (c) => c.aptidao - PENALIDADE_TAMANHO * c.tamChave;

// Candidatos refinados (um por tamanho), ordenados do mais provável ao menos.
// Usado pelo modo automático: tenta primeiro o que mais "parece português".
export function candidatosOrdenados(textoCifrado, tamMaxChave = 10) {
  const cands = [];
  for (let L = 1; L <= tamMaxChave; L++) cands.push(ataqueRefinado(textoCifrado, L));
  cands.sort((a, b) => pontuacaoRanking(b) - pontuacaoRanking(a));
  return cands;
}
