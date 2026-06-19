# Tutorial: Ataque MitM com Cifra de Vigenère em Docker
### Disciplina: ADS — Segurança da Informação / Criptografia

---

## 📋 Visão Geral

Este laboratório simula um **ataque Man-in-the-Middle (MitM)** em um canal de comunicação protegido pela **Cifra de Vigenère** (cifra polialfabética).

```
  [ALICE] ──cifrado──► [BROKER/CANAL] ──intercepta──► [ATACANTE]
                              │                              │
                              │◄────── injeta decifrado ────┘
                              │
                            [BOB] ──responde "SIM" ou "NÃO"──►
```

### Participantes
| Container | Papel | Porta |
|-----------|-------|-------|
| `broker`  | Canal de comunicação inseguro | 5000 |
| `alice`   | Envia mensagem cifrada        | 8001 |
| `bob`     | Recebe e valida mensagens     | 8002 |
| `attacker`| Intercepta e quebra a cifra   | —    |

---

## 🧠 Teoria: Cifra de Vigenère

A Cifra de Vigenère é uma **cifra polialfabética** que usa uma palavra-chave para criptografar o texto:

### Cifragem
```
Texto:  O  L  A  B  O  B
Chave:  S  E  C  R  E  T  (repete)
        ↓  ↓  ↓  ↓  ↓  ↓
Cifra:  G  P  C  S  S  U

Fórmula: C[i] = (P[i] + K[i]) mod 26
```

### Decifragem
```
Fórmula: P[i] = (C[i] - K[i] + 26) mod 26
```

### Por que ela é quebrável?
A Vigenère repete a chave periodicamente. Isso cria **padrões estatísticos** exploráveis:

1. **Índice de Coincidência (IC)** — detecta o tamanho da chave
2. **Análise de Frequência** — identifica cada letra da chave

---

## 📁 Estrutura do Projeto

```
crypto-lab/
├── docker-compose.yml
├── shared/
│   └── vigenere.py       ← Implementação da cifra + ataque
├── alice/
│   ├── Dockerfile
│   └── alice.py          ← Envia mensagem cifrada ao broker
├── bob/
│   ├── Dockerfile
│   └── bob.py            ← Recebe, decifra e responde
├── attacker/
│   ├── Dockerfile
│   └── attacker.py       ← Intercepta e quebra a cifra
└── broker/
    ├── Dockerfile
    └── broker.py         ← Canal HTTP inseguro central
```

---

## 🚀 Passo a Passo

### Pré-requisitos

Instale o Docker Desktop (Windows/Mac) ou Docker Engine (Linux):
- https://docs.docker.com/get-docker/

Verifique a instalação:
```bash
docker --version
docker compose version
```

---

### Passo 1 — Baixar / criar os arquivos

Copie a estrutura de arquivos acima para uma pasta chamada `crypto-lab/` na sua máquina.

---

### Passo 2 — Construir e subir os containers

Abra o terminal na pasta `crypto-lab/` e execute:

```bash
docker compose up --build
```

O Docker vai:
1. Construir as 4 imagens (broker, alice, bob, attacker)
2. Criar a rede `canal_inseguro`
3. Iniciar todos os containers em ordem

---

### Passo 3 — Observar os logs em tempo real

Os logs de todos os containers aparecem juntos. Para ver separado por container:

```bash
# Em terminais diferentes:
docker logs -f alice
docker logs -f bob
docker logs -f attacker
docker logs -f broker
```

---

### Passo 4 — Entender o fluxo

**Sequência de eventos:**

```
1. [BROKER] inicia e fica aguardando

2. [ALICE]  criptografa "OLA BOB COMO VOCE ESTA HOJE"
            com chave "SECRETO" → produz texto cifrado
            envia para o broker

3. [ATACANTE] monitora o broker, detecta a mensagem cifrada
              aplica análise de IC + frequência
              descobre a chave aproximada
              decifra o texto
              injeta o texto decifrado de volta no broker

4. [BOB]    recebe a mensagem (agora decifrada pelo atacante)
            tenta decifrar com sua chave correta "SECRETO"
            se a mensagem fizer sentido → responde "SIM"
            caso contrário → responde "NÃO ENTENDI"

5. [ATACANTE] lê a resposta de Bob
              se "SIM" → ataque bem-sucedido!
              se não   → tenta novamente com outra chave
```

---

### Passo 5 — Verificar resultado esperado nos logs

```
[ALICE]    Mensagem original  : OLA BOB COMO VOCE ESTA HOJE
[ALICE]    Chave secreta      : SECRETO
[ALICE]    Mensagem cifrada   : GPC...
[ALICE]    Enviando para o broker...

[ATACANTE] Mensagem interceptada: GPC...
[ATACANTE] Tamanho de chave estimado: 7
[ATACANTE] Chave descoberta: SECRETO
[ATACANTE] Texto decifrado  : OLA BOB COMO VOCE ESTA HOJE

[BOB]      Mensagem recebida: OLA BOB COMO VOCE ESTA HOJE
[BOB]      ✅ Mensagem compreendida! Respondendo: SIM

[ATACANTE] Bob respondeu: 'SIM'
[ATACANTE] 🏆 ATAQUE BEM-SUCEDIDO!
```

---

## 🔬 Explorando o Código

### Como funciona o ataque — `shared/vigenere.py`

#### 1. Índice de Coincidência
```python
def index_of_coincidence(text):
    # IC alto (~0.065) = texto em linguagem natural ou cifra monoalfabética
    # IC baixo (~0.038) = cifra polialfabética bem distribuída
    # Testamos grupos de 1 a N caracteres para encontrar o tamanho da chave
```

#### 2. Análise de Frequência por Grupo
```python
def frequency_attack_single(grupo):
    # Cada posição da chave cifra um subconjunto de letras
    # Esses subconjuntos seguem distribuição de frequência do idioma
    # O caractere mais frequente provavelmente corresponde a 'E'
```

#### 3. Ataque Completo
```python
def crack_vigenere(ciphertext):
    tamanho = kasiski_key_length(ciphertext)   # passo 1
    chave   = frequency_attack_single(grupos)   # passo 2
    return chave, vigenere_decrypt(ciphertext, chave)
```

---

## 🛠️ Personalizando o Experimento

### Mudar a mensagem de Alice
Edite `alice/alice.py`:
```python
MESSAGE = "SUA NOVA MENSAGEM AQUI"
```

### Mudar a chave secreta
Edite `alice/alice.py` e `bob/bob.py`:
```python
SECRET_KEY = "MINHASENHA"
```
⚠️ Quanto maior a chave, mais difícil é o ataque por frequência.

### Testar a cifra manualmente
```python
from shared.vigenere import vigenere_encrypt, vigenere_decrypt, crack_vigenere

cifrado = vigenere_encrypt("OLA MUNDO", "CHAVE")
print(cifrado)

original = vigenere_decrypt(cifrado, "CHAVE")
print(original)

chave, texto = crack_vigenere(cifrado)
print(f"Chave descoberta: {chave}, Texto: {texto}")
```

---

## 🧹 Encerrando o laboratório

```bash
# Para todos os containers
docker compose down

# Remove também as imagens criadas
docker compose down --rmi all
```

---

## 📝 O que entregar no trabalho

1. **Capturas de tela** dos logs mostrando:
   - Alice cifrando e enviando a mensagem
   - Atacante interceptando e aplicando criptanálise
   - Bob respondendo "SIM"

2. **Explicação teórica** dos conceitos usados:
   - Cifra de Vigenère (cifragem/decifragem)
   - Índice de Coincidência
   - Análise de Frequência
   - Ataque Man-in-the-Middle

3. **Análise de segurança**: Por que a Vigenère é vulnerável? O que tornaria esse sistema mais seguro?

---

## 🔐 Conceitos para o Relatório

| Conceito | Descrição |
|----------|-----------|
| Cifra polialfabética | Usa múltiplos alfabetos de substituição conforme a posição |
| Chave periódica | A chave se repete, criando padrões exploráveis |
| Índice de Coincidência | Mede a uniformidade da distribuição de letras |
| Análise de Kasiski | Identifica repetições para estimar tamanho da chave |
| MitM | Atacante intercepta e manipula comunicação sem que Alice e Bob saibam |

---

*Tutorial desenvolvido para fins acadêmicos — ADS / Segurança da Informação*
