"""
ATACANTE (Man-in-the-Middle)
Intercepta mensagens do broker, tenta quebrar a Cifra de Vigenère
e verifica se Bob responde "SIM"
"""
import sys
import time
import requests
import json

sys.path.insert(0, '/app/shared')
from vigenere import quebrar_vigenere, decifrar_vigenere

URL_BROKER = "http://broker:5000"
MAX_TENTATIVAS = 5


def executar_ataque():
    time.sleep(4)
    print("\n" + "🔴" * 25)
    print("[ATACANTE] ⚡ Iniciando ataque Man-in-the-Middle!")
    print("🔴" * 25 + "\n")

    ultima_tentativa = 0

    for num_rodada in range(1, MAX_TENTATIVAS + 1):
        # Aguarda nova mensagem no broker
        print(f"[ATACANTE] 👂 Monitorando canal... (rodada {num_rodada})")
        texto_cifrado = None

        for _ in range(20):
            try:
                resp = requests.get(f"{URL_BROKER}/message", timeout=5)
                dados = resp.json()
                if dados.get("ciphertext") and dados.get("attempt", 0) != ultima_tentativa:
                    texto_cifrado = dados["ciphertext"]
                    ultima_tentativa = dados["attempt"]
                    break
            except Exception:
                pass
            time.sleep(1)

        if not texto_cifrado:
            print("[ATACANTE] Nenhuma mensagem interceptada. Encerrando.")
            break

        print(f"\n[ATACANTE] 🎯 Mensagem interceptada: {texto_cifrado}")
        print("[ATACANTE] Tentando quebrar a cifra de Vigenère...\n")

        # Ataque criptanalítico
        chave_descoberta, texto_decifrado = quebrar_vigenere(texto_cifrado, tam_max_chave=10)

        print(f"[ATACANTE] 🔑 Chave descoberta : {chave_descoberta}")
        print(f"[ATACANTE] 📄 Texto decifrado  : {texto_decifrado}")
        print(f"[ATACANTE] 📤 Enviando texto decifrado para Bob via broker...")

        # O atacante injeta o texto decifrado no canal (para Bob verificar)
        try:
            requests.post(f"{URL_BROKER}/inject", json={
                "ciphertext": texto_decifrado,  # envia o texto "decifrado" como se fosse a mensagem
                "attempt": ultima_tentativa,
                "note": f"Injetado pelo atacante (rodada {num_rodada}) - chave tentativa: {chave_descoberta}"
            }, timeout=5)
        except Exception as e:
            print(f"[ATACANTE] Erro ao injetar: {e}")

        # Aguarda resposta de Bob
        print("[ATACANTE] ⏳ Aguardando resposta de Bob...")
        time.sleep(5)

        try:
            resp = requests.get(f"{URL_BROKER}/reply", timeout=5)
            resposta_bob = resp.json().get("reply", "")
            print(f"[ATACANTE] 📬 Bob respondeu: '{resposta_bob}'")

            if resposta_bob.strip().upper() == "SIM":
                print("\n" + "✅" * 20)
                print(f"[ATACANTE] 🏆 ATAQUE BEM-SUCEDIDO na rodada {num_rodada}!")
                print(f"[ATACANTE] Chave real descoberta: {chave_descoberta}")
                print(f"[ATACANTE] Mensagem original   : {texto_decifrado}")
                print("✅" * 20 + "\n")
                break
            else:
                print(f"[ATACANTE] ❌ Bob não confirmou. Tentando chave diferente...\n")
                # Limpa a resposta para próxima rodada
                requests.delete(f"{URL_BROKER}/reply", timeout=5)
        except Exception as e:
            print(f"[ATACANTE] Erro ao verificar resposta: {e}")

        time.sleep(2)

    print("[ATACANTE] Ataque encerrado.")


if __name__ == "__main__":
    executar_ataque()
