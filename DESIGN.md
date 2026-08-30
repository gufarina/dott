> DESIGN.md do Dott — sistema de design da UI (React + Tauri 2). Documento em
> português com acentos, UTF-8 (conteúdo lido por pessoa). Os tokens citados
> aqui são os REAIS de `src/styles/tokens.css` — nunca inventados; se um
> valor mudar no código, atualize aqui no mesmo commit.

## Baseline Decision

- **Baseline técnica adotada:** DESIGN.md do Cursor (catálogo awesome-design-md).
- **Modo:** ADAPT — fit estimado ~70%.
- **Por quê Cursor e não outro:** disciplina de marca (um único accent, usado
  com escassez), profundidade só por hairline (sem drop shadow), receita de
  pill/caption enxuta e uma escala de raio/espaçamento pequena e coerente. É
  a MESMA disciplina que o Dott precisa — só que o Cursor é editorial
  cream-light e o Dott é dark premium (captura pessoal, tela calma, sem
  ruído). Importamos o ESQUELETO, não a cor.
- **Adaptações (o que mudou do original):**
  1. **Inversão de tema** — canvas/superfície escuros (`--bg`, `--surface`)
     no lugar do cream/branco do Cursor. Ink vira `--fg` claro sobre fundo
     escuro.
  2. **Accent único** — o Cursor usa laranja sólido (`#f54e00`); o Dott usa
     `--dott-gradient`, a BRASA de verdade do widget (`.brasa` em
     `Widget.module.css`), portada pra caixa de botão — não mais o gradiente
     linear achatado que morava aqui antes (revogado 26/08/2026, CEO: "no
     preview não tem o gradiente que usamos no botão"). É o "primo dark" do
     Cursor Orange: mesma família de matiz (vermelho-alaranjado quente),
     mesma regra de escassez.
  3. **Tipografia** — Manrope (`--font-ui`) no lugar de CursorGothic/Inter;
     Merriweather (`--font-reading`) para o corpo de leitura de nota, papel
     que o Cursor não tem (marketing site não lê texto longo do usuário).
     JetBrains Mono continua igual ao Cursor para superfície de código
     (`--font-mono`).
  4. **Escala de raio e espaçamento** — importadas quase 1:1 (ver seções
     Layout e Formas), com uma ressalva: os tokens antigos `--r-xs..--r-3xl`
     do Dott alimentam o **widget/orbe** (fora de escopo desta rodada) e não
     foram redefinidos — os novos `--r-btn`/`--r-card` cobrem a UI do app
     principal sem tocar no widget.
  5. **Peso de título em 700, não 600** — mandato explícito do CEO
     (25/08/2026), pós-aprovação do sistema. A regra do Cursor "display
     nunca 700+" (voz editorial magazine) foi conscientemente derrubada
     aqui: o CEO quer título com mais peso. A elegância se mantém pelo
     **tracking negativo** (`-0.01em` a `-0.02em`), não pelo peso leve —
     pill (600), botão (600), label (600) e corpo continuam INTOCADOS por
     este desvio.
  6. **Receita de pill reduzida (10px, não 11px)** — correção de medição do
     CEO (25/08/2026, com foto do card do Inbox na mão): a receita
     "caption-uppercase" do Cursor (11px) tinha proporção de 81% contra o
     texto de conteúdo do Inbox (13.5px) — pill quase do tamanho da nota,
     "disforme". Reduzida pra 10px/padding 3px 8px/tracking .06em (74% de
     proporção). Ver seção 4, "Pill / Badge", pro princípio e a tabela de
     proporção medida em cada contexto do app.
- **Alternativas rejeitadas:**
  - **Linear** — denso e "produto de trabalho em equipe" demais para uma
    ferramenta de captura pessoal e calma; a densidade de informação do
    Linear brigaria com o princípio de no-friction do Dott.
  - **Vercel** — monocromático e frio; mataria a única marca visual forte
    que o Dott tem (o gradiente chama do orbe) ao reduzir tudo a
    preto/branco/cinza.

## 1. Tema e Atmosfera

O Dott é **dark premium calmo**, não "IDE escuro". A superfície de base é
quase preta com tingimento neutro (`--bg: #0d0d10`), nunca preto puro — o
mesmo princípio do Cursor de "canvas nunca é a cor mais extrema da paleta",
só que invertido (lá é creme, não branco puro; aqui é grafite, não preto
puro). Cards sobem em degraus sutis de superfície (`--surface` →
`--surface2` → `--surface3`), sem nenhuma sombra própria — a profundidade é
100% hairline + contraste de superfície (seção 6). A única cor "quente" da
tela é o gradiente da marca, usado com escassez cirúrgica: botão primário,
badge de contagem, tab ativa. Tudo o mais é neutro.

## 2. Paleta (com papéis)

| Token | Dark | Light | Papel |
|---|---|---|---|
| `--bg` | `#0d0d10` | `#f4f4f7` | Piso da janela (mesa por trás dos cards) |
| `--surface` | `#141417` | `#ffffff` | Card, modal, painel |
| `--surface2` | `#1a1a1e` | `#f0f0f4` | Campo de input, superfície "dentro" de um card |
| `--surface3` | `#222228` | `#e8e8ef` | Hover, chip/pill neutro, contagem |
| `--border` | `#26262c` | `#e0e0ea` | Divisória decorativa (não precisa de piso de contraste) |
| `--border2` | `#2e2e36` | `#d0d0dc` | Borda de card estático |
| `--border-control` | `#63636b` | `#8b8b99` | Borda de input/botão/checkbox — tem que SER VISTA (piso ≥3:1). Calibrado contra `--surface2` |
| `--border-control-3` (TASK-370) | `#717179` | `#7d818e` | MESMO papel de `--border-control`, mas calibrado contra `--surface3` — **SEM CONSUMIDOR desde a TASK-375** (29/08/2026): `.convoBox` (CaptureBox), o único que usava, voltou a `--surface2`/`--border-control`. Token órfão, dívida de remoção registrada na seção "Regra: fundo de controle é PAPEL do token" (não removido aqui — `tokens.css` está com outra frente nesta rodada) |
| `--recess-shadow` (TASK-378, fundo do consumidor mudou na TASK-380) | `rgba(0,0,0,.45)` | `rgba(20,20,35,.14)` | Base da sombra de RECESSO de campo protagonista (`.convoBox`). Nasceu quando o campo sentava no token mais escuro da paleta (`--desk`, TASK-378) — hoje `.convoBox` senta em `--surface` (TASK-380, o "chão próprio" que a rodada anterior tinha dado a `.centralColumn` foi removido). A receita (cor final já com alfa) não depende de qual token está por baixo e continua funcionando, remedida. Ver "CEO reprova o chão próprio" depois da seção "campo protagonista" |
| `--hairline` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)` | Borda "sutil" da baseline Cursor — usada em Modal e superfícies novas |
| `--fg` | `#e8e8ec` | `#18181f` | Texto principal |
| `--fg2` | `#aeaec2` | `#54546a` | Texto secundário |
| `--fg3` | `#8c8ca6` | `#666678` | Texto terciário / metadado / label uppercase |
| `--accent` | `#e05a38` | `#d94428` | Destaque pontual (link, ícone ativo) — NÃO é o CTA (ver `--dott-gradient`) |
| `--accent-s` | `rgba(224,90,56,.12)` | `rgba(217,68,40,.10)` | Fundo de destaque suave (sugestão, foco de input) |
| `--focus` | `#ff8a63` | `#b8341a` | Anel de foco de teclado |
| `--warn` / `--danger` / `--success` | ver tokens.css | ver tokens.css | Semântico — nunca usado como accent de marca |
| **`--dott-gradient`** | dark: núcleo quase-branco + corpo de fogo + ambiente em `screen` sobre `#070103` · light: radial em blend `normal` (TASK-318) | por tema | Reservado a superfície ISOLADA que precisa da brasa cheia parada (hoje: nenhum botão — ver TASK-319). Escasso por definição — ver Do's/Don'ts |
| `--dott-gradient-linear` | `linear-gradient(135deg, oklch(.54 .20 37), oklch(.80 .22 50), oklch(.97 .05 62))` | igual | **Mesmo accent, forma LINHA.** `border-image` (tab ativa), superfície larga demais pro radial |
| `--dott-gradient-soft` | tint 14% das mesmas 3 paradas da forma linha | igual | Reservado a tint pontual pequeno (ex. atrás de ícone) — não é receita de botão |
| **`--dott-gradient-glow`** (novo, TASK-319, 28/08/2026) | radial `at 50% 82%`, alfa caindo pra transparente (mesmas 3 paradas, reordenadas núcleo→transparente) | igual (blend `normal`, funciona nos dois temas sem variante) | **Mesmo accent, forma HOVER.** Consumida por `.hoverGlow` (`reset.css`) — a única forma que anima POSIÇÃO (via `translate`, escrito pelo componente), nunca preenche em repouso. Ver seção 8 |

`--dott-gradient-linear`, `--dott-gradient-soft` e `--dott-gradient-glow`
são **fixos** (não mudam com o tema) — identidade de marca, não decoração
de tela, a mesma regra do Cursor Orange (que também não inverte em modo
escuro). `--dott-gradient` em si passou a variar por tema na TASK-318
(a versão clara não pode usar `screen` sobre fundo escuro — lavaria a cor
pro branco), mas o PAPEL dela na marca continua o mesmo nos dois temas.

**Histórico curto (26/08/2026, 4 rodadas medidas no pixel, não em opinião):**
rodada 1 era um linear chapado (reprovado: "não tem o gradiente que usamos
no botão"); rodada 2 portou a base preta do widget pro botão e prendeu o
núcleo na borda — virou CTA mais escuro que `--surface` com uma faixa
clara cortada pelo raio (o defeito de "nascer do sol" que `.luz1` em
`Widget.module.css` documenta); rodada 3 capou o núcleo pra passar
contraste (4,73:1 medido) mas a amplitude caiu demais — CEO viu ampliado e
reprovou: "sem o gradiente, tá horrível" (tecnicamente havia gradiente,
visualmente não). **Rodada 4 — vigente:** três formas foram testadas
lado a lado (núcleo deslocado / rampa de matiz / brasa embaixo com botão
mais alto) e o CEO escolheu a 3ª: "quero o 3, bem melhor". A receita NÃO
capa mais nada — os tons de pico da bolinha ficam intactos. Quem resolve a
legibilidade do texto é **geometria**, não luz mais fraca: núcleo e corpo
de fogo ficam ancorados bem abaixo da linha de texto, e por isso o botão
primário **subiu de 36px pra 44px** (ver seção Botão). Medido no pixel:
pior ponto sob a faixa do texto **11,0:1** de contraste com `#fff`,
amplitude pico/vale grande — lê como brasa a olho nu, sem ampliar.

## 3. Tipografia

**Duas famílias, dois papéis — nunca misturar:**

- **`--font-ui` (Manrope)** — toda a UI: título, botão, label, navegação,
  pill, input. Papel do CursorGothic/Inter na baseline.
- **`--font-reading` (Merriweather)** — SÓ o corpo de leitura de uma nota
  (`.md-view` em `markdown.css`, o "modo leitura" com texto longo). Papel
  que a baseline não tem (site de marketing não lê prosa do usuário).
- **`--font-mono` (JetBrains Mono)** — igual à baseline: toda superfície de
  código/valor técnico (blocos de código na nota, atalhos de teclado,
  contagem numérica monoespaçada).

### Escala

**Reduzida em 27/08/2026 (TASK-309, ordem do CEO: "diminui o tamanho das
fontes no geral do app").** Degrau uniforme de -10% em cada passo da escala
antiga, feito no TOKEN (`tokens.css`), não arquivo por arquivo — literal
`font-size: Npx` que duplicava um degrau antigo foi convertido pra
`var(--text-*)` correspondente em toda a base não-editor (editor e Widget
ficam de fora por desenho, ver Known Gaps). `--text-3xs` bateu o piso de
10px pra rótulo/etiqueta antes de completar os 10% (11×0,9 = 9,9px) — parado
em 10px (~9,1% de redução nesse degrau, não 10%). Nenhum outro degrau bateu
piso; `--text-base` (corpo/leitura) ficou em 14,5px, acima do piso de 13px
pra leitura corrida. **Lembrete:** a janela principal roda com zoom nativo
de 1.2 (`main.tsx`) — o tamanho REAL que o CEO vê é o valor abaixo × 1,2
(coluna "Tela real").

| Token | Tamanho (token) | Tela real (×1,2) | Peso recomendado | Uso |
|---|---|---|---|---|
| `--text-2xl` | 21,5px | 25,8px | **700** | Título de tela grande (raro) |
| `--text-xl` | 20px | 24px | **700** | Título de seção |
| `--text-lg` | 15,5px | 18,6px | **700** | Título de modal, cabeçalho de painel |
| `--text-base` | 14,5px | 17,4px | 400 | Corpo padrão / leitura de nota (piso 13px, respeitado) |
| `--text-sm` | 12,5px | 15px | 400–600 | Texto de lista, botão |
| `--text-xs` | 11,5px | 13,8px | 400–600 | Metadado, botão secundário |
| `--text-2xs` | 11px | 13,2px | 600 | Label pequeno |
| `--text-3xs` | **10px (piso, parado aqui)** | 12px | 600 | Label pequeno de campo/seção (não é mais o tamanho da pill — ver `--pill-font-size` abaixo) |
| `--pill-font-size` | **10px** (token próprio, não é `--text-3xs`, NÃO tocado nesta rodada) | 12px | 600 | **Toda pill/badge** (ver seção 4, "Pill / Badge") — NÃO sobe pra 700 |

### Princípios (importados da baseline, adaptados)

- **Título em 700 por mandato do CEO (25/08/2026) — desvio consciente da
  baseline Cursor.** O original proíbe bold (700+) porque a voz ali é
  editorial magazine; o CEO aprovou o sistema inteiro e pediu explicitamente
  mais peso nos títulos. A elegância se mantém pelo **tracking negativo**,
  não pelo peso leve. Escopo do desvio — só título de tela/seção/pasta/modal
  e `h1-h4` do modo leitura (Modal `.title`, `.bannerName` da pasta,
  `.titulo` da tarefa, `h1-h4` de `markdown.css`). **Pill (600), botão (600),
  label pequeno (600) e corpo de texto ficam de fora — não sobem.**
- **Tracking negativo sutil em título grande** (`-0.01em` a `-0.02em`) é o
  que segura a elegância com peso 700 — sem ele, título bold largo grita.
  Nunca em texto de corpo.
- **JetBrains Mono em toda superfície de código.**
- **Pill é SEMPRE `--pill-font-size` (11px) / peso 600 / uppercase /
  `--pill-letter-spacing` (+0.08em) / `--pill-line-height` (1.4)** — nunca
  reescrever esses cinco números à mão em um módulo novo, e nunca subir pro
  peso 700 do título (pill é metadado, não título).

## 4. Componentes

### Botão
- **Altura 44px (era 36px, mudou em 26/08/2026 - TASK-306).** Mantida
  mesmo depois da TASK-319 (28/08/2026) tirar a brasa do preenchimento de
  repouso — é o padrão de altura de botão do app agora, não mais amarrada
  à geometria da brasa. Todo botão primário do app (rodapé de modal,
  toolbar da pasta, CTA do estado vazio, primeira tela do onboarding) e o
  secundário/ghost ao lado dele sobem juntos, pra dupla não desalinhar.
  Exceção que NÃO sobe: **Botão de capturar do Quick Capture**
  (`InboxPanel .btnCapture`, 28px) — fica dentro de `.captureAcoes`, a
  faixa mais apertada do hot path de no-friction do produto (ver
  `desktop-frameworks.md`), ao lado de um ícone de 28px. Subir pra 44px
  alongaria essa faixa bem no fluxo que tem que ser o mais enxuto do app.
- **Repouso 100% neutro nos dois (TASK-319, 28/08/2026 — CEO: "o gradiente
  só deve aparecer nos botões com hover, o botão sem hover deve estar
  neutro").** Hierarquia por SOLIDEZ, não por marca:
  - **Primário** — `background: var(--fg)`, `color: var(--bg)` (o par de
    maior contraste do tema, sempre a superfície mais "cheia" da tela —
    inverte com o tema automaticamente), sem borda, `font-weight: 600`.
    Hover: `opacity: .92`. Usado em: criar nota/tarefa/pasta (modais e
    toolbar da pasta), primeira tela do onboarding, capturar (Quick
    Capture). **Desabilitado nunca carrega a marca** — troca pra
    `background: var(--surface3)` / `color: var(--fg3)` (`opacity: 1`).
  - **Secundário / ghost** — fundo `var(--surface2)`, `border: 1px solid
    var(--border2)`, texto `--fg2`; hover: `background: var(--surface3)`,
    texto `--fg`. Acompanha a altura do primário ao lado (44px).
- **A marca vira luz que acende no HOVER e segue o cursor** — classe
  global `hoverGlow` (`reset.css`) + token `--dott-gradient-glow`
  (`tokens.css`). Aplicada em todo botão de ação (primário e secundário
  das fileiras de criação), NUNCA em ghost/descarte (`.ghost` "Cancelar").
  Mecanismo, contrato pro componente e a saída de contraste com a luz em
  movimento: ver "REGRA VIGENTE (28/08/2026, TASK-319)" na seção 8,
  Do's/Don'ts — não duplicado aqui.
- **Raio:** `--r-btn` (8px) — igual ao `rounded.md` do Cursor.

### Input
- Fundo `--surface2`, borda `1px solid var(--border-control)` (o piso de
  contraste de controle, 3:1+), `border-radius: var(--r-btn)` (8px).
- Foco: **anel sutil**, não borda grossa — `border-color: var(--accent)` +
  `box-shadow: 0 0 0 3px var(--accent-s)`. Nunca ícone decorativo dentro do
  campo (o antigo modal "Virar tarefa" tinha um ícone de checkbox solto —
  removido).
- **REGRA: um foco por CONJUNTO, nunca aninhado.** Quando um campo de
  entrada vive dentro de um container que já sinaliza foco (borda +
  box-shadow em `:focus-within`, como acima), o elemento nativo por dentro
  (`<input>`/`<textarea>`) NUNCA pode acender o próprio anel — dois aneis
  quentes um dentro do outro é sempre defeito, nunca reforço. Quem avisa
  foco é o CONJUNTO (o container, via `:focus-within`), um sinal só. Causa
  raiz, medida três vezes no mesmo componente de captura: o
  Chromium/WebView2 aplica `:focus-visible` (`reset.css`, `outline: var(--focus)`)
  em `<textarea>`/`<input>` em QUALQUER clique, não só teclado — e um
  simples `outline: none` na regra base do campo não basta, porque
  `:focus-visible` do reset tem a MESMA especificidade e pode vencer pela
  ordem de carga no bundle. A correção sempre precisa da MESMA
  especificidade a mais: `.seuInput:focus-visible { outline: none; }`.
  Três casos já tropeçaram nisto, sempre em campo de captura/entrada
  rápida:
  - **TASK-308** (27/08/2026) — `.captureInput` (então em
    `InboxPanel.module.css`, hoje o campo mudou de dono — ver TASK-343).
  - **TASK-339** (28/08/2026) — `.addInput` em `TasksPanel.module.css`
    (campo de nova tarefa, mesmo dia da TASK-308).
  - **TASK-347** (28/08/2026) — `.convoInput` em
    `CaptureBox.module.css` (a caixa de captura nova do painel do PARA,
    TASK-343) — a MESMA falha no MESMO dia, num componente recém-criado:
    prova de que a regra não estava escrita em lugar nenhum que se
    consultasse antes de escrever um campo novo. Está escrita agora — todo
    campo novo com container de foco próprio nasce já com
    `:focus-visible { outline: none; }` no elemento nativo por dentro.

### Card
- Fundo `--surface`, borda `1px solid var(--border)` ou `--border2`,
  `border-radius: var(--r-card)` (12px) nas superfícies revisadas nesta
  rodada (Modal); cards mais antigos do app (Inbox, PARA, Folder) continuam
  em `--r-lg` (16px) — ver "Known Gaps" no rodapé desta seção.
- **Zero drop shadow.** Profundidade vem de hairline + contraste de
  superfície (`--surface` sobre `--bg`), nunca de `box-shadow`.

### Pill / Badge

**Princípio (CEO, 25/08/2026, com foto na mão do card do Inbox): pill é
METADADO, tem que sussurrar.** Ela classifica o conteúdo, nunca compete com
ele. Alvo de proporção: **o texto da pill fica em ~65-70% do tamanho do
texto de conteúdo que ela acompanha**, com peso visual claramente menor
(tamanho + padding + tracking somados, não só o `font-size`). A primeira
versão da receita (11px sobre um conteúdo de 13.5px = 81%) violava isso —
a pill do Inbox ficava quase do tamanho da nota, "disforme". Medido e
reduzido nesta rodada.

Receita única (baseline "caption-uppercase", adaptada e REDUZIDA), tokens em
`tokens.css`:
```
font-size: var(--pill-font-size);        /* 10px (era 11px) */
font-weight: var(--pill-font-weight);    /* 600 — nao mudou */
letter-spacing: var(--pill-letter-spacing); /* .06em (era .08em) */
text-transform: uppercase;
line-height: var(--pill-line-height);    /* 1.4 — nao mudou */
padding: var(--pill-padding);            /* 3px 8px (era 4px 10px) */
border-radius: var(--r-full);            /* pill — nao mudou */
display: inline-flex; align-items: center;
```
**Ícone dentro da pill** (`.cardType`, `.captureChip` — o único ícone junto
com o `CardTypeIcon`): reduzido de 10-11px pra **9px**, gap de `4px` pra
`3px`. Decisão: **manter o ícone**, não remover — ele diferencia o tipo por
forma+cor mais rápido que ler a palavra ao escanear a lista, e é a mesma
gramática de ícone usada no resto do app (perder o ícone aqui quebraria a
consistência visual sem resolver o problema real, que era tamanho de
fonte/padding, não a presença do ícone).

Aplicada em: `.cardType`/`.previewTipo` (tipo do card no Inbox), `.estado`
(status da tarefa), `.connMark` (ACHADA/INFERIDA na nota), `.marca`
(idem, na Constelação), `.tarefaGrupo` e `.tarefaPrazo` (metadado de tarefa
na pasta), `.captureChip`/`.captureChipNeutral` (chip de tipo detectado na
captura), e as pills do onboarding (`.ob-badge`, `.ob-tag`, `.s2-card .tag`).
**Exceção documentada:** `.secaoContagem` (contador "3/5" na pasta) mantém
`--font-mono` para legibilidade tabular de números, mas usa o mesmo raio e
padding da receita. `.s4-card .nt` (miniatura de 66×46px no onboarding)
mantém fonte menor que a receita (8px) por não caber a 10px — peso, raio e
tracking seguem a receita mesmo assim.

### Proporção medida por contexto (conferência de 25/08/2026)

| Pill | Texto de conteúdo ao lado | Proporção | Veredito |
|---|---|---|---|
| `.cardType` (Inbox) | `.cardContent` 13.5px | 10/13.5 = **74%** | Alvo — era o caso que o CEO apontou (81% antes) |
| `.tarefaGrupo`/`.tarefaPrazo` (pasta) | `.tarefaTexto` 13.5px | **74%** | Alvo |
| `.ob-tag` (onboarding) | `.ob-ch-head` 14px | **71%** | Alvo |
| `.previewTipo` (modal "processar card") | `.previewTexto` 12.5px | **80%** | Acima do alvo, mas texto secundário de modal (não é o conteúdo protagonista) — aceito, não é "disforme" |
| `.connMark` (nota conectada) | `.connTitle` ~13px | **77%** | Levemente acima, contexto secundário (painel de conexões) — aceito |
| `.marca` (Constelação) | texto do painel ~12px | **83%** | Painel de detalhe secundário, não conteúdo principal — aceito |
| `.ob-badge` (onboarding) | `.ob-note span` 12.5px | **80%** | Nota explicativa secundária do onboarding — aceito |
| `.s2-card .tag` (mockup animado) | texto do mockup 11.5px | **87%** | Ilustração decorativa de 150px, não conteúdo real — aceito |
| `.estado` (Tarefa) | `.titulo` da tarefa 21px/700 | **48%** | Padrão diferente: badge de status ao lado de título grande, não metadado inline — não é o mesmo caso, aceito |

Onde a proporção passou de ~80% em contexto de LEITURA PRIMÁRIA (Inbox,
Pasta), a pill foi a causa raiz corrigida. Nos contextos secundários (modal
de processo, painel de conexão, onboarding) o excesso é menor e o texto ao
lado já é, ele mesmo, secundário — não há "conteúdo protagonista" sendo
ofuscado.

### Modal
Único vocabulário de modal do app (`src/components/Modal.tsx`):
overlay `rgba(6,6,9,.72)` + `backdrop-filter: blur(2px)` → card
`--surface` + `1px solid var(--hairline)` + `border-radius: var(--r-card)`
(12px) + `box-shadow: var(--shadow)`. Superfície flutuante — uma das
exceções à regra de sombra (ver seção 6, lista completa; não é mais "a
única", são sete). Header com título (`--text-lg`/**700**), corpo com
`ModalField`/`ModalInput`, rodapé com `ModalButton` primário (gradiente) +
ghost. Os outros quatro modais do app (Settings, Busca, GlyphPicker, "O que
fazer com este card") não usam este componente ainda (dívida — ver Known
Gaps) mas seguem a mesma regra de sombra por serem a mesma categoria.

### Toast
`src/components/Toast.module.css` — fundo `--surface2`, borda `--border2`,
`border-radius: var(--r-lg)` (16px, legado — fora do escopo desta rodada),
`box-shadow: var(--shadow)`, título `.title` peso **600** (não é título de
tela, é o cabeçalho de um aviso pontual). Superfície flutuante — sombra
mantida por regra, não por dívida (ver seção 6).

### Tab
`.tab` (Inbox: Inbox/Tags) — texto `--fg2`, ativa vira `--accent` +
sublinhado. A sublinha ativa usa `border-image: var(--dott-gradient-linear)
1` (era `border-bottom-color: var(--accent)` sólido, e antes disso o
gradiente linear achatado) — `border-image` não aceita a brasa
multi-camada, por isso é sempre a forma linha, nunca `--dott-gradient` puro.

### Navegação
O Dott não tem top-nav (é app desktop, não site) — o equivalente é o
`Titlebar` (barra de janela) e as abas do painel esquerdo (Inbox/Tags,
PARA). Ambos seguem `--font-ui`, `--text-xs`/`--text-sm`, sem gradiente
(navegação nunca leva o accent — só o item ATIVO dentro dela).

## 5. Layout e Espaçamento

Escala 4/8/12/16/20/24/32/48 (idêntica à baseline, exceto o "section: 80px"
do Cursor — que é de site de marketing com rolagem longa; o Dott é um app
de painéis fixos, não tem "seção" com esse ritmo):

| Token | Valor |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |

Painéis do app (não é grid de site): painel esquerdo (Inbox/Tags) ~280px,
painel central (PARA/pasta) flexível, painel de tarefa/nota também flexível
com largura de leitura confortável (`.md-view .md-inner { max-width: 660px
}`). Ver seção 8 (Responsivo) para larguras de corte.

## 6. Profundidade e Elevação

**Hairline-only para superfície de conteúdo** — a regra não é mais "só o
Modal tem sombra" (isso ficou falso quando auditamos as ~20 superfícies do
app em 25/08/2026 — TASK-299). A regra correta:

> **Sombra só em superfície FLUTUANTE (modal, popover, toast, drag preview).
> Card e pill nunca.**

Superfície flutuante = paira ACIMA do fluxo normal da tela (overlay,
posição fixa seguindo o ponteiro, ou empilhada por cima de tudo). Card e
pill vivem DENTRO do fluxo — esses nunca levam `box-shadow`, só hairline +
contraste de superfície.

| Nível | Tratamento | Uso |
|---|---|---|
| Piso (`--bg`) | Cor de fundo da janela | Atrás dos painéis |
| Superfície (`--surface`) | Card, painel | Conteúdo (SEM sombra) |
| Superfície elevada (`--surface2`/`--surface3`) | Input, hover, chip | "Dentro" de um card (SEM sombra) |
| Hairline | `1px solid var(--border)`/`var(--hairline)` | Toda borda de card/divisória |
| **Exceção — superfície flutuante** | `box-shadow` (var(`--shadow`) ou custom) | Ver lista abaixo — é a categoria inteira, não mais "só o Modal" |

### Lista completa de exceções (auditada em 25/08/2026, TASK-299)

| Componente | Arquivo | Por quê é exceção |
|---|---|---|
| Modal (vocabulário único) | `components/Modal.module.css` | Paira sobre overlay escurecido |
| Modal "O que fazer com este card" | `features/inbox/InboxPanel.module.css` `.processModal` | Idem — overlay + card centralizado |
| Settings | `components/Settings.module.css` `.modal` | Idem |
| Busca (Ctrl+K) | `components/SearchModal.module.css` `.modal` | Idem |
| Seletor de símbolo | `components/GlyphPicker.module.css` `.modal` | Idem |
| Toast | `components/Toast.module.css` `.toast` | Flutua sobre conteúdo variado, empilhado por cima — precisa se destacar sem overlay escurecido atrás |
| Card fantasma do drag | `App.module.css` `.dragGhost`/`.dragGhostArmado` | Solto do fluxo, acompanha o ponteiro por cima de tudo — sem sombra se confunde com o que está por baixo |

### Não é sombra de elevação (fica, mas por outro motivo)
- **`obTargetGlow`** (`features/onboarding/onboarding.css`) — `box-shadow`
  usado como ANEL DE FOCO MOMENTÂNEO (pulso de destaque de 1.2s no alvo do
  arrasto), não como elevação permanente de superfície. Mesma família do
  `:focus-visible` do app. Fica.
- **Overlay de onboarding e afins** (`.ob-overlay`, `.overlay` dos modais) —
  o escurecimento de fundo (`background: rgba(...)`) não é `box-shadow`,
  não conta como "sombra" pra esta regra.

### O que deixou de ser exceção nesta rodada
- **`.ob-card`** (onboarding, primeira tela do app) — tinha `box-shadow`
  igual a um modal, mas é card estático dentro do próprio overlay, não uma
  segunda camada flutuante. Sombra removida, raio unificado pra `--r-card`,
  borda trocada pra `--hairline`.

## 7. Formas (raio)

**Princípio (TASK-332, 28/08/2026 — CEO, com foto do chip de sugestão de
pasta na mão): "olha como tá mto arredondado isso? reve a regra de
bordas, pra elementos pequenos o mesmo tamanho de borda não faz
sentido."** Raio é proporcional à SUPERFÍCIE, não um número fixo aplicado
igual em tudo — o que dá elegância a um cartão de 200px vira cápsula
infantil num chip de 28px. A régua abaixo existe pra ninguém mais
escolher raio pelo gosto:

| Degrau | Valor | Porte do elemento | Exemplos reais |
|---|---|---|---|
| `--r-xs` | 7px | **Minúsculo** — ícone-só de 16–20px, checkbox | `.cardRemove`/`.cardAction` (Inbox), `.groupDel`/`.novaTarefaPrazoLimpar`, badges pequenos (`.badge` do PARA/FolderNotesView) |
| `--r-sm` | 9px | **Pequeno** — ícone-só ou botão compacto de 24–32px | `.captureIconBtn`, `.coverBtn`, `.close`/`.processClose`/`.modalClose`, `.back` (Breadcrumb), `.filterToggle`, `.novaTarefaPrazoBtn`, `.qAdd` |
| `--r-btn` | 8px | **Botão/input de ação** — 36–44px, com rótulo | `ModalButton`, `.btnNew*`, `.input` (Modal) — o par mais próximo de `--r-sm`; a distinção histórica dos dois (8 vs 9) é herança de duas baselines diferentes, não uma decisão de porte nova desta rodada |
| `--r-md`/`--r-card` | 12px | **Superfície média** — linha de card, input maior, painel pequeno | `.processFolder`, `.acaoLinha`, `Modal.card`, `GlyphPicker .cell` |
| `--r-lg`…`--r-3xl` | 16–30px | **Superfície grande** — card de conteúdo, modal | Card do Inbox/Pasta/PARA, `Settings`/`SearchModal .modal`, `.processModal`, `Toast` — identidade de canto generoso, JÁ APROVADA pelo CEO; não muda nesta rodada |
| `--r-full` | 9999px | **Pill/badge/ponto** — metadado que É uma cápsula por definição (a curva SEMPRE acompanha a altura, nunca fica desproporcional sozinha) | `.captureChip`/`.cardType`/`.previewTipo`/`.tarefaGrupo`/`.tarefaPrazo` (pill de tipo/metadado), `.badge` de contagem (Inbox), pontos/dots |

**A regra de porte, em uma frase:** elemento minúsculo (ícone/checkbox
solto) usa `--r-xs`; controle pequeno (botão/toggle compacto) usa
`--r-sm`; ação com rótulo em tamanho padrão usa `--r-btn`; painel/linha
média usa `--r-md`/`--r-card`; card e modal usam a escala grande
(`--r-lg`+); metadado que É uma cápsula (pill/badge/ponto) usa
`--r-full` — nunca aplicado a um CONTROLE clicável de ação (isso é botão,
usa a régua de botão).

**A regra de aninhamento (o defeito medido nesta rodada):** quando um
elemento arredondado mora DENTRO de outro arredondado, o de dentro
precisa de raio MENOR que o de fora — nunca igual. Regra prática: raio
interno ≈ raio externo menos o espaçamento (padding/gap) entre os dois;
na prática, isso quase sempre significa "o de fora usa a régua de
pill/card, o de dentro usa a régua de botão pequeno" — são shapes
DIFERENTES, não a mesma cápsula em escala menor. Usar `--r-full` nos
dois lados é o erro clássico: duas cápsulas idênticas aninhadas leem como
bolha-dentro-de-bolha, não como hierarquia.

**Achado medido (varredura de todo `border-radius` em `src/**/*.module.css`,
28/08/2026):** a única violação real da regra de aninhamento no app é o
chip de sugestão de pasta que o CEO fotografou —
`src/features/editor/FolderHintChip.module.css` (TASK-325/326): o
container `.hint` usa `--r-full` (correto — é um chip de metadado) mas os
botões `.aceitar`/`.ignorar` DENTRO dele TAMBÉM usam `--r-full` (errado —
são controles de ação, não pills). É o único lugar do app com dois
`--r-full` aninhados; todo outro uso de `--r-full` encontrado na
varredura é standalone (pill/badge/ponto sem nada arredondado dentro).
**Não editado nesta rodada** — `src/features/editor/` está com o
RUSTLINE consertando outro bug ao mesmo tempo. Valor correto pro
RUSTLINE aplicar: trocar `border-radius: var(--r-full);` por
`border-radius: var(--r-sm);` nas duas classes `.aceitar`/`.ignorar` (as
mesmas regras de tamanho/cor continuam) — `--r-sm` é a régua de "controle
pequeno" (24-32px, ver tabela acima), a mesma que `.filterToggle` e
`.novaTarefaPrazoBtn` já usam para o mesmo tipo de botão compacto em
outros lugares do app. `.hint` continua `--r-full`, sem mudança.

**Nenhum valor numérico da escala mudou nesta rodada.** O pedido do CEO
foi "reveja a regra" (qual degrau serve a qual porte), não "troque os
números" — mudar valor de token de raio em massa, sem verificação
visual disponível neste posto de trabalho, arriscaria exatamente o tipo
de regressão silenciosa que essas rodadas vêm evitando de propósito (ver
seção 17.6, ordem de migração faseada). A tabela acima é a formalização
do que a maior parte do app já fazia certo — só a exceção
(`FolderHintChip`) precisa de correção, e ela é uma troca de UM token em
duas classes, não uma reforma de escala.

**Não fique quadrado demais — o outro lado do erro.** A identidade do
app tem canto generoso em superfície GRANDE (card, modal) — isso já foi
aprovado e não muda aqui. O que a régua acima resolve é PROPORÇÃO por
porte, nunca "menos arredondado" como estilo geral; card e modal
continuam na escala 16–30px de propósito.

**Armadilha medida do projeto (não repetir):** `corner-shape:
superellipse()` (squircle) é renderizado ERRADO pelo WebView2 do Tauri em
elemento com `overflow:hidden` (clipa em ~6px em vez do raio real — ver
`clients/dott/squad/knowledge/armadilhas-medidas.md` e o comentário em
`reset.css`, ".squircle"). Toda correção de raio desta seção usa
`border-radius` puro, como o app já faz — nunca reabrir `corner-shape`
pra "resolver" proporção.

## 8. Do's e Don'ts

### REGRA VIGENTE (28/08/2026, TASK-330 — o CEO viu de novo uma captura ANTIGA e preferiu aquilo; troca a FORMA do highlight, não o resto da regra)

**O que muda e o que NÃO muda em relação ao histórico abaixo:** o botão
continua neutro em repouso (nenhum preenchimento de marca no `background`
do botão em si — isso não mudou desde a TASK-319/320). O que muda é a
FORMA do highlight interno: a TASK-320 tinha chegado numa "luz sem
aresta" (radial que dissolve nas duas direções, invisível em repouso). O
CEO mandou de volta uma captura de uma rodada ainda mais antiga (os
botões "Nova tarefa"/"Nova pasta") e disse: **"quero o highlight como
nessa img anexa que vc criou, que eh uma forma contida com o gradiente
dentro dele, tipo uma tag."** Ele é o dono do gosto — a receita troca de
vez, sem tentar reconciliar luz-sem-aresta com forma-contida (são
opostos: um dissolve de propósito, o outro tem borda de propósito).

**NÃO é um retorno ao defeito que a TASK-320 corrigiu.** Aquele retângulo
era alto (60% da caixa do botão), com cantos vivos e cortado a pique pela
borda do botão — lia como "meio botão pintado". A tag desta rodada é
diferente em três medidas, todas menores/mais contidas que o defeito
antigo:
1. **Baixa** — o que sobra visível é uma lasca fina (ver correção
   TASK-336 abaixo), não bloco de fundo.
2. **Vazada na base, não recuada (TASK-336 revisa este item — ver
   correção abaixo)** — `--tag-inset-x: 10px` continua recuando as
   laterais, mas a tag não tem mais recuo da base: fica centrada na
   própria borda inferior do botão, metade visível, metade cortada.
3. **Com raio próprio** — `--tag-r: 3px`, menor que `--r-btn`(8px)/
   `--r-md`(12px) do botão que a contém. Regra geral de aninhamento (ver
   seção 7, "Raio"): elemento arredondado dentro de outro arredondado
   precisa de raio MENOR que o de fora, nunca igual — senão a curva
   interna briga com a externa.

**Repouso: nem sumida, nem acesa — o meio-termo que atende as duas
ordens do CEO.** A captura antiga que ele mandou parecia ter a forma
visível mesmo sem mouse (o que, se fosse pra valer, seria um retorno a
"botão com marca em repouso" — contradiz a ordem da TASK-319 de repouso
neutro). Resolvido pelo meio: a FORMA da tag é visível em repouso (um
tom neutro recuado, `--tag-groove` em `tokens.css` — nunca cor de marca),
mas o GRADIENTE (a marca em si) só acende no hover/foco. É "a forma
sempre lá, a luz só quando a mão chega perto" — não contradiz repouso
neutro (o botão continua sem cor de marca até o hover) nem trai a
referência (a tag como OBJETO é permanente, só o conteúdo dela acende).
**Se esta leitura estiver errada** (se o CEO realmente quiser a forma
JÁ acesa com gradiente em repouso, não só presente-e-apagada), avisar —
não decidido sozinho, é mudança de princípio (repouso com marca), não só
de forma.

**Primário/secundário: mesma forma, intensidade diferente.** Não mudou —
é a mesma regra de sempre (`--glow-intensity`, secundário define um valor
menor). A tag em si (tamanho, posição, raio) é idêntica nos dois; o que
difere é o quanto o gradiente acende dentro dela no hover.

**Histórico curto (pra quem for entender o porquê, não só o o quê):**
TASK-310 (27/08) mandou o gradiente aparecer em TODOS os botões de ação,
sempre visível. TASK-313 (mesmo dia) corrigiu a EXECUÇÃO disso (preenchimento
claro virou "cara de alerta" no app real). TASK-319 (28/08) mudou a REGRA em
si — CEO: **"o gradiente só deve aparecer nos botões com hover, o botão sem
hover deve estar neutro... e o gradiente tem que ser animado com o mouse
seguindo, seja criativo."** As duas rodadas anteriores ficaram obsoletas por
inteiro nesta parte; nada do preenchimento fixo (cheio ou contido) sobrevive.

**CORREÇÃO (28/08/2026, TASK-320 — mesmo dia, o CEO abriu o app reconstruído
e reprovou a EXECUÇÃO desta regra, não a regra em si):** "o botão tá branco
no dark mode, o gradient tá estranho demais". Dois ajustes, a regra acima
continua valendo por inteiro:
- **Preenchimento de repouso não é mais invertido `--fg`/`--bg`** (virava
  branco no tema escuro) — agora é escuro "como os vizinhos":
  `var(--surface3)` pro primário (sem borda), `var(--surface2)` + borda pro
  secundário. Hierarquia continua por solidez (primário mais "cheio", sem
  borda; secundário recuado, com borda) — só o TOM que deixou de inverter.
- **A forma do brilho mudou** de um núcleo único quase-circular flutuando
  no meio do botão ("estranho") para uma **barrinha na base** — uma lasca
  fina de luz, invisível em repouso, que acende E "derrama" o brilho pra
  dentro do botão no hover. É a ideia do "rastro" que a TASK-319 mandou
  aposentar, recuperada com papel diferente: lá era enfeite sempre ligado;
  aqui é o ELEMENTO PRINCIPAL da marca no botão, mudo até o hover. Ver a
  receita completa (duas camadas, `::before` estática + `::after` móvel)
  em `reset.css`.

**SEGUNDA CORREÇÃO (mesmo dia, mesma rodada):** a primeira versão da barra
também foi reprovada — o CEO renderizou o botão isolado e viu "um retângulo
chapado ocupando a metade de baixo do botão, cantos vivos em cima, laterais
cortadas a pique". Causa: a receita usava dois `linear-gradient(to top...)`,
que só dissolvem NA VERTICAL — na horizontal a cor ficava constante até a
borda reta da caixa (`left:6%; right:6%`), virando a "lateral cortada a
pique"; a caixa também era alta demais (60% do botão), lendo como bloco.
Trocado por um único `radial-gradient` (dissolve nas duas direções por
natureza, referência "fresta de luz por baixo de uma porta") dentro de uma
caixa bem menor (28% da altura, encostada na base) — ver a receita
definitiva e os números abaixo.

**A regra, em três frases (TASK-330):**
1. **Em repouso, o botão continua neutro (sem cor de marca no
   `background`) — mas a TAG existe, visível, num tom neutro recuado
   (`--tag-groove`).** Hierarquia de botão continua por SOLIDEZ
   (`--surface3` sem borda no primário, `--surface2` com borda no
   secundário) — a tag não muda isso, é um elemento à parte, dentro dele.
2. **No hover, o gradiente acende DENTRO da tag** (preenche a forma
   inteira) **e um ponto quente mais brilhante corre dentro dela,
   seguindo o cursor** (mesmo hook, `--glow-x`/`--glow-y`, inércia
   inalterada). Ao sair, o gradiente apaga com calma — a tag (a forma)
   continua visível, só o brilho some.
3. **O pico de clique continua existindo**, agora um pouco mais contido
   (`scale: 1.08`, era `1.18`) — a tag é pequena, um pulso grande demais
   ficaria desproporcional a ela.

**Onde a regra mora:** classe global `hoverGlow` (`src/styles/reset.css`)
+ um token de forma (`--tag-groove`, `tokens.css`, o tom da tag em
repouso — theme-aware) + um token de conteúdo (`--dott-gradient-glow`,
redefinido nesta rodada — ver abaixo) + `--dott-gradient-linear` (já
existia, agora reusado como o preenchimento estático da tag acesa). Os 3
números da geometria (`--tag-h`/`--tag-inset-x`/`--tag-r` — `--tag-inset-b`
foi REMOVIDA na TASK-336, ver correção abaixo) são custom properties com
default na própria classe `.hoverGlow`, sobrescrevíveis por quem precisar
de outro porte — hoje `.btnCapture` (28px) e `.btnEdit` (30px)
sobrescrevem, os outros 44px usam o default.
Consumidores inalterados: `.btnNew`/`.btnNewAlt`/`.btnNewBig`/
`.btnNewBigAlt` (FolderNotesView), `ModalButton` variant primary,
`.ob-btn.primary` (onboarding), `.btnCapture` (Quick Capture). Ghost/
Cancelar continua de fora.

**APOSENTADO nesta rodada:** a "barra estática + derramar pra dentro"
(`::before` usando `--dott-gradient-bar`) e o "ponto quente movido por
`translate` numa camada oversized" (`::after` com `inset:-25%`). O token
`--dott-gradient-bar` fica sem consumidor (não apagado — pode voltar a
servir outro contexto) porque a nova receita não tem "barra estática
grande + luz que derrama" — tem uma tag PEQUENA e FIXA que ela mesma é a
forma inteira (não precisa de uma camada separada "derramando pra
dentro" de coisa nenhuma).

**O mecanismo (duas camadas, MESMO tamanho/posição — é isso que faz
`::after` "morar dentro" de `::before`, não uma clipando a outra):**
- `::before` — o CORPO da tag: `left`/`right`: `--tag-inset-x`; `bottom`:
  `calc(var(--tag-h) / -2)` (TASK-336 — centra a caixa na borda inferior
  do botão, metade visível/metade cortada; substitui o `--tag-inset-b`
  fixo da TASK-330); `height`: `--tag-h`; `border-radius`: `--tag-r`.
  Background `--tag-groove` (neutro, sempre visível, nunca cor de marca).
  Não anima no hover — é o objeto permanente.
- `::after` — o PREENCHIMENTO, na EXATA mesma caixa (mesmas 3 variáveis
  + a mesma fórmula de `bottom`).
  Duas `background-image` na mesma camada: `--dott-gradient-linear`
  (corpo estático, preenche a tag inteira) por baixo, `--dott-gradient-glow`
  (o ponto quente, agora um círculo simples — não precisa mais desenhar
  forma própria, a tag já dá a forma) por cima, deslocado por
  `background-position: calc(50% + var(--glow-x)) calc(50% + var(--glow-y))`.
  Opacidade 0 em repouso, acende no hover/foco.
- **Mudança de mecanismo, documentada — `translate` deu lugar a
  `background-position`:** a receita anterior movia o ponto quente com
  `translate` (trabalho de compositor, nunca repintura) porque a camada
  cobria boa parte do botão. Agora a caixa É a tag — pequena (poucos px
  de altura) — então mover o PREENCHIMENTO por `background-position`
  (que causa repaint, ao contrário de `translate`) só repinta essa área
  minúscula, não o botão inteiro. É uma troca deliberada: ganhamos "o
  ponto quente contido pela forma" (impossível com `translate` puro,
  porque transladar o elemento move a forma junto — ver detalhe técnico
  no comentário de `reset.css`), pagamos um pouco de repaint numa área
  pequena. **Peço remedição de performance com vários `.hoverGlow` na
  tela ao mesmo tempo (ex. a fileira de botões da pasta) em hardware
  fraco — não tenho como medir FPS aqui.**

  **Atualização (TASK-334, 28/08/2026):** pedido pra medir ou reduzir o
  risco por desenho. Não consegui medir (sem ferramenta de FPS neste
  posto). Considerei a alternativa sugerida — "a luz em `translate` dentro
  de um recorte" — e ela **não é possível só com `::before`/`::after`**:
  `clip-path`/máscara e `transform` no MESMO elemento não são
  independentes (o clip é calculado sobre a caixa antes do transform, e
  o transform move a caixa JÁ recortada como uma unidade rígida) — pra
  ter um recorte FIXO com um ponto que anda por DENTRO dele é preciso um
  par pai-filho real (pai com `overflow:hidden` fixo, filho que translada)
  — pseudo-elemento não tem filho. Isso é um `.tsx` (um `<span>` real
  dentro do botão) — especificação pronta pro RUSTLINE quando `.tsx`
  estiver liberado, comentada em `reset.css`. Enquanto isso, reduzido o
  risco por desenho, sem depender de medição: `@media (update: slow)`
  (o navegador avisa quando redesenhar é caro) trava o ponto quente no
  centro da tag — o hook continua escrevendo `--glow-x`/`--glow-y`, mas a
  camada para de LER esses valores, então o navegador não repinta por
  causa deles nesses dispositivos. Argumento (não medição) pro caso
  comum: a área repintada é só a da tag (poucos px de altura), não o
  botão inteiro, e só UM botão por vez tem o valor reescrito (o hook só
  escreve no elemento recebendo `pointermove` agora).
- **Contrato pro componente — SEM MUDANÇA (o hook
  `src/hooks/useHoverGlowCursor.ts` já cumpre, não mexer nele nem no
  laço):** continua escrevendo `--glow-x`/`--glow-y` em `px`, mesma
  fórmula de amortecimento, `--glow-y` travado em ±4px. Só a fórmula CSS
  que LÊ essas duas variáveis mudou (de `translate` pra
  `background-position`) — o hook não sabe nem precisa saber disso.

**Contraste (ficou trivial, o próprio CEO notou):** superado pela
correção TASK-336 abaixo — a tag deixou de flutuar recuada da base e
passou a vazar pela borda inferior do botão.

### CORREÇÃO (28/08/2026, TASK-336 — a tag da TASK-330 flutuava recuada da base; o CEO queria vazamento)

O CEO viu o botão "Começar a usar o Dott" com a tag inteira visível,
flutuando com folga acima da borda de baixo, e reprovou: **"eu pedi
claramente pra essa tag com o gradiente estar vazando metade pra fora e
metade pra dentro na parte inferior, pra ele estar totalmente para
baixo, com a metade de baixo cortado. não quero que ela esteja pra
dentro. aumenta a altura dessa tag pra ficar legal bem vazado, mas tem
que estar pouco visível, somente a metade de cima da tag."**

**O que muda:** só a geometria vertical da tag (item 2 da lista acima,
"Recuada"). Tudo o resto da REGRA VIGENTE (TASK-330) continua de pé —
forma neutra em repouso, gradiente só no hover, `--glow-intensity` por
hierarquia, `--tag-inset-x`/`--tag-r` sem mudança de conceito.

1. **Centrada na borda, não recuada.** A tag não tem mais
   `--tag-inset-b` (recuo da base) — essa custom property foi REMOVIDA
   do contrato. A posição vertical agora é só `bottom: calc(var(--tag-h)
   / -2)`: desloca a caixa pra baixo em meia altura, então o EIXO
   horizontal do meio dela cai exatamente em cima da borda inferior do
   botão. Metade de cima fica dentro (visível), metade de baixo fica
   fora (cortada pelo `overflow: hidden` que `.hoverGlow` já tinha —
   não precisou de `overflow: hidden` novo em nenhum botão, o contrato
   já garantia isso).
2. **Altura total dobrada** — `--tag-h: 6px → 12px` no default de 44px;
   `3px → 6px` nos dois overrides de botão menor (`.btnCapture` 28px em
   `InboxPanel.module.css`, `.btnEdit` 30px em `ImageViewer.module.css`).
   Calibrado pelo que SOBRA visível, não pela altura total (a instrução
   do CEO): como só a metade de cima aparece, dobrar a altura faz o
   pedaço visível ter a MESMA presença que a tag inteira tinha antes —
   6px visíveis hoje equivalem aos 6px que apareciam por inteiro na
   TASK-330 (3px nos botões pequenos). Fica "bem vazado" (a instrução) e
   ao mesmo tempo "pouco visível" (a outra instrução, aparentemente
   oposta): vazado porque a caixa é grande e cortada de propósito, pouco
   visível porque só metade dela chega a aparecer.
3. **`--tag-r` sem mudança** (3px no default, 2px nos overrides). Como o
   raio já era ~metade da altura ANTIGA (a tag inteira lia como pílula),
   mantido igual ele passa a ser ~metade da altura VISÍVEL de agora — a
   MESMA curvatura relativa no pedaço que sobra. Isso é o que evita os
   dois erros que o CEO nomeou como proibidos ("retângulo duro" e
   "elipse esticada"): o topo da tag mantém canto arredondado (não vira
   reto), e a base — que agora é a própria borda do botão, uma linha
   reta, não o border-radius da tag — não estica o raio em proporção
   nenhuma, porque o raio nunca mudou.

**Onde mora:** os únicos 3 arquivos tocados são `src/styles/reset.css`
(o contrato `.hoverGlow`, incluindo os defaults) e os dois overrides
locais que citavam geometria própria — `InboxPanel.module.css`
(`.btnCapture`) e `ImageViewer.module.css` (`.btnEdit`). Os outros 8
usos de `hoverGlow` no app (`.btnNew`/`.btnNewAlt`×2/`.btnNewBig`/
`.btnNewBigAlt` em `FolderNotesView.tsx`, `ModalButton` em `Modal.tsx`,
`.ob-btn.primary`×2 em `Onboarding.tsx`) não têm override próprio —
herdam o novo default de `reset.css` automaticamente, sem precisar de
edição.

**Contraste (revisão da conta original):** com o novo default
(`--tag-h: 12px`, centrada na borda), a parte VISÍVEL vai só da própria
borda inferior do botão até `calc(var(--tag-h) / 2)` acima dela — 6px,
num botão de 44px. Isso deixa a faixa visível ainda mais perto da borda
(e mais longe do centro, onde o texto senta) do que a receita anterior
(11px a partir do fundo). Sem geometria especial "protegendo" nada — a
metade cortada pra fora já garante a distância.

**Badge/contador e rótulo pequeno:** regras da TASK-313/316 continuam
valendo sem mudança — chip neutro com número em `--accent` pro contador
(`.badge` em InboxPanel), cor normal de hierarquia pro rótulo que não é
link/estado ativo (`.badge` em FolderNotesView). Essas nunca preencheram e
não usam `hoverGlow` — não são botão.

### Faça
- **Botão de ação é neutro em repouso; a brasa só acende no hover e segue
  o cursor — ver "REGRA VIGENTE" acima.** Fora de botão de ação (badge de
  contagem, tab ativa, estado selecionado), a
  escassez original AINDA VALE: gradiente é exceção, não regra geral de tela.
- **Em repouso, nenhum botão preenche — nem o primário** (TASK-319,
  28/08/2026, substitui a regra de "primário preenche" da TASK-313). A
  marca só aparece acesa no hover, seguindo o cursor (classe `hoverGlow`).
  Badge e rótulo continuam neutros sempre (nunca tiveram preenchimento). Se
  sobrar dúvida entre "a marca aparecer mais" e "o elemento ficar quieto",
  escolha quieto.
- Toda pill nova usa os 5 tokens `--pill-*` (peso 600) — nunca escreva
  `10px / 600 / .06em` à mão de novo, e nunca suba a pill pro peso 700.
  Confira a proporção contra o texto de conteúdo ao lado (~65-70%) antes de
  aprovar — não confie só no token.
- **Título de tela/seção/pasta/modal em peso 700** com tracking negativo
  sutil (`-0.01em` a `-0.02em`) — mandato do CEO (25/08/2026), ver Baseline
  Decision.
- Profundidade de CARD e PILL só com hairline + contraste de superfície.
  Sombra é reservada a superfície FLUTUANTE (modal, popover, toast, drag
  preview) — ver seção 6, lista de exceções.

### Não faça
- **Nunca um segundo accent de marca.** `--dott-gradient`/`--dott-gradient-linear`
  são as duas formas do MESMO único accent (superfície e linha), nunca dois
  accents diferentes. Cores semânticas (`--warn`/`--danger`/`--success`) não
  contam — são estado, não marca.
- **Nunca `background-blend-mode` esquecido.** `--dott-gradient` sem
  `background-blend-mode: var(--dott-gradient-blend)` some a soma em `screen`
  e vira camadas empilhadas sem vida — os dois sempre andam juntos.
- **Nunca `--dott-gradient` (a brasa) num `border-image`.** A propriedade
  não aceita fundo multi-camada; use `--dott-gradient-linear`.
- **Nunca `opacity` pra desabilitar um botão que leva a brasa.** Vira lama
  marrom (medido). Desabilitado troca pra `--surface3`/`--fg3`.
- **Nunca drop shadow em card ou pill.** Sombra é só pra superfície
  flutuante (modal, popover, toast, drag preview) — ver seção 6 pra lista
  completa e exaustiva das exceções; qualquer sombra nova fora dela é bug.
- **Nunca pill fora da receita** — se você está digitando `padding: 3px 6px`
  numa pill nova, pare e use `var(--pill-padding)`. Pill fica em 600, nunca
  700 — 700 é reservado a título.
- **Título em 700 por mandato do CEO (25/08/2026) — desvio consciente da
  baseline Cursor; a elegância se mantém pelo tracking negativo, não pelo
  peso leve.** (Isto substitui a regra original do Cursor "nunca bold 700+
  em título/display" — aqui é o oposto, por ordem explícita.) O que NÃO
  muda: botão, label pequeno e pill continuam em 600; corpo de texto
  continua em 400.
- **Nunca ícone decorativo dentro de um input** (a lição do checkbox solto
  do antigo modal "Virar tarefa").
- **Nunca gradiente/laranja saturado como PREENCHIMENTO em botão secundário,
  badge ou rótulo, em tema escuro** (TASK-313, 27/08/2026 — CEO no app real:
  "tá ridículo"). Preenchimento cheio é só do botão primário; o resto usa
  borda, rastro baixo ou cor de texto. Vira "cara de alerta", não de marca,
  e ainda quebra contraste de texto por cima.
- **Nunca aprovar gradiente/animação só pelo swatch isolado do preview.**
  A licão desta rodada: o preview mostrou uma amostra bonita enquanto a
  tela real (fileira de botões na pasta, barra de abas com contador) ficava
  errada. Todo componente de marca precisa de uma amostra NO CONTEXTO da
  tela real antes de aprovar — ver seção do preview.

## 9. Comportamento Responsivo

O Dott é **app desktop fixo**, não site — não há breakpoint de mobile/tablet
na baseline do Cursor que se aplique 1:1. O equivalente real:

| Contexto | Largura | Comportamento |
|---|---|---|
| Painel esquerdo (Inbox/Tags) | ~280px fixo | Não colapsa; é o "sempre visível" do app |
| Painel central (PARA/pasta) | Flexível, mínimo ~480px | Grid de cards `repeat(auto-fill, minmax(200px,1fr))` |
| Corpo de leitura de nota (`.md-inner`) | `max-width: 660px`, centralizado | Nunca estica em janela larga — legibilidade da prosa em Merriweather |
| Modal | `max-width: calc(100vw - 32px)`, largura base 420px | Nunca encosta na borda da janela |
| Janela mínima do app | Definida no Tauri (fora deste documento) | — |

**Touch:** o Dott roda em desktop com mouse/teclado; os `@media (hover:
none)` existentes (ações que só apareciam no hover viram sempre visíveis)
continuam válidos e não mudam com esta baseline.

## Guia de Prompt para Agente

Ao pedir uma tela ou componente novo do Dott a um agente (humano ou IA):

1. **Comece pelos tokens, não pela tela.** Se o valor que você precisa não
   existe em `tokens.css`, pare e pergunte — não invente hex nem px solto.
2. **Pill nova → os 5 `--pill-*`, sempre.** Copie o bloco da seção 4 deste
   documento, não escreva os números de novo.
3. **Gradiente é escasso.** Antes de aplicar o gradiente da marca, pergunte:
   "isso é o botão primário, o contador, ou um estado ativo?" Se a resposta
   for não, use `--accent` sólido ou nada. Se a resposta for sim: a caixa
   tem 44px de altura ou mais? Sim → `--dott-gradient` + `background-blend-mode:
   var(--dott-gradient-blend)`. Não (badge, botão pequeno) ou é
   `border-image`/caixa muito larga → `--dott-gradient-linear` sozinho.
4. **Raio: botão/input = `--r-btn` (8px). Card/modal = `--r-card` (12px).**
   Não crie um raio novo sem justificar por que a escala existente não
   serve.
5. **Título de tela/seção/pasta/modal vai em peso 700** (mandato do CEO,
   25/08/2026) com tracking negativo sutil — se "parece gritado", o ajuste é
   tracking, não descer o peso. Pill, botão e label pequeno continuam 600.
6. **Zero `box-shadow`**, exceto se o elemento for uma superfície FLUTUANTE
   (modal, popover, toast, drag preview — ver seção 6 pra lista exaustiva).
   Card, pill, botão, painel: hairline + contraste de superfície, nunca
   sombra.
7. **Duas fontes, dois papéis.** UI = Manrope (`--font-ui`). Corpo de
   leitura de nota = Merriweather (`--font-reading`). Código = JetBrains
   Mono (`--font-mono`). Nunca uma terceira família.
8. **Não toque no widget/orbe** sem pedido explícito — ele tem tokens de
   raio e sombra próprios (as camadas radiais oklch do orbe), fora desta
   baseline.
9. Depois de editar, rode o checklist de `preview/index.html` (na raiz do
   projeto) antes de considerar pronto.

## 10. Legado eliminado (TASK-316, 27/08/2026)

CEO: "ao segurar a nota o design do card muda pra uma versão antiga...
corrija e limpe tudo". Achado e consertado (varredura completa, não só o
sintoma do arraste):

- **13 cores de tipo cravadas em hex, fora da paleta** (`InboxPanel.module.css`
  `.type-*` e `Widget.module.css` `.chip-*`, duplicadas em dois arquivos).
  Incluíam violeta `#9b6cdb`/`#a05adc`, rosa `#e05aa0`, bege `#b4966e` e dois
  tons de teal `#3db3aa`/`#5ab4b4` — nenhuma dessas cores é ou foi token do
  Dott. Eram justamente `.type-url` (violeta) e `.type-ideia` (o mesmo tom
  de `--warn`, lê como "amarelo-oliva") — as duas etiquetas que o CEO
  fotografou. Consolidado: tipo com significado semântico usa o TOKEN certo
  (`--accent` pra link, `--green` pra código/tarefa, `--warn` pra ideia,
  `--danger` pra shell), fundo agora é o próprio token a 15% via
  `color-mix()` (acompanha sozinho se o token mudar). Tipo sem significado
  semântico (áudio, vídeo, imagem, arquivo, prompt, contato, e a própria
  nota — o caso mais comum, por isso fica quieta) virou NEUTRO
  (`--surface3`/`--fg3`, a mesma receita de qualquer pill do app) — o ícone
  (`CardTypeIcon`) já diferencia por forma, não precisava de 13 matizes.
- **Fonte MiSans Latin morta** (`src/styles/fonts.css`, 8 arquivos `.otf`) —
  reprovada pelo CEO em 25/08/2026 ("amador"), zero consumidor no código
  (`font-family: 'MiSans Latin'` não aparece em nenhum componente), mas o
  `import` em `main.tsx` continuava carregando os 8 arquivos no bundle.
  Import removido. Os arquivos físicos (`fonts.css` + `fonts/*.otf`)
  continuam em disco — apagar arquivo é fora do alcance de quem só edita
  texto; é o próximo passo, sinalizado.
- **Cor semântica duplicada em hex solto** (`TasksPanel.module.css`
  `.checkIcon`, `color: #3db37a` sem referenciar `--success`) — convertida
  pra `var(--success)` + `color-mix()`.
- **Origem do "design antigo" que só aparecia no arraste**: não é um
  segundo COMPONENTE de card (não existe `Card.tsx`/`InboxCard.tsx`
  paralelo — conferido, um card só, uma árvore de componentes só). É o
  MESMO card com as cores de tipo acima, que em repouso (fundo a 15% de
  alfa sobre superfície escura) fica quase invisível — lê como "texto
  colorido sem caixa" — e ficou óbvio quando o CEO prestou atenção durante
  o arraste. Não achei nenhum código que prepende "+" ao rótulo durante o
  drag (varredura completa por concatenação de string não encontrou nada);
  a hipótese mais provável é o ícone nativo de "copiar" que o
  Windows/WebView2 desenha ao lado do cursor em alguns arrastos — isso é
  decoração do sistema operacional, não CSS do app, e não há o que
  consertar no código pra isso.

## 11. Interação — Hover com leve zoom (TASK-317, 27/08/2026)

CEO: "ao fazer hover em todas as peças do app deveria ter uma regra de
zoom... estimulando visualmente a interagir".

**Onde a regra mora:** `src/styles/reset.css` — token `--hover-scale: 1.015`
(1,5%, "leve DE VERDADE") + duas classes utilitárias, `.hoverZoom` e
`.hoverElevate`. Nunca reescrita número a número em cada módulo — quem
precisa do efeito só adiciona a classe (string literal, não `s.hoverZoom`,
porque a regra é global/não-modular de propósito, igual `appearUp` e as
keyframes de brasa).

**Onde ESTÁ aplicada agora:** card do Inbox, card de nota da pasta, card
de pasta do PARA (`.hoverZoom`, são blocos isolados com espaço entre si,
não colam um no outro); toda `ModalButton` (primário e ghost, um só
componente cobre todos os modais do app); `.btnNew`/`.btnNewAlt`/
`.btnNewBig`/`.btnNewBigAlt` (fileira de criação); `.captureIconBtn` e
`.btnCapture` (ações da caixa de captura). **Fechada nesta rodada
(TASK-334, 28/08/2026)** — as quatro telas que nunca tinham recebido a
regra: `Settings` (`.close`, `.btn`/`.primary`), `GlyphPicker` (`.close`,
`.cell` — o tile do símbolo —, `.limpar`), `TaskDetail` (`.excluir`,
`.btnVoltar`, `.limpar` do prazo) e `Constellation` (`.abrir`).

**Nota técnica sobre a Fase de fechamento:** nas quatro telas acima o
efeito foi aplicado ESCREVENDO `scale: var(--hover-scale)` direto na
classe do próprio componente (dentro de `@media (hover: hover) and
(pointer: fine)`), em vez de adicionar a string `hoverZoom` no JSX — esta
rodada tinha fronteira de não tocar `.tsx` (RUSTLINE mexendo em paralelo).
O efeito visual é IDÊNTICO (mesmo token `--hover-scale`, mesma curva); a
diferença é só onde a regra mora. Quando o RUSTLINE puder tocar essas
quatro telas, o ideal é substituir esses blocos pela classe global
`hoverZoom` no JSX (elimina a duplicação) — registrado, não escondido.

**Onde NÃO se aplica, de propósito (cinco armadilhas — duas novas nesta
rodada):**
1. **Texto corrido** — escalar borra tipografia em alguns motores de
   composição. Bloco majoritariamente-texto usa `.hoverElevate`
   (`translateY(-1px)` + a mesma sombra de `--elevation-card`) em vez de
   `.hoverZoom`. Nenhuma classe global aplica escala a `p`, `.md-view` ou
   qualquer contêiner de prosa.
2. **Linha de lista de largura total** — cresceria pra fora do contêiner e
   tremeria. `.list-item`, `.linhaTarefa`, `.tarefaCorpo`, `.tagItem`,
   `.processFolder`, `.acaoLinha`, `.tab`, resultado de busca (SearchModal),
   `.restoreItem` (Settings), `.atalhoPasta` (TaskDetail), `.vizinho`
   (Constellation) e qualquer linha de tarefa/pasta em lista continuam SEM
   `.hoverZoom` — usam o sinal que já tinham (fundo, borda) ou passam a
   usar `.hoverElevate` onde fizer sentido. Por desenho, **não existe** uma
   regra global tipo `button:hover, a:hover { scale: ... }` — a ativação é
   sempre por classe, opt-in, exatamente pra essa lista de exceções nunca
   herdar por acidente.
3. **Nunca briga com a respiração dos botões de ação** — a respiração
   anima o `::after` (camada separada, dentro do botão); `.hoverZoom`
   escala o BOTÃO inteiro. São propriedades independentes em elementos
   diferentes — o efeito composto (botão cresce 1,5%, a brasa por dentro
   continua respirando no ritmo dela) é aditivo, não uma disputa pela
   mesma propriedade.
4. **Controle de formulário nativo** (achado em TaskDetail: `.dataInput`,
   `.select`, `.anotacao`) — escalar um `<input>`/`<select>`/`<textarea>`
   no hover é incomum e arrisca colidir com o cromo nativo que o
   WebView2/Chromium desenha por cima (calendário, seta do select).
   Continuam só com borda/fundo no hover, que já tinham.
5. **Elemento posicionado por layout/transform próprio, não um DOM box
   comum** (achado em Constellation: `.node`, o círculo SVG do grafo) —
   a posição já é escrita via `transform`/coordenadas do próprio layout do
   grafo; aplicar `scale` entraria em rota de colisão com esse mecanismo.
   `.check` de TaskDetail (a caixa de marcar da tarefa) também fica fora,
   por motivo diferente: já tem o PRÓPRIO `scale: 1.06` bespoke no
   `:hover` (mais antigo que esta regra) — duplicar duas gramáticas de
   zoom no mesmo elemento seria a mesma "sujeira" que a seção 8 evita nos
   botões de ação.

`(hover: hover) and (pointer: fine)` no media query evita ativar em touch.
`prefers-reduced-motion` (bloco já existente em `tokens.css`) zera a
transição globalmente — nenhum ajuste extra precisou ser feito pra isso.

**Cobertura agora fechada** para os elementos interativos mapeados nas
seis telas com CSS module do app principal (Inbox, Pasta/PARA, Modal,
Settings, GlyphPicker, TaskDetail, Constellation). **Ainda fora:**
`Titlebar` (RUSTLINE mexendo lá) e `src/features/editor/` (fronteira
desta e de rodadas anteriores) — não avaliados nesta varredura porque
estão sob edição de outro agente, não por terem sido esquecidos.

## 12. Tema Claro — reescrito por completo (TASK-318, 27/08/2026)

CEO: "o white mode eh algo nojento, quero algo parecido com o codex
desktop" (referência descrita, não uma imagem: cinza neutro nunca branco
puro, cartões quase-brancos separados por sombra difusa fraca — não borda,
quase monocromático, acento só em indicador minúsculo de dado, nunca
preenchendo botão/etiqueta, tipografia com muito respiro).

**Fio condutor — a MESMA regra da seção 8 (revogação de preenchimento
colorido, TASK-313), agora void pros dois temas:** o gradiente da marca
preenche só a ação principal; todo o resto (botão secundário, badge,
etiqueta, card) é neutro. É por isso que a varredura de cor da TASK-316
(seção 10) teve que vir ANTES do tema claro — cor fora da paleta hardcoded
em hex não obedece a nenhum tema; se não tivesse sido limpa antes, o tema
claro herdaria os mesmos 13 tons errados.

### Paleta nova (`:root[data-theme="light"]`, `tokens.css`)

| Token | Valor novo | Papel |
|---|---|---|
| `--bg` | `#eceef1` | Piso da janela — cinza neutro, nunca branco |
| `--surface` | `#fbfbfc` | Card/modal — quase-branco, não branco puro |
| `--surface2` | `#f2f3f5` | Input, "dentro" de um card |
| `--surface3` | `#e8eaed` | Hover, chip neutro |
| `--border` | `rgba(20,20,35,.07)` | Divisória "quase imperceptível" |
| `--border2` | `rgba(20,20,35,.12)` | Borda de card estático (decorativa) |
| `--border-control` | `#838794` | Input/botão/checkbox — piso ≥3:1 contra `--surface2` |
| `--border-control-3` (TASK-370) | `#7d818e` | Mesmo papel, calibrado pra fundo `--surface3` (`--border-control` sozinho cai pra ~2,97:1 aí) |
| `--fg` | `#1c1e22` | Texto principal (quase-preto, não preto puro) |
| `--fg2` | `#52565e` | Texto secundário (cinza médio) |
| `--fg3` | `#65696f` | Texto terciário/metadado |
| `--accent` | `#b5431f` | Texto/indicador minúsculo — NUNCA preenche botão/badge |
| `--desk` | `#dde0e4` | "Mesa" atrás dos shells flutuantes |
| `--elevation-card` (novo) | `0 1px 2px rgba(20,20,35,.04), 0 10px 28px -12px rgba(20,20,35,.12)` | Separação de CARD por sombra difusa larga e fraca — substitui a borda escura da referência. `none` no tema escuro (lá continua hairline-only, ver seção 6) |
| `--dott-gradient` (override só no claro) | radial em blend `normal` (não `screen`), 3 paradas de `--dott-gradient-linear` | Variante clara da brasa — ver abaixo |

`--warn`/`--danger`/`--success`/`--green` também escureceram um degrau
(`#a15c14`/`#c0392b`/`#1f7a4d`/`#1f7a4d`) pra manter contraste de texto
sobre `--surface`/`--surface2` claros — mesmo papel semântico, tom mais
escuro porque fundo é claro agora.

### Contrastes calculados (fórmula WCAG, luminância relativa)

| Par | Contraste | Piso | Situação |
|---|---|---|---|
| `--fg` sobre `--surface` | 16,15:1 | 4,5:1 (corpo) / 3:1 (título grande) | Folgado |
| `--fg2` sobre `--surface` | 7,13:1 | 4,5:1 | Folgado |
| `--fg3` sobre `--surface` | 5,33:1 | 4,5:1 | Passa |
| **`--fg3` sobre `--surface2`** | **4,96:1** | **4,5:1** | **O caso mais apertado** — texto terciário "dentro" de um card (ex. metadado num input) sobre a superfície mais clara do app. Escurecido de propósito até aqui (a régua antiga, `#666678`, dava 4,29:1 e reprovava) |
| `--border-control` sobre `--surface2` | 3,23:1 | 3:1 (não-textual) | Passa com folga pequena — mais escuro que isso parece borda dura, contra o espírito "quase imperceptível" |
| `--border-control-3` sobre `--surface3` (TASK-370) | 3,23:1 claro / 3,27:1 escuro | 3:1 (não-textual) | Par dedicado — `--border-control` sozinho cai pra 2,97:1 claro / 2,66:1 escuro contra `--surface3` (o degrau mais claro que `--surface2`), abaixo do piso |

Pixel real fica por conta do coordenador remedir (mesmo protocolo da
TASK-312/313) — os números acima são o cálculo de fórmula, registrado pra
comparar contra a medição.

### A brasa em fundo claro

A receita original depende de `background-blend-mode: screen` sobre uma
base quase-preta (`#070103`) — screen contra um fundo CLARO lava a cor pro
branco e perde o brilho ("suja", exatamente o risco que o CEO avisou).
Reescrita como preenchimento radial em blend **normal**, reusando os TRÊS
tons de pico de `--dott-gradient-linear` (nunca uma segunda paleta) no
mesmo formato "núcleo quente perto da base" da receita original — continua
reconhecível como a MESMA marca, só sem o truque que exige fundo escuro. O
tom mais escuro do range (`oklch(.42 .16 34)`) fica na área onde o texto
branco do botão passa por cima, sustentando contraste sozinho, sem
depender de soma de luz.

### Cobertura

Como quase todo componente já consumia `var(--surface)`/`var(--fg)`/etc.
em vez de hex cravado (o trabalho das rodadas anteriores, TASK-309/313/316,
paga o preço aqui), a nova paleta cascateia automaticamente pra: caixa de
captura, cards (Inbox/Pasta/PARA), abas, tarefas, modais, Settings,
onboarding, Toast, SearchModal, GlyphPicker. `Titlebar` e
`src/features/editor/` NÃO foram tocados nesta rodada (RUSTLINE mexendo
nos dois em paralelo) — se o editor consumir um token que precisou mudar
aqui, mudou o TOKEN, nunca o arquivo do editor.
`--elevation-card` (sombra em vez de borda) foi aplicado nos três tipos de
card mais comuns (Inbox, nota da pasta, pasta do PARA) — outras superfícies
com borda própria (Settings, GlyphPicker, SearchModal, `.processModal`)
ainda não ganharam o token; é mecânico (uma linha `box-shadow:
var(--elevation-card, none);` cada) e fica registrado como próximo passo,
não escondido — mesmo espírito do Known Gap de raio já existente.

## 13. Ícone de tipo — decisão de consistência (TASK-321, 28/08/2026)

CEO: "usamos ícone de nota na Nova Nota, mas na caixa de entrada não tem
nada disso. Quero consistência." Decisão: **a captura ganha o mesmo
vocabulário de ícone que o resto do app já usa (`CardTypeIcon`) — os
botões de criação NÃO perdem o deles.** Motivo: o app já tem um sistema de
ícone por tipo completo (`CardTypeIcon`, um desenho por `CardType`), já
usado com sucesso em 3 lugares (badge do card na lista do Inbox, chip
detectado da captura, botões "Nova nota/tarefa/pasta"); os DOIS lugares
que ainda faltavam eram exceções isoladas, não um padrão alternativo
válido — mais barato e mais consistente fechar a exceção do que desmontar
um vocabulário que já funciona em três lugares.

**Onde faltava (achado por varredura completa, não só o botão apontado):**
1. `src/features/inbox/InboxPanel.tsx` — o chip NEUTRO da caixa de captura
   (`.captureChipNeutral`, mostrado quando ainda não há texto/tipo
   detectado) renderiza só a palavra "Nota", sem ícone. O chip DETECTADO
   (`.captureChip`, ao lado) já tem `<CardTypeIcon>` — a inconsistência era
   exatamente entre os dois estados do MESMO elemento.
2. `src/features/inbox/InboxPanel.tsx` — `.previewTipo` (o rótulo de tipo
   no modal "O que fazer com este card") mostra `{card.type}` como texto
   puro, sem ícone, mesmo já usando a cor certa do tipo.

CSS já pronto pra receber (gap de ícone adicionado nos dois seletores).
**JSX necessário (RUSTLINE):**
- `.captureChipNeutral`: trocar `<span className={s.captureChipNeutral}>Nota</span>`
  por `<span className={s.captureChipNeutral}><CardTypeIcon type="NOTA" size={9} />Nota</span>`
  (`CardTypeIcon` já importado no arquivo).
- `.previewTipo`: trocar `{card.type}` por `<CardTypeIcon type={card.type} size={9} />{card.type}`
  no `<span className={...previewTipo...}>`.

Nenhum outro ponto do app tem o conceito "tipo de item" sem ícone — chip
de tarefa (`.tarefaGrupo`/`.tarefaPrazo` em TasksPanel e FolderNotesView)
é metadado (grupo, prazo), não "tipo de item", fora do escopo desta
decisão.

## 14. Painel de Tarefas — três consertos (TASK-322, 28/08/2026)

**Alinhamento do item (checkbox vs. texto).** Causa medida: a TASK-309
reduziu `--text-xs` de 13px pra 11,5px sem reajustar quem convivia com
ele — a folga entre a caixa de marcar (`.check`, 16px fixos) e a caixa de
linha do texto (`line-height` × fonte) caiu de ~2,85px pra ~0,68px. Com
quase nenhuma folga sobrando, a caixa (retângulo duro) e a primeira linha
do texto (que tem espaço assimétrico entre o topo da caixa de linha e o
glifo — comum em fontes variáveis como a Manrope) deixam de coincidir
visualmente; antes a folga absorvia essa diferença. **Consertado:**
`line-height` do texto do item sobe de 1.45 pra **1.7** (devolve ~3,55px
de folga, perto do que havia antes) e `.check` ganha `margin-top: 2px`
(era 1px) + `align-self: flex-start` explícito. `.item` já usava
`align-items: flex-start` no pai — isso garante que a caixa alinha com a
PRIMEIRA linha do texto, nunca com o centro do bloco inteiro, mesmo com
texto de duas linhas ou com a linha de metadado (prazo/pasta) embaixo.
Pixel a confirmar — não tenho como renderizar.

**Hierarquia (título do grupo vs. texto do item).** Medido: `.groupName`
estava em `--text-2xs` (11px token / 13,2px real) contra `.text` do item
em `--text-xs` (11,5px / 13,8px real) — o título perdia do próprio
conteúdo. Corrigido: `.groupName` sobe pra **`--text-sm`** (12,5px /
15px real), mesmo peso 700 de antes — título pesa mais que item.

**Cabeçalho em duas faixas (`img6`).** O painel gasta uma faixa pro
título ("Tarefas 6") e outra pros filtros (PRAZO/TODOS) — o CEO pediu
juntar numa linha só, título à esquerda e filtros à direita, e trocar o
rótulo "TODOS" (não descreve o que o filtro faz) por um termo melhor
(sugestão do CANVAS: **"Tudo"** ou **"Todas"** — mais curto que "Todas as
tarefas" e não soa como uma categoria própria como "TODOS" soava).
**Isto exige mudar JSX** (mover os dois `<div>` `.header`/`.filter`,
hoje siblings verticais, pra dentro de uma única linha, e trocar o texto
do botão) — fora do alcance desta rodada (fronteira de arquivo, RUSTLINE
mexendo em `.tsx` do painel em paralelo). Devolvido como especificação:
ver o resumo desta entrega para o texto exato.

## 15. Troca de aba anima (TASK-323, 28/08/2026)

**O que é 100% CSS (feito):** o conteúdo que troca por MONTAGEM/DESMONTAGEM
de nó (não por re-render de um nó que já existia) ganha `animation:
appearUp` no mount — a mesma keyframe global já usada em cards/sugestões
no resto do app, sem precisar de JS:
- Abas Inbox/Tags (`InboxPanel.tsx`): `.inboxContent`/`.tagsContent` já são
  blocos condicionais (`{leftTab === 'inbox' && ...}`) — cada troca
  desmonta um e monta o outro, então a animação de entrada dispara
  sozinha.
- Filtro Prazo/Todos (`TasksPanel.tsx`): o array `items` é FILTRADO antes
  do `.map` — uma tarefa que reaparece é um `<div key={task.id}>` NOVO pro
  React. `.item` ganhou `animation: appearUp .18s var(--ease-out) both`,
  então cada item que (re)aparece entra suavemente.
`prefers-reduced-motion` já zera isso globalmente (`tokens.css`), sem
ajuste extra.

**Indicador deslizante — CSS fechado (28/08/2026, pendência devolvida pelo
RUSTLINE: "as classes que ele precisa não existem").** Um indicador que
DESLIZA fisicamente de uma aba pra outra (não só troca de cor) exige um
elemento próprio cuja posição/largura é medida — as abas hoje têm largura
variável (rótulo + contador), então um valor fixo em CSS ficaria errado
assim que o contador mudasse de dígito. Classe global `.tabIndicator`
(`src/styles/reset.css`, mesmo padrão de `.hoverGlow`/`.hoverZoom` —
definida uma vez, usada por classe literal no JSX de `InboxPanel.tsx` e
`TasksPanel.tsx`, nunca duplicada por CSS module):

- **Contrato pro componente (RUSTLINE):** o indicador é um `<span>` (ou
  similar) IRMÃO dos botões de aba/filtro, dentro do container (`.tabs`
  em `InboxPanel.module.css`, `.filter` em `TasksPanel.module.css` — os
  dois já ganharam `position: relative` pra ancorar o indicador
  corretamente). O JSX mede a aba ativa (`ref.offsetLeft`/`offsetWidth`) e
  escreve DUAS custom properties no PRÓPRIO CONTAINER (não no indicador —
  ele lê por herança, mesmo mecanismo de `--glow-x`/`--glow-y`):
  `--indicator-x` (deslocamento horizontal em `px`) e `--indicator-w`
  (largura em `px`). Remedir sempre que o conteúdo do botão mudar (não só
  quando o `active` troca — um contador que muda de dígito também muda a
  largura).
- **Por que `transform`/`width` e nunca `left`:** mover via `left` força
  recálculo de LAYOUT a cada quadro da transição; `translateX` é trabalho
  de compositor. `.tabIndicator` anima `transform` e `width` — nunca
  `left`.
- **Cor:** cada consumidor define `--tab-indicator-color` no próprio
  container (a cor que a aba ativa já usa hoje) — a classe compartilhada
  cai no fallback `--accent` se ninguém definir. `.tabs` usa
  `--dott-gradient-linear` (a mesma de `.tab.active`); `.filter` usa
  `--accent` (a mesma de `.filterToggle.active`).
- `prefers-reduced-motion`: `.tabIndicator` zera a transição — a troca
  fica direta, sem deslizar.

## 16. Seletor de prazo do modal "Nova tarefa" (TASK-320-extra, 28/08/2026)

JSX do RUSTLINE (`FolderNotesView.tsx`), acabamento do CANVAS
(`FolderNotesView.module.css`, classes `.novaTarefaPrazo*`). Linha
discreta entre o campo de texto e o rodapé do modal — ghost em repouso
(mesma receita de `.filterToggle` em `TasksPanel.module.css`), pra não
fazer o modal parecer formulário (a mesma reclamação de sempre). Gatilho
vira a data formatada quando há prazo escolhido; ativo reusa a receita de
`.acaoAtiva` (sobreviveu à reforma da seção 14). Ícone é `Icon name="prazo"`
— o mesmo já usado em `TasksPanel .acaoBtn` e no chip de deadline, mesma
gramática da decisão da seção 13, não um ícone novo. `input[type=date]`
real fica `position:absolute; inset:0; opacity:0` cobrindo o gatilho
inteiro (reuso de `.dateInput`) — sem isso o clique não abre o calendário
nativo.

## 17. Auditoria de Botão e Chip — inventário, papéis e a fronteira (TASK-327, 28/08/2026)

Preocupação do CEO, literal: "tem botoes que estao com comportamentos
diferentes, e com design diferentes tbm... deveriamos ter tokenizacao e
reuso, pra manter consistencia e ficar mais facil de manutencao... to
preocupado." **Ele está certo, e agora está medido, não estimado.** Grep em
todo `src/**/*.css` (14 arquivos de componente + `tokens.css`/`reset.css`)
por qualquer seletor que age como botão: a contagem só pelo NOME
(`btn`/`chip`/`acao`/`toggle`) já dava ~30; a auditoria completa (toda
classe com `cursor: pointer` fazendo papel de botão, inclusive as que não
têm "btn" no nome — `coverBtn`, `qAdd`, `folderNew`, `catAdd`,
`modalClose`, `back`, `abrir`, `excluir`, `limpar`, `groupDel`,
`cardRemove`, `cardAction`, `processClose`) chega a **54 seletores de
botão em 14 componentes**, fora ~15 de chip/pill e fora `Widget.module.css`
(mais 3 — o widget/orbe tem tokens próprios, fora de escopo desde sempre,
ver seção "Faça", item 8). `src/features/editor/` (5 classes:
`EditorToolbar.btn`/`.btnText`, `ImageViewer.btnEdit`,
`NoteEditor.modeToggle`/`.btnDelete`) entra no INVENTÁRIO abaixo — media-se
tudo — mas **não foi editado nesta rodada** (RUSTLINE mexendo lá em
paralelo, mesma fronteira das seções 12/14/16).

Esta seção é o CONTRATO: o conjunto mínimo que deveria existir, o
inventário medido com o veredito papel-vs-acidente por classe, a fronteira
que impede a próxima pessoa de inventar a 55ª classe, os buracos de token,
o diagnóstico do chip e a ordem de migração. **Nenhuma classe foi
renomeada, fundida ou removida nesta rodada** — a troca do JSX pra um
componente compartilhado é do RUSTLINE; isto aqui é o mapa que ele segue.

### 17.1 — O conjunto mínimo (a régua)

Todo botão do app é a combinação de 3 eixos, nunca mais:

| Eixo | Valores válidos | O que NÃO é este eixo |
|---|---|---|
| **Papel** | `primário` · `secundário/ghost` · `ícone-só` | Perigo, ativo, desabilitado são ESTADO (17.3), não papel |
| **Porte** | `lg` (44px) · `md` (28px) · `sm` (20px) | 24/26/30/32/36px não são portes novos — são os mesmos 3 medidos errado |
| **Rótulo** | com texto · só ícone | — |

Receita de cada papel (já vale desde a seção 4 "Botão" — esta tabela é a
régua que faltava pra saber qual classe existente cai em qual):

| Papel | `lg` 44px | `md` 28px | `sm` 20px |
|---|---|---|---|
| **Primário** | `--surface3`, sem borda, `hoverGlow` cheio | `--surface3`, sem borda, `hoverGlow` reduzido (`--glow-intensity:.7`) — só o Quick Capture usa este porte | não existe (ação primária nunca é minúscula) |
| **Secundário/ghost** | `--surface2`/transparente + borda `--border2` | idem, mais compacto | transparente, sem borda, hover `--surface3` |
| **Ícone-só** | não existe (ícone sozinho nunca é 44px) | 28px, transparente → hover `--surface3` | 20px, transparente → hover `--surface3`, só aparece no hover da linha-mãe |

**Estado** (modificador, nunca um papel novo — ver 17.3): `ativo/selecionado`
(fundo `--accent-s`, borda/texto `--accent`) e `perigo` (hover vira
`--danger`, ~13% de alfa — falta o token, ver 17.4).

### 17.2 — O inventário (papel vs acidente), classe por classe

**Primário `lg` — a receita vigente (referência: `Modal.module.css:136`,
`--surface3` + `hoverGlow`):**

| Classe | Arquivo:linha | Veredito |
|---|---|---|
| `.primary` | `components/Modal.module.css:136` | Referência |
| `.btnNew` | `features/folder/FolderNotesView.module.css:98` | Papel — igual à referência |
| `.btnNewBig` | `features/folder/FolderNotesView.module.css:265` | Papel, mas **duplicata**: única diferença de `.btnNew` é `padding:0 18px` contra `0 14px` — é contexto (17.3, exemplo A), não motivo pra classe própria |
| `.btnCapture` | `features/inbox/InboxPanel.module.css:225` | Primário, porém `md` (28px) por decisão já documentada (hot path do Quick Capture) — exceção legítima, mantém |

**Primário — ACIDENTE (preenchimento sólido `--accent`, receita de ANTES
da TASK-319/320, nunca migrada):**

| Classe | Arquivo:linha | O que faz de diferente | Veredito |
|---|---|---|---|
| `.primary` | `components/Settings.module.css:52` | `background: var(--accent)` sólido, sem `hoverGlow` | **Acidente** |
| `.btnPrimary` | `features/para/PARAGrid.module.css:439` | idem, 36px | **Acidente** |
| `.btnEdit` | `features/editor/ImageViewer.module.css:37` (editor, não editado) | idem no hover | **Acidente** |
| `.btnVoltar` | `features/tasks/TaskDetail.module.css:226` | idem, sólido sempre | **Acidente** |
| `.abrir` | `features/graph/Constellation.module.css:208` | idem | **Acidente** |
| `.btn` | `widget/Widget.module.css:574` | idem | Fora de escopo (widget), mas é o MESMO padrão antigo |

**Este é o achado mais concreto da auditoria: 6 botões "principais" em 6
telas ainda usam a receita de primário de ANTES da TASK-319/320** (fundo
`--accent` sólido, sem a barra/ponto quente que só acende no hover). Não é
variação de papel — é o MESMO papel, implementado em duas épocas do design
system, e as 5 telas de fora do pacote da própria rodada (Modal,
FolderNotesView, InboxPanel) nunca foram migradas depois.

**Secundário/ghost, com rótulo:**

| Classe | Arquivo:linha | Porte medido | Veredito |
|---|---|---|---|
| `.ghost` | `components/Modal.module.css:124` | 44 | Referência |
| `.btnNewAlt` | `features/folder/FolderNotesView.module.css:121` | 44 | Papel — igual (`--glow-intensity:.6` é hierarquia documentada, não acidente) |
| `.btnNewBigAlt` | `features/folder/FolderNotesView.module.css:411` | 44 | Papel, mas **duplicata** de `.btnNewAlt` (mesmo caso do par btnNew/btnNewBig) |
| `.btnCancel` | `features/para/PARAGrid.module.css:427` | 36 | Acidente de PORTE — nem `lg` nem `md` |
| `.btn` | `components/Settings.module.css:43` | ~33 (só padding, sem altura fixa) | Acidente de porte |
| `.btnCaptureFull` | `features/inbox/InboxPanel.module.css:248` | 28 | Papel — é o estado "cheio" do primário (`.btnCapture`), modificador, não papel novo |
| `.limpar` | `components/GlyphPicker.module.css:98` | 32 | Papel — ghost, porte quase-`md` (drift de 4px) |
| `.modeToggle` | `features/editor/NoteEditor.module.css:33` (editor) | ~30 | Papel — ghost pill |

**Ícone-só, porte `md` (24-32px, cabeçalho/toolbar/capa):**

| Classe | Arquivo:linha | Porte | Veredito |
|---|---|---|---|
| `.captureIconBtn` | `features/inbox/InboxPanel.module.css:175` | 28 | Referência |
| `.coverBtn` | `features/folder/FolderNotesView.module.css:47` | 28 | Papel — igual |
| `.coverBtn` | `features/para/PARAGrid.module.css:208` | 28 | **Acidente de duplicação** — MESMO nome, MESMA receita, copiada num segundo arquivo |
| `.back` | `components/Breadcrumb.module.css:12` | 28 | Papel — igual |
| `.hoverBtn` | `features/folder/FolderNotesView.module.css:211` | 24 | Papel — contexto legítimo (sobre foto, fundo preto translúcido próprio) |
| `.qAdd` | `features/para/PARAGrid.module.css:81` | 30 | Papel — cor do quadrante PARA é dado, não estilo (17.3, exemplo C) |
| `.close` | `components/Modal.module.css:49` | 26 | Acidente de porte |
| `.close` | `components/GlyphPicker.module.css:36` | 24 | Acidente de porte |
| `.processClose` | `features/inbox/InboxPanel.module.css:430` | 24 | Acidente de porte |
| `.modalClose` | `features/para/PARAGrid.module.css:371` | 24 | Acidente de porte |
| `.btn`/`.btnText` | `features/editor/EditorToolbar.module.css:13,29` (editor) | 26 | Mesma família ícone-só, editor não editado |
| `.btnOpen` | `widget/Widget.module.css:560` | 28 | Fora de escopo (widget) |

Os quatro "fechar modal" (`.close`×2, `.processClose`, `.modalClose`) são
a MESMA ação — "fechar esta superfície flutuante", sempre no canto
superior direito do cabeçalho — reimplementada 4 vezes com 3 tamanhos
(24/24/26) que ninguém decidiu de propósito.

**Ícone-só, porte `sm` (18-26px, ação inline que só aparece no hover da
linha-mãe):**

| Classe | Arquivo:linha | Porte | Veredito |
|---|---|---|---|
| `.cardRemove` | `features/inbox/InboxPanel.module.css:283` | 18 | Referência |
| `.cardAction` | `features/inbox/InboxPanel.module.css:297` | 18 | Papel — igual |
| `.groupDel` | `features/tasks/TasksPanel.module.css:240` | 18 | Papel — igual |
| `.novaTarefaPrazoLimpar` | `features/folder/FolderNotesView.module.css:509` | 20 | Papel — igual |
| `.acaoBtn` | `features/tasks/TasksPanel.module.css:262` | 26 | Acidente — conceitualmente a MESMA ação de linha (só aparece no hover do item), medida 26px em vez de ~20 |

**Toggle/filtro (pill `md`, com estado ativo):**

| Classe | Arquivo:linha | Veredito |
|---|---|---|
| `.filterToggle` | `features/tasks/TasksPanel.module.css:48` | Referência |
| `.novaTarefaPrazoBtn` | `features/folder/FolderNotesView.module.css:445` | Papel — igual |
| `.novaTarefaPrazoAtalho` | `features/folder/FolderNotesView.module.css:489` | Papel — variante sem borda em repouso (secundário do secundário, documentado, não acidente) |
| `.completedToggle` | `features/tasks/TasksPanel.module.css:225` | Papel DIFERENTE de verdade — é disclosure (abre/fecha lista), não seleção; o nome já deixa isso claro |

**O "estado ativo" — a mesma receita, escrita à mão 5 vezes:**

| Classe | Arquivo:linha | Regra |
|---|---|---|
| `.filterToggle.active` | `features/tasks/TasksPanel.module.css:65` | `background: var(--accent-s); border-color/color: var(--accent)` |
| `.btnActive` | `components/Titlebar.module.css:58` | idem |
| `.acaoAtiva` | `features/tasks/TasksPanel.module.css:291` | idem (+ `opacity:1 !important`) |
| `.novaTarefaPrazoBtnAtivo` | `features/folder/FolderNotesView.module.css:466` | idem |
| `.cellAtiva` | `components/GlyphPicker.module.css:86` | idem |

**Veredito: acidente puro.** Valor por valor é a mesma receita — nasceu
cinco vezes porque cada componente escreveu do zero em vez de puxar de um
lugar só. Candidata a utilitário global (`.stateActive` em `reset.css`,
mesmo padrão de `.hoverZoom`/`.hoverGlow`), não a cinco cópias.

**Fora das tabelas acima (não são botão): checkboxes** (`.check` em
`TasksPanel.module.css:147`, `.tarefaCheck` em
`FolderNotesView.module.css:347`, `.check` em `TaskDetail.module.css:23`)
são a MESMA receita (16-17px, borda `--border-control`, preenche
`--success` quando marcado) em 3 arquivos — mesmo diagnóstico do "estado
ativo", registrado aqui para não escapar da lista, mas fora do escopo de
"botão" que o CEO perguntou.

### 17.3 — A fronteira: papel vira variante, contexto não

> **Se a diferença está em QUEM o botão é (o que ele faz, quanto pesa na
> hierarquia da tela) → é variante de PAPEL, ganha nome de papel
> (primário/secundário/ícone). Se a diferença está em ONDE o botão mora (a
> largura do container, o vizinho ao lado, se está sobre foto ou
> superfície plana, a cor de um dado como o quadrante PARA) → NÃO é classe
> nova. Resolve com padding/gap do container, uma prop booleana
> (`fullWidth`, `sobreImagem`) ou uma variável CSS que o pai define —
> nunca com um nome de componente diferente.**

Três exemplos medidos nesta auditoria:

- **A — `.btnNew` vs `.btnNewBig`:** mesma receita byte a byte; a única
  diferença é `padding: 0 14px` contra `0 18px` porque um vive numa barra
  apertada (ao lado de um contador) e o outro centraliza sozinho num
  estado vazio. Contexto — devia ser uma prop do mesmo componente.
- **B — os quatro "fechar modal"** (17.2): mesma ação, mesmo lugar
  relativo, reimplementada 4 vezes. Nenhum motivo de contexto justifica —
  devia ser uma implementação só.
- **C — `.qAdd` muda de cor por quadrante PARA** (vermelho em Projetos,
  azul em Áreas, verde em Recursos, cinza em Arquivo): isto **é** contexto
  legítimo — a cor vem de DADO (`--q-p`/`--q-a`/`--q-r`/`--q-ar`, tokens
  que já existem), não de um papel de botão diferente. Continua sendo UM
  `.qAdd` com a cor herdada do container — o padrão que a família de chip
  (17.5) deveria copiar.

### 17.4 — Buracos de token (por que alguém "precisa escrever do zero")

Medido em `tokens.css`: hoje só existem tokens de raio e de cor de
superfície/estado (`--accent-s`). Faltam:

1. **Altura de botão.** Nenhum `--btn-h-lg/md/sm` — os 44px do papel
   primário/secundário estão certos porque foram copiados de exemplo em
   exemplo, mas os outros portes (17.2) já mostram 24/26/28/30/32/36
   fazendo o trabalho de só dois números (28 e 20). Sem token, cada botão
   novo "chuta" um valor próximo.
2. **Tinta de estado além de `--accent-s`.** Não existe `--danger-s`/
   `--warn-s`/`--success-s`. Por isso o hover "perigo" foi escrito à mão
   em pelo menos 7 lugares — `TaskDetail.excluir:219` `rgba(224,64,64,.14)`;
   `InboxPanel.acaoPerigo:499` `.13`; `TasksPanel.acaoPerigo:296`/
   `.groupDel:248` `.15`; `NoteEditor.btnDelete:202` (editor) `.12`;
   `FolderNotesView.prazoAtrasado:403` `.15`; `PARAGrid .q-projects .qAdd:96/97`
   `.12`/`.22` — sete valores de alfa (`.12/.13/.14/.15/.16/.18/.22`) pra
   MESMA ideia ("fundo de perigo, discreto").
   **Achado extra, não só estético:** as sete regras usam
   `rgba(224, 64, 64, X)` — o RGB literal do `--danger` do TEMA ESCURO
   (`#e04040`). No tema claro `--danger` é `#c0392b` (192,57,43); estas
   sete continuam pintando o vermelho do tema ESCURO mesmo com o app no
   tema claro, porque usam número cravado em vez de `var(--danger)`/
   `color-mix()`. É um defeito de tema real (a confirmar no pixel — não
   tenho como renderizar aqui), não só preferência de consistência: a
   fragmentação de classe escondeu um bug atrás de sete cópias que
   ninguém comparou lado a lado.
3. **Ícone-só sem porte nomeado.** `--icon-btn-md` (28px) /
   `--icon-btn-sm` (20px) resolveriam o drift 18/20/22/24/26/28/30/32
   medido em 17.2.

Nenhum destes tokens foi criado nesta rodada — é a lista de compras pra
quem consolidar (ver 17.6).

### 17.5 — O chip: mesmo problema, causa diferente

Os nomes `.chip-<tipo>`/`.type-<tipo>` (`InboxPanel.module.css:352-364`,
`Widget.module.css:609-621`, réplica intencional já documentada na seção
10) **já usam token certo** (`color-mix()` sobre `--accent`/`--green`/
`--warn`/`--danger`, nunca hex cravado — o defeito de tema do item 17.4
não se repete aqui). O problema não é o CSS, é o RECORTE: os 13 tipos de
card (nota, imagem, áudio, vídeo, arquivo, prompt, contato, url, link,
código, tarefa, ideia, shell) viram 13 nomes de classe, mas só existem
**5 tons** de verdade:

| Tom | Tipos que caem nele | Token |
|---|---|---|
| Neutro | nota, imagem, áudio, vídeo, arquivo, prompt, contato | `--surface3`/`--fg3` |
| Accent | url, link | `--accent` (15%) |
| Sucesso | código, tarefa | `--green` (15%) |
| Aviso | ideia | `--warn` (15%) |
| Perigo | shell | `--danger` (15%) |

**Resposta à pergunta do CEO: sim — a família certa é "um chip com o tom
vindo do tipo", não treze classes.** O tipo já mapeia pra um tom semântico
hoje (a tabela acima são os mesmos agrupamentos que já existem nos dois
arquivos, só escritos 13+13=26 vezes em vez de 5). O alvo é uma família de
5 classes (`.chip-neutral/accent/success/warning/danger`) mais um mapa
`CardType → tom` — que já existe em espírito no `TYPE_CLASS`/`TECNICO` de
`InboxPanel.tsx`. Calcular a classe a partir do mapa em vez de escrever o
nome do tipo literal no JSX é mudança de `.tsx` — do RUSTLINE, não desta
rodada. A duplicação entre `InboxPanel.module.css` e `Widget.module.css`
(as mesmas 5 regras de tom, coladas em dois arquivos) é a mesma doença já
registrada na seção 10 do histórico — nunca foi resolvida na raiz, só
recolorida.

### 17.6 — Ordem de migração proposta (faseada — não cabe numa rodada)

**Dito sem enfeite, como pedido: isto precisa de várias rodadas.** O app
só tem teste automatizado em duas ilhas (comandos de markdown e dado
local) — não há teste visual, e este posto de trabalho não tem ferramenta
de captura de tela pra conferir antes/depois. Consolidar em massa sem isso
é o risco exato que foi levantado. Ordem proposta, do mais seguro pro mais
arriscado:

1. **Fase 0 (esta rodada): só documentação.** Este contrato — zero bytes
   de `.css`/`.tsx` mudaram. Risco zero, porque nada mudou.
2. **Fase 1 — tokens novos, aditivos, ninguém consome ainda.**
   `--btn-h-lg/md/sm`, `--icon-btn-md/sm`, `--danger-s/--warn-s/--success-s`
   em `tokens.css`. Risco zero de quebra visual — são variáveis que nada
   usa ainda. Verificação: abrir o app, nada deveria ter mudado (isso É a
   prova).
3. **Fase 2 — os 6 "primário acidente"** (Settings, PARAGrid, ImageViewer,
   TaskDetail, Constellation, e Widget se um dia entrar em escopo). Maior
   risco de REGRESSÃO VISUAL (cor sólida → neutro+hover é mudança visível
   a olho nu), menor risco de quebra funcional (classe e JSX não mudam de
   nome, só a receita CSS por trás). Fazer um de cada vez; sugestão de
   ordem: Settings e TaskDetail primeiro (telas simples, fácil de conferir
   em 10 segundos), PARAGrid e Constellation depois. Verificação sem
   Playwright: comparar contra um print "antes" tirado pelo coordenador ou
   pelo CEO, nos dois temas, antes de cada troca.
4. **Fase 3 — os 4 "fechar modal" duplicados + o "estado ativo" 5×.** Aqui
   o objetivo já é REDUZIR classes, não só trocar cor — mais seguro fazer
   junto do RUSTLINE (que já está mexendo em estrutura de JSX pro
   indicador de aba) do que o CANVAS mudar o CSS sozinho e torcer pra não
   colidir.
5. **Fase 4 — os pares `.btnNew`/`.btnNewBig` (e `Alt`/`BigAlt`) e os
   portes 24/26/30/32/36px.** Menor prioridade: já usam o papel certo,
   só o porte está levemente errado — diferença de 2-8px não salta aos
   olhos como a Fase 2.
6. **Fase 5 — o chip (17.5).** Depende de JSX (o mapa tipo→tom precisa
   existir em código, hoje só existe implícito nas duas listas de CSS) —
   é RUSTLINE, depois que o indicador de aba atual fechar.

**O que não recomendo:** consolidar tudo num commit só. É o cenário que o
coordenador pediu pra evitar — sem teste visual automatizado, um commit
grande esconde qual das N mudanças quebrou algo, se algo quebrar.

### 17.7 — Fases 1 e 2 executadas (28/08/2026, mesma rodada do TASK-329)

**Fase 1 (tokens, aditivo, risco zero) — feito em `tokens.css`:**
`--danger-s`/`--warn-s`/`--success-s` (`color-mix()` a 15% sobre o token de
cada tema — ver 17.4), `--btn-h-lg/md/sm` (44/28/20px), `--icon-btn-md/sm`
(28/20px). Nenhum consumidor foi trocado pra usar `--btn-h-*`/`--icon-btn-*`
ainda (isso é Fase 4) — só `--danger-s`/`--warn-s` já nascem consumidos
pelos consertos abaixo.

**Fase 2 (os 6 primários-acidente) — 4 de 6 migrados, 1 fora por
instrução explícita, 1 fora pela fronteira do editor:**

| Classe | Arquivo | Resultado |
|---|---|---|
| `.primary` | `components/Settings.module.css` | Migrado — `--surface3`/`--fg`, hover `opacity:.88` |
| `.btnPrimary` | `features/para/PARAGrid.module.css` | Migrado — idem |
| `.btnVoltar` | `features/tasks/TaskDetail.module.css` | Migrado — idem (ganhou hover, não tinha nenhum antes) |
| `.abrir` | `features/graph/Constellation.module.css` | Migrado — idem (ganhou hover, não tinha nenhum antes) |
| `.btn` | `widget/Widget.module.css` | **Fora por instrução do coordenador** — "o widget é outra janela, não escala com o zoom e tem regra própria; migrar agora é risco sem ganho" |
| `.btnEdit` | `features/editor/ImageViewer.module.css` | **Fora pela fronteira do editor** — RUSTLINE construindo `src/features/editor/` nesta mesma rodada; a ordem original da Fase 2 citava este arquivo, mas a fronteira desta rodada ("não encoste em nada lá") é posterior e mais específica. Sinalizado ao coordenador em vez de decidido sozinho — fica pendente pra quando o editor fechar |

**Limite honesto do que "migrado" significa aqui:** troquei o PREENCHIMENTO
(`--accent` sólido → `--surface3` neutro) e o hover (`filter`/`background`
de marca → `opacity:.88`), que é o que fazia esses botões contradizerem a
regra vigente. **Não** apliquei a barrinha-acende-no-hover (classe
`hoverGlow`) — isso exige adicionar a classe no JSX de cada botão, que é
do RUSTLINE. Os 4 botões migrados ficam com o repouso neutro correto e um
hover funcional (opacity), só sem o "brilho segue o cursor" que o primário
de referência (`Modal.primary`, `.btnNew`) tem — registrado como próximo
passo em vez de fingido pronto.

**O vermelho cravado — 6 de 7 corrigidos, 1 fora pela fronteira do editor,
1 achado extra corrigido de graça:**

| Lugar | Antes | Depois |
|---|---|---|
| `TaskDetail.module.css` `.excluir:hover` | `rgba(224,64,64,.14)` / borda `rgba(224,64,64,.45)` | `var(--danger-s)` / borda `color-mix(in oklab, var(--danger) 45%, transparent)` |
| `InboxPanel.module.css` `.acaoPerigo:hover` | `rgba(224,64,64,.13)` | `var(--danger-s)` |
| `TasksPanel.module.css` `.acaoPerigo:hover` | `rgba(224,64,64,.15)` / borda `rgba(224,64,64,.4)` | `var(--danger-s)` / borda `color-mix(in oklab, var(--danger) 40%, transparent)` |
| `TasksPanel.module.css` `.groupDel:hover` | `rgba(224,64,64,.15)` | `var(--danger-s)` |
| `FolderNotesView.module.css` `.prazoAtrasado` | `rgba(224,64,64,.15)` | `var(--danger-s)` |
| `FolderNotesView.module.css` `.prazoHoje` (achado extra, mesmo defeito com `--warn`, mesma linha do de cima) | `rgba(217,140,58,.15)` | `var(--warn-s)` |
| `features/editor/NoteEditor.module.css` `.btnDelete:hover` | `rgba(224,64,64,.12)` | **Não tocado — fronteira do editor.** Pendente. |
| `PARAGrid.module.css` `.q-projects .qAdd` | `rgba(224,64,64,.12/.22)` | `color-mix(in oklab, var(--q-p) 12%/22%, transparent)` — **não usei `--danger-s` aqui**: esta cor não é o estado "perigo", é o quadrante Projetos (`--q-p`), que só *coincide* com o hex de `--danger` no tema escuro (os dois são `#e04040`) e diverge no claro (`--q-p:#c83030` vs `--danger:#c0392b`). Usar `--danger-s` teria corrigido o sintoma (tema) mas errado a semântica (ligaria "criar pasta em Projetos" ao conceito de perigo). |

**Prova sem captura de tela (não tenho a ferramenta neste posto):** dá pra
provar a diferença por CÁLCULO, não por olho. Tema escuro: `--danger` é
`#e04040` (224,64,64) — o valor cravado batia exatamente, zero diferença
visual aí, como esperado (o bug só existe no OUTRO tema). Tema claro:
`--danger` é `#c0392b` (192,57,43) — antes do conserto, `.acaoPerigo:hover`
no tema claro pintava `rgba(224,64,64,.15)`, ou seja, o vermelho ESCURO
(224,64,64) a 15% de alfa, quando deveria pintar o vermelho CLARO
(192,57,43). Depois do conserto, `color-mix(in oklab, var(--danger) 15%,
transparent)` resolve `var(--danger)` no tema ativo — no claro, mistura
192,57,43; no escuro, mistura 224,64,64. **A prova é que os dois temas
agora leem o MESMO token em vez de um deles ler um número cravado que
pertencia ao outro tema** — matematicamente corrigido; a confirmação no
pixel (a diferença é sutil — os dois tons de vermelho são próximos —
mas real) fica para quem for reconstruir e olhar as telas.

Não migrado nesta rodada (fica para Fases 3-5, já avisado): os 4 "fechar
modal" duplicados, o "estado ativo" copiado 5×, os pares
`.btnNew`/`.btnNewBig`, os portes 24/26/30/32/36px, e o chip de 13
classes. As três irmãs de `.qAdd` (`.q-areas`/`.q-resources`/`.q-archives`)
têm o mesmo defeito de RGB cravado que a de Projetos tinha, com outras
cores (`--q-a`/`--q-r`/`--q-ar`) — fora do pedido ("o vermelho cravado"),
registrado como Known Gap.

### 17.8 — Fases 3 e 4 executadas (TASK-334, 28/08/2026)

**Fase 3 — os 4 "fechar modal" (`.close`×2, `.processClose`,
`.modalClose`):** convergidos pro MESMO tamanho, `--icon-btn-md` (28px) —
o porte que `.captureIconBtn`/`.coverBtn`/`.back` já usavam pra ícone-só
em cabeçalho/toolbar. Antes: 26px (`Modal.close`), 24px
(`GlyphPicker.close`), 24px (`InboxPanel.processClose`), 26px
(`PARAGrid.modalClose`) — quatro decisões independentes, nenhuma
combinando com a outra. Depois: os quatro leem `var(--icon-btn-md)`, uma
fonte só. **Limite honesto:** as 4 classes continuam existindo como CSS
separado em 4 arquivos (`Modal.module.css`, `GlyphPicker.module.css`,
`InboxPanel.module.css`, `PARAGrid.module.css`) — não viraram um
componente único. Fundir de verdade exigiria ou (a) um componente React
compartilhado (mudança de `.tsx`, fora do alcance desta rodada — RUSTLINE)
ou (b) `composes: X from global` entre CSS modules, uma feature padrão do
css-modules que eu não tenho como VERIFICAR aqui (não há build/teste
visual neste posto de trabalho) — arriscar sintaxe não testada numa
feature que, se errada, quebra o build inteiro (não só um botão feio) não
parecia a troca certa por um ganho cosmético. Convergi o VALOR (tamanho),
que resolve o defeito que o CEO via na tela; a duplicação de CÓDIGO fica
registrada como dívida menor, não escondida.

**Fase 4 — o "estado ativo" copiado 5× (`TasksPanel.filterToggle.active`/
`.acaoAtiva`, `Titlebar.btnActive`, `FolderNotesView
.novaTarefaPrazoBtnAtivo`, `GlyphPicker.cellAtiva`):** os 5 agora
referenciam 3 tokens novos e semânticos —
`--state-active-bg`/`--state-active-border`/`--state-active-fg`
(`tokens.css`, hoje alias de `--accent-s`/`--accent`/`--accent`) — em vez
de `--accent-s`/`--accent` direto. Zero mudança visual (mesmo valor
resolvido); o ganho é que "o que é estado ativo" agora tem UM ponto de
origem — mudar a cor do estado ativo no app inteiro é uma linha em
`tokens.css`, não uma caça a 5 arquivos. Mesma limitação da Fase 3: os 5
blocos de CSS continuam existindo (o valor é compartilhado, a REGRA em si
não foi fundida numa classe só, pelo mesmo motivo — `.tsx`/`composes` fora
do alcance ou não verificável).

**Fase 5 (chip de 13 classes) e o resto dos portes desalinhados
(24/26/30/32/36px) continuam fora de escopo** — dependem de JSX
(RUSTLINE) ou são baixa prioridade visual, como já registrado.

## 18. Sistema de Profundidade — Elevação e Shimmer (TASK-329, 28/08/2026)

CEO: "implementa shadow depth em todo app, estavamos sem mas no seu
exemplo eu gostei, quero que hierarquize todos elementos pra cada um ter
uma altura, seguindo os melhores principios de design ja estudados, so
replica, com blur glow etc necessario." Ele viu profundidade na proposta
da tela de escrita (`preview/editor-nota-proposta.html` — o cartão de
imagem, a barra flutuante por seleção, o menu "/") e quer isso como
SISTEMA, não como acidente de uma tela só.

### 18.1 — A escala: 6 degraus, poucos de propósito

| Token | Papel | Regra de uso |
|---|---|---|
| `--elev-0` | Fundo (a mesa, o piso da janela) | Nunca leva sombra — é o chão, não pode "flutuar" |
| `--elev-1` | Repouso (cartão parado, painel fixo do app: cabeçalho/rodapé/barra lateral) | O degrau mais comum da tela — a maioria dos elementos vive aqui |
| `--elev-2` | Realce (cartão em hover, item com destaque físico) | Só quando o elemento fisicamente "sobe" (hover que já usa `translateY`/`hoverZoom`) — não é todo hover, ver 18.3 |
| `--elev-3` | Flutuante leve (popover, tooltip, menu de contexto, menu "/", barra de formatação por seleção, toast) | Paira sobre o conteúdo mas não bloqueia a tela (sem overlay escurecido) |
| `--elev-4` | Comando/decisão (modal, busca Ctrl+K, seletor de símbolo, "o que fazer com este card") | Bloqueia a tela (overlay escurecido) — é onde `--shadow` já vivia |
| `--elev-5` | Manipulação ativa (o que a pessoa está arrastando agora) | O mais raro do app — hoje só `.dragGhost`. Se aparecer um segundo consumidor, questione se ele é MESMO tão perto do usuário quanto uma nota sendo arrastada |

`--elev-1` (claro) é byte a byte o valor que já existia em
`--elevation-card`; `--elev-4` (os dois temas) é byte a byte o valor que já
existia em `--shadow`. **Os dois tokens antigos continuam existindo, agora
como alias** — nada que já consome `--elevation-card`/`--shadow` precisa
mudar. Consumidor novo usa `--elev-*`.

### 18.2 — A hierarquia: cada família, um degrau (a tabela que evita a próxima pessoa inventar a 7ª altura)

| Família de elemento | Degrau | Onde mora hoje |
|---|---|---|
| Piso da janela, "mesa" atrás dos shells | `--elev-0` | `--bg`, `--desk` |
| Cartão em repouso (Inbox, nota da pasta, pasta do PARA) | `--elev-1` | `.card`/`.folderCard` em `InboxPanel`/`FolderNotesView`/`PARAGrid` |
| Painel fixo do app (cabeçalho/rodapé da nota, barra de abas, breadcrumb) | `--elev-1` | `.header`/`.statusBar`/`.connections` (`NoteEditor`), `.tabs` (`InboxPanel`), `.breadcrumb` |
| Cartão em hover / item em destaque | `--elev-2` | `.card:hover`, `.folderCard:hover` — **hoje só ganham `translateY`/borda mais clara, ainda não o token novo (ver 18.5, não migrado nesta rodada)** |
| Chip/toolbar flutuante por seleção, menu "/", tooltip nativo, menu de contexto | `--elev-3` | Ainda não existe no app — é o que a proposta da tela de escrita introduz; RUSTLINE consome direto |
| Toast (aviso) | `--elev-3` | `Toast.module.css` — não bloqueia a tela, convive com o resto, mesmo peso de um popover |
| Modal, busca (Ctrl+K), seletor de símbolo, "o que fazer com este card" | `--elev-4` | `Modal.module.css`, `SearchModal.module.css`, `GlyphPicker.module.css`, `.processModal` (`InboxPanel`) |
| Camada de arraste (o card/nota sendo arrastado agora) | `--elev-5` | `.dragGhost` (`App.module.css`) |

A pergunta que decide cada linha, como pedido: **o que está mais perto do
usuário AGORA?** Um cartão só está ali, esperando ser clicado — baixo. Um
menu que a pessoa ABRIU (seleção, "/", clique no ⋮) subiu na mão dela —
mais alto que o cartão, mas ainda não trava a tela. Um modal INTERROMPE (a
pessoa não pode fazer outra coisa até responder) — mais alto ainda. O que
a pessoa está literalmente segurando com o cursor (arrastar) é o mais
perto que existe — o topo.

### 18.3 — Como a profundidade se expressa em cada tema (o erro clássico
### que a ordem do CEO avisou pra não cometer)

**Não é a mesma sombra, mais fraca no escuro — é uma receita diferente
para o MESMO degrau, com a MESMA fonte de luz.** Sombra preta sobre um
fundo já quase preto (`--surface:#141417` contra `--bg:#0d0d10`) some —
zero contraste, é matemática, não gosto. Portar `--elev-4` do claro
(sombra difusa cinza-azulada) pro escuro literalmente não pintaria nada
visível — o erro que a ordem citou.

A fonte de luz do app é **de cima pra baixo**, coerente nos dois temas:

- **Claro:** a luz bate de cima, a sombra cai embaixo do elemento — exatamente
  `--elevation-card`/`--shadow` já faziam. A escala só estica o alcance e a
  suavidade da sombra a cada degrau (raio maior, alfa um pouco mais alto),
  nunca fica mais ESCURA/dura (dureza lê como sujeira, não como
  profundidade).
- **Escuro:** a MESMA luz de cima agora aparece como um **friso claro no
  topo do elemento** (`inset`, simulando a borda pegando um fiapo de luz —
  é o "com glow necessário" que a ordem pediu) **mais uma sombra de
  contato suave embaixo** (que FUNCIONA aqui porque o elemento não está
  sobre preto puro — está sobre `--surface`/`--bg`, que têm luminância
  suficiente pra uma sombra preta suave aparecer). Cresce em dois eixos a
  cada degrau: o friso fica mais claro/mais grosso, a sombra fica maior. No
  `--elev-5` (o mais raro) some um terceiro ingrediente — um halo suave
  (`0 0 24px rgba(0,0,0,.35)`) que reforça "isto está pairando", não
  decoração.

### 18.4 — Regras (o que separa profundidade de enfeite)

1. **Uma fonte de luz só, coerente no app inteiro.** Luz de cima, sempre —
   nenhum componente inventa a própria direção de sombra.
2. **Degrau alto é raro por desenho.** `--elev-5` deveria ter UM consumidor
   (`.dragGhost`). Se aparecer um segundo, pergunte se ele é mesmo tão
   "na mão do usuário agora" quanto um arrasto — provavelmente não é, e o
   certo é `--elev-4` ou `--elev-3`.
3. **Nunca sombra colorida onde ela não significa nada.** Toda sombra desta
   escala é neutra (preto ou branco a baixa alfa) — cor de marca não
   aparece aqui; ela já tem o gradiente (seção 2) pros próprios momentos.
   Uma sombra roxa/laranja embaixo de um card não é "profundidade
   estilizada", é ruído.
4. **Nada de sombra em elemento que já está no fundo.** `--elev-0` é
   `none`, sempre — dar sombra ao piso da janela ou a um painel que nunca
   sai do lugar (a "mesa") contradiz o próprio conceito.
5. **Brilho/desfoque só quando o elemento É luminoso, nunca por estar
   bonito.** O `hoverGlow` (seção 8) já segue essa regra — a brasa acende
   porque aquele botão É a marca acendendo, não decoração aplicada por
   cima. O friso claro do `--elev-2..5` escuro segue a mesma lógica: é a
   BORDA pegando luz de uma fonte real (a de cima), não um brilho
   arbitrário.

### 18.5 — Custo (a pergunta que a ordem pediu pra responder sem enfeite)

**`box-shadow` não é compositado pela GPU como `transform`/`opacity`** — o
navegador precisa REPINTAR o elemento a cada quadro em que a sombra muda
(a mesma razão pela qual `tokens.css` já proíbe animar `width`/`top` em
vez de `transform`). Isso importa em dois cenários bem diferentes:

- **Um elemento por vez trocando de degrau (hover de um card, abrir UM
  menu):** custo desprezível — é um repaint pequeno, uma vez, no ritmo de
  interação humana. **Nenhum degrau é pesado neste uso.**
- **Muitos elementos trocando de degrau ao mesmo tempo** (ex.: uma lista
  inteira de cards ganhando `--elev-2` num mount, ou um filtro que
  reconstrói 30 linhas de uma vez): **isto SERIA pesado, e por isso a
  regra já em vigor no app (seção "Movimento" de `tokens.css`, e o próprio
  `appearUp`) nunca anima sombra em massa — cards que aparecem/somem usam
  `opacity`/`translateY`, nunca uma transição de `box-shadow`.** A escala
  de elevação não muda essa regra; ela só nomeia o valor final que o
  elemento já tinha, estático, quando a animação (de opacidade/posição)
  termina.

**Degrau que EU sinalizaria como caro se fosse aplicado sem essa disciplina:**
`--elev-2` (hover de cartão), porque é o único que troca em resposta a um
evento de ALTA FREQUÊNCIA (o mouse passeando rápido por uma grade de
cards, cada um entrando e saindo do hover em sucessão) — se cada card
tivesse uma transição de `box-shadow` de 200ms+ disparando a cada
`mouseenter`, um mouse rápido sobre uma grade de 20+ cards poderia
acumular repaints o bastante pra engasgar em hardware fraco. Mitigação já
parcialmente em vigor (`--dur-base`, 170ms, é curto) — recomendo manter a
transição de `box-shadow` SEMPRE curta (`--dur-base` ou menos) neste
degrau especificamente, e nunca aplicar `--elev-2` a uma linha de lista de
largura total (a mesma exceção que `.hoverZoom` já documenta em
`reset.css`) — só a cartões isolados, que é onde already vive.

### 18.6 — Shimmer (brilho de carregamento)

Pedido explícito do CEO, parte deste sistema. Receita em
`src/styles/reset.css` (classe `.shimmer`) + tokens `--shimmer-gradient`/
`--shimmer-duration` (`tokens.css`) — pronta pro RUSTLINE aplicar por
classe, mesmo padrão de `hoverGlow`/`hoverZoom`/`tabIndicator`.

**Onde aparece:** só em cima de um bloco que ainda NÃO chegou (hoje: o
único candidato real do app é a imagem sendo salva/carregada na nota —
`ImageViewer`/`NoteEditor`, que o RUSTLINE está construindo agora).

**Duração:** `--shimmer-duration: 1.5s`, uma volta completa, sempre a
mesma — nenhum consumidor escreve a própria duração.

**O que o shimmer NUNCA pode fazer** (as quatro condições da ordem, mais
uma):
1. **Nunca em conteúdo já carregado** — é sinal de estado, não decoração;
   suma no instante em que o conteúdo real chega, sem fade de saída nem
   tempo mínimo artificial de exibição.
2. **Nunca vários blocos fora de sincronia** — a regra não é "sincronizar
   relógios" (fisicamente cada elemento começa a contar quando entra no
   DOM), é mais simples e mais forte: **nenhum consumidor escreve a
   própria duração ou delay.** Todo `.shimmer` da tela usa exatamente
   `--shimmer-duration` e delay zero — a variação aleatória "pra dar
   vida" é o erro clássico que transforma skeleton em confete.
3. **Nunca cor de marca** — o gradiente é sempre `--surface2`/`--surface3`
   (a mesma regra da seção 18.4, item 3, estendida pro shimmer).
4. **Respeita `prefers-reduced-motion`** — para de variar, fica num tom
   parado (não continua animando mais devagar).

### 18.7 — O que existe agora vs. o que falta

**Feito nesta rodada (aditivo, tokens + 1 classe utilitária):**
`--elev-0..5` (dois temas) em `tokens.css`; `--shimmer-gradient`/
`--shimmer-duration` em `tokens.css`; classe `.shimmer` em `reset.css`.
Nenhum componente existente foi migrado pra consumir `--elev-2/3/5` (isso
IMPLICARIA mudar CSS de componente por componente, fora do pedido desta
rodada, que era o SISTEMA) — `--elev-1` e `--elev-4` já são consumidos
via os alias (`--elevation-card`/`--shadow`), então parte da escala já
está "no ar" sem ninguém precisar tocar em nada.

**O que falta (RUSTLINE, na tela de escrita, e além dela depois):** aplicar
`--elev-3` na barra flutuante por seleção, no menu "/" e nos chips sobre a
imagem da proposta (`preview/editor-nota-proposta.html`); aplicar
`.shimmer` no bloco de imagem carregando; e, fora desta rodada, migrar
`.card:hover`/`.folderCard:hover` de `translateY` solto pra `--elev-2` de
verdade (hoje já fazem metade do trabalho — falta só o box-shadow).

## 19. Aba/filtro — componente único `TabBar` (TASK-333, 28/08/2026)

CEO: "esses itens de abas não seguem uma consistência, cada um tem seu
design e quero todos iguais... tem indicador de quantidade e a barrinha.
E quero que a aba como um todo, o conteúdo, quando eu troco de aba tenha
uma animação, não só na parte superior mas no conteúdo, algo elegante."

**Varredura do app inteiro por grupo de aba/filtro** (não só os dois que o
CEO fotografou): o estado (`store.ts`) só tem DOIS grupos de verdade —
`leftTab` (Inbox/Tags) e `filterPrazo` (PRAZO/Tudo). PARA é uma grade de
quadrantes estáticos (não alterna conteúdo), Settings usa `<section>`
fixas (não abas), GlyphPicker não tem categoria. **2 de 2 migrados** —
cobertura completa, não parcial.

**Antes:** dois desenhos diferentes para o mesmo conceito.
`InboxPanel.module.css .tab` (sublinhado: sem fundo/borda, texto
maiúsculo + ícone + contador em pill, borda inferior de 2px que vira
gradiente quando ativo) contra `TasksPanel.module.css .filterToggle`
(pílula: fundo transparente, borda 1px sempre visível, ativo preenche
`--state-active-bg`). Os DOIS já tinham a barrinha deslizante
(`.tabIndicator`, TASK-323) por baixo — o mecanismo de deslizar já era
único, só a CASCA visual (e a lógica de medição, copiada byte a byte nos
dois arquivos) não era.

**Depois:** um componente, `src/components/TabBar.tsx` +
`TabBar.module.css`. O padrão vencedor (rótulo + ícone + contador
opcional + sublinhado ativo + barrinha deslizante) venceu porque é o que
já tinha indicador de quantidade — o pedido explícito do CEO. Contrato:

```
<TabBar
  activeKey={...}
  onChange={key => ...}
  items={[{ key, label, icon, count?, title? }, ...]}
  variant="standalone" | "inline"   // default standalone
  indicatorColor?: string           // fallback --accent
/>
```

- **`count` é opcional por desenho** — Inbox/Tags usa (`inbox.length`/
  `tags.length`, o indicador de quantidade que o CEO pediu); PRAZO/Tudo
  não tem uma contagem própria e simplesmente omite a prop — o MESMO
  componente, não um componente "com contador" e outro "sem".
- **`variant="standalone"`** (Inbox/Tags): a aba É o cabeçalho inteiro —
  altura 44px, borda inferior e padding lateral próprios.
- **`variant="inline"`** (PRAZO/Tudo): a aba mora DENTRO de um cabeçalho
  que já tem altura/borda/padding (`TasksPanel .header`, título à
  esquerda + filtro à direita, TASK-322) — o componente só contribui a
  fileira de botões + a barrinha, sem chrome duplicado
  (`.tabs.inline { border-bottom:none; padding:0; height:100% }`).
- **A lógica de medição (useLayoutEffect + ResizeObserver que escreve
  `--indicator-x`/`--indicator-w`) foi extraída pro componente** — antes
  vivia copiada em `InboxPanel.tsx` e `TasksPanel.tsx` (mesma lógica,
  dois lugares); agora é uma implementação só, parametrizada pelas refs
  dos botões.
- **Consequência visual:** PRAZO/Tudo perde a pílula com contorno e ganha
  o sublinhado. Cor da barrinha deslizante: os DOIS consumidores passam
  `indicatorColor="var(--dott-gradient-linear)"` - a mesma reducao linear
  que `.tab.active` ja usa no texto/borda dos dois grupos. DESIGN.md
  secao 1 ja reservava o gradiente pra "botao primario, badge de
  contagem, **tab ativa**" - PRAZO/Tudo virou aba de verdade nesta
  rodada (nao mais filtro-pilula), entao herda a mesma regra que
  Inbox/Tags sempre teve, em vez do `--accent` solido que
  `.filterToggle.active` usava antes (que continua sendo o FALLBACK do
  componente, usado so se um consumidor futuro nao passar
  `indicatorColor`). `TasksPanel.module.css .filter`/
  `.filterToggle`/`.filterToggle.active` saíram do arquivo, sem
  consumidor — a entrada correspondente no inventário da seção 17.2
  ("Toggle/filtro — `.filterToggle`, referência") fica **superada por
  este componente**, não apagada da história.

**Conteúdo do painel anima na troca (a segunda parte do pedido) —
`.tabContent` (classe global, `reset.css`, mesmo padrão de
`.hoverGlow`/`.tabIndicator`):**

- Inbox/Tags já eram blocos condicionais de verdade
  (`{leftTab === 'inbox' && ...}`) — a troca desmonta um e monta o outro,
  e a classe `tabContent` dispara sozinha no mount. **Achado corrigindo
  a própria documentação:** a seção 15 deste arquivo já registrava esta
  animação como "feita", mas a auditoria desta rodada (grep por
  `appearUp`/`tabContent` nos dois arquivos) mostrou que
  `.inboxContent`/`.tagsContent` NUNCA tinham a `animation` de fato
  aplicada — só existia em elementos internos (`.capturePalpite`,
  `.sugestaoPasta`). Corrigido agora — o registro anterior estava
  otimista, não mentiroso, mas o CEO via a troca "seca" mesmo assim.
- PRAZO/Tudo **não desmonta nada por padrão** (o filtro só recalcula a
  lista com `.filter()` — o mesmo array de nós React, sem remount). Pra
  ter uma animação de entrada de verdade na troca (não só nos itens
  individuais que já entravam via `.item { animation: appearUp }`,
  TASK-323), o container `.list` ganhou `key={filterPrazo ? 'prazo' :
  'tudo'}` — força o React a desmontar/remontar o bloco inteiro no swap,
  o gatilho que `tabContent` precisa. Estado do formulário (`draftFor`,
  `editing` etc.) mora no componente pai (`TasksPanel`), não nos nós
  remontados — nada se perde no swap.
- **Direção:** cada consumidor escreve `--content-dir` (`-1` = aba/filtro
  à esquerda, `1` = à direita) no próprio elemento — o conteúdo entra
  "vindo de onde a aba está" (Inbox/PRAZO com `-1`, Tags/Tudo com `1`),
  sem precisar rastrear qual era a aba ANTERIOR (heurística simples,
  suficiente pra 2 abas por grupo — o único caso que existe hoje).
- **Duração/curva:** `240ms` (`--dur-medium`, dentro da faixa 180-260ms
  pedida) + `--ease-out` (a curva única da casa) — fade + deslocamento
  horizontal pequeno (`8px`), nunca vertical (a troca é lateral, não uma
  lista aparecendo).
- **`prefers-reduced-motion`:** zera sozinho via o bloco global já
  existente em `tokens.css` (a mesma garantia que `appearUp`/`.item` já
  usam) — nenhum ajuste extra precisou ser feito.

**Sem dependência nova** — CSS puro + Web Animations nativas (`animation`/
`@keyframes`), o mecanismo que o app já usa em toda parte (`appearUp`,
`.hoverGlow`, `.shimmer`).

## 20. Fileira "Nova nota/Nova tarefa/Nova pasta" — barrinha e alinhamento (TASK-334, 28/08/2026)

**Nota (TASK-336, mesmo dia):** os números `--tag-h: 6px`/`--tag-inset-b: 5px`
citados abaixo são o retrato do código NAQUELE momento (TASK-334) — a
correção TASK-336 (seção 8) mudou os dois: `--tag-h` dobrou e
`--tag-inset-b` foi removida. A conclusão desta seção (o alinhamento era
box-model, não geometria da tag) continua válida — só os números
citados como "receita vigente" ficaram históricos.

CEO: "os botões perderam o alinhamento, essa barrinha está acima, e na
referência eu tinha pedido pra ser colada na parte inferior do botão."

**A barrinha em si já estava correta.** Conferido byte a byte contra a
receita vigente (seção 8, "REGRA VIGENTE... TASK-330"): `--tag-h: 6px`,
`--tag-inset-b: 5px` (recuo da BASE), dentro de `.hoverGlow` que tem
`overflow: hidden` — a tag não tem como aparecer "solta, com folga,
abaixo do botão" nesta versão do código; ela é fisicamente clipada pelo
próprio botão. A leitura mais provável é que a captura que motivou este
retorno é anterior à correção da TASK-330 (o histórico da própria seção 8
mostra duas rodadas de correção no mesmo dia) — não havia um SEGUNDO
defeito de geometria pra achar na tag.

**O que estava errado de verdade: os três botões não tinham o MESMO
box-model**, e isso é o que lê como "desalinhado" numa fileira lado a
lado. `.btnNew` (Nova nota, primário) tinha `border: none`; `.btnNewAlt`
(Nova tarefa/Nova pasta, secundário) tem `border: 1px solid
var(--border2)`. Com `box-sizing: border-box` (regra global,
`reset.css`), os três chegam a `height: 44px` OK — mas o botão sem borda
ganha ~1px a mais de ALTURA DE CONTEÚDO que os dois com borda, então o
rótulo/ícone do primário senta ligeiramente mais alto que o dos dois
secundários ao lado. É um defeito pequeno em pixels, mas é exatamente o
tipo de coisa que "olha errado" numa fileira de 3 botões apertados.
**Corrigido:** `.btnNew` ganhou `border: 1px solid transparent` — mesmo
gasto de 1px nos quatro lados que `.btnNewAlt` já tinha, sem mudar a cor
percebida (transparente). Padding (`0 14px`), altura (`44px`), gap do
ícone (`7px`) e tamanho de ícone (todos `size={14}` no JSX, conferido)
já eram idênticos nos três — só a borda estava assimétrica.

**Fechado no mesmo dia (segunda passada, coordenador apontou que o estado
vazio é uma das primeiras telas que o CEO vê):** `.btnNewBig`/
`.btnNewBigAlt` (`FolderNotesView.module.css`, o par do ESTADO VAZIO da
pasta — "Criar primeira nota"/"Criar primeira tarefa") tinha a mesma
assimetria de borda (`border: none` vs `border: 1px solid
var(--border2)`). Mesmo conserto: `.btnNewBig` ganhou `border: 1px solid
transparent`. **Não mexido** (fora desta queixa, é diferença de raio, não
de borda): `.btnNewBig` usa `--r-btn` e `.btnNewBigAlt` usa `--r-md` — os
dois já existiam com raios diferentes antes desta rodada, não é o
"desalinhamento" que o CEO reportou.

## 21. Fade de rolagem na base — condicional (TASK-349, 28/08/2026)

**Pedido do CEO:** viu o card da pasta "Leituras" (quadrante Recursos do
PARA) cortado em linha reta na base da área de rolagem e pediu o mesmo fade
que já existia no TOPO de cada quadrante — "isso já existia mas sumiu sei lá
pq". Medido: o fade de baixo nunca existiu em `PARAGrid.module.css` (só o de
cima, `.qHeader::after`) — não foi regressão, é peça nova espelhando a que
já existe.

**Geometria (igual ao fade de cima, sentido invertido):** 18px de altura,
`linear-gradient(to bottom, transparent, var(--bg))` (o de cima é
`linear-gradient(var(--bg), transparent)`), `pointer-events: none`.
**CORRIGIDO NA TASK-364** — o MECANISMO (não a geometria/altura, que
continuam as mesmas) mudou de `::after` para `mask-image`; ver secao 21.1.

**A diferença que importa — condicional, não permanente.** O fade de cima
(`.qHeader::after`) é decoração fixa: o cabeçalho não rola, então o fade ali
não depende de haver mais conteúdo cortado — é sempre a mesma transição
cabeçalho→conteúdo. O de BAIXO não pode ser assim: numa lista curta, sem
nada cortado, um fade permanente vira **sombra no vazio** (o próprio CEO
nomeou o risco) — ou pior, esconde a ÚLTIMA linha completa como se
estivesse cortada quando não está. Por isso o fade de baixo só acende
quando `scrollHeight - scrollTop - clientHeight > 1px`.

**Onde a receita mora (REUSE, não copiada por módulo — o mesmo precedente
que `.hoverGlow`/`.hoverZoom`/`.tabIndicator`/`.shimmer` já seguem):**
- **Classe global `.scrollFadeBottom`** (`src/styles/reset.css`) — geometria
  do fade + a condição de acender/apagar (`is-fade-bottom` no mesmo
  elemento). Mecanismo de pintura CORRIGIDO na TASK-364 — ver 21.1.
- **Hook `useScrollEdgeFade`** (`src/hooks/useScrollEdgeFade.ts`) — alterna
  `is-fade-bottom` DIRETO no DOM via `ref` (sem passar por estado do React,
  sem re-render a cada scroll), ouvindo `scroll` + `ResizeObserver` no
  próprio elemento. Quem chama passa um array `watch` com o que muda o
  TAMANHO do conteúdo (ex.: `[itens.length]`) pra remedir quando a lista
  cresce/encolhe sem o container mudar de altura.

**Contrato pro consumidor:** `ref` no MESMO elemento que tem
`overflow-y: auto`, classe `scrollFadeBottom` literal junto do módulo CSS
(`className={`${styles.lista} scrollFadeBottom`}`), hook chamado ANTES de
qualquer `return` condicional do componente (regra de Hooks — dois
consumidores desta rodada, `CategoryView` e `Constellation`, têm early
return depois da lista de estado; o hook subiu pra antes dele).

**Onde foi aplicado — 9 áreas (contagem medida, `overflow-y: auto` em todo
`src/**/*.module.css`, 28/08/2026):**

| Área | Arquivo | Nota |
|---|---|---|
| PARA — pastas do quadrante (`.qCards`) | `PARAGrid.tsx`/`.module.css` | O pedido original; 4 quadrantes, ref por quadrante (`QuadrantCards`, novo componente interno) |
| PARA — pastas de UMA categoria (`.catBody`) | `PARAGrid.tsx`/`.module.css` | Mesma feature, outra tela — mesmo card, mesmo corte possível |
| Inbox — fila de cards (`.list`) | `InboxPanel.tsx`/`.module.css` | Nomeado pelo CEO ("a fila da caixa de entrada") |
| Inbox — aba Tags (`.tagsContent`) | `InboxPanel.tsx`/`.module.css` | Mesmo arquivo/padrão do Inbox, custo marginal |
| Tarefas — lista (`.list`) | `TasksPanel.tsx`/`.module.css` | Nomeado pelo CEO ("a lista de tarefas") |
| Notas da pasta (`.body`) | `FolderNotesView.tsx`/`.module.css` | Nomeado pelo CEO ("a lista de notas dentro de uma pasta") — cobre tarefas E notas da pasta, mesmo scroller |
| Busca Ctrl+K (`.results`) | `SearchModal.tsx`/`.module.css` | Nomeado pelo CEO ("a busca") |
| Seletor de símbolo (`.grid`) | `GlyphPicker.tsx`/`.module.css` | Mesmo padrão de grade cortável do PARA, achado na varredura |
| Constelação — painel de conexões (`.painel`) | `Constellation.tsx`/`.module.css` | Lista de vizinhos (`.vizinho`) pode passar de 1 tela, achado na varredura |

**Onde NÃO foi aplicado — 7 áreas, com o motivo medido (mesma varredura):**

| Área | Arquivo | Por que fica de fora |
|---|---|---|
| "O que fazer com este card" (`.processBody`) | `InboxPanel.module.css` | Lista curta por natureza (poucas pastas sugeridas do PARA, nunca dezenas); modal secundário de uso rápido — risco de corte real é baixo, fora desta rodada pra conter escopo |
| Modal genérico de criação (`.body`) | `Modal.module.css` | Corpo de FORMULÁRIO curto (campo + chips de sugestão), não lista repetida; termina em `.footer` com padding próprio — não é o mesmo "corte cru sem nenhuma pista" |
| Configurações (`.body`) | `Settings.module.css` | Cada `.section` já tem `border-bottom` própria SEPARANDO uma da outra — já existe um sinal de transição, não é o mesmo defeito de corte sem aviso nenhum |
| Detalhe de UMA tarefa (`.corpo`) | `TaskDetail.module.css` | Corpo de uma tarefa só (campos + descrição), não uma lista repetida de itens |
| Caixa de captura (textarea) | `CaptureBox.module.css` | É o campo de TEXTO do próprio usuário digitando — aplicar fade em cima do que a pessoa está escrevendo seria estranho, sem precedente no app |
| Painel de conexões da nota (`.connections`) | `InboxCardEditor.module.css` | `src/features/editor/` — RUSTLINE está trabalhando em outro bug ali agora (ver "Known Gaps" abaixo, mesma trava já registrada pro ImageViewer/NoteEditor); mesma receita se precisar depois |
| Editor de markdown (`.cm-scroller`) | `features/editor/liveMarkup.css` | Mesmo motivo acima (`src/features/editor/`) — e é a MESMA exceção que a redução de fonte da TASK-309 já registrou ("editor e Widget ficam de fora por desenho", seção 3) |

### 21.1 — O fade que grudava no card, corrigido (TASK-364, 28/08/2026)

**O que o CEO reprovou:** fotografou o quadrante Projetos do PARA e disse
"esta fixo na pasta" — o fade de baixo não ficava parado na borda inferior
da área de rolagem, ele se movia JUNTO com os cards enquanto a lista rolava
(dava a impressão de um gradiente pintado em cima de uma pasta específica).

**Causa medida:** a receita original (`::after` com `position: absolute;
bottom: 0` dentro de um `.scrollFadeBottom { position: relative }` — o
PRÓPRIO elemento com `overflow-y: auto`) trazia um comentário afirmando que
isso "fica fixo na base do VIEWPORT de rolagem, não do fim do conteúdo".
**Essa afirmação estava ERRADA** — medido no app real (WebView2), não só na
teoria: o `::after`, por ser filho do elemento que rola, não se comportou
como decoração fixa da caixa. Mesma família das outras armadilhas já
registradas deste WebView2 (corner-shape squircle clipando errado,
zoom CSS quebrando arrasto) — motor renderiza diferente do que a regra
"deveria" garantir.

**Correção — trocar o MECANISMO, não a geometria:** `mask-image` (como
`background-image`) se pinta em relação à própria CAIXA do elemento, nunca
ao conteúdo que rola por dentro dela — por construção não tem como grudar
num filho, elimina a ambiguidade do `position: absolute` dentro de um
scroller. A imagem da máscara é mais ALTA que a caixa
(`mask-size: 100% calc(100% + 18px)`): os primeiros 100% (a altura real da
caixa) ficam opacos — nada cortado —, e os 18px extras no fim da imagem são
o degradê opaco→transparente. `mask-position` desloca essa imagem pra
cima/baixo, e é ISSO que anima (length/percentage transiciona nativo, sem
precisar de `@property` nem trocar o `mask-image` inteiro, que não anima):
- `0 0` (padrão, sem `is-fade-bottom`): o degradê fica todo ABAIXO da caixa
  visível → fade apagado, lista curta fica intacta (mesmo cuidado condicional
  da receita original, preservado).
- `0 -18px` (com `is-fade-bottom`): a imagem sobe 18px e o degradê encaixa
  exatamente na borda de baixo da caixa → fade aceso, sempre na mesma
  posição da tela enquanto o conteúdo rola por baixo.

**Checagem de colisão de máscara:** vários paineis do app já usam
`mask-image: paint(squircle)` pro corte squircle — auditado caso a caso
(nenhum dos 9 elementos abaixo declara `mask-image` próprio; a máscara
squircle mora sempre no FILHO — `.folderCard`, `.card`, `.modal` — nunca no
scroller), então as duas máscaras nunca competem no mesmo seletor.

**Confirmado nos dois extremos:** lista curta (sem conteúdo cortado) nunca
acende o fade; lista longa acende o fade e ele fica PARADO na borda de
baixo enquanto os cards passam por baixo dele, sem pintar por cima de
nenhum card no meio do caminho (o degradê só ocupa os 18px finais da
caixa, nunca a área acima).

**Escopo:** correção na RECEITA (`src/styles/reset.css`, classe global),
vale para as 9 áreas da tabela acima — nenhuma precisou de mudança de
marcação (`className`/`ref` continuam iguais; o hook `useScrollEdgeFade`
não mudou, ele já alternava `is-fade-bottom` no elemento certo).

**Arquivos tocados:** `src/styles/reset.css` (`.scrollFadeBottom`,
`.scrollFadeBottom.is-fade-bottom`, o bloco `prefers-reduced-motion`) e este
arquivo (`DESIGN.md`, seção 21 e esta subseção). Nenhum `.tsx` mudou.

## 22. Raio aninhado — auditoria completa e teste de concentricidade (TASK-354, 28/08/2026)

> **AVISO (TASK-369, 28/08/2026): `--r-shell` mudou de 18px pra 20px.**
> Todo "18px" e todo "6px"/"8px" de raio interno citado daqui até a seção
> 22.2 abaixo é o valor HISTÓRICO (o que era verdade quando cada rodada
> rodou) — a seção **22.3** logo depois tem a tabela recalculada com o
> valor atual. As tabelas abaixo não foram reescritas linha a linha
> (registro histórico de cada rodada), mas nenhuma delas mais reflete o
> `--r-shell` vigente.

**Pedido do CEO, com uma referência técnica anexada (UiDesignz, "Better
Nested Border Radius"):** o canto superior esquerdo do painel da captura
("a caixa de texto por dentro tem curva quase igual à do painel que a
contém") — mas o pedido não foi consertar só a foto, foi "design impecável
e WOW é premissa aqui... não é ajuste pontual, é passe no app inteiro". A
seção 7 já tinha a REGRA (TASK-332, 28/08/2026 mais cedo), mas a auditoria
daquela rodada só comparou pares que usavam o MESMO token (`--r-full`
duas vezes) — nunca mediu a fórmula contra o `--r-shell` (18px, a moldura
de `panelLeft`/`panelRight`/`central`/`captureShell`, `App.module.css`)
que envolve a maior parte da tela. É essa lacuna que esta rodada fecha.

**A fórmula, sem ambiguidade:**

```
raio_interno_maximo = raio_externo - espacamento_real_ate_a_borda_de_fora
```

Se o raio que o elemento de dentro JÁ tem for **maior** que esse teto, é
defeito — as curvas competem em vez de correrem paralelas (o "canto dentro
de canto" que a referência do CEO nomeia). Se for **igual**, é o encaixe
perfeito (concêntrico). Se for **menor**, está seguro — não existe "raio
de dentro pequeno demais" nesta regra, só grande demais. E quando o
espaçamento já é **maior ou igual** ao raio de fora, as duas curvas nunca
se tocam — a fórmula dá zero/negativo e QUALQUER raio de dentro razoável
já é seguro (não precisa forçar canto reto; só precisa não ser um raio
absurdamente grande pra caixa).

**Teste de conferência (o mesmo que a referência do CEO sugere, adaptado
ao squircle do app):** aumente mentalmente (ou no DevTools) a caixa de
dentro até o tamanho da de fora — as duas curvas têm que COINCIDIR. Se a
de dentro "estoura" pra fora antes de chegar lá, o raio dela está grande
demais pro espaço que tem.

### Exemplo certo e errado (do próprio app, medido)

| | Externo | Espaçamento real | Interno (era) | Teto da fórmula | Veredito |
|---|---|---|---|---|---|
| **Errado** (o que o CEO fotografou) | `.captureShell` — `--r-shell` 18px | `.convoWrap` padding-top 12px (o lado mais apertado; 16px nos outros três) | `.convoBox` — `--r-2xl` **26px** | 18 − 12 = **6px** | 26 > 6 — a curva de dentro nem cabe inteira na de fora, quanto mais concêntrica |
| **Certo** (depois da correção) | `.captureShell` — 18px | 12px | `.convoBox` — `--r-shell-inset-12` **6px** | 6px | 6 = 6, encaixe exato |

### A auditoria — todo par aninhado encontrado, com a medida

Varredura de todo `border-radius`/`mask-image: paint(squircle)` em
`src/**/*.css` (28/08/2026), cruzado com o componente-pai de cada um
(`.tsx` correspondente, pra achar o espaçamento real, não suposto).
**4 violações reais, 3 delas corrigidas encolhendo o raio de dentro, 1
corrigida abrindo o espaçamento** (ver justificativa da coluna
"Correção"); o resto — modais, o painel do widget, badges de canto — já
respeitava a fórmula, alguns por pouco.

| Par (externo → interno) | Raio externo | Espaçamento real | Raio interno (era) | Teto da fórmula | Veredito | Correção |
|---|---|---|---|---|---|---|
| `.captureShell` → `.convoBox` (CaptureBox) | `--r-shell` 18px, mascarado | 12px (topo, o lado mais apertado) | `--r-2xl` 26px | 6px | **ERRADO** — o defeito fotografado | Raio → `--r-shell-inset-12` (6px) |
| `.panelLeft` → `.card` (InboxPanel) | `--r-shell` 18px, mascarado | 10px (`.list` padding, uniforme) | `--r-lg` 16px, mascarado | 8px | **ERRADO** — mesma família do defeito acima, nunca fotografada | Raio → `--r-shell-inset-10` (8px); `--sq-r` da máscara atualizado junto (ver seção "Máscara squircle" abaixo) |
| `.central` → `.imageContainer` (ImageViewer) | `--r-shell` 18px, mascarado | 12px (margin-top, o lado mais apertado; 18px nas laterais) | `--r-lg` 16px | 6px | **ERRADO** | Raio → `--r-shell-inset-12` (6px) |
| `.central` → `.folderCard` (PARAGrid, quadrantes inferiores) | `--r-shell` 18px, mascarado | 16px (`.qCards` padding lateral/base) | `--r-xl` 20px, mascarado — **identidade de canto generoso, já aprovada (seção 7)** | 2px | **ERRADO**, mas encolher destruiria a identidade do card pra um defeito pequeno (20 contra um teto de 2, não 26 contra 6) | Espaçamento → 20px (`.qCards` padding lateral/base), zona seguindo o mesmo número que `.catBody` já usa; raio do card **não mudou** |
| `.central` → `.card` (FolderNotesView, notas da pasta) | `--r-shell` 18px, mascarado | 18px (`.body` padding, no fim do scroll) | `--r-lg` 16px — mesma identidade | 0px | **ERRADO**, borderline (só visível com a lista rolada até o fim) | Espaçamento → 20px (`.body` padding), mesma lógica do item acima; raio **não mudou** |
| `.hint` → `.aceitar`/`.ignorar` (FolderHintChip) | `--r-full` (pill) | 5-6px | `--r-sm` 9px | — (pill não usa a fórmula linear) | ~~JÁ CORRETO~~ **CORRIGIDO O VEREDITO NA TASK-357**: estava ERRADO — pílula com raio fixo dentro nunca é concêntrica, ver seção 22.1 (regra da pílula) | Ver seção 22.1 — `--r-full` nos dois botões |
| `.panelRight` → `.item` (TasksPanel, linha da tarefa) | `--r-shell` 18px | 10px (`.list` padding) | `--r-sm` 9px | 8px | Borderline (1px acima) | ~~Não alterado~~ **CORRIGIDO NA TASK-357** (o CEO reabriu os 3 borderline) — raio → `--r-xs` 7px |
| `.panelRight` → `.addRow` (TasksPanel, campo de nova tarefa) | `--r-shell` 18px | 10px | `--r-sm` 9px | 8px | Borderline (1px acima) | ~~Não alterado~~ **CORRIGIDO NA TASK-357** — raio → `--r-xs` 7px |
| `.banner` → `.coverBtn` (FolderNotesView, capa da pasta) | `--r-shell` 18px (clipa o banner via máscara, banner não tem raio próprio) | 10px (top/right, uniforme) | `--r-sm` 9px | 8px | Borderline (1px acima) | ~~Não alterado~~ **CORRIGIDO NA TASK-357** — raio → `--r-xs` 7px |
| `.folderCard` → `.stagnant` (PARAGrid, selo "parado") | `--r-xl` 20px, mascarado | 6px (top/right) | `--r-xs` 7px | 14px | **Certo**, com folga | Nenhuma |
| `.folderCard` → `.coverBtn` (PARAGrid) | `--r-xl` 20px | n/a — botão fica na borda de baixo de `.cover`, longe do canto arredondado real do card (que só existe no topo/base do card inteiro, não no meio do conteúdo) | `--r-md` 12px | n/a | **Não aplicável** — não há canto de fora perto pra competir | — |
| `Modal.tsx` `.card` → `.input`/botões do rodapé | `--r-card` 12px, mascarado | 16px (`.body`/`.footer` padding) | `--r-btn` 8px | negativo (espaçamento > raio) | **Certo** — zona segura | Nenhuma |
| `InboxCardEditor.panel` → `.close`/`.connItem` | `--r-card` 12px, mascarado | 16px | `--r-sm` 9px | negativo | **Certo** | Nenhuma |
| `Settings.modal`/`SearchModal.modal` → `.close` | `--r-3xl` 30px, mascarado | 16-20px | `--r-sm` 9px | 10-14px | **Certo**, com folga | Nenhuma |
| `GlyphPicker.modal` → `.close` | `--r-2xl` 26px, mascarado | 16px | `--r-sm` 9px | 10px | **Certo**, com folga | Nenhuma |
| `PARAGrid.modal`/`InboxPanel.processModal` → inputs/botões | `--r-3xl` 30px, mascarado | 14-18px | `--r-md`/`--r-sm` 9-12px | 12-16px | **Certo** | Nenhuma |
| `TaskDetail.wrap` (clipado por `--r-shell` de `.central`) → campos/anotação | 18px | 22-26px | `--r-sm`/`--r-md` 9-12px | negativo | **Certo** — zona segura | Nenhuma |
| `Widget.panel` → `.input`/`.imgPreviewWrap`/botões do rodapé | `--r-2xl` 26px | 12px, uniforme (`margin: 12px`) | `--r-md`/`--r-sm` 9-12px | 14px | **Certo**, com folga | Nenhuma |

**Contagem: 18 pares auditados · 5 violações reais (contando a já corrigida
do FolderHintChip) · 4 corrigidas nesta rodada · 3 borderline (1px,
documentadas, não alteradas) · 10 já corretas.**

### Por que duas correções encolheram o raio e duas abriram o espaçamento

A fórmula tem duas variáveis — dá pra resolver por qualquer uma das duas.
Este passe usou as duas, por critério, não por preguiça:

- **`.convoBox` e `.imageContainer`** não carregam identidade nenhuma —
  `--r-2xl`/`--r-lg` foram escolhidos "pelo porte" sem checar o container.
  Encolher pro valor exato da fórmula (`--r-shell-inset-12`) dá a
  concentricidade de verdade que a referência do CEO pede — não é só
  "evitar o choque", é a curva de dentro correndo paralela à de fora.
- **`.folderCard` e o `.card` de FolderNotesView** têm raio generoso
  registrado como identidade aprovada (seção 7: "Card do Inbox/Pasta/PARA
  ... identidade de canto generoso, JÁ APROVADA pelo CEO"). Encolher esses
  pra 2px/0px destruiria a cara do produto por uma violação pequena (a
  distância entre o raio e o teto era de só 2-4px, não os 18-20px dos
  outros dois casos). Abrir o espaçamento pra 20px — o MESMO número que
  `.catBody` (a tela de categoria única) já usa, sem regressão nenhuma —
  tira o par da zona de risco sem tocar no raio que o CEO já aprovou.

### Máscara squircle — o que foi medido

`squircle.js` (worklet Houdini, `public/squircle.js`) lê o raio em DUAS
fontes, nesta ordem: `--sq-r` primeiro, e só se ela faltar cai pro
`border-top-left-radius` computado do próprio elemento (linha 17-18 do
worklet). **A fórmula de aninhamento continua valendo com a máscara
aplicada — a curva desenhada pelo worklet segue o MESMO raio nominal**,
com uma ressalva medida: quando o elemento declara `--sq-r` explícito
(a maioria dos shells/modais/cards mascarados do app: `panelLeft`,
`panelRight`, `central`, `captureShell`, `Modal.card`, `Settings.modal`,
`SearchModal.modal`, `GlyphPicker.modal`, `PARAGrid.modal`/`.folderCard`,
`InboxPanel.card`/`.processModal`, `InboxCardEditor.panel`), **`--sq-r` é
a fonte de verdade — mudar só o `border-radius` sem mudar `--sq-r` junto
faz a máscara desenhar uma curva DIFERENTE da borda**, um defeito pior que
o original (a borda e a máscara deixam de bater). Foi exatamente o
cuidado que `InboxPanel.card` exigiu nesta correção: `border-radius` E
`--sq-r` mudaram juntos, os dois pro mesmo `--r-shell-inset-10`. Na época
desta auditoria (TASK-354), `.convoBox`/`.imageContainer` não usavam
máscara (só `border-radius` + `overflow: hidden`) — **isso mudou na
TASK-369**, quando `.convoBox` ganhou `mask-image: paint(squircle)` pra
resolver o mesmo defeito de canto que este parágrafo descreve.

Não foi encontrado nenhum caso, na auditoria desta rodada, de elemento
mascarado onde `--sq-r` e `border-radius` já divergiam antes da correção
— o risco é ao EDITAR um raio mascarado dali pra frente, não um bug
pré-existente. Registrado aqui como regra de manutenção: **todo raio que
tem `mask-image: paint(squircle)` no mesmo seletor muda `border-radius` E
`--sq-r` juntos, sempre — nunca só um dos dois.**

**Incidente TASK-370 (28/08/2026) — a regra acima foi escrita e violada no
mesmo dia:** a TASK-369 deu `--sq-r` a `.convoBox` mas não repôs
`border-radius` (que a TASK-354 tinha posto lá antes de existir máscara) —
o CEO fotografou o canto reto de novo, o coordenador mediu
`getComputedStyle` no app rodando (`border-radius: 0px` contra `--sq-r`
declarado) e provou a violação. Consertado: `border-radius:
var(--r-shell-inset-12)` ao lado de `--sq-r: var(--r-shell-inset-12)` — o
MESMO token nos dois, não dois números que podem divergir de novo.
Auditoria completa (TASK-370) de todo `src/` com `--sq-r` declarado: 14
seletores mascarados no total (`.panelLeft`/`.panelRight`/`.central`/
`.captureShell` em `App.module.css`, `.convoBox` em `CaptureBox.module.css`,
`.modal` em `GlyphPicker`/`SearchModal`/`PARAGrid`, `.card` em
`Modal.module.css`, `.card`/`.processModal` em `InboxPanel.module.css`,
`.panel` em `Settings.module.css`/`InboxCardEditor.module.css`,
`.folderCard` em `PARAGrid.module.css`) — 13 já tinham o par certo,
`.convoBox` era o único quebrado, consertado acima. A classe utilitária
`.squircle` (`reset.css`) fica de fora da contagem: zero consumidor em
`className` no `src/` inteiro (sem `border-radius` próprio pra sincronizar
porque nada a usa).

### Onde a relação fica declarada (o sistema, não 4 correções soltas)

`tokens.css` ganhou dois tokens novos, nomeados pelo espaçamento que cada
um resolve (não pelo valor — quem for medir um caso novo sabe qual token
usar só olhando o padding/margin real do container):

```css
--r-shell-inset-10: 8px;  /* --r-shell(18) - 10px (literal, nao token) */
--r-shell-inset-12: 6px;  /* --r-shell(18) - 12px */
```

Nenhum token da escala geral de porte (`--r-xs`…`--r-3xl`) mudou de
valor — a escala de porte continua certa pra elemento SOLTO; o par
`--r-shell-inset-*` é especificamente pra elemento que nasce DENTRO do
`--r-shell`. Se aparecer um terceiro espaçamento (ex. 14px), o padrão é
declarar um terceiro token pelo mesmo molde, comentado com a fórmula —
nunca escrever o número calculado direto no seletor do componente.

### 22.1 — A COBERTURA reprovada e a regra que faltava (TASK-357, 28/08/2026)

**O que o CEO reprovou:** a auditoria acima (TASK-354) olhou 18 pares —
ela nunca disse quantas declarações de `border-radius` existem no `src/`
nem quantas delas formam par aninhado. O CEO fotografou o
`FolderHintChip` (a tarja "Parece Comece aqui") pintado como "JÁ CORRETO"
na tabela acima — e estava errado: a curva do container (pílula,
`--r-full`) e a curva dos dois botões por dentro (`--r-sm`, 9px fixos)
NUNCA são concêntricas, em nenhum tamanho, porque uma pílula não tem raio
fixo — o raio dela É metade da própria altura, que muda por elemento. A
fórmula linear (`raio_interno = raio_externo - espaçamento`) não se aplica
a esse caso; faltava uma regra própria.

**A regra da pílula (nova, sem exceção):**

```
Dentro de um container em pilula (border-radius: --r-full), o elemento
de dentro TAMBEM e pilula (--r-full) - ou o de fora deixa de ser pilula.
Nao existe meio-termo: pilula com retangulo arredondado dentro sempre
compete, em qualquer tamanho, porque a curva de fora nao e um numero
fixo pra comparar.
```

Por que `--r-full` (9999px) resolve sozinho: `border-radius` é sempre
clampado pelo navegador a `min(raio, metade da altura, metade da
largura)` — então DOIS elementos com `--r-full`, um dentro do outro (com
qualquer respiro de padding), desenham cada um sua própria pílula
perfeita, sempre concêntricas entre si, sem precisar calcular px nenhum.
É a mesma lógica da fórmula linear (nunca deixar a curva de dentro
"estourar" a de fora), só que a pílula resolve por CONSTRUÇÃO, não por
conta.

**Corrigido:** `FolderHintChip.module.css` — `.aceitar`/`.ignorar`
(os botões "Mover"/"Agora não") trocaram `border-radius: var(--r-sm)` por
`var(--r-full)`. `.hint` (o container) não mudou.

### 22.2 — A varredura completa (as 210+ declarações, não as 18 escolhidas)

Varredura de TODO `border-radius:` em `src/**/*.css` (30 arquivos), TASK-357:
**204 declarações reais** medidas (`rg 'border-radius\s*:'`; o número
"210 em 30 arquivos" que abriu a task incluía comentário/prosa que cita a
palavra sem ser propriedade — 204 é a contagem só de propriedade CSS de
fato, `tokens.css` fora da conta porque só declara variável `--r-*`, nunca
`border-radius:` literal).

Cada uma das 204 foi classificada em UMA destas três categorias — não dá
pra aplicar a fórmula de aninhamento em quem não tem par:

1. **Não é par aninhado (a maioria)** — elemento solto sem ancestral com
   `border-radius` por perto (toast flutuante, badge de canto sem shell,
   linha de lista dentro de um container SEM raio), OU é `border-radius:
   50%`/círculo puro (dot, avatar, ícone circular — uma proporção que
   nunca "estoura" pra fora porque acompanha o próprio tamanho do
   elemento, categoria estrutural diferente da fórmula linear, mesmo
   critério que a TASK-354 já usava implicitamente ao nunca listar
   nenhum círculo na tabela). Não tem o que medir.
2. **É par aninhado, mas "encaixotado" (sanduíche seguro)** — o elemento
   com raio vive dentro de um container com raio, mas SEPARADO do canto
   real por outra fileira (cabeçalho, rodapé, outra seção) que ocupa esse
   canto — ex. `.previewCard` (InboxPanel `.processModal`, abaixo do
   header), `.suggestionChip`/`.modalInput` (PARAGrid `.modal`, entre
   header e footer), `.campos`/`.anotacao` (TaskDetail, dentro do
   `.corpo` com 22-30px de sobra pro `--r-shell`). A fórmula ainda vale,
   mas o espaçamento real até o canto é maior que o padding local (some
   junto o que a fileira acima/abaixo ocupa) — sempre cai em "negativo",
   zona segura, confirmado caso a caso.
3. **É par aninhado de verdade, corner-a-corner** — o elemento de raio é
   o PRIMEIRO ou ÚLTIMO conteúdo do container (nada entre ele e o canto
   real), ou é um badge/botão posicionado `absolute` explicitamente num
   canto. Só esta categoria testa a fórmula de fato.

**Os pares da categoria 3, completos (18 da TASK-354 + 5 achados nesta
rodada que a varredura anterior nunca cobriu = 23 pares):**

| Par | Raio externo | Espaçamento | Raio interno | Teto | Veredito | Ação |
|---|---|---|---|---|---|---|
| Os 18 pares da TASK-354 (tabela da seção 22 acima) | — | — | — | — | 5 violações (já corrigidas + reabertas abaixo), 10 certas, 3 "borderline" | Ver abaixo — os 3 borderline voltam corrigidos |
| `.hint`(pílula) → `.aceitar`/`.ignorar` (FolderHintChip) | pílula, `--r-full` | 5-6px | `--r-sm` 9px fixo | n/a (regra da pílula, não a linear) | **ERRADO** — pílula com raio fixo dentro nunca é concêntrica, marcado como "já correto" por engano na TASK-354 | **Corrigido**: `.aceitar`/`.ignorar` → `--r-full` |
| `.panelRight` → `.item` (TasksPanel) | `--r-shell` 18px | 10px (`.list` padding) | `--r-sm` 9px | 8px | Borderline (1px acima) — não alterado na TASK-354 | **Corrigido agora**: `--r-xs` (7px) |
| `.panelRight` → `.addRow` (TasksPanel) | `--r-shell` 18px | 10px | `--r-sm` 9px | 8px | Borderline (1px acima) | **Corrigido agora**: `--r-xs` (7px) |
| `.banner`(clipado por `--r-shell`) → `.coverBtn` (FolderNotesView) | `--r-shell` 18px | 10px | `--r-sm` 9px | 8px | Borderline (1px acima) | **Corrigido agora**: `--r-xs` (7px) |
| `SelectionToolbar.toolbar` → `.btn` | `--r-md` 12px | 4px (padding) | `--r-xs` 7px | 8px | **Certo**, com 1px de folga | Nenhuma — achado nesta rodada, nunca auditado antes, já estava certo |
| `SlashMenu.menu` → `.item` | `--r-md` 12px | 6px (padding, sem rodapé depois do último item — encosta no canto de baixo) | `--r-sm` 9px | 6px | **ERRADO** (1px) — achado nesta rodada, nunca auditado antes | **Corrigido**: padding → 5px, raio → `--r-xs` (7px); 12-5=7=7, encaixe exato |
| `imageBlocks .cm-livemd-img-tools` → `.cm-livemd-img-btn` | `--r-sm` 9px | 3px (padding, toolbar minúscula sem folga nenhuma nos 4 lados) | `--r-xs` 7px | 6px | **ERRADO** (1px) — achado nesta rodada | **Corrigido**: padding → 2px; 9-2=7=7, encaixe exato |
| `GlyphPicker.modal` → `.limpar` | `--r-2xl` 26px | 16px (margin, é o ÚLTIMO elemento do modal) | `--r-md` 12px | 10px | **ERRADO** (2px) — achado nesta rodada | **Corrigido**: raio → `--r-sm` (9px), mesma família do `.close` deste modal |
| `Settings .restoreBox` → `.restoreItem` | `--r-md` 12px | 10px (padding, linha de largura total sem cabeçalho/rodapé disputando o canto) | `--r-sm` 9px | 2px | **ERRADO** (7px) — achado nesta rodada | **Corrigido**: padding → 12px (== o próprio raio, zona segura por definição) |

**Contagem final, honesta:** 204 declarações de `border-radius` no `src/`.
23 formam par aninhado corner-a-corner (a única categoria onde a fórmula
se aplica). Dessas 23: **9 violações reais** (1 da regra da pílula +
3 "borderline de 1px" reabertas por ordem do CEO + 4 novas nunca
auditadas antes + as 4 já corrigidas na TASK-354, que continuam
corretas hoje) — **todas as 9 corrigidas nesta rodada ou confirmadas
ainda corrigidas**; 14 já estavam certas (11 da TASK-354 + `SelectionToolbar`,
achado novo já correto, + as 2 do `folderCard`/já documentadas como
certas/N-A). O restante (181 declarações) não forma par aninhado —
círculo, elemento solto sem ancestral com raio, ou sanduíche seguro
(categoria 2 acima, confirmada negativa em cada caso revisado) — não é
"exceção concedida à mão", é ausência de par pra aplicar a fórmula.

**Nenhum caso ficou pendente de renderização nesta rodada** — todos os 23
pares foram resolvíveis por leitura de CSS + estrutura do componente
(ordem de elementos, se há cabeçalho/rodapé disputando o canto). Se um
caso futuro depender de posição real após rolagem/animação pra decidir
(ex. dúvida sobre se um elemento ESTÁ mesmo no canto em tempo de
execução), a saída é abrir o app e medir — não decidir na mão.

### 22.3 — `--r-shell` abriu de 18 pra 20px (TASK-369, 28/08/2026)

**O pedido:** o CEO reclamou de novo que o canto de dentro da captura "não
tá tão arredondado" — mesmo depois do squircle (ver "Máscara squircle"
acima). A auditoria da seção 22 já tinha provado que 6px era o TETO exato
da fórmula pra `--r-shell` 18px; não dava pra abrir mais o raio de dentro
sem abrir o de fora. O CEO autorizou exatamente isso: "abrir o raio EXTERNO
e recalcular o interno, nunca quebrar a fórmula".

**O número escolhido: 20px (era 18px).** Por quê:
- É o mesmo valor de `--r-xl` (tokens.css) — já aprovado no app como
  "canto generoso, mas não vira bolha" (identidade do `.folderCard`,
  PARAGrid, seção 7). Reusa um número que já provou não ficar redondo
  demais num elemento grande, em vez de inventar um novo.
- **Testado contra os 9 pares aninhados do app que dependem de
  `--r-shell`** (a lista completa abaixo) antes de aplicar: com 20px,
  TODOS continuam corretos sem precisar abrir espaçamento em nenhum
  arquivo — inclusive os dois que sobrevivem pela regra do "espaçamento
  ≥ raio de fora" (`PARAGrid.module.css` `.qCards` e
  `FolderNotesView.module.css` `.body`, os dois com folga real de
  exatamente 20px). Um número maior (`--r-2xl` 26px, escala de modal)
  teria estourado os dois — exigindo abrir espaçamento em arquivos de
  outra frente (PARAGrid), não autorizado nesta rodada.
- Painel gigante (as 3 colunas + a caixa de captura cobrem a maior parte
  da tela) com raio grande demais é o risco que o próprio CEO nomeou
  ("redondo demais numa tela cheia"). 20px é um degrau, não um salto —
  fica abaixo da escala reservada pra elementos flutuantes menores
  (modais: `--r-2xl` 26px, `--r-3xl` 30px), preservando a hierarquia
  "painel é mais contido que modal".

**Aplicado app-wide, não só na captura** — `--r-shell` é consumido por
`--sq-r` nos 4 shells de `App.module.css` (`.panelLeft`, `.panelRight`,
`.central`, `.captureShell`) via `var(--r-shell)`, então a mudança em
`tokens.css` propagou sozinha pros quatro sem editar `App.module.css`.
Os 3 painéis principais e a caixa de captura continuam com o MESMO raio —
nenhuma exceção por tela.

> **ATUALIZAÇÃO (TASK-378, 29/08/2026):** `.captureShell` deixou de ser um
> dos "4 shells" acima — perdeu raio, mask e fundo próprios (ver "Campo
> protagonista vira painel de primeiro nível" depois da seção de "campo
> protagonista"). `.convoBox` (a caixa em si) é quem passou a consumir
> `--r-shell` diretamente. Contagem atualizada: 4 consumidores de
> `--r-shell` continuam existindo (`.panelLeft`, `.panelRight`, `.central`,
> `.convoBox`), só um deles trocou de nome.

**Os 9 pares que dependem de `--r-shell`, recalculados (dos 23 pares
totais da auditoria — os outros 14 usam `--r-card`/`--r-2xl`/`--r-3xl`/
`--r-md`/`--r-xl`/`--r-sm`/pílula, não `--r-shell`, e ficam fora desta
mudança):**

| Par | Espaçamento real | Raio interno | Teto com 18px (era) | Teto com 20px (agora) | O que mudou |
|---|---|---|---|---|---|
| `.captureShell` → `.convoBox` (CaptureBox) | 12px | `--r-shell-inset-12` | 6px | **8px** | Token recalculado sozinho (tokens.css) — nenhum arquivo de componente mudou o número. **DESFEITO na TASK-378** (29/08/2026): `.captureShell` perdeu raio/mask próprios, o par aninhado acabou — `.convoBox` passou a usar `--r-shell` (20px) direto, como painel de primeiro nível. Ver seção depois de "campo protagonista" |
| `.panelLeft` → `.card` (InboxPanel) | 10px | `--r-shell-inset-10` | 8px | **10px** | Token recalculado sozinho — nenhuma mudança de componente |
| `.central` → `.imageContainer` (ImageViewer) | 12px | `--r-shell-inset-12` | 6px | **8px** | Token recalculado sozinho — nenhuma mudança de componente |
| `.panelRight` → `.item` (TasksPanel) | 10px | era `--r-xs` (7px, fixo) | 8px | **10px** | Corrigido nesta rodada: `--r-xs` → `--r-sm` (9px) — o valor de TASK-357 era artificialmente pequeno só pra caber no teto antigo |
| `.panelRight` → `.addRow` (TasksPanel) | 10px | era `--r-xs` (7px, fixo) | 8px | **10px** | Mesma correção: `--r-xs` → `--r-sm` (9px) |
| `.banner`(clipado por `--r-shell`) → `.coverBtn` (FolderNotesView) | 10px | era `--r-xs` (7px, fixo) | 8px | **10px** | Mesma correção: `--r-xs` → `--r-sm` (9px) |
| `.central` → `.folderCard` (PARAGrid, quadrantes inferiores) | 20px (`.qCards` padding) | `--r-xl` (20px, fixo) | negativo (safe) | **0px, mas espaçamento(20) ≥ raio-de-fora(20) → ainda seguro pela regra do escape hatch (seção 22)** | Nenhuma mudança — `PARAGrid.module.css` não foi tocado (fora do escopo desta task) e não precisou ser |
| `.central` → `.card` (FolderNotesView) | 20px (`.body` padding) | `--r-lg` (16px, fixo) | negativo (safe) | **0px, mesma regra do escape hatch, ainda seguro** | Nenhuma mudança — `FolderNotesView.module.css` não precisou de novo padding |
| `TaskDetail.wrap` (clipado por `--r-shell` de `.central`) → campos/anotação | 22-26px (`.corpo` padding) | `--r-sm`/`--r-md` (9-12px, fixo) | negativo (safe, folga de 4px) | **0-4px, ainda seguro (o mínimo 22px continua ≥ 20px), mas a folga do pior caso encolheu de 4px pra 0px** | Nenhuma mudança de CSS — registrado aqui porque a folga ficou mais apertada, não porque violou |

**Contagem final:** 9 pares afetados, 6 corrigidos automaticamente pelo
token (3 recalculados sozinhos + 3 restaurados de `--r-xs` pra `--r-sm`
porque agora cabem), 3 continuam seguros sem tocar em nada. Zero pares
quebrados por este aumento. Zero arquivos de outra frente
(`PARAGrid.module.css`, `Widget.*`, `Settings.tsx`) precisaram ser
tocados — os dois pares que dependiam deles (`.folderCard`, e
indiretamente `.card` de FolderNotesView) já tinham folga suficiente.

**Se `--r-shell` precisar subir de novo no futuro:** o próximo degrau sem
tocar em `PARAGrid.module.css`/`FolderNotesView.module.css` é limitado —
os dois pares acima têm espaçamento fixo em exatamente 20px; qualquer
`--r-shell` > 20px exige abrir esse padding também (mesma técnica já
usada nos dois arquivos: "espaçamento ≥ raio de fora"), o que precisa da
frente dona de `PARAGrid.module.css` (hoje fora do escopo deste squad).

## Regra: borda de controle sobre `--surface3` (TASK-370, 28/08/2026)

`--border-control` é calibrado contra `--surface2` (~3,1:1/3,23:1, ver seção
2). Qualquer controle (input/botão/checkbox/caixa de captura) cujo FUNDO seja
`--surface3` — o degrau seguinte, mais claro no escuro e mais claro-vizinho
no claro — usa `--border-control-3` em vez de `--border-control`, porque o
par padrão cai abaixo do piso de 3:1 nesse fundo (~2,66:1 escuro / ~2,97:1
claro, medido). `--border-control-3` (`#717179` escuro, `#7d818e` claro)
mede ~3,27:1 escuro / ~3,23:1 claro contra `--surface3` — ver tabelas de
token na seção 2. Hoje o único consumidor é `.convoBox` (CaptureBox,
`src/features/capture/CaptureBox.module.css`) — a dívida registrada na
TASK-369 (borda de `.convoBox` contra `--surface3`) foi paga aqui.
Varredura (TASK-370): dos 10 lugares do app que usam `--border-control`,
`.convoBox` era o único com fundo `--surface3` — os demais sentam sobre
`--surface2` (ex. `.input`/`.tagInput`/`.modalInput`) ou fundo transparente
sobre um painel `--surface`/`--surface2` (checkboxes de tarefa), então não
tinham o mesmo defeito.

**Lição (TASK-370, incidente de build):** comentário de CSS não pode conter `*/` no meio da frase — nome de classe com wildcard (`.type-*`) citado ao lado de outra classe se escreve sem a barra colada (ex. `.type-` ou "`.type-*` " com espaço), nunca `.type-*/`, porque isso fecha o comentário ali e quebra o parser (tela em branco, sem erro de tipo nem teste pego).

## Regra: fundo de controle é PAPEL do token, não grau de separação (TASK-375, 29/08/2026)

**Reprovação do CEO, conceitual, não de tonalidade:** "não gostei das cores
do box de texto, seja sem hover, seja com ele clicado, a cor mais clara tá
me incomodando, parece que não tem design por trás, sem lógica estética."
Ele não pediu outro tom — apontou que a TASK-369/370 resolveu separação
visual escolhendo um valor (subir `.convoBox` pra `--surface3`), não
seguindo uma regra.

**A lógica de luz do app, em três frases (a que faltava registrada):**
a escala `--surface → --surface2 → --surface3` (seção 2) não é uma régua de
"quanto preciso separar" — é PAPEL fixo: `--surface` é card/painel,
`--surface2` é o que fica DENTRO de um card (campo de entrada, ver seção 4
"Input"), `--surface3` é reservado a estado transitório (hover, chip,
contagem — nunca um campo em repouso). Um controle dentro de um painel se
separa dele pela BORDA (`--border-control`, já calibrada pra "SER VISTA",
piso ≥3:1 contra `--surface2` nos dois temas — seção 2), nunca subindo o
preenchimento pro degrau seguinte: subir o preenchimento muda o PAPEL do
elemento (de "campo calmo" pra "estado de destaque"), não só o tom, e é
isso que lê como "sem lógica" mesmo com números de contraste corretos.

**O que a auditoria desta correção encontrou:** `.convoBox` era o ÚNICO
campo de escrita do app inteiro fora da receita de Input (seção 4) —
`Modal .input`, `TasksPanel .addRow`, `PARAGrid .modalInput`,
`NoteEditor .tagInput`, `liveMarkup .cm-livemd-tag-input` seguem todos
`background: var(--surface2)` + `border: 1px solid var(--border-control)`
sem exceção. A TASK-369 criou a exceção pra resolver "as duas cores
pareciam a mesma" (`.convoBox` contra `.captureShell`, ambos then muito
próximos) — mas resolveu emprestando o papel do token errado
(`--surface3`, "hover/chip/contagem") em vez de reforçar a borda do papel
certo (`--surface2`, "campo de input").

**1ª correção (revertida na hora — registrado pra não repetir o erro):**
a primeira resposta a esta reprovação voltou `.convoBox` pro par liso
`--surface2` + `--border-control`, sem mais nada. O coordenador mediu a
linha do tempo e provou que isso é **byte a byte o estado que o CEO já
tinha reprovado ANTES da TASK-369** ("o box do chat tá estranho, as
cores") — a reversão pura resolvia a lógica (o diagnóstico acima continua
de pé) mas devolvia o produto ao ponto de partida. Diagnóstico certo,
conclusão incompleta: faltava dar à caixa presença extra por um canal que
NÃO fosse preenchimento.

### Regra: campo protagonista (TASK-375, 2ª rodada) — presença extra sem trocar de papel

**Quando se aplica:** um campo de texto que É o conteúdo inteiro de uma
tela/painel — não um input entre vários de um formulário, mas o motivo da
tela existir (hoje: só `.convoBox`, o hot path de captura). Pergunta que
decide: "esta tela existiria sem este campo?" — se a resposta é não, o
campo é protagonista. Regra deliberadamente rara, mesmo espírito do
`--elev-5` (seção 18.4, regra 2): se aparecer um segundo candidato,
questionar se ele é MESMO protagonista ou só um input que quer mais peso
visual (provavelmente o segundo caso, e a resposta certa aí seria só
`--border-control` normal).

**O papel do campo não muda** — continua `--surface2` (input, seção 2),
nunca `--surface3`. O que muda são dois canais aditivos, os dois
derivados de tokens que já existem via `color-mix()` (nenhum token novo em
`tokens.css` — avaliado e descartado: dava pra resolver só combinando
tokens já declarados):

1. **Borda mais forte:** `color-mix(in srgb, var(--border-control) 75%,
   var(--fg) 25%)`, espessura `1.5px` (era `1px`, a mesma família de peso
   que `TasksPanel`/`FolderNotesView`/`NoteEditor` já usam pra controle que
   pede mais presença). Mistura em direção a `--fg` porque `--fg` é sempre
   a cor de maior contraste do tema, nos dois temas — não precisa de
   branch por tema.
2. **Sombra interna no topo:** `inset 0 1px 3px color-mix(in srgb,
   var(--bg) 45%, transparent)`. Fisicamente é a MESMA fonte de luz de
   cima que a seção 18.3 já descreve, só que invertida: uma superfície
   ELEVADA pega friso claro no topo (18.3); uma superfície REBAIXADA
   (um campo "afundado" no painel) pega sombra no topo — é o rebordo do
   painel bloqueando a luz de cima bater na parte de cima do recesso.
   `--bg` (o tom mais escuro/piso, nos dois temas) é a base da sombra,
   nunca preto cravado — mistura, não cor nova. Isso NÃO é `--elev-*`
   (elevação só sobe, seção 18.4 regra 2) — é uma categoria à parte,
   "recesso", pro caso raro de campo protagonista.

**Contraste medido (fórmula WCAG, luminância relativa — cálculo manual
registrado aqui porque o par é novo, ainda não auditado por ferramenta):**

| Par | Contraste | Antes (só `--border-control`) | Situação |
|---|---|---|---|
| Borda de campo protagonista sobre `--surface2`, escuro | **~4,7:1** | ~3,1:1 | +~50%, cruza o piso de texto AA (4,5:1) — degrau perceptível de verdade |
| Borda de campo protagonista sobre `--surface2`, claro | **~4,7:1** | ~3,23:1 | +~45%, mesmo cruzamento do piso AA |

Os dois números batem porque a mistura sempre caminha em direção a `--fg`
(a cor de maior contraste do próprio tema) — a fórmula é simétrica por
desenho, não coincidência. **Pixel real fica por conta do coordenador
remedir** (mesmo protocolo já usado nas seções 12/18) — os números acima
são o cálculo de fórmula, não medição em tela.

**Os quatro elementos internos, sem remendo:** como o FUNDO da caixa
continua `--surface2` (só a borda e a sombra mudaram), a decisão da 1ª
correção pra esses quatro elementos continua de pé, sem precisar de novo
ajuste — o selo NOTA (`.convoChipNeutral`), os sete chips de tipo neutros
(`.type-nota` e companhia), o hover do botão de imagem
(`.convoIconBtn:hover`) e o botão Capturar (`.convoSend`/`.convoSendFull`)
usam `var(--surface3)`, a MESMA receita que `InboxPanel.module.css` já usa
pra `.type-*` (chip `--surface3` sobre card `--surface2`).

**Foco:** o anel (`box-shadow: inset 0 0 0 2px var(--accent-s)`) e a
sombra de recesso do repouso agora coexistem na mesma lista de sombras
(`box-shadow` é uma lista, não substituição) — senão o foco apagaria a
leitura de "campo rebaixado" que acabou de ser criada. `border-color`
continua virando `var(--accent)` no foco, como já era.

**Token órfão, sinalizado e não removido:** `--border-control-3`
(`tokens.css`) não tem mais consumidor no `src/` inteiro depois desta
correção — `.convoBox` era o único (a própria seção "TASK-370" acima já
registrava isso). Não removido aqui porque `tokens.css` está sob outra
frente nesta rodada (o squad que está refazendo o sistema de botões do
app). Fica registrado como dívida de remoção: quando `tokens.css` estiver
livre, apagar `--border-control-3` (as duas variantes, claro e escuro) e
esta linha da tabela da seção 2.

### Campo protagonista vira painel de primeiro nível — `.captureShell` removido (TASK-378, 29/08/2026)

**A ordem do CEO, literal, depois de `preview/caixa-captura-opcoes.html`
(TASK-377, cinco estruturas para decidir) ser reprovado pela terceira
vez:** "1, com a cor do box do 2." Traduzindo: a ESTRUTURA da opção 1 (a
caixa senta direto no piso, **sem o painel-moldura `.captureShell` no
meio**) com a COR de caixa da opção 2 (o poço — a caixa como ponto
ESCURO, não como bloco mais claro). Reforçado na entrega: "sem o painel
intermediário."

**O problema que a ordem já continha, medido no app rodando antes de
aplicar:** o que fica atrás do painel de captura hoje não é `--bg`
(`#0d0d10`) — é `.body`, em `--desk` (`#060609`, mais escuro que `--bg`
nos dois temas). A opção 2 fazia a caixa `--bg` contra um painel
`--surface` ao redor — a caixa ficava mais escura que o painel, lia como
poço. Tirando o painel (estrutura da opção 1) sem mais nada, o entorno da
caixa vira `--desk`, e uma caixa `--bg` ali fica **mais clara** que o
chão — o poço se desfaz e volta a ser bloco claro pousado, o defeito que
já tinha sido reprovado três vezes.

**Resolução escolhida (das listadas pela ordem, com critério):**
`.centralColumn` (`App.module.css`) ganha `background: var(--surface)` —
o "chão próprio um degrau acima do piso" — e `.captureShell` perde TUDO
(fundo, borda, raio, mask): vira um `div` de layout puro, transparente,
sem identidade visual própria. `.convoWrap` perde o padding que dava
matting interno ao painel antigo. Resultado: `.convoBox` (agora `--bg`)
senta direto no chão de `.centralColumn` (`--surface`) exatamente como
`.central` já senta — sem nenhuma FORMA nova entre os dois. A opção
alternativa da ordem ("a caixa assume o tom do piso, lida só por
borda/sombra") foi descartada porque zeraria a diferença caixa-vs-entorno
— a própria ordem proibiu isso ("se der praticamente zero, não serve").

**Valores finais (fórmula WCAG, luminância relativa → L\*):**

| Papel | Token | Escuro | Claro |
|---|---|---|---|
| Entorno imediato (`.centralColumn`) | `--surface` | `#141417` (L\*≈6,3) | `#fbfbfc` (L\*≈98,7) |
| Caixa (`.convoBox`) | `--bg` | `#0d0d10` (L\*≈3,6) | `#eceef1` (L\*≈94,0) |
| Piso de verdade (`.body`, fora do alcance visual direto da caixa) | `--desk` | `#060609` (L\*≈1,6) | `#dde0e4` (L\*≈89,1) |
| Base da sombra de recesso | `--desk` (era `--bg`) | — | — |

**Diferença perceptível caixa-vs-entorno:** ≈2,7 L\* no escuro, ≈4,6 L\* no
claro. **Registro honesto, não maquiado:** o número escuro é modesto —
mesma ordem de grandeza dos degraus que a própria TASK-377 chamou de
"quase idênticos". O que mudou não foi só a magnitude, foi a DIREÇÃO: a
caixa agora é o ponto mais escuro (era o mais claro) e a sombra de recesso
(abaixo) finalmente concorda com essa direção — antes a caixa era clara
com sombra de "afundada" (contradição); agora é escura com sombra de
"mais funda ainda" (consistente). Se o CEO julgar isso sutil demais no
escuro depois de ver a tela, a válvula de escape já documentada é trocar
o fundo da caixa de `var(--bg)` pra `var(--desk)` (dobra a diferença pra
≈4,7 L\*) — não aplicada agora porque a ordem pediu literalmente "a cor do
box do 2", que é `--bg`, não `--desk`.

**Contraste da borda (piso 3:1, controle não-textual — seção 2), MESMA
receita da TASK-375 (nenhuma cor nova, só o fundo atrás mudou):**

| Tema | Borda | Fundo novo (`--bg`) | Contraste | Piso |
|---|---|---|---|---|
| Escuro | `rgb(132,132,139)` | `#0d0d10` | **~5,2:1** | 3:1 |
| Claro | `~rgb(105,109,120)` | `#eceef1` | **~4,4:1** | 3:1 |

Os dois cruzam o piso com folga. O escuro melhorou (era ~4,7:1 contra
`--surface2`); o claro caiu um pouco (era ~4,7:1) mas segue bem acima do
mínimo.

**Sombra de recesso — cor e sombra concordam de novo:** a base da sombra
(`color-mix(in srgb, var(--desk) 45%, transparent)`) trocou de `--bg` pra
`--desk` porque `--bg` virou a cor da PRÓPRIA caixa — usar `--bg` como
base da sombra tingiria a caixa com a cor dela mesma (sombra invisível).
`--desk` é o novo "mais escuro disponível", o mesmo papel que `--bg`
cumpria antes contra `--surface2`. Receita, alfa e direção (inset, topo,
luz de cima — seção 18.3) não mudaram, só o token de base.

**Raio — par aninhado desfeito, recalculado (seção 22.3 avisava pra
recalcular se isso acontecesse):** `.captureShell` era o "de fora" da
fórmula `raio_interno = raio_externo - espaçamento`; sem raio/mask
próprios, não há mais curva de fora pra `.convoBox` ficar concêntrica.
`.convoBox` promove pra raio de PORTE — `--r-shell` (20px), o mesmo que
`.panelLeft`/`.panelRight`/`.central` usam — em vez do raio de aninhamento
`--r-shell-inset-12` (8px). `--r-shell-inset-12` **não fica órfão**: o
outro consumidor (`.imageContainer`, ImageViewer) continua usando o token
normalmente.

**Os quatro elementos internos, revistos, sem remendo necessário:** selo
NOTA (`.convoChipNeutral`), os sete chips de tipo neutros (`.type-nota` e
companhia), hover do botão de imagem (`.convoIconBtn:hover`) e botão
Capturar (`.convoSend`) continuam em `var(--surface3)` — o mesmo papel
"hover/chip/contagem" da seção 2, que não depende de QUAL tom o fundo da
caixa usa (é papel do token, não grau de separação — regra da seção
anterior). Com a caixa mais escura (`--bg` em vez de `--surface2`), a
distância desses elementos até o fundo aumentou — contraste igual ou
melhor, nunca pior. Nenhum arquivo precisou mudar por causa deles.

**Foco continua sendo o único momento em que a marca aparece:** o anel
(`--accent` sólido na borda + `inset 0 0 0 2px var(--accent-s)`) contra um
fundo ainda mais escuro (`--bg`, era `--surface2`) tem MAIS contraste, não
menos — laranja contra quase-preto é sempre alto contraste,
independentemente de qual quase-preto. Nenhuma mudança de comportamento:
a caixa continua sendo o único lugar do app que "acende" fora de hover de
botão.

**Arquivos tocados (1ª rodada):** `App.module.css` (`.centralColumn`,
`.captureShell`), `CaptureBox.module.css` (`.convoWrap`, `.convoBox`,
`.convoBox:focus-within`), `tokens.css` (comentário de
`--r-shell-inset-12`, sem valor novo). `App.tsx` **não foi tocado** — o
comentário ali (linha ~211-217, "TASK-346") ainda descreve `.captureShell`
com a receita antiga (fundo/borda/raio próprios); ficou desatualizado
porque `.tsx` estava fora da lista de arquivos autorizados nesta rodada.
Sinalizado aqui para quem pegar `App.tsx` depois corrigir o comentário.

### Válvula de escape puxada — a caixa vira `--desk` (TASK-378, 2ª rodada, mesmo dia)

**A decisão foi do CEO, não do especialista, e ele mesmo registrou por
quê:** depois de ver a 1ª rodada acima rodando, com a diferença
caixa-vs-entorno medida em ≈2,7 L\* no escuro — "mesma ordem de grandeza
dos degraus já reprovados" — o CEO julgou que entregar de novo um degrau
que o próprio especialista chamou de modesto, pra quem já recusou
exatamente isso TRÊS vezes por diferença insuficiente, era apostar contra
a evidência. Ele puxou a válvula de escape que a 1ª rodada já tinha
documentado: **`.convoBox` passa de `var(--bg)` pra `var(--desk)`** — o
piso de verdade, o token mais escuro que existe nos dois temas (seção 2).
Estrutura e direção da 1ª rodada ficam de pé (sem moldura, caixa mais
escura que o entorno, sombra concordando) — só o TOM da caixa mudou de
novo.

**Valores finais (substituem a linha "Caixa" e "Base da sombra" da tabela
da 1ª rodada acima):**

| Papel | Token | Escuro | Claro |
|---|---|---|---|
| Entorno imediato (`.centralColumn`) | `--surface` | `#141417` (L\*≈6,4) | `#fbfbfc` (L\*≈98,6) |
| Caixa (`.convoBox`) | `--desk` (era `--bg`) | `#060609` (L\*≈1,7) | `#dde0e4` (L\*≈89,0) |
| Base da sombra de recesso | `--recess-shadow` (token novo, `tokens.css`) | `rgba(0,0,0,.45)` | `rgba(20,20,35,.14)` |

**1. Diferença perceptível caixa-vs-entorno, recalculada:** ≈**4,7 L\*** no
escuro (era 2,7 — quase dobrou), ≈**9,6 L\*** no claro (era 4,6 — mais que
dobrou). A caixa agora é o ponto inequivocamente mais escuro da tela nos
dois temas — não há mais ambiguidade de leitura. `--desk` é o piso do
próprio sistema de token (o mais escuro que existe); não sobra alavanca de
fundo pra puxar de novo se isso ainda for pouco — a próxima, se precisar,
é alfa/blur da sombra, não mais o token de cor.

**2. Contraste da borda contra o fundo novo (piso 3:1, controle
não-textual — seção 2), MESMA receita de sempre (nenhuma cor nova):**

| Tema | Borda | Fundo (`--desk`) | Contraste | Piso | Situação |
|---|---|---|---|---|---|
| Escuro | `rgb(132,132,139)` | `#060609` | **~5,45:1** | 3:1 | Folga de +82% — melhorou a cada fundo mais escuro |
| Claro | `~rgb(105,109,120)` | `#dde0e4` | **~3,91:1** | 3:1 | Folga de +30% — caiu (era ~4,4:1 contra `--bg`, ~4,7:1 contra `--surface2` originalmente) mas não estoura o piso |

Nenhum dos dois tema quebra o piso de 3:1 — o claro tem menos folga que
antes (a borda é um cinza médio que se aproxima do próprio fundo quando o
fundo escurece), mas ainda folga real de quase um terço acima do mínimo.
Não precisou parar e voltar pro `--bg`.

**3. Tema claro — confirmado, não vira mancha:** `--desk` claro
(`#dde0e4`, L\*≈89,0) é mais escuro que `--surface` (`#fbfbfc`, L\*≈98,6),
então a caixa fica mais escura que o entorno no claro também, como pedido
— e a diferença (≈9,6 L\*) é a MAIOR das duas medidas nesta rodada, não a
menor. O risco real não era a caixa parecer "manchada" (ela é um cinza
muito claro, `rgb(221,224,228)`, reconhecível como o mesmo material da
"mesa" que já aparece no app inteiro — não um cinza sujo novo) — o risco
medido foi a SOMBRA: usar o mesmo preto a 45% do escuro no claro
pintaria uma faixa escura pesada demais no topo da caixa (mistura de
preto puro numa base tão mais clara derruba a luminância muito mais).
Por isso o claro ganhou um PAR PRÓPRIO — ver item 5. Sem esse ajuste na
sombra, sim, teria virado mancha; com ele, não.

**4. Elementos internos, recontados contra o fundo ainda mais escuro:**
selo NOTA/chips de tipo/hover do ícone/botão Capturar continuam em
`var(--surface3)` (papel fixo da seção 2, não muda com o tom do fundo).
Distância perceptível (L\*) selo-vs-caixa no escuro: `--surface3`
(L\*≈13,4) contra `--desk` (L\*≈1,7) = **≈11,7 L\*** de diferença — maior
que a distância medida na 1ª rodada contra `--bg` (≈9,7 L\*). Texto normal
(`--fg`) e placeholder (`--fg3`) dentro da caixa: contraste calculado
(fórmula WCAG) **~16,6:1** e **~6,2:1** respectivamente contra `--desk`
escuro — os dois muito acima do piso AA de texto (4,5:1), e melhores que
antes (fundo mais escuro só ajuda texto claro). Nenhum remendo necessário
de novo.

**5. Sombra de recesso — token novo, `--recess-shadow` (`tokens.css`),
porque a base anterior (`--desk`) virou a cor da própria caixa:** não há
mais token de superfície abaixo de `--desk` pra reciclar (`--desk` é o
piso de verdade). Em vez de inventar um tom de cinza novo, o token guarda
a cor FINAL da sombra (já com alfa), calibrada por tema:

- **Escuro:** `rgba(0, 0, 0, .45)` — preto puro, mesma alfa da receita
  anterior. Esta é uma exceção deliberada à regra da seção 18.3 ("nunca
  preto cravado") — aquela regra foi escrita pensando na escala de
  elevação, onde sempre sobra um token de superfície mais escuro
  disponível; aqui o piso do próprio sistema de token foi alcançado, e a
  exceção é registrada aqui, não escondida. Efeito medido: mistura com
  `--desk` escuro derruba o topo da caixa em ≈0,84 L\* — sutil, mas na
  MESMA família de sutileza que a receita anterior já produzia (≈0,90 L\*
  contra `--surface2`) — não é uma regressão de intensidade, é a mesma
  intensidade com base nova.
- **Claro:** `rgba(20, 20, 35, .14)` — o "ink" que `--border`/`--shadow`/
  `--elevation-card`/`--elev-2..5` claros já usam pra toda sombra/divisória
  desta paleta (reaproveitado, não inventado), a uma alfa BEM mais baixa
  que o par escuro. Motivo medido: a mesma alfa de 45% misturando preto
  puro contra um fundo tão mais claro (`--desk` claro é L\*≈89 contra
  L\*≈1,7 do escuro) pintaria uma faixa escura pesada — o teste que
  motivou baixar a alfa. Em 14% (perto da faixa que a própria
  `--elevation-card` já usa, .04/.12, um pouco mais forte por ser recesso
  de campo protagonista) o efeito medido é ≈10,2 L\* de queda no topo —
  visível, coerente com "a sombra FAZ o trabalho" no claro (seção 18.3),
  sem virar mancha.

**Cor e sombra concordam nos dois temas, confirmado:** a caixa é o ponto
mais escuro da tela (repouso) e a sombra só aprofunda o mesmo canto —
nenhuma contradição em nenhum tema.

**Arquivos tocados (2ª rodada):** `tokens.css` (token novo
`--recess-shadow`, dois temas), `CaptureBox.module.css` (`.convoBox`
background e `box-shadow`, `.convoBox:focus-within` `box-shadow`,
comentários). `App.module.css` não precisou mudar nesta rodada — o "chão
próprio" (`--surface` em `.centralColumn`) já estava certo, só a cor da
caixa em cima dele mudou.

### CEO reprova o "chão próprio" — container removido de vez, a caixa sobe pra `--surface` (TASK-380, 29/08/2026)

**A ordem, literal:** "você criou um container atrás do PARA e do box..
sem sentido, apague isso agora." O "chão próprio" que a seção anterior deu
a `.centralColumn` (`background: var(--surface)`) resolveu o conflito de
cor (poço vs bloco claro) criando exatamente a camada nova que a ordem
original da TASK-378 ("sem o painel intermediário") tinha mandado tirar —
o especialista trocou um problema por outro. O CEO está certo.

**O que foi apagado:** `.centralColumn` (`App.module.css`) perde o
`background` — volta a ser só layout (o pai flex-column que empilha o
painel do PARA e a caixa de captura, sem cor, borda, raio ou máscara
próprios, nunca foi pra ser uma FORMA).

**O conflito que isso reabre, resolvido na mesma rodada:** sem chão
próprio, o entorno de `.convoBox` volta a ser o piso REAL do app (`.body`,
`--desk`) — o MESMO token que a caixa já usava desde a "válvula de escape"
da seção anterior. Duas superfícies no mesmo tom somem uma na outra —
exatamente o defeito que o CEO apontou.

`--desk` é o piso de verdade do sistema de tokens (o mais escuro que
existe nos dois temas — seção 2) — não há token abaixo dele pra puxar. A
única saída honesta pra continuar visível sem inventar container é a
caixa subir um degrau: fica mais clara que o chão, não mais o ponto mais
escuro da tela. **Isso é uma perda real da metáfora de "poço"** que a
seção anterior tinha conquistado — registrado sem maquiagem, não
escondido.

**Por que `--surface`, não `--bg` (o degrau logo acima de `--desk`):** a
própria história deste componente já mediu que um degrau modesto não
convence o CEO — `--bg` contra `--surface` (a relação da 1ª rodada da
TASK-378) dava só ≈2,7 L\* no escuro, e foi reprovado três vezes por
"quase idêntico". `--bg` contra `--desk` (a relação de agora, se esse
degrau fosse escolhido) dá ainda menos: ≈2,0 L\*. Pular direto pra
`--surface` reusa o MESMO tom que `.panelLeft`/`.panelRight`/`.central` já
usam sentados direto em `--desk` — a caixa vira um painel de primeiro
nível como os outros três, com a MESMA magnitude de diferença que a
própria TASK-378 já validou como suficiente (só a DIREÇÃO inverte: a
caixa agora é a mais clara, não a mais escura).

**Valores finais:**

| Papel | Token | Escuro | Claro |
|---|---|---|---|
| Piso real (`.body`, agora também o entorno direto de `.convoBox`) | `--desk` | `#060609` (L\*≈1,7) | `#dde0e4` (L\*≈89,0) |
| Caixa (`.convoBox`) | `--surface` (era `--desk`) | `#141417` (L\*≈6,4) | `#fbfbfc` (L\*≈98,6) |

Diferença perceptível: ≈4,7 L\* escuro, ≈9,6 L\* claro — idêntica à
magnitude já aprovada na TASK-378, invertida em direção.

**Borda, recalculada contra o fundo novo (piso 3:1, controle
não-textual):**

| Tema | Borda | Fundo (`--surface`) | Contraste | Situação |
|---|---|---|---|---|
| Escuro | `rgb(132,132,139)` | `#141417` | **~4,95:1** | Era ~5,45:1 contra `--desk` — cai um pouco, segue com folga de +65% |
| Claro | `~rgb(105,109,120)` | `#fbfbfc` | **~5,0:1** | Era ~3,91:1 contra `--desk` — melhorou |

**`--recess-shadow` (tokens.css, TASK-378) — continua fazendo sentido,
medido, não assumido:** o token nasceu pra um caso específico (a caixa
sentando em `--desk`, sem token de superfície mais escuro abaixo pra
reciclar como base). Esse caso não existe mais (`--surface` tem `--bg` e
`--desk` mais escuros abaixo), mas a receita (cor final já com alfa) não
depende de qual token está por baixo — funciona igual:
- Escuro: `rgba(0,0,0,.45)` misturado com `--surface` (L\*≈6,4) derruba o
  topo da caixa pra ≈L\*3,1 — queda de ≈3,3 L\*, MAIOR que a queda de
  ≈0,84 L\* que a mesma receita dava contra `--desk` (a caixa antes já
  estava quase preta, sobrava pouco L\* pra cair). O recesso fica MAIS
  legível agora, não menos, e a área afetada continua sendo só a faixa de
  1-3px do inset — não estoura.
- Claro: `rgba(20,20,35,.14)` misturado com `--surface` claro (L\*≈98,6)
  derruba pra ≈L\*87,3 — queda de ≈11,3 L\*, mesma ordem de grandeza da
  queda que a receita já dava contra `--desk` (≈10,2 L\*).
- **Veredito: nenhuma recalibração necessária.** O token sobrevive à troca
  de fundo sem sumir nem estourar.

**A caixa deixa de ser "poço" e vira painel de primeiro nível — trade-off
explícito, não escondido:** com o chão próprio removido e `--desk` sendo
o piso de verdade sem token abaixo dele, não há como a caixa continuar
sendo o ponto mais escuro da tela sem reintroduzir algum tipo de
container atrás dela — exatamente o que foi proibido nesta rodada. A
caixa agora é irmã de `.central`/`.panelLeft`/`.panelRight` (mesmo tom,
`--surface`, sentados direto no piso), e continua lendo como "campo onde
se escreve" pela borda reforçada + sombra de recesso (inset, topo) — não
mais pela cor absoluta ser a mais escura da tela.

**Zoom no hover (segunda parte da ordem — "falta o zoom no hover do text
box"):** `.convoBox` ganha a classe global `hoverZoom` (`reset.css`,
TASK-317) — a mesma régua de todo container interativo do app
(`.folderCard`, `.card`), nenhum número novo. Dois cuidados medidos antes
de aplicar:
1. **Squircle não serrilha ao escalar:** a máscara
   (`mask-image: paint(squircle)`) é computada pelo worklet Houdini a
   partir do TAMANHO DE LAYOUT do elemento — `scale` (assim como
   `transform: scale()`) é aplicado DEPOIS do paint, como transformação de
   composição; a caixa inteira (conteúdo + máscara) escala junto, como uma
   unidade, preservando a curvatura relativa. Não é suposição nova:
   `.folderCard` (`PARAGrid.tsx`) já combina `hoverZoom` +
   `mask-image: paint(squircle)` em produção (mesmo mecanismo, mesmo raio
   de porte) sem nenhum defeito de serrilhado registrado em
   `armadilhas-medidas.md` ou nesta seção — é o precedente mais próximo
   que existe no próprio Client.
2. **Clipe pela ancestral (achado NOVO desta rodada):** `.convoBox` senta
   rente às bordas esquerda/direita/baixo de `.centralColumn` (a TASK-378
   tirou o matting de propósito) — e `.centralColumn` tinha
   `overflow: hidden`. Escalar uma caixa "rente" dentro de um ancestral
   que clipa corta a borda que cresce pra fora (a mesma armadilha que a
   própria regra do `.hoverZoom` documenta em `reset.css`, item 2: "linha
   de largura total não pode escalar"). Resolvido junto: `.centralColumn`
   perde o `overflow: hidden` (vira `visible`) — sem risco novo, porque
   quem de fato precisa clipar já clipa por conta própria (`.central`, o
   painel do PARA, mantém `overflow: hidden`; `.convoInput`, o texto da
   caixa, mantém `overflow-y: auto`). O respiro que sobra pra absorver o
   1,5% de escala (`--hover-scale`, `reset.css`) vem do `gap: 10px` que já
   existia entre `.captureShell`/`.convoWrap` e do `padding` de `.body`
   (10px nas laterais/embaixo) — nenhum espaçamento novo foi criado.

**Foco e hover não brigam (pedido explícito da ordem):** `hoverZoom`
escala (`scale`) e `.convoBox:focus-within` decora
(`border-color`/`box-shadow`) — propriedades diferentes, nunca disputando
o mesmo valor, o mesmo princípio que já rege `hoverZoom` + `hoverGlow`
coexistindo no botão `.convoSend`. Como `.convoBox` é uma `<div>` sem
`tabindex`, o seletor `.hoverZoom:focus-visible` nunca dispara nela
diretamente (só `:hover` importa aqui) — clicar dentro da caixa acende o
anel de foco do CONJUNTO (`:focus-within`) independente de o mouse
continuar em cima ou não; se o mouse sair depois do clique, o zoom relaxa
e o anel de foco continua aceso, sem contradição (são dois sinais, dois
canais visuais).

**`prefers-reduced-motion`:** herdado do mecanismo já existente
(`tokens.css`, regra global) — não precisou de ajuste novo; `.convoBox`
segue a mesma regra que todo outro consumidor de `.hoverZoom` já segue
(transição cai pra 80ms; a escala em si não foi desligada em lugar nenhum
do app — comportamento pré-existente, não uma lacuna nova desta tarefa).

**Não confirmado nesta rodada (sem ferramenta de screenshot/build neste
posto de trabalho):** o comportamento do worklet squircle sob `scale` é
justificado por mecanismo + precedente (`.folderCard`), não por captura de
tela desta caixa específica. Pedido explícito: confirmar no app real que a
borda/canto não serrilha e que o clipe foi mesmo resolvido nas bordas
esquerda/direita/baixo antes de fechar como definitivo.

**Arquivos tocados:** `App.module.css` (`.centralColumn` — background
removido, `overflow: hidden` → `visible`, comentário reescrito),
`CaptureBox.module.css` (`.convoBox` — `background`, comentários de borda
e sombra recalculados), `CaptureBox.tsx` (classe `hoverZoom` somada ao
`className` da `.convoBox`), `tokens.css` (comentário de `--recess-shadow`
atualizado, nenhum valor novo).

## 23. Tarja/porte de botão reduzidos e animação simétrica (TASK-372, 29/08/2026)

**Duas fotos do CEO, na mesma mensagem, cobrando "TOKENIZAÇÃO" com todas as
letras — a TASK-327 (seção 17) tinha ficado documentada mas não fechada de
verdade.** Palavras dele:

- Sobre "Capturar": "com essa tarja com o gradiente tá muito alto, reduz a
  altura dessa tarja e a altura dos botões também, tá ridículo, e quero que
  tenha mais easy in and out de animação, demore levemente pra acender, tá
  muito com cara de software vagabundo."
- Sobre "Nova pasta" (ao lado do contador "1 pasta"): "o botão de nova pasta
  tá sem isso... investiga a consistência do design dos botões... TOKENIZAÇÃO!"
- Terceira foto (não comentada por escrito, registrada mesmo assim): "Novo
  grupo" com moldura tracejada, um quarto desenho.

### 23.1 — Auditoria fresca (a que faltava desde a TASK-327)

A auditoria da seção 17 (54 seletores, 14 componentes) **nunca cobriu
`PARAGrid.tsx` `CategoryView`/`.catAdd` nem `TasksPanel` `.addGroup`** —
os dois exatamente apontados pelo CEO nesta rodada. Grep fresco de
`cursor: pointer` em todo `src/**/*.module.css` (25 arquivos, incluindo os
6 que a varredura de 28/08 não tinha aberto) confirma: a fragmentação
continua sendo o mesmo padrão — "criar X" reimplementado do zero em vez de
puxado de um lugar só.

| Botão | Arquivo | Porte (era) | Radio (era) | Tarja antes | Veredito | Ação nesta rodada |
|---|---|---|---|---|---|---|
| `.primary`/`.ghost`/`ModalButton` | `components/Modal.module.css` | 44px fixo | `--r-btn` | Sim (default) | Referência, porte errado | Migrado pra `var(--btn-h-lg)` |
| `.btnNew`/`.btnNewAlt` (Nova nota/Nova tarefa) | `features/folder/FolderNotesView.module.css` | 44px fixo | `--r-btn` | Sim | Porte errado | Migrado |
| `.btnNewBig`/`.btnNewBigAlt` (estado vazio) | idem | 44px fixo | `--r-btn`/`--r-md` | Sim | Porte errado | Migrado |
| `.ob-btn`/`.ob-btn.primary` (onboarding) | `features/onboarding/onboarding.css` | 44px fixo | `--r-md` | Sim | Porte errado | Migrado |
| `.convoSend` ("Capturar" — a foto do CEO) | `features/capture/CaptureBox.module.css` | `var(--btn-h-lg)` | `--r-btn` | Sim (default, sem override) | Já usava token — herdou o novo valor sozinho | **Nenhum arquivo tocado** (fora do alcance desta rodada) — resolvido só por token |
| `.catAdd` ("Nova pasta" — a 2ª foto do CEO) | `features/para/PARAGrid.module.css` | 32px fixo | `--r-md` | **Não tinha** | Nunca auditado; porte E raio errados; sem tarja | Migrado + `hoverGlow hoverZoom` adicionado em `PARAGrid.tsx` (2 usos: header e estado vazio) |
| `.addGroup` ("Novo grupo" — a 3ª foto) | `features/tasks/TasksPanel.module.css` | Sem altura fixa (padding 9px) | `--r-sm` | **Não tinha**, moldura TRACEJADA (4º vocabulário) | Nunca auditado; borda/raio/fonte fora do sistema; sem tarja | CSS migrado (borda sólida, `--r-btn`, `--text-xs`, `--glow-intensity`) — **classe `hoverGlow` NÃO adicionada**: vive em `TasksPanel.tsx`, arquivo fora do alcance desta rodada (outra frente, comportamento de tarefas). Ver "Known Gaps" abaixo. |
| `.btnEdit` (editor) | `features/editor/ImageViewer.module.css` | 30px, override próprio | `--r-md` | Não (fill sólido antigo) | Já documentado (17.2/Known Gaps) | Não tocado — fronteira do editor (RUSTLINE) |
| `.btnCancel`/`.btnPrimary`/`.close`×4/`.acaoBtn` | vários | 24-36px, drift | vários | Não | Já documentado (17.2, Fase 4 pendente) | Não tocado — fora do pedido desta rodada, backlog conhecido |

**Contagem:** 9 botões primário/secundário-com-rótulo no app (excluindo
editor e widget). Antes desta rodada: 5 usavam a tarja (`.primary`/`.ghost`,
`.btnNew`/`.btnNewAlt`, `.btnNewBig`/`.btnNewBigAlt`, `.ob-btn.primary`,
`.convoSend`) — todos no porte errado (44px). Depois: **7 de 9** usam a
tarja no porte novo (36px) — os 5 de antes migrados + `.catAdd` (adotado
nesta rodada). Os 2 que faltam (`.addGroup`, `.btnEdit`) têm motivo escrito
(bloqueio de arquivo fora do alcance), não omissão silenciosa.

### 23.2 — O sistema: 1 porte com rótulo, recalibrado

`--btn-h-lg` (tokens.css) **44px → 36px** — o valor que o app usava ANTES
da TASK-306. A exigência de 44px só existia enquanto `--dott-gradient` (o
radial cheio) preenchia o botão inteiro em repouso, ancorando o núcleo bem
abaixo da linha de texto; a TASK-319 (28/08) já tinha tirado esse
preenchimento do repouso — hoje **zero botão consome `--dott-gradient`
puro** (confirmado por grep). Reverter pro valor histórico é REUSE, não
invenção. `--btn-h-md` (28px, ícone-só/hot-path) e `--btn-h-sm` (20px) não
mudaram — o pedido do CEO mirava a família COM rótulo (as 3 fotos são
todas botões com texto).

**Todo consumidor da família lg passou a LER o token** (zero número mágico
remanescente nesse porte): `Modal.module.css` `.btn`, `FolderNotesView
.btnNew`/`.btnNewAlt`/`.btnNewBig`/`.btnNewBigAlt`, `onboarding.css
.ob-btn`. `.convoSend` (CaptureBox) já lia o token desde a TASK-343/375 —
herdou a mudança automaticamente.

### 23.3 — A tarja: números antes/depois

Geometria em `.hoverGlow` (`reset.css`), consumida por herança em todo
botão com a classe:

| Propriedade | Antes (TASK-336) | Depois (TASK-372) | Razão |
|---|---|---|---|
| `--tag-h` (altura total) | 12px | **8px** | Metade, acompanhando a altura do botão caindo de 44→36px |
| Fatia VISÍVEL (metade de `--tag-h`) | 6px | **4px** | -33% em valor absoluto |
| Fatia visível ÷ altura do botão | 6/44 = 13,6% | **4/36 = 11,1%** | Proporção também cai, não só o valor absoluto |
| `--tag-r` (raio da tag) | 3px | **2px** | Metade do visível, mesma razão histórica |
| `--tag-inset-x` (recuo lateral) | 10px | **8px** | Mesma proporção relativa ao botão (10/44 ≈ 8/36 ≈ 22%) |

Overrides de botão menor que já existiam (`.btnEdit`, 30px, editor — fora
do alcance) continuam com a própria geometria (6px/2px), já proporcional
ao porte deles; não precisaram mudar.

### 23.4 — Animação: simétrica, com leve demora

CEO: "quero que tenha mais easy in and out de animação, demore levemente
pra acender". Antes: `transition: opacity 220ms var(--ease-out)` — número
solto (não token) e curva `--ease-out` (começa RÁPIDO, ler como "flash"
instantâneo em vez de "ganhando força aos poucos"). Depois, nos dois
`transition` de `.hoverGlow` (`::before` o corpo neutro, `::after` o
preenchimento de marca):

```
transition: opacity var(--dur-glow) var(--ease-inout);
```

- **`--ease-inout`** (tokens.css) — `cubic-bezier(0.77, 0, 0.175, 1)`, já
  existia declarado e **tinha ZERO consumidor no app** (confirmado por
  grep antes desta rodada). Simétrica por natureza (devagar→rápido→devagar
  nos DOIS sentidos) — acender e apagar usam a mesma curva, a demora leve
  fica só no início de cada transição, nunca some no meio. Reusado, não
  reinventado.
- **`--dur-glow: 240ms`** (tokens.css, novo) — não reusa `--dur-medium`
  (mesmo valor numérico, mas semântica diferente: aquele é "modal, troca de
  tela"; este é um momento de marca, e os dois não podem ficar acoplados
  por acidente se um mudar no futuro). Nasce token nomeado pelo PAPEL,
  como a casa já faz (`--icon-btn-md` também duplica o valor de
  `--btn-h-md` com nome próprio, mesmo padrão).
- `prefers-reduced-motion` já cobria os dois seletores antes (bloco
  genérico do topo do arquivo) — sem ajuste extra necessário.
- O pulso de clique (`.hoverGlow:active::after`, `.16s var(--ease-out)`)
  **não mudou** — é feedback de clique, evento diferente do hover, fora do
  pedido.

### 23.5 — `TabBar`/`.tabIndicator`: tokenizado, `width` mantido por decisão escrita

Pedido do coordenador na mesma rodada (dono de `reset.css`). O `220ms`
solto do trilho deslizante de aba virou `var(--dur-medium)` (240ms) —
DELIBERADAMENTE não `--dur-glow`: o trilho e o conteúdo da aba
(`.tabContent`, já em `--dur-medium`) são duas metades da MESMA animação
de troca de aba e precisam terminar juntos; a brasa do botão é outro
momento (marca acendendo em hover), com exigência diferente do CEO
(simetria), por isso tem par próprio. A alternativa 100%-compositor
(`scaleX` + `border-radius: calc(2px / var(--indicator-scale))`, sugerida
pelo guarda de design) foi REAVALIADA — o cálculo fecha matematicamente,
mas aplicá-la exige ensinar `TabBar.tsx` a escrever uma terceira custom
property (`--indicator-scale`) e não há Playwright/preview neste posto
pra confirmar que a ponta arredondada não distorce quando o contador troca
de dígito. Mantido `width` (a decisão e o motivo já estavam escritos em
`reset.css` desde 28/08 — conferido, não tinha sumido); reavaliação e
tokenização registradas no comentário junto de `.tabIndicator`.

### 23.6 — Regra pro próximo botão

1. Botão com rótulo (primário ou secundário) usa `height: var(--btn-h-lg)`
   — nunca um número solto.
2. Se ele é ação de criação/confirmação dentro de uma fileira (o padrão
   "Nova X"), leva `hoverGlow hoverZoom` no JSX. Se for secundário, define
   `--glow-intensity: .6` (o mesmo grau que `.btnNewAlt`/`.catAdd`/
   `.addGroup` já usam).
3. Nunca escrever `--tag-h`/`--tag-inset-x`/`--tag-r` num módulo novo — os
   defaults de `.hoverGlow` (8px/8px/2px) já servem o porte `lg`; só
   sobrescrever se o botão for de um porte MENOR (ver `.btnEdit`).
4. Se o botão NÃO deve ter a tarja, o motivo entra aqui (não é permitido
   deixar de fora sem registrar por quê) — hoje a única exceção documentada
   é `.ghost`/"Cancelar" (nunca leva marca, é a ação de descarte).

**Arquivos tocados nesta rodada:** `tokens.css`, `reset.css`,
`components/Modal.module.css`, `features/folder/FolderNotesView.module.css`,
`features/onboarding/onboarding.css`, `features/para/PARAGrid.module.css`,
`features/para/PARAGrid.tsx`, `features/tasks/TasksPanel.module.css`
(só CSS). **Não tocados por restrição:** `features/tasks/TasksPanel.tsx`,
`store.ts`, `features/capture/CaptureBox.module.css` (o botão "Capturar"
recebeu a correção inteira por herança de token, sem editar este arquivo).

## Known Gaps (dívida registrada, não escondida)

- **`.addGroup` ("Novo grupo", `features/tasks/TasksPanel.module.css`)
  está com a receita CSS pronta pro sistema de botão (TASK-372: borda
  sólida, `--r-btn`, `--text-xs`, `--glow-intensity: .6`), mas SEM a classe
  `hoverGlow hoverZoom`** — falta só adicionar essa className no `<button>`
  de `TasksPanel.tsx` (linha ~234). Não feito nesta rodada porque
  `TasksPanel.tsx` está sob outra frente (comportamento de tarefas),
  restrição explícita desta task. Assim que liberar, é uma linha.
- **`ImageViewer.btnEdit` e `NoteEditor.btnDelete` (`src/features/editor/`)
  continuam com preenchimento sólido `--accent`/vermelho cravado**
  (TASK-327/329) — os dois foram identificados no mesmo lote dos outros 6

- **`ImageViewer.btnEdit` e `NoteEditor.btnDelete` (`src/features/editor/`)
  continuam com preenchimento sólido `--accent`/vermelho cravado**
  (TASK-327/329) — os dois foram identificados no mesmo lote dos outros 6
  botões-acidente e dos 7 lugares de vermelho cravado, mas ficaram de fora
  desta rodada porque o RUSTLINE está construindo a tela de escrita dentro
  de `src/features/editor/` agora ("não encoste em nada lá"). Migrar
  quando o editor fechar.
- **`.q-areas`/`.q-resources`/`.q-archives .qAdd` (`PARAGrid.module.css`)
  têm o mesmo defeito de RGB cravado que `.q-projects .qAdd` tinha** (o
  hex do meio de cada cor de quadrante, só correto no tema escuro) — só a
  de Projetos foi corrigida nesta rodada porque o pedido era
  especificamente "o vermelho cravado" (7 lugares). Mesmo conserto
  (`color-mix()` sobre `--q-a`/`--q-r`/`--q-ar`), mecânico, registrado
  como próximo passo.
- **A escala de elevação (`--elev-*`, seção 18) existe em token, mas só
  `--elev-1`/`--elev-4` têm consumidor** (via os alias
  `--elevation-card`/`--shadow`) — `--elev-2`/`--elev-3`/`--elev-5` ainda
  não foram cabeados em nenhum componente existente do app principal
  (só a proposta da tela de escrita e, futuramente, `.card:hover` migrado
  de `translateY` solto).

- **Varredura de tipografia (TASK-309, 27/08/2026) não é exaustiva por
  desenho.** Convertidos pra `var(--text-*)` só os `font-size: Npx` que
  duplicavam EXATAMENTE um degrau antigo da escala (24/22/17/16/14/13/12/11),
  em toda a base não-editor (16 arquivos: App, Constellation, TasksPanel,
  TaskDetail, SearchModal, Breadcrumb, Toast, BootLoader, GlyphPicker,
  Titlebar, Settings, PARAGrid, onboarding, FolderNotesView, InboxPanel,
  reset/tokens). Valores bespoke (`13.5px`, `12.5px`, `11.5px`, `10.5px`,
  `15px`, `18px`, `20px`, `9px`, `10px` já solto) foram DEIXADOS DE FORA de
  propósito — muitos são medições auditadas (proporção pill/conteúdo do
  TASK-299, 25/08/2026) que uma conversão mecânica quebraria. `Widget.module.css`
  e o editor (`features/editor/`) ficaram fora por desenho (ver linha
  abaixo). Se aparecer texto que "não encolheu" numa tela específica, é
  provável que seja um destes valores bespoke — ajuste manual, com a mesma
  régua de proporção do TASK-299, não reconversão em massa.

- **Escala de raio legada (`--r-xs..--r-3xl`)** ainda convive com a nova
  (`--r-btn`/`--r-card`) porque alimenta o widget/orbe (fora de escopo
  permanente) e vários modais/cards do app principal (Settings,
  SearchModal, GlyphPicker, `.processModal` do Inbox, Toast, PARA) que
  **não foram redefinidos de raio nesta rodada** (TASK-299 focou peso de
  título/rótulo e a regra de sombra, não raio — exceção: `.ob-card` do
  onboarding, que migrou `--r-3xl` → `--r-card` porque também perdeu a
  sombra). Migrar esses consumidores pra `--r-btn`/`--r-card` é o próximo
  passo natural, ainda não agendado.
- **Quatro modais fora do vocabulário único** (`Settings.module.css`,
  `SearchModal.module.css`, `GlyphPicker.module.css`,
  `InboxPanel.module.css` `.processModal`) continuam com sua própria marcação
  em vez de usar `src/components/Modal.tsx`. Seguem a regra de sombra
  (são superfície flutuante) e agora têm título/rótulo alinhados (Settings
  `.sectionTitle`, SearchModal `.groupLabel`), mas a migração pro componente
  único ainda não aconteceu.
- **`.bannerName` (nome da pasta) tem `text-shadow`**, não `box-shadow` — é
  legibilidade de texto branco sobre foto de capa, não elevação de card;
  mantido, mas registrado aqui para não parecer omissão.
- **CursorGothic/Inter → Manrope, JetBrains Mono mantido** — decisão do CEO
  de 25/08/2026, não desta rodada; documentada aqui só para rastreabilidade
  da baseline.
- **Auditoria de 25/08/2026 (TASK-299)** cobriu as ~20 superfícies medidas
  pelo coordenador via grep + DOM real (dev server 5599): onboarding
  (a pior, corrigida por completo), Settings, SearchModal, Toast,
  GlyphPicker, Titlebar, Constellation, InboxPanel (resíduo), TaskDetail
  (resíduo), App.module.css (drag ghost). `src/widget/Widget.module.css` e
  `src/styles/fonts.css` ficaram de fora por desenho (widget aprovado;
  fonts.css é `@font-face`, não estilo).
- **`Settings.doRestore` (restaurar backup) ainda usa `confirm()` nativo do
  navegador**, não o `Modal` do app (TASK-367-2 trocou só a confirmação de
  "Limpar exemplos"; restaurar backup não foi pedido nesta rodada e não foi
  ampliado por conta própria) — mesma migração pendente, decisão de quando
  fica com o CEO.

---

## Aprovação

**Aprovado por:** Gustavo Farina (CEO) em 25/08/2026, sobre `preview/index.html`
(hash `804f450fb468`), com um ajuste de direção pedido no ato: títulos em peso
700 (ver "Baseline Decision", item 5).

A partir daqui este arquivo é o contrato do sistema visual do Dott. Tela nova
nasce dele; divergência é defeito, não estilo. Trocar de baseline ou redesenhar
invalida esta aprovação e exige preview + aprovação novas.
