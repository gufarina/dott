# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/). Este arquivo
comeca a partir da 0.6.0 (14/09/2026) — nao ha entradas retroativas de versoes
anteriores por nao existir historico registrado ate aqui.

## [0.6.0] - 2026-09-14

### "UI densa" (TASK-566, F1-F6)

- **Busca centralizada na Titlebar.** Campo de busca real (nao mais so um
  icone), centralizado, sem caixa branca nativa por cima.
- **Raio do card de pasta.** Grade PARA com card compacto (`--r-xs`) no
  lugar do raio de card padrao; capa (banner) so aparece quando a pasta
  tem capa de verdade — nunca banner solido/gradiente de placeholder.
- **Painel de Tarefas em card + trilho.** Item de tarefa passa a viver
  dentro de um card; o painel colapsa num trilho de 56px (atalho `]`).
- **Composer (CaptureBox) em vidro.** Capsula de 384×40 em repouso,
  expande para `100% - 24px` × 152px no hover/foco. Novos tokens
  `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-highlight`,
  `--glass-blur` em `tokens.css`.
- **Tema AMOLED.** Terceira opcao em Settings (Claro / Escuro / AMOLED) —
  variante do escuro com superficie/borda mais extremas para pixel preto
  real em tela OLED.
- **Escuro comum mais escuro.** `surface`/`surface2`/`surface3`/`border`/
  `border2` do tema escuro padrao ~10% mais escuros (pedido do CEO durante
  a rodada), mantendo a mesma ordem de elevacao e contraste WCAG acima do
  piso de 4,5:1.

Materializado em `preview/index.html` (secoes "Busca — centralizada na
Titlebar", "Grade PARA — capa condicional", "Painel de Tarefas" e
"Composer — captura em vidro", alem do botao AMOLED no alternador de
tema).
