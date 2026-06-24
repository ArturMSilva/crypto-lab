// Porte em JavaScript de shared/vigenere.py.
// A cifra e o ataque rodam no navegador — o broker apenas repassa mensagens.

const A = "A".charCodeAt(0);

const onlyAlpha = (text) =>
  text
    .toUpperCase()
    .split("")
    .filter((c) => c >= "A" && c <= "Z")
    .join("");

export function vigenereEncrypt(plaintext, key) {
  plaintext = plaintext.toUpperCase();
  key = key.toUpperCase();
  const out = [];
  let k = 0;
  for (const ch of plaintext) {
    if (ch >= "A" && ch <= "Z") {
      const shift = key.charCodeAt(k % key.length) - A;
      out.push(String.fromCharCode(((ch.charCodeAt(0) - A + shift) % 26) + A));
      k++;
    } else {
      out.push(ch); // mantém espaços e pontuação
    }
  }
  return out.join("");
}

export function vigenereDecrypt(ciphertext, key) {
  ciphertext = ciphertext.toUpperCase();
  key = key.toUpperCase();
  const out = [];
  let k = 0;
  for (const ch of ciphertext) {
    if (ch >= "A" && ch <= "Z") {
      const shift = key.charCodeAt(k % key.length) - A;
      out.push(String.fromCharCode(((ch.charCodeAt(0) - A - shift + 26) % 26) + A));
      k++;
    } else {
      out.push(ch);
    }
  }
  return out.join("");
}

export function indexOfCoincidence(text) {
  text = onlyAlpha(text);
  const n = text.length;
  if (n < 2) return 0;
  const freq = {};
  for (const c of text) freq[c] = (freq[c] || 0) + 1;
  const sum = Object.values(freq).reduce((s, f) => s + f * (f - 1), 0);
  return sum / (n * (n - 1));
}

// Frequência relativa das letras em português (%), sem acentos.
export const PT_FREQ = {
  A: 14.63, B: 1.04, C: 3.88, D: 4.99, E: 12.57, F: 1.02,
  G: 1.3, H: 1.28, I: 6.18, J: 0.4, K: 0.02, L: 2.78,
  M: 4.74, N: 5.05, O: 10.73, P: 2.52, Q: 1.2, R: 6.53,
  S: 7.81, T: 4.34, U: 4.63, V: 1.67, W: 0.01, X: 0.21,
  Y: 0.01, Z: 0.47,
};

export const PT_IC = 0.072;
const THRESHOLD = 0.06; // acima disso, consideramos "idioma natural"
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Calcula o IC médio para cada tamanho de chave candidato (para o gráfico).
export function icByKeyLength(ciphertext, maxKeyLen = 10) {
  const text = onlyAlpha(ciphertext);
  const result = [];
  for (let keyLen = 1; keyLen <= maxKeyLen; keyLen++) {
    const groups = [];
    for (let i = 0; i < keyLen; i++) {
      let g = "";
      for (let j = i; j < text.length; j += keyLen) g += text[j];
      groups.push(g);
    }
    const avgIc = groups.reduce((s, g) => s + indexOfCoincidence(g), 0) / keyLen;
    result.push({ keyLen, avgIc });
  }
  return result;
}

export function kasiskiKeyLength(ciphertext, maxKeyLen = 10) {
  const ics = icByKeyLength(ciphertext, maxKeyLen);
  for (const { keyLen, avgIc } of ics) {
    if (avgIc >= THRESHOLD) return keyLen; // menor tamanho que já parece idioma natural
  }
  // nenhum cruzou o limiar: devolve o de maior IC
  return ics.reduce((best, cur) => (cur.avgIc > best.avgIc ? cur : best)).keyLen;
}

// Quebra uma cifra de César (um grupo da Vigenère) por qui-quadrado.
// Retorna o detalhe de todos os 26 deslocamentos para visualização.
export function frequencyAttackSingle(group) {
  const letters = onlyAlpha(group);
  const n = letters.length;
  const chiByShift = [];
  if (n === 0) {
    for (let s = 0; s < 26; s++) chiByShift.push({ shift: s, chi: 0 });
    return { keyChar: "A", bestShift: 0, chiByShift };
  }

  let bestShift = 0;
  let bestChi = Infinity;
  for (let shift = 0; shift < 26; shift++) {
    const counts = {};
    for (const c of letters) {
      const d = String.fromCharCode(((c.charCodeAt(0) - A - shift + 26) % 26) + A);
      counts[d] = (counts[d] || 0) + 1;
    }
    let chi = 0;
    for (const letter of ALPHABET) {
      const expected = (PT_FREQ[letter] / 100) * n;
      const observed = counts[letter] || 0;
      chi += ((observed - expected) ** 2) / expected;
    }
    chiByShift.push({ shift, chi });
    if (chi < bestChi) {
      bestChi = chi;
      bestShift = shift;
    }
  }
  return { keyChar: String.fromCharCode(bestShift + A), bestShift, chiByShift };
}

// Deriva a melhor chave para um tamanho FIXO, via análise de frequência por grupo.
export function attackWithKeyLength(ciphertext, keyLen) {
  const text = onlyAlpha(ciphertext);
  const positions = [];
  let key = "";
  for (let i = 0; i < keyLen; i++) {
    let group = "";
    for (let j = i; j < text.length; j += keyLen) group += text[j];
    const res = frequencyAttackSingle(group);
    positions.push({ index: i, group, ...res });
    key += res.keyChar;
  }
  return { keyLen, positions, key, decrypted: vigenereDecrypt(ciphertext, key) };
}

// Ataque completo: estima o tamanho da chave e quebra cada posição.
export function crackVigenere(ciphertext, maxKeyLen = 10) {
  const icSpectrum = icByKeyLength(ciphertext, maxKeyLen);
  const keyLen = kasiskiKeyLength(ciphertext, maxKeyLen);
  return { icSpectrum, ...attackWithKeyLength(ciphertext, keyLen) };
}

// Lista de candidatos (um por tamanho de chave 1..maxKeyLen), em ordem crescente.
export function candidatesByLength(ciphertext, maxKeyLen = 10) {
  const candidates = [];
  for (let L = 1; L <= maxKeyLen; L++) {
    candidates.push(attackWithKeyLength(ciphertext, L));
  }
  return candidates;
}

/* ------------------------------------------------------------------ *
 * REFINAMENTO — corrige o "chega perto mas erra" do ataque puro de
 * frequência. A análise por qui-quadrado dá um palpite; o hill-climbing
 * ajusta cada letra da chave maximizando o quanto o texto decifrado
 * "parece português" (modelo de trigramas de um corpus de referência).
 * ------------------------------------------------------------------ */

// Corpus de referência em português (sem acentos). Quanto mais texto natural,
// melhor o modelo estatístico que distingue uma decifração correta de lixo.
const PT_CORPUS = `
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

let NGRAM = null;
function buildNgram() {
  const text = onlyAlpha(PT_CORPUS);
  const tri = {};
  for (let i = 0; i + 3 <= text.length; i++) {
    const t = text.slice(i, i + 3);
    tri[t] = (tri[t] || 0) + 1;
  }
  const total = Math.max(1, text.length - 2);
  NGRAM = { tri, total, floor: Math.log(0.01 / total) };
}

// Pontua o quanto um texto "parece português" (soma de log-prob dos trigramas).
// Maior = mais natural. Serve de função objetivo do refinamento.
export function textFitness(text) {
  if (!NGRAM) buildNgram();
  const s = onlyAlpha(text);
  let score = 0;
  for (let i = 0; i + 3 <= s.length; i++) {
    const c = NGRAM.tri[s.slice(i, i + 3)];
    score += c != null ? Math.log(c / NGRAM.total) : NGRAM.floor;
  }
  return score;
}

// A partir de uma chave inicial, ajusta cada posição (A..Z) mantendo a troca
// que mais aumenta a "naturalidade" do texto, repetindo até estabilizar.
export function hillClimbKey(ciphertext, keyLen, startKey) {
  const key = startKey.padEnd(keyLen, "A").slice(0, keyLen).split("");
  let best = textFitness(vigenereDecrypt(ciphertext, key.join("")));
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < keyLen; i++) {
      let bestChar = key[i];
      let bestScore = best;
      const original = key[i];
      for (let c = 0; c < 26; c++) {
        key[i] = String.fromCharCode(65 + c);
        const score = textFitness(vigenereDecrypt(ciphertext, key.join("")));
        if (score > bestScore) {
          bestScore = score;
          bestChar = key[i];
        }
      }
      key[i] = bestChar;
      if (bestChar !== original) {
        best = bestScore;
        improved = true;
      }
    }
  }
  return key.join("");
}

// Ataque a um tamanho fixo, já com refinamento por hill-climbing.
export function attackRefined(ciphertext, keyLen) {
  const base = attackWithKeyLength(ciphertext, keyLen);
  const key = hillClimbKey(ciphertext, keyLen, base.key);
  const decrypted = vigenereDecrypt(ciphertext, key);
  return { keyLen, baseKey: base.key, key, decrypted, fitness: textFitness(decrypted) };
}

// Penalidade por letra de chave: chaves longas têm mais graus de liberdade e
// tendem a "overfitar" textos curtos. Penalizar o tamanho evita escolher uma
// chave longa só porque ela ajusta melhor um texto pequeno.
const LENGTH_PENALTY = 3.0;
const rankScore = (c) => c.fitness - LENGTH_PENALTY * c.keyLen;

// Candidatos refinados (um por tamanho), ordenados do mais provável ao menos.
// Usado pelo modo automático: tenta primeiro o que mais "parece português".
export function candidatesRanked(ciphertext, maxKeyLen = 10) {
  const cands = [];
  for (let L = 1; L <= maxKeyLen; L++) cands.push(attackRefined(ciphertext, L));
  cands.sort((a, b) => rankScore(b) - rankScore(a));
  return cands;
}
