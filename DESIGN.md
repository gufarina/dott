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
| `--border-control` | `#63636b` | `#8b8b99` | Borda de input/botão/checkbox — tem que SER VISTA (piso ≥3:1) |
| `--hairline` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)` | Borda "sutil" da baseline Cursor — usada em Modal e superfícies novas |
| `--fg` | `#e8e8ec` | `#18181f` | Texto principal |
| `--fg2` | `#aeaec2` | `#54546a` | Texto secundário |
| `--fg3` | `#8c8ca6` | `#666678` | Texto terciário / metadado / label uppercase |
| `--accent` | `#e05a38` | `#d94428` | Destaque pontual (link, ícone ativo) — NÃO é o CTA (ver `--dott-gradient`) |
| `--accent-s` | `rgba(224,90,56,.12)` | `rgba(217,68,40,.10)` | Fundo de destaque suave (sugestão, foco de input) |
| `--focus` | `#ff8a63` | `#b8341a` | Anel de foco de teclado |
| `--warn` / `--danger` / `--success` | ver tokens.css | ver tokens.css | Semântico — nunca usado como accent de marca |
| **`--dott-gradient`** | a brasa de verdade do widget — núcleo quase-branco + corpo de fogo + ambiente em `screen` sobre `#070103`, sem capar (ver `tokens.css`) | igual (fixo) | **O único accent de marca — forma SUPERFÍCIE.** Botão primário (44px+), rodapé de modal. Escasso por definição — ver Do's/Don'ts |
| `--dott-gradient-linear` | `linear-gradient(135deg, oklch(.54 .20 37), oklch(.80 .22 50), oklch(.97 .05 62))` | igual | **Mesmo accent, forma LINHA.** `border-image` (tab ativa), superfície larga demais pro radial (`.btnNewBig`) e superfície PEQUENA demais pro núcleo caber (badge de contagem, botão do Quick Capture) |
| `--dott-gradient-soft` | tint 14% das mesmas 3 paradas da forma linha | igual | Fundo de estado ativo/selecionado (tint, não sólido) |

`--dott-gradient` (nas duas formas) é **fixo** (não muda com o tema): é
identidade de marca, não decoração de tela — a mesma regra do Cursor Orange,
que também não inverte em modo escuro (o site do Cursor não tem modo
escuro, mas a lógica "CTA é constante" é a que importamos).

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

| Token | Tamanho | Peso recomendado | Uso |
|---|---|---|---|
| `--text-2xl` | 24px | **700** | Título de tela grande (raro) |
| `--text-xl` | 22px | **700** | Título de seção |
| `--text-lg` | 17px | **700** | Título de modal, cabeçalho de painel |
| `--text-base` | 16px | 400 | Corpo padrão / leitura de nota |
| `--text-sm` | 14px | 400–600 | Texto de lista, botão |
| `--text-xs` | 13px | 400–600 | Metadado, botão secundário |
| `--text-2xs` | 12px | 600 | Label pequeno |
| `--text-3xs` | 11px | 600 | Label pequeno de campo/seção (não é mais o tamanho da pill — ver `--pill-font-size` abaixo) |
| `--pill-font-size` | **10px** (token próprio, não é `--text-3xs`) | 600 | **Toda pill/badge** (ver seção 4, "Pill / Badge") — NÃO sobe pra 700 |

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
- **Altura 44px (era 36px, mudou em 26/08/2026 - TASK-306).** A receita
  vigente de `--dott-gradient` ancora o núcleo abaixo da linha de texto,
  como na esfera do widget — não cabe numa caixa de 36px. Mudança de
  LAYOUT, não só de cor: todo botão primário do app (rodapé de modal,
  toolbar da pasta, CTA do estado vazio, primeira tela do onboarding) e o
  secundário/ghost ao lado dele subiram juntos, pra dupla não desalinhar.
  **Duas exceções que NÃO subiram** (levantadas antes de aplicar, não
  encolhidas depois):
  - **Badge de contagem** (`InboxPanel .badge`, 18px) e **tab ativa**
    (`border-image`) — pequenos demais pro núcleo caber, sem texto grande
    por cima; usam `--dott-gradient-linear`.
  - **Botão de capturar do Quick Capture** (`InboxPanel .btnCapture`,
    28px) — fica dentro de `.captureAcoes`, a faixa mais apertada do hot
    path de no-friction do produto (ver `desktop-frameworks.md`), ao lado
    de um ícone de 28px. Subir pra 44px alongaria essa faixa bem no fluxo
    que tem que ser o mais enxuto do app — ficou em 28px, com
    `--dott-gradient-linear` (pequeno demais pro núcleo de qualquer jeito).
- **Primário** — `background: var(--dott-gradient)` (a brasa; sempre
  acompanhado de `background-blend-mode: var(--dott-gradient-blend)`),
  texto `#fff`, `border-radius: var(--r-btn)` (8px), sem borda,
  `font-weight: 600`. Hover: `opacity: .88–.92`. Usado em: criar
  nota/tarefa/pasta (modais e toolbar da pasta), primeira tela do
  onboarding. Exceção: o CTA do estado vazio da pasta (`.btnNewBig`) é
  largo demais pra razão da brasa — usa `--dott-gradient-linear` sem
  blend, ver Do's/Don'ts.
  **Desabilitado nunca carrega a marca** — `opacity` sobre a brasa vira
  lama marrom; troca pra `background: var(--surface3)` / `color:
  var(--fg3)` (`opacity: 1`), igual ao resto do sistema.
- **Secundário / ghost** — fundo transparente, `border: 1px solid
  var(--border2)`, texto `--fg2`; hover: `background: var(--surface3)`,
  texto `--fg`. Nunca leva o gradiente. Acompanha a altura do primário ao
  lado (44px) — é só ajuste de medida, não ganha marca.
- **Raio:** `--r-btn` (8px) — igual ao `rounded.md` do Cursor.

### Input
- Fundo `--surface2`, borda `1px solid var(--border-control)` (o piso de
  contraste de controle, 3:1+), `border-radius: var(--r-btn)` (8px).
- Foco: **anel sutil**, não borda grossa — `border-color: var(--accent)` +
  `box-shadow: 0 0 0 3px var(--accent-s)`. Nunca ícone decorativo dentro do
  campo (o antigo modal "Virar tarefa" tinha um ícone de checkbox solto —
  removido).

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

| Token | Valor | Uso |
|---|---|---|
| `--r-btn` | 8px | **Botão, input** (novo — baseline `rounded.md`) |
| `--r-card` | 12px | **Card, modal** (novo — baseline `rounded.lg`) |
| `--r-full` | 9999px | Pill, badge |
| `--r-xs`…`--r-3xl` | 7–30px | Escala legada — ainda alimenta o widget/orbe (fora de escopo) e a maioria dos modais/cards do app (Settings, SearchModal, GlyphPicker, `.processModal`, Toast, Inbox card, PARA). Não redefinida nesta rodada (só o `.ob-card` do onboarding migrou, junto com a remoção da sombra). |

## 8. Do's e Don'ts

### Faça
- Use o gradiente da marca só em: botão primário, badge de contagem, estado
  ativo/selecionado. Em mais de ~3 lugares por tela, é demais. A ESCOLHA
  ENTRE AS DUAS FORMAS não afrouxa essa escassez — é técnica, não estética:
  `--dott-gradient` (a brasa) numa caixa de **44px de altura ou mais**, onde
  o núcleo cabe abaixo da linha de texto; `--dott-gradient-linear` quando o
  CSS exige um gradiente único (`border-image`), a caixa é larga demais pro
  radial (`.btnNewBig`), OU pequena demais pro núcleo caber (badge de
  contagem, botão do Quick Capture).
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

## Known Gaps (dívida registrada, não escondida)

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

---

## Aprovação

**Aprovado por:** Gustavo Farina (CEO) em 25/08/2026, sobre `preview/index.html`
(hash `804f450fb468`), com um ajuste de direção pedido no ato: títulos em peso
700 (ver "Baseline Decision", item 5).

A partir daqui este arquivo é o contrato do sistema visual do Dott. Tela nova
nasce dele; divergência é defeito, não estilo. Trocar de baseline ou redesenhar
invalida esta aprovação e exige preview + aprovação novas.
