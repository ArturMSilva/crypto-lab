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

// Ataque completo com todos os dados intermediários para a interface.
export function crackVigenere(ciphertext, maxKeyLen = 10) {
  const icSpectrum = icByKeyLength(ciphertext, maxKeyLen);
  const keyLen = kasiskiKeyLength(ciphertext, maxKeyLen);
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

  const decrypted = vigenereDecrypt(ciphertext, key);
  return { icSpectrum, keyLen, positions, key, decrypted };
}
