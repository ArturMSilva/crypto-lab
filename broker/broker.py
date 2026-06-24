"""
BROKER - Canal de comunicação inseguro
Simula o canal pelo qual Alice e Bob se comunicam (interceptável pelo atacante).

Serve tanto os scripts Python (versão Docker/CLI) quanto a interface web (React),
por isso responde com cabeçalhos CORS e expõe um endpoint /state unificado.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import json

# Estado compartilhado (canal inseguro). Tudo aqui pode ser lido por qualquer um.
state = {
    "channel": None,   # mensagem atual trafegando (de Alice ou injetada pelo atacante)
    "reply": None,     # resposta de Bob
    "log": [],         # histórico de eventos do canal
}


def log_event(actor: str, text: str):
    entry = {
        "t": datetime.now().strftime("%H:%M:%S"),
        "actor": actor,          # alice | bob | attacker | system
        "text": text,
    }
    state["log"].append(entry)
    state["log"] = state["log"][-100:]  # mantém só os últimos 100 eventos
    print(f"[{entry['t']}] [{actor.upper()}] {text}")


class BrokerHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silencia o log padrão do http.server

    # ---- helpers -------------------------------------------------------
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    # ---- preflight CORS ------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    # ---- leitura -------------------------------------------------------
    def do_GET(self):
        if self.path == "/state":
            # Tudo o que a interface web precisa em uma única chamada.
            self._send_json(state)

        elif self.path == "/message":
            # Compatibilidade com os scripts Python (Bob/atacante leem aqui).
            self._send_json(state["channel"] or {})

        elif self.path == "/reply":
            self._send_json({"reply": state["reply"]})

        elif self.path == "/log":
            self._send_json({"log": state["log"]})

        else:
            self._send_json({"error": "rota não encontrada"}, 404)

    # ---- escrita -------------------------------------------------------
    def do_POST(self):
        data = self._read_body()

        if self.path == "/send":
            # Alice envia mensagem cifrada para Bob.
            state["channel"] = {
                "ciphertext": data["ciphertext"],
                "from": data.get("from", "alice"),
                "attempt": data.get("attempt", 1),
                "injected": False,
            }
            state["reply"] = None  # limpa resposta anterior
            log_event("alice", f"→ Bob (cifrado): {data['ciphertext']}")
            self._send_json({"ok": True})

        elif self.path == "/reply":
            # Bob responde.
            state["reply"] = data["reply"]
            log_event("bob", f"→ Alice: {data['reply']}")
            self._send_json({"ok": True})

        elif self.path == "/inject":
            # Atacante injeta/manipula a mensagem no canal (MitM ativo).
            state["channel"] = {
                "ciphertext": data["ciphertext"],
                "from": "attacker",
                "attempt": data.get("attempt", 1),
                "injected": True,
                "note": data.get("note", ""),
            }
            log_event("attacker", f"⚡ INJETOU: {data['ciphertext']} | {data.get('note', '')}")
            self._send_json({"ok": True})

        elif self.path == "/reset":
            state["channel"] = None
            state["reply"] = None
            state["log"] = []
            log_event("system", "Canal reiniciado")
            self._send_json({"ok": True})

        else:
            self._send_json({"error": "rota não encontrada"}, 404)

    def do_DELETE(self):
        if self.path == "/reply":
            state["reply"] = None
            self._send_json({"ok": True})
        elif self.path == "/reset":
            state["channel"] = None
            state["reply"] = None
            state["log"] = []
            self._send_json({"ok": True})
        else:
            self._send_json({"error": "not found"}, 404)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 5000), BrokerHandler)
    print("[BROKER] Canal inseguro iniciado na porta 5000")
    print("[BROKER] Qualquer mensagem pode ser interceptada!\n")
    server.serve_forever()
