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


# Frequência relativa das letras no idioma português (em %), sem acentos.
# Usada como "impressão digital" do idioma no ataque de frequência.
PT_FREQ = {
    'A': 14.63, 'B': 1.04, 'C': 3.88, 'D': 4.99, 'E': 12.57, 'F': 1.02,
    'G': 1.30, 'H': 1.28, 'I': 6.18, 'J': 0.40, 'K': 0.02, 'L': 2.78,
    'M': 4.74, 'N': 5.05, 'O': 10.73, 'P': 2.52, 'Q': 1.20, 'R': 6.53,
    'S': 7.81, 'T': 4.34, 'U': 4.63, 'V': 1.67, 'W': 0.01, 'X': 0.21,
    'Y': 0.01, 'Z': 0.47,
}

# IC esperado para texto monoalfabético em português (~0.072-0.078).
PT_IC = 0.072


def kasiski_key_length(ciphertext: str, max_key_len: int = 10) -> int:
    """
    Estima o tamanho da chave usando o Índice de Coincidência.

    Para cada tamanho candidato, o texto é dividido em grupos (um por posição
    da chave). Se o tamanho estiver correto, cada grupo é uma cifra de César de
    texto em português e seu IC fica próximo de PT_IC (~0.072). Tamanhos errados
    embaralham as letras e produzem IC baixo (~0.038, texto aleatório).

    Escolhemos o MENOR tamanho cujo IC médio já indica idioma natural, evitando
    selecionar um múltiplo do tamanho real (que também teria IC alto).
    """
    text = ''.join(c for c in ciphertext.upper() if c.isalpha())
    THRESHOLD = 0.060  # acima disso, consideramos "linguagem natural"

    best_len, best_ic = 1, -1.0
    for key_len in range(1, max_key_len + 1):
        groups = [text[i::key_len] for i in range(key_len)]
        avg_ic = sum(index_of_coincidence(g) for g in groups) / key_len
        if avg_ic >= THRESHOLD:
            return key_len  # menor tamanho que já parece idioma natural
        if avg_ic > best_ic:
            best_ic, best_len = avg_ic, key_len

    return best_len  # nenhum cruzou o limiar; devolve o de maior IC


def frequency_attack_single(ciphertext_group: str) -> str:
    """
    Quebra uma cifra de César (um grupo da Vigenère) por análise de frequência.

    Testa os 26 deslocamentos possíveis. Para cada um, decifra o grupo e mede,
    via qui-quadrado, o quanto a distribuição de letras resultante se parece com
    a do português (PT_FREQ). O deslocamento com menor qui-quadrado revela a
    letra da chave naquela posição.
    """
    group = [c for c in ciphertext_group.upper() if c.isalpha()]
    n = len(group)
    if n == 0:
        return 'A'

    best_shift, best_chi = 0, float('inf')
    for shift in range(26):
        # Conta as letras do grupo decifrado com este deslocamento
        counts = {}
        for c in group:
            d = chr((ord(c) - ord('A') - shift + 26) % 26 + ord('A'))
            counts[d] = counts.get(d, 0) + 1

        # Qui-quadrado contra a frequência esperada do português
        chi = 0.0
        for letter, pct in PT_FREQ.items():
            expected = pct / 100.0 * n
            observed = counts.get(letter, 0)
            chi += (observed - expected) ** 2 / expected

        if chi < best_chi:
            best_chi, best_shift = chi, shift

    # A letra da chave é o próprio deslocamento (A=0, B=1, ...)
    return chr(best_shift + ord('A'))


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
