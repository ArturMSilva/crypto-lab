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
from vigenere import cifrar_vigenere

# Configurações
CHAVE_SECRETA = "SECRETO"          # Chave compartilhada com Bob (o atacante não sabe)
URL_BROKER = "http://broker:5000"  # Broker central (simulando canal inseguro)
PORTA_ALICE = 8001

# Mensagem que Alice quer enviar a Bob.
# Texto longo (e sem acentos) de proposito: quanto mais texto cifrado, mais
# facil para o atacante recuperar a chave por analise de frequencia.
MENSAGEM = (
    "OLA BOB ESTA E UMA MENSAGEM SECRETA ENVIADA POR ALICE ATRAVES DO CANAL "
    "INSEGURO ESPERO QUE NINGUEM CONSIGA LER NOSSA CONVERSA POIS ESTAMOS USANDO "
    "A CIFRA DE VIGENERE COM UMA CHAVE COMPARTILHADA APENAS ENTRE NOS DOIS SE "
    "VOCE CONSEGUIR DECIFRAR ESTA MENSAGEM CORRETAMENTE RESPONDA COM SIM PARA "
    "CONFIRMAR QUE A NOSSA COMUNICACAO SEGURA ESTA FUNCIONANDO PERFEITAMENTE BEM"
)


class ManipuladorAlice(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silencia logs padrão

    def do_GET(self):
        if self.path == "/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "Alice online", "key": CHAVE_SECRETA}).encode())


def enviar_mensagem_cifrada():
    """Alice envia a mensagem criptografada para o broker"""
    time.sleep(2)  # aguarda o broker subir
    cifrado = cifrar_vigenere(MENSAGEM, CHAVE_SECRETA)

    print("=" * 50)
    print("[ALICE] Mensagem original  :", MENSAGEM)
    print("[ALICE] Chave secreta      :", CHAVE_SECRETA)
    print("[ALICE] Mensagem cifrada   :", cifrado)
    print("[ALICE] Enviando para o broker (canal inseguro)...")
    print("=" * 50)

    tentativa = 1
    while True:
        try:
            resp = requests.post(f"{URL_BROKER}/send", json={
                "from": "alice",
                "to": "bob",
                "ciphertext": cifrado,
                "attempt": tentativa
            }, timeout=5)
            print(f"[ALICE] Mensagem entregue ao broker! (tentativa {tentativa})")
        except Exception as e:
            print(f"[ALICE] Broker indisponível: {e}, tentando novamente em 3s...")
            time.sleep(3)
            continue

        # Aguarda resposta de Bob (via broker)
        time.sleep(3)
        try:
            resp = requests.get(f"{URL_BROKER}/reply", timeout=5)
            dados = resp.json()
            if dados.get("reply"):
                resposta = dados["reply"]
                print(f"\n[ALICE] Bob respondeu: '{resposta}'")
                if resposta.strip().upper() == "SIM":
                    print("[ALICE] ✅ Bob confirmou! A mensagem foi compreendida.")
                    break
                else:
                    print("[ALICE] ⚠️  Bob não entendeu. O atacante tentará novamente...")
                    tentativa += 1
                    # reenvia a mesma mensagem cifrada
                    time.sleep(2)
            else:
                time.sleep(2)
        except Exception as e:
            time.sleep(2)


if __name__ == "__main__":
    # Inicia thread de envio
    t = threading.Thread(target=enviar_mensagem_cifrada, daemon=True)
    t.start()

    # Inicia servidor HTTP simples (para status)
    servidor = HTTPServer(("0.0.0.0", PORTA_ALICE), ManipuladorAlice)
    print(f"[ALICE] Servidor iniciado na porta {PORTA_ALICE}")
    servidor.serve_forever()
