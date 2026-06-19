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
from vigenere import crack_vigenere, vigenere_decrypt

BROKER_URL = "http://broker:5000"
MAX_ATTEMPTS = 5


def run_attack():
    time.sleep(4)
    print("\n" + "🔴" * 25)
    print("[ATACANTE] ⚡ Iniciando ataque Man-in-the-Middle!")
    print("🔴" * 25 + "\n")

    last_attempt = 0

    for round_num in range(1, MAX_ATTEMPTS + 1):
        # Aguarda nova mensagem no broker
        print(f"[ATACANTE] 👂 Monitorando canal... (rodada {round_num})")
        ciphertext = None

        for _ in range(20):
            try:
                resp = requests.get(f"{BROKER_URL}/message", timeout=5)
                data = resp.json()
                if data.get("ciphertext") and data.get("attempt", 0) != last_attempt:
                    ciphertext = data["ciphertext"]
                    last_attempt = data["attempt"]
                    break
            except Exception:
                pass
            time.sleep(1)

        if not ciphertext:
            print("[ATACANTE] Nenhuma mensagem interceptada. Encerrando.")
            break

        print(f"\n[ATACANTE] 🎯 Mensagem interceptada: {ciphertext}")
        print("[ATACANTE] Tentando quebrar a cifra de Vigenère...\n")

        # Ataque criptanalítico
        discovered_key, decrypted_text = crack_vigenere(ciphertext, max_key_len=10)

        print(f"[ATACANTE] 🔑 Chave descoberta : {discovered_key}")
        print(f"[ATACANTE] 📄 Texto decifrado  : {decrypted_text}")
        print(f"[ATACANTE] 📤 Enviando texto decifrado para Bob via broker...")

        # O atacante injeta o texto decifrado no canal (para Bob verificar)
        try:
            requests.post(f"{BROKER_URL}/inject", json={
                "ciphertext": decrypted_text,  # envia o texto "decifrado" como se fosse a mensagem
                "attempt": last_attempt,
                "note": f"Injetado pelo atacante (rodada {round_num}) - chave tentativa: {discovered_key}"
            }, timeout=5)
        except Exception as e:
            print(f"[ATACANTE] Erro ao injetar: {e}")

        # Aguarda resposta de Bob
        print("[ATACANTE] ⏳ Aguardando resposta de Bob...")
        time.sleep(5)

        try:
            resp = requests.get(f"{BROKER_URL}/reply", timeout=5)
            bob_reply = resp.json().get("reply", "")
            print(f"[ATACANTE] 📬 Bob respondeu: '{bob_reply}'")

            if bob_reply.strip().upper() == "SIM":
                print("\n" + "✅" * 20)
                print(f"[ATACANTE] 🏆 ATAQUE BEM-SUCEDIDO na rodada {round_num}!")
                print(f"[ATACANTE] Chave real descoberta: {discovered_key}")
                print(f"[ATACANTE] Mensagem original   : {decrypted_text}")
                print("✅" * 20 + "\n")
                break
            else:
                print(f"[ATACANTE] ❌ Bob não confirmou. Tentando chave diferente...\n")
                # Limpa a resposta para próxima rodada
                requests.delete(f"{BROKER_URL}/reply", timeout=5)
        except Exception as e:
            print(f"[ATACANTE] Erro ao verificar resposta: {e}")

        time.sleep(2)

    print("[ATACANTE] Ataque encerrado.")


if __name__ == "__main__":
    run_attack()
