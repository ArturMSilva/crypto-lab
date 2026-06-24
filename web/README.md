# Crypto Lab — Interface Web (Vigenère MitM)

Versão visual em **React** do laboratório de ataque Man-in-the-Middle sobre a
Cifra de Vigenère. Foi pensada para rodar em **3 notebooks reais**, cada um
assumindo um personagem (Alice, Bob ou Atacante), todos conectados ao mesmo
**broker** (o "canal inseguro") pela rede local.

```
   Notebook 1            Notebook do broker            Notebook 3
   ┌─────────┐           ┌────────────────┐            ┌──────────┐
   │  ALICE  │ ─HTTP──►  │  broker :5000  │  ◄──HTTP── │ ATACANTE │
   │(browser)│           │ (canal inseguro)│           │(browser) │
   └─────────┘           └────────────────┘            └──────────┘
                                ▲
                          ┌─────────┐   Notebook 2
                          │   BOB   │
                          │(browser)│
                          └─────────┘
```

- A **cifra e o ataque rodam no navegador** (porte JS de `shared/vigenere.py` em
  `src/lib/vigenere.js`).
- O **broker** (`../broker/broker.py`) só repassa mensagens e mantém o log do
  canal — exatamente o papel de um canal inseguro interceptável.

---

## Pré-requisitos

- **Node.js 18+** (testado no 24) em quem for servir a interface.
- **Python 3** na máquina que rodar o broker.
- Os 3 notebooks na **mesma rede local** (Wi-Fi/cabo).

---

## Como rodar (cenário com 3 notebooks)

### 1. Suba o broker (em 1 máquina — pode ser uma das três)

```bash
cd crypto-lab
python3 broker/broker.py
```

Descubra o IP dessa máquina na rede local (ex.: `192.168.0.10`):

```bash
ip addr        # Linux        → procure algo como 192.168.x.x
ipconfig       # Windows
```

> Garanta que a porta **5000** está liberada no firewall.

### 2. Sirva a interface web

Em **uma** máquina (a mesma do broker serve), rode o servidor de
desenvolvimento — o `--host` já vem ligado no `vite.config.js`:

```bash
cd crypto-lab/web
npm install      # só na primeira vez
npm run dev      # serve em http://<ip>:5173
```

> Alternativa para "produção": `npm run build && npm run preview` (porta 4173).

### 3. Em cada notebook, abra o navegador

1. Acesse `http://<ip-de-quem-serve-a-web>:5173`.
2. No campo **"Endereço do broker"**, coloque `http://<ip-do-broker>:5000`
   (o indicador fica verde quando conecta). Fica salvo no navegador.
3. Escolha o papel daquele notebook: **Alice**, **Bob** ou **Atacante**.

Pronto — os três compartilham o mesmo canal.

### Rodando tudo em 1 só máquina (para testar)

Abra três abas em `http://localhost:5173`, deixe o broker como
`http://localhost:5000` e escolha um papel em cada aba.

---

## Roteiro da demonstração

1. **Alice** escreve a mensagem e a chave (`SECRETO`), clica em *Cifrar e enviar*.
   A tela mostra a correspondência texto → chave → cifra.
2. **Atacante** vê a mensagem cifrada aparecer e, automaticamente:
   - mostra o **Índice de Coincidência por tamanho de chave** (gráfico) →
     estima o tamanho;
   - mostra a **análise de qui-quadrado por posição** → revela cada letra da
     chave;
   - exibe a **chave descoberta** e o **texto decifrado** — sem nunca ter
     recebido a chave.
3. **Bob** recebe a cifra, decifra com `SECRETO` e responde **SIM**.
4. (Opcional, MitM ativo) O atacante injeta um texto manipulado no canal e a
   turma observa Bob reagir à mensagem adulterada.

O painel lateral **"Canal inseguro (log)"** mostra, em todas as telas, tudo o
que trafega — reforçando que o canal não tem confidencialidade.

---

## O que observar / discutir

- A Vigenère cai porque a **chave é periódica**: o IC denuncia o tamanho e a
  análise de frequência denuncia cada letra.
- Quanto **maior a chave** (e menor o texto), mais difícil o ataque — teste
  mudando a chave na tela da Alice.
- Mitigações: chave do tamanho da mensagem (one-time pad), cifras modernas
  (AES) e um canal **autenticado e cifrado** (TLS), que impediria o MitM.
