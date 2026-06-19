"""
BROKER - Canal de comunicação inseguro
Simula o canal pelo qual Alice e Bob se comunicam (interceptável pelo atacante)
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

# Estado compartilhado (canal inseguro)
state = {
    "message": None,   # mensagem de Alice para Bob
    "reply": None,     # resposta de Bob
    "log": []
}


class BrokerHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silencia logs

    def _send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def do_GET(self):
        if self.path == "/message":
            # Qualquer um pode ler a mensagem (canal inseguro)
            self._send_json(state["message"] or {})

        elif self.path == "/reply":
            self._send_json({"reply": state["reply"]})

        elif self.path == "/log":
            self._send_json({"log": state["log"]})

        else:
            self._send_json({"error": "rota não encontrada"}, 404)

    def do_POST(self):
        data = self._read_body()

        if self.path == "/send":
            # Alice envia mensagem para Bob
            state["message"] = {
                "ciphertext": data["ciphertext"],
                "attempt": data.get("attempt", 1)
            }
            state["reply"] = None  # limpa resposta anterior
            entry = f"[CANAL] Alice → Bob (cifrado): {data['ciphertext']}"
            state["log"].append(entry)
            print(entry)
            self._send_json({"ok": True})

        elif self.path == "/reply":
            # Bob responde
            state["reply"] = data["reply"]
            entry = f"[CANAL] Bob → Alice: {data['reply']}"
            state["log"].append(entry)
            print(entry)
            self._send_json({"ok": True})

        elif self.path == "/inject":
            # Atacante injeta mensagem manipulada
            state["message"] = {
                "ciphertext": data["ciphertext"],
                "attempt": data.get("attempt", 1),
                "injected": True,
                "note": data.get("note", "")
            }
            entry = f"[CANAL] ⚡ ATACANTE INJETOU: {data['ciphertext']} | {data.get('note','')}"
            state["log"].append(entry)
            print(entry)
            self._send_json({"ok": True})

        else:
            self._send_json({"error": "rota não encontrada"}, 404)

    def do_DELETE(self):
        if self.path == "/reply":
            state["reply"] = None
            self._send_json({"ok": True})
        else:
            self._send_json({"error": "not found"}, 404)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 5000), BrokerHandler)
    print("[BROKER] Canal inseguro iniciado na porta 5000")
    print("[BROKER] Qualquer mensagem pode ser interceptada!\n")
    server.serve_forever()
