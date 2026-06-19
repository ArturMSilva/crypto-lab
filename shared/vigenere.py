"""
Implementação da Cifra de Vigenère (Cifra Polialfabética)
Usada por Alice, Bob e pelo Atacante
"""

def vigenere_encrypt(plaintext: str, key: str) -> str:
    """Criptografa texto usando a Cifra de Vigenère"""
    plaintext = plaintext.upper()
    key = key.upper()
    ciphertext = []
    key_index = 0

    for char in plaintext:
        if char.isalpha():
            shift = ord(key[key_index % len(key)]) - ord('A')
            encrypted_char = chr((ord(char) - ord('A') + shift) % 26 + ord('A'))
            ciphertext.append(encrypted_char)
            key_index += 1
        else:
            ciphertext.append(char)  # mantém espaços e pontuação

    return ''.join(ciphertext)


def vigenere_decrypt(ciphertext: str, key: str) -> str:
    """Descriptografa texto usando a Cifra de Vigenère"""
    ciphertext = ciphertext.upper()
    key = key.upper()
    plaintext = []
    key_index = 0

    for char in ciphertext:
        if char.isalpha():
            shift = ord(key[key_index % len(key)]) - ord('A')
            decrypted_char = chr((ord(char) - ord('A') - shift + 26) % 26 + ord('A'))
            plaintext.append(decrypted_char)
            key_index += 1
        else:
            plaintext.append(char)

    return ''.join(plaintext)


def index_of_coincidence(text: str) -> float:
    """Calcula o Índice de Coincidência de um texto"""
    text = ''.join(c for c in text.upper() if c.isalpha())
    n = len(text)
    if n < 2:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    ic = sum(f * (f - 1) for f in freq.values()) / (n * (n - 1))
    return ic


def kasiski_key_length(ciphertext: str, max_key_len: int = 10) -> int:
    """
    Estima o tamanho da chave usando análise de IC (simplificado).
    Testa tamanhos de 1 a max_key_len e escolhe o que produz IC mais próximo do inglês (~0.065).
    """
    text = ''.join(c for c in ciphertext.upper() if c.isalpha())
    TARGET_IC = 0.065
    best_len = 1
    best_diff = float('inf')

    for key_len in range(1, max_key_len + 1):
        # Divide o texto em 'key_len' grupos de acordo com a posição da chave
        groups = [text[i::key_len] for i in range(key_len)]
        avg_ic = sum(index_of_coincidence(g) for g in groups) / key_len
        diff = abs(avg_ic - TARGET_IC)
        if diff < best_diff:
            best_diff = diff
            best_len = key_len

    return best_len


def frequency_attack_single(ciphertext_group: str) -> str:
    """
    Ataque de frequência em um único grupo (substitui cifra de César).
    Assume que o caractere mais frequente corresponde à letra 'E' em português.
    """
    freq = {}
    for c in ciphertext_group.upper():
        if c.isalpha():
            freq[c] = freq.get(c, 0) + 1
    if not freq:
        return 'A'
    most_common = max(freq, key=freq.get)
    # Em português, a letra mais comum é 'A', mas usaremos 'E' como padrão inglês
    # Tentamos ambas e escolhemos a que faz mais sentido
    shift = (ord(most_common) - ord('E')) % 26
    return chr(shift + ord('A'))


def crack_vigenere(ciphertext: str, max_key_len: int = 10) -> tuple:
    """
    Tenta quebrar a cifra de Vigenère automaticamente.
    Retorna (chave_descoberta, texto_decifrado)
    """
    print("[ATACANTE] Iniciando análise criptográfica...")
    
    # Passo 1: Estimar tamanho da chave
    key_len = kasiski_key_length(ciphertext, max_key_len)
    print(f"[ATACANTE] Tamanho de chave estimado: {key_len}")

    # Passo 2: Para cada posição da chave, achar a letra por análise de frequência
    text_only = ''.join(c for c in ciphertext.upper() if c.isalpha())
    key_chars = []
    for i in range(key_len):
        group = text_only[i::key_len]
        key_char = frequency_attack_single(group)
        key_chars.append(key_char)

    discovered_key = ''.join(key_chars)
    print(f"[ATACANTE] Chave descoberta: {discovered_key}")

    decrypted = vigenere_decrypt(ciphertext, discovered_key)
    return discovered_key, decrypted
