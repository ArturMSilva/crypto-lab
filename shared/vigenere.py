"""
Implementação da Cifra de Vigenère (Cifra Polialfabética)
Usada por Alice, Bob e pelo Atacante
"""

def cifrar_vigenere(texto_claro: str, chave: str) -> str:
    """Criptografa texto usando a Cifra de Vigenère"""
    texto_claro = texto_claro.upper()
    chave = chave.upper()
    texto_cifrado = []
    indice_chave = 0

    for caractere in texto_claro:
        if caractere.isalpha():
            deslocamento = ord(chave[indice_chave % len(chave)]) - ord('A')
            caractere_cifrado = chr((ord(caractere) - ord('A') + deslocamento) % 26 + ord('A'))
            texto_cifrado.append(caractere_cifrado)
            indice_chave += 1
        else:
            texto_cifrado.append(caractere)  # mantém espaços e pontuação

    return ''.join(texto_cifrado)


def decifrar_vigenere(texto_cifrado: str, chave: str) -> str:
    """Descriptografa texto usando a Cifra de Vigenère"""
    texto_cifrado = texto_cifrado.upper()
    chave = chave.upper()
    texto_claro = []
    indice_chave = 0

    for caractere in texto_cifrado:
        if caractere.isalpha():
            deslocamento = ord(chave[indice_chave % len(chave)]) - ord('A')
            caractere_decifrado = chr((ord(caractere) - ord('A') - deslocamento + 26) % 26 + ord('A'))
            texto_claro.append(caractere_decifrado)
            indice_chave += 1
        else:
            texto_claro.append(caractere)

    return ''.join(texto_claro)


def indice_de_coincidencia(texto: str) -> float:
    """Calcula o Índice de Coincidência de um texto"""
    texto = ''.join(c for c in texto.upper() if c.isalpha())
    n = len(texto)
    if n < 2:
        return 0.0
    freq = {}
    for c in texto:
        freq[c] = freq.get(c, 0) + 1
    ic = sum(f * (f - 1) for f in freq.values()) / (n * (n - 1))
    return ic


# Frequência relativa das letras no idioma português (em %), sem acentos.
# Usada como "impressão digital" do idioma no ataque de frequência.
FREQ_PT = {
    'A': 14.63, 'B': 1.04, 'C': 3.88, 'D': 4.99, 'E': 12.57, 'F': 1.02,
    'G': 1.30, 'H': 1.28, 'I': 6.18, 'J': 0.40, 'K': 0.02, 'L': 2.78,
    'M': 4.74, 'N': 5.05, 'O': 10.73, 'P': 2.52, 'Q': 1.20, 'R': 6.53,
    'S': 7.81, 'T': 4.34, 'U': 4.63, 'V': 1.67, 'W': 0.01, 'X': 0.21,
    'Y': 0.01, 'Z': 0.47,
}

# IC esperado para texto monoalfabético em português (~0.072-0.078).
IC_PT = 0.072


def tamanho_chave_kasiski(texto_cifrado: str, tam_max_chave: int = 10) -> int:
    """
    Estima o tamanho da chave usando o Índice de Coincidência.

    Para cada tamanho candidato, o texto é dividido em grupos (um por posição
    da chave). Se o tamanho estiver correto, cada grupo é uma cifra de César de
    texto em português e seu IC fica próximo de IC_PT (~0.072). Tamanhos errados
    embaralham as letras e produzem IC baixo (~0.038, texto aleatório).

    Escolhemos o MENOR tamanho cujo IC médio já indica idioma natural, evitando
    selecionar um múltiplo do tamanho real (que também teria IC alto).
    """
    texto = ''.join(c for c in texto_cifrado.upper() if c.isalpha())
    LIMIAR = 0.060  # acima disso, consideramos "linguagem natural"

    melhor_tam, melhor_ic = 1, -1.0
    for tam_chave in range(1, tam_max_chave + 1):
        grupos = [texto[i::tam_chave] for i in range(tam_chave)]
        ic_medio = sum(indice_de_coincidencia(g) for g in grupos) / tam_chave
        if ic_medio >= LIMIAR:
            return tam_chave  # menor tamanho que já parece idioma natural
        if ic_medio > melhor_ic:
            melhor_ic, melhor_tam = ic_medio, tam_chave

    return melhor_tam  # nenhum cruzou o limiar; devolve o de maior IC


def ataque_frequencia_grupo(grupo_cifrado: str) -> str:
    """
    Quebra uma cifra de César (um grupo da Vigenère) por análise de frequência.

    Testa os 26 deslocamentos possíveis. Para cada um, decifra o grupo e mede,
    via qui-quadrado, o quanto a distribuição de letras resultante se parece com
    a do português (FREQ_PT). O deslocamento com menor qui-quadrado revela a
    letra da chave naquela posição.
    """
    grupo = [c for c in grupo_cifrado.upper() if c.isalpha()]
    n = len(grupo)
    if n == 0:
        return 'A'

    melhor_deslocamento, melhor_qui = 0, float('inf')
    for deslocamento in range(26):
        # Conta as letras do grupo decifrado com este deslocamento
        contagens = {}
        for c in grupo:
            d = chr((ord(c) - ord('A') - deslocamento + 26) % 26 + ord('A'))
            contagens[d] = contagens.get(d, 0) + 1

        # Qui-quadrado contra a frequência esperada do português
        qui = 0.0
        for letra, pct in FREQ_PT.items():
            esperado = pct / 100.0 * n
            observado = contagens.get(letra, 0)
            qui += (observado - esperado) ** 2 / esperado

        if qui < melhor_qui:
            melhor_qui, melhor_deslocamento = qui, deslocamento

    # A letra da chave é o próprio deslocamento (A=0, B=1, ...)
    return chr(melhor_deslocamento + ord('A'))


def quebrar_vigenere(texto_cifrado: str, tam_max_chave: int = 10) -> tuple:
    """
    Tenta quebrar a cifra de Vigenère automaticamente.
    Retorna (chave_descoberta, texto_decifrado)
    """
    print("[ATACANTE] Iniciando análise criptográfica...")

    # Passo 1: Estimar tamanho da chave
    tam_chave = tamanho_chave_kasiski(texto_cifrado, tam_max_chave)
    print(f"[ATACANTE] Tamanho de chave estimado: {tam_chave}")

    # Passo 2: Para cada posição da chave, achar a letra por análise de frequência
    apenas_texto = ''.join(c for c in texto_cifrado.upper() if c.isalpha())
    letras_chave = []
    for i in range(tam_chave):
        grupo = apenas_texto[i::tam_chave]
        letra_chave = ataque_frequencia_grupo(grupo)
        letras_chave.append(letra_chave)

    chave_descoberta = ''.join(letras_chave)
    print(f"[ATACANTE] Chave descoberta: {chave_descoberta}")

    decifrado = decifrar_vigenere(texto_cifrado, chave_descoberta)
    return chave_descoberta, decifrado
