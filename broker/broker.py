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
estado = {
    "channel": None,   # mensagem atual trafegando (de Alice ou injetada pelo atacante)
    "reply": None,     # resposta de Bob
    "log": [],         # histórico de eventos do canal
}


def registrar_evento(ator: str, texto: str):
    entrada = {
        "t": datetime.now().strftime("%H:%M:%S"),
        "actor": ator,           # alice | bob | attacker | system
        "text": texto,
    }
    estado["log"].append(entrada)
    estado["log"] = estado["log"][-100:]  # mantém só os últimos 100 eventos
    print(f"[{entrada['t']}] [{ator.upper()}] {texto}")


class ManipuladorBroker(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silencia o log padrão do http.server

    # ---- auxiliares ----------------------------------------------------
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _enviar_json(self, dados, codigo=200):
        corpo = json.dumps(dados).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self._cors()
        self.end_headers()
        self.wfile.write(corpo)

    def _ler_corpo(self):
        tamanho = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(tamanho)) if tamanho else {}

    # ---- preflight CORS ------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    # ---- leitura -------------------------------------------------------
    def do_GET(self):
        if self.path == "/state":
            # Tudo o que a interface web precisa em uma única chamada.
            self._enviar_json(estado)

        elif self.path == "/message":
            # Compatibilidade com os scripts Python (Bob/atacante leem aqui).
            self._enviar_json(estado["channel"] or {})

        elif self.path == "/reply":
            self._enviar_json({"reply": estado["reply"]})

        elif self.path == "/log":
            self._enviar_json({"log": estado["log"]})

        else:
            self._enviar_json({"error": "rota não encontrada"}, 404)

    # ---- escrita -------------------------------------------------------
    def do_POST(self):
        dados = self._ler_corpo()

        if self.path == "/send":
            # Alice envia mensagem cifrada para Bob.
            estado["channel"] = {
                "ciphertext": dados["ciphertext"],
                "from": dados.get("from", "alice"),
                "attempt": dados.get("attempt", 1),
                "injected": False,
            }
            estado["reply"] = None  # limpa resposta anterior
            registrar_evento("alice", f"→ Bob (cifrado): {dados['ciphertext']}")
            self._enviar_json({"ok": True})

        elif self.path == "/reply":
            # Bob responde.
            estado["reply"] = dados["reply"]
            registrar_evento("bob", f"→ Alice: {dados['reply']}")
            self._enviar_json({"ok": True})

        elif self.path == "/inject":
            # Atacante injeta/manipula a mensagem no canal (MitM ativo).
            estado["channel"] = {
                "ciphertext": dados["ciphertext"],
                "from": "attacker",
                "attempt": dados.get("attempt", 1),
                "injected": True,
                "note": dados.get("note", ""),
            }
            registrar_evento("attacker", f"⚡ INJETOU: {dados['ciphertext']} | {dados.get('note', '')}")
            self._enviar_json({"ok": True})

        elif self.path == "/reset":
            estado["channel"] = None
            estado["reply"] = None
            estado["log"] = []
            registrar_evento("system", "Canal reiniciado")
            self._enviar_json({"ok": True})

        else:
            self._enviar_json({"error": "rota não encontrada"}, 404)

    def do_DELETE(self):
        if self.path == "/reply":
            estado["reply"] = None
            self._enviar_json({"ok": True})
        elif self.path == "/reset":
            estado["channel"] = None
            estado["reply"] = None
            estado["log"] = []
            self._enviar_json({"ok": True})
        else:
            self._enviar_json({"error": "not found"}, 404)


if __name__ == "__main__":
    servidor = HTTPServer(("0.0.0.0", 5000), ManipuladorBroker)
    print("[BROKER] Canal inseguro iniciado na porta 5000")
    print("[BROKER] Qualquer mensagem pode ser interceptada!\n")
    servidor.serve_forever()
