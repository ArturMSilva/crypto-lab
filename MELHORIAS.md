# Revisão e Plano de Melhorias — crypto-lab

> Documento de revisão do laboratório de **Ataque MitM com Cifra de Vigenère em Docker**.
> Status: **somente documentação** — nada foi implementado ainda.

O conceito e a estrutura de pastas correspondem ao `tutorial.md`. Porém há problemas que
impedem o lab de funcionar como o tutorial promete — desde a construção das imagens até o
resultado final do ataque. Abaixo, os achados em ordem de prioridade e um plano de ação.

---

## 🔴 Bloqueadores (o lab não roda / não dá o resultado esperado)

### 1. Os `Dockerfile`s vão falhar no build (`COPY ../shared`)
No `docker-compose.yml`, o `context` é `.` (raiz `crypto-lab/`) e o `dockerfile` é
`alice/Dockerfile`. Os caminhos do `COPY` são relativos ao **contexto de build**, não à pasta
onde está o Dockerfile. Portanto, hoje temos:

```dockerfile
COPY ../shared /app/shared   # ERRO: "forbidden path outside the build context"
COPY alice.py /app/          # ERRO: o arquivo está em alice/alice.py, não na raiz
```

Correção (mantendo o contexto `.`):

```dockerfile
COPY shared /app/shared
COPY alice/alice.py /app/
```

O mesmo vale para `bob`, `attacker` e `broker`.
**Impacto:** sem isso, `docker compose up --build` nem inicia.

### 2. A lógica do MitM é contraditória — Bob nunca responde "SIM"
Fluxo atual:
- Alice cifra e envia para `/message`.
- O atacante quebra a cifra e **injeta o texto decifrado (plaintext)** de volta em `/message`.
- Bob lê `/message` e aplica `vigenere_decrypt` **de novo** com `SECRETO`.

Resultado: mesmo que o ataque fosse perfeito, Bob decifraria um texto que já está em claro →
vira lixo → `"NAO ENTENDI"`. O fluxo, como está, **nunca** produz o "SIM" mostrado no Passo 5
do tutorial. Há também uma **condição de corrida**: Bob e o atacante competem pelo mesmo slot
`/message`, então o que Bob lê depende do timing.

### 3. O ataque criptanalítico não recupera a chave `SECRETO`
- `kasiski_key_length` usa `TARGET_IC = 0.065` (**inglês**); o texto é português (IC ≈ 0,072–0,078).
- A mensagem tem ~22 letras. Dividida em grupos de tamanho 7, cada grupo tem ~3 letras —
  **estatisticamente insuficiente** para IC ou análise de frequência.
- `frequency_attack_single` assume que a letra mais comum é `'E'` (o próprio comentário do
  código diz que em português é `'A'`).

Na prática, `crack_vigenere` devolve chave/texto errados quase sempre. O
"Chave descoberta: SECRETO" do tutorial é otimista demais para essa entrada.

---

## 🟡 Problemas menores / qualidade

- `version: "3.9"` no `docker-compose.yml` está obsoleto (gera warning) — pode ser removido.
- `pip install requests` sem versão fixa e sem `requirements.txt` — build não reprodutível.
- `except Exception: pass` silencioso em `bob.py` e `attacker.py` esconde erros e dificulta a depuração.
- Estado do broker em memória + polling com `sleep` fixos → comportamento sensível a timing (frágil).
- `alice.py` expõe a `SECRET_KEY` em `/status` (didático, mas vale um comentário explicando que é intencional).

---

## ✅ Plano de melhoria

### Etapa 1 — Fazer o lab buildar e rodar (essencial)
1. Corrigir os 4 `Dockerfile`s (`COPY shared /app/shared` + `COPY <serv>/<arquivo>.py /app/`).
2. Adicionar `requirements.txt` com `requests==2.x` e usar `pip install -r requirements.txt`.
3. Remover `version` do `docker-compose.yml`.

### Etapa 2 — Tornar o fluxo MitM coerente (essencial p/ o "SIM")
Escolher um dos modelos coerentes:
- **(a) MitM passivo:** atacante apenas lê e decifra (loga o resultado); Bob continua recebendo
  o ciphertext original e responde "SIM". Mais simples e didaticamente honesto.
- **(b) MitM ativo real:** atacante decifra, **re-cifra** com a chave recuperada e injeta o
  ciphertext; Bob decifra normalmente. Demonstra interceptação + reinjeção de verdade.

Em ambos os casos, separar os canais (ex.: `/to_bob`, `/from_bob`, `/intercept`) para eliminar
a corrida pelo slot `/message`.

### Etapa 3 — Fazer a criptanálise realmente funcionar
1. Trocar o alvo para frequências do **português** (letra mais comum `'A'`; idealmente comparar
   a distribuição completa por χ², não só a letra mais frequente).
2. Usar IC alvo do português (~0,074).
3. Usar um **texto bem mais longo** (várias frases) para o ataque ser estatisticamente viável —
   ou assumir explicitamente no tutorial que é uma demonstração simplificada.

### Etapa 4 — Robustez (opcional)
- Logar exceções em vez de `except: pass`.
- Adicionar healthcheck no broker em vez de `sleep(2/3/4)` fixos.

---

## Recomendação de ordem
Começar por **Etapa 1 + Etapa 2(a)**, que é o mínimo para o lab efetivamente rodar e produzir o
resultado do tutorial. Alternativamente, ajustar o `tutorial.md` para refletir o que o código
realmente faz, caso se prefira manter o código atual.
