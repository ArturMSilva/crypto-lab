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
from vigenere import decifrar_vigenere

# Configurações
CHAVE_SECRETA = "SECRETO"          # Chave compartilhada com Alice
URL_BROKER = "http://broker:5000"
PORTA_BOB = 8002

# O que Bob espera receber (para validação) - deve ser identico ao de Alice
MENSAGEM_ESPERADA = (
    "OLA BOB ESTA E UMA MENSAGEM SECRETA ENVIADA POR ALICE ATRAVES DO CANAL "
    "INSEGURO ESPERO QUE NINGUEM CONSIGA LER NOSSA CONVERSA POIS ESTAMOS USANDO "
    "A CIFRA DE VIGENERE COM UMA CHAVE COMPARTILHADA APENAS ENTRE NOS DOIS SE "
    "VOCE CONSEGUIR DECIFRAR ESTA MENSAGEM CORRETAMENTE RESPONDA COM SIM PARA "
    "CONFIRMAR QUE A NOSSA COMUNICACAO SEGURA ESTA FUNCIONANDO PERFEITAMENTE BEM"
)


class ManipuladorBob(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "Bob online"}).encode())


def escutar_mensagens():
    """Bob fica ouvindo o broker por novas mensagens"""
    time.sleep(3)
    print("[BOB] Aguardando mensagens no broker...")
    ultima_tentativa = 0

    while True:
        try:
            resp = requests.get(f"{URL_BROKER}/message", timeout=5)
            dados = resp.json()

            if dados.get("ciphertext") and dados.get("attempt", 0) != ultima_tentativa:
                tentativa = dados["attempt"]
                ultima_tentativa = tentativa
                texto_recebido = dados["ciphertext"]

                print("\n" + "=" * 50)
                print(f"[BOB] 📨 Mensagem recebida (tentativa {tentativa}): {texto_recebido}")

                # Bob descriptografa com a chave correta
                decifrado = decifrar_vigenere(texto_recebido, CHAVE_SECRETA)
                print(f"[BOB] 🔓 Descriptografado com chave '{CHAVE_SECRETA}': {decifrado}")

                # Verifica se faz sentido
                if decifrado.strip() == MENSAGEM_ESPERADA:
                    resposta = "SIM"
                    print(f"[BOB] ✅ Mensagem compreendida! Respondendo: '{resposta}'")
                else:
                    resposta = "NAO ENTENDI"
                    print(f"[BOB] ❌ Mensagem não faz sentido. Respondendo: '{resposta}'")

                # Envia resposta ao broker
                requests.post(f"{URL_BROKER}/reply", json={"reply": resposta}, timeout=5)
                print("=" * 50)

                if resposta == "SIM":
                    print("\n[BOB] 🎉 Comunicação bem-sucedida! Encerrando...")
                    break

        except Exception as e:
            pass

        time.sleep(2)


if __name__ == "__main__":
    t = threading.Thread(target=escutar_mensagens, daemon=True)
    t.start()

    servidor = HTTPServer(("0.0.0.0", PORTA_BOB), ManipuladorBob)
    print(f"[BOB] Servidor iniciado na porta {PORTA_BOB}")
    servidor.serve_forever()
