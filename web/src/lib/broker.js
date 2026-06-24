// Cliente do broker (canal inseguro). A URL é configurável porque, nos 3
// notebooks, o broker roda em um host da rede local acessível por IP.

const KEY = "brokerUrl";

export function getBrokerUrl() {
  return localStorage.getItem(KEY) || defaultBrokerUrl();
}

export function setBrokerUrl(url) {
  localStorage.setItem(KEY, url.replace(/\/+$/, ""));
}

// Por padrão, assume o broker no mesmo host onde a página foi aberta, porta 5000.
function defaultBrokerUrl() {
  const host = window.location.hostname || "localhost";
  return `http://${host}:5000`;
}

async function req(path, options) {
  const res = await fetch(getBrokerUrl() + path, options);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

export const broker = {
  getState: () => req("/state"),
  send: (ciphertext, attempt = 1) =>
    req("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "alice", ciphertext, attempt }),
    }),
  reply: (reply) =>
    req("/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    }),
  inject: (ciphertext, note, attempt = 1) =>
    req("/inject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ciphertext, note, attempt }),
    }),
  reset: () => req("/reset", { method: "POST" }),
};
