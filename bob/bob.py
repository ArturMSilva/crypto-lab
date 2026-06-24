"""
BOB - Receptor de mensagens
Recebe mensagens do broker, descriptografa com a chave correta e responde "SIM" se entendeu
"""
import sys
import time
import requests
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, '/app/shared')
from vigenere import vigenere_decrypt

# Configurações
SECRET_KEY = "SECRETO"          # Chave compartilhada com Alice
BROKER_URL = "http://broker:5000"
BOB_PORT = 8002

# O que Bob espera receber (para validação) - deve ser identico ao de Alice
EXPECTED_MESSAGE = (
    "OLA BOB ESTA E UMA MENSAGEM SECRETA ENVIADA POR ALICE ATRAVES DO CANAL "
    "INSEGURO ESPERO QUE NINGUEM CONSIGA LER NOSSA CONVERSA POIS ESTAMOS USANDO "
    "A CIFRA DE VIGENERE COM UMA CHAVE COMPARTILHADA APENAS ENTRE NOS DOIS SE "
    "VOCE CONSEGUIR DECIFRAR ESTA MENSAGEM CORRETAMENTE RESPONDA COM SIM PARA "
    "CONFIRMAR QUE A NOSSA COMUNICACAO SEGURA ESTA FUNCIONANDO PERFEITAMENTE BEM"
)


class BobHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "Bob online"}).encode())


def listen_for_messages():
    """Bob fica ouvindo o broker por novas mensagens"""
    time.sleep(3)
    print("[BOB] Aguardando mensagens no broker...")
    last_attempt = 0

    while True:
        try:
            resp = requests.get(f"{BROKER_URL}/message", timeout=5)
            data = resp.json()

            if data.get("ciphertext") and data.get("attempt", 0) != last_attempt:
                attempt = data["attempt"]
                last_attempt = attempt
                received_text = data["ciphertext"]

                print("\n" + "=" * 50)
                print(f"[BOB] 📨 Mensagem recebida (tentativa {attempt}): {received_text}")

                # Bob descriptografa com a chave correta
                decrypted = vigenere_decrypt(received_text, SECRET_KEY)
                print(f"[BOB] 🔓 Descriptografado com chave '{SECRET_KEY}': {decrypted}")

                # Verifica se faz sentido
                if decrypted.strip() == EXPECTED_MESSAGE:
                    reply = "SIM"
                    print(f"[BOB] ✅ Mensagem compreendida! Respondendo: '{reply}'")
                else:
                    reply = "NAO ENTENDI"
                    print(f"[BOB] ❌ Mensagem não faz sentido. Respondendo: '{reply}'")

                # Envia resposta ao broker
                requests.post(f"{BROKER_URL}/reply", json={"reply": reply}, timeout=5)
                print("=" * 50)

                if reply == "SIM":
                    print("\n[BOB] 🎉 Comunicação bem-sucedida! Encerrando...")
                    break

        except Exception as e:
            pass

        time.sleep(2)


if __name__ == "__main__":
    t = threading.Thread(target=listen_for_messages, daemon=True)
    t.start()

    server = HTTPServer(("0.0.0.0", BOB_PORT), BobHandler)
    print(f"[BOB] Servidor iniciado na porta {BOB_PORT}")
    server.serve_forever()
