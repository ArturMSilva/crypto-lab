"""
ALICE - Servidor de mensagens criptografadas
Criptografa mensagens com Cifra de Vigenère e as envia para Bob (via broker HTTP)
"""
import sys
import os
import time
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading

sys.path.insert(0, '/app/shared')
from vigenere import vigenere_encrypt

# Configurações
SECRET_KEY = "SECRETO"          # Chave compartilhada com Bob (o atacante não sabe)
BROKER_URL = "http://broker:5000"  # Broker central (simulando canal inseguro)
ALICE_PORT = 8001

# Mensagem que Alice quer enviar a Bob.
# Texto longo (e sem acentos) de proposito: quanto mais texto cifrado, mais
# facil para o atacante recuperar a chave por analise de frequencia.
MESSAGE = (
    "OLA BOB ESTA E UMA MENSAGEM SECRETA ENVIADA POR ALICE ATRAVES DO CANAL "
    "INSEGURO ESPERO QUE NINGUEM CONSIGA LER NOSSA CONVERSA POIS ESTAMOS USANDO "
    "A CIFRA DE VIGENERE COM UMA CHAVE COMPARTILHADA APENAS ENTRE NOS DOIS SE "
    "VOCE CONSEGUIR DECIFRAR ESTA MENSAGEM CORRETAMENTE RESPONDA COM SIM PARA "
    "CONFIRMAR QUE A NOSSA COMUNICACAO SEGURA ESTA FUNCIONANDO PERFEITAMENTE BEM"
)


class AliceHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silencia logs padrão

    def do_GET(self):
        if self.path == "/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "Alice online", "key": SECRET_KEY}).encode())


def send_encrypted_message():
    """Alice envia a mensagem criptografada para o broker"""
    time.sleep(2)  # aguarda o broker subir
    encrypted = vigenere_encrypt(MESSAGE, SECRET_KEY)
    
    print("=" * 50)
    print("[ALICE] Mensagem original  :", MESSAGE)
    print("[ALICE] Chave secreta      :", SECRET_KEY)
    print("[ALICE] Mensagem cifrada   :", encrypted)
    print("[ALICE] Enviando para o broker (canal inseguro)...")
    print("=" * 50)

    attempt = 1
    while True:
        try:
            resp = requests.post(f"{BROKER_URL}/send", json={
                "from": "alice",
                "to": "bob",
                "ciphertext": encrypted,
                "attempt": attempt
            }, timeout=5)
            print(f"[ALICE] Mensagem entregue ao broker! (tentativa {attempt})")
        except Exception as e:
            print(f"[ALICE] Broker indisponível: {e}, tentando novamente em 3s...")
            time.sleep(3)
            continue

        # Aguarda resposta de Bob (via broker)
        time.sleep(3)
        try:
            resp = requests.get(f"{BROKER_URL}/reply", timeout=5)
            data = resp.json()
            if data.get("reply"):
                reply = data["reply"]
                print(f"\n[ALICE] Bob respondeu: '{reply}'")
                if reply.strip().upper() == "SIM":
                    print("[ALICE] ✅ Bob confirmou! A mensagem foi compreendida.")
                    break
                else:
                    print("[ALICE] ⚠️  Bob não entendeu. O atacante tentará novamente...")
                    attempt += 1
                    # reenvia a mesma mensagem cifrada
                    time.sleep(2)
            else:
                time.sleep(2)
        except Exception as e:
            time.sleep(2)


if __name__ == "__main__":
    # Inicia thread de envio
    t = threading.Thread(target=send_encrypted_message, daemon=True)
    t.start()

    # Inicia servidor HTTP simples (para status)
    server = HTTPServer(("0.0.0.0", ALICE_PORT), AliceHandler)
    print(f"[ALICE] Servidor iniciado na porta {ALICE_PORT}")
    server.serve_forever()
