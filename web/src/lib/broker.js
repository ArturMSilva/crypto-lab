// Cliente do broker (canal inseguro). A URL é configurável porque, nos 3
// notebooks, o broker roda em um host da rede local acessível por IP.

const CHAVE_LS = "brokerUrl";

export function obterUrlBroker() {
  return localStorage.getItem(CHAVE_LS) || urlBrokerPadrao();
}

export function definirUrlBroker(url) {
  localStorage.setItem(CHAVE_LS, url.replace(/\/+$/, ""));
}

// Por padrão, assume o broker no mesmo host onde a página foi aberta, porta 5000.
function urlBrokerPadrao() {
  const host = window.location.hostname || "localhost";
  return `http://${host}:5000`;
}

async function requisitar(caminho, opcoes) {
  const res = await fetch(obterUrlBroker() + caminho, opcoes);
  if (!res.ok) throw new Error(`${caminho} → HTTP ${res.status}`);
  return res.json();
}

export const broker = {
  obterEstado: () => requisitar("/state"),
  enviar: (textoCifrado, tentativa = 1) =>
    requisitar("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "alice", ciphertext: textoCifrado, attempt: tentativa }),
    }),
  responder: (resposta) =>
    requisitar("/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: resposta }),
    }),
  injetar: (textoCifrado, nota, tentativa = 1) =>
    requisitar("/inject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ciphertext: textoCifrado, note: nota, attempt: tentativa }),
    }),
  limparResposta: () => requisitar("/reply", { method: "DELETE" }),
  reiniciar: () => requisitar("/reset", { method: "POST" }),
};
