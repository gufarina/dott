# Prompt de continuacao — implementar o widget vivo do Dott

> Cole o bloco abaixo no chat novo. Ele carrega o contexto, o que ja foi
> decidido e provado, e principalmente as ARMADILHAS que ja custaram tempo —
> pra o proximo agente nao cair nelas de novo.

---

## COLE A PARTIR DAQUI

Voce vai implementar o redesign do widget flutuante do **Dott**, um segundo
cerebro pessoal de desktop. Leia tudo antes de mexer em qualquer arquivo.

### Onde estao as coisas

- **Codigo do app:** `C:\Users\Lite OS\Projetos\dott-warmfox` (git proprio, arvore limpa)
- **Stack:** Tauri 2 (Rust) + React 19 + TypeScript + Vite + Zustand
- **O widget:** `src/widget/Widget.tsx` e `src/widget/Widget.module.css`
- **Ultimo commit:** `bd5a767`

### O que ja foi feito (nao refazer)

O widget foi **estudado e prototipado**, mas **NAO foi implementado no app**.
Os prototipos sao HTML soltos na raiz do projeto, e sao a fonte da verdade do
que precisa virar codigo React:

- `estudo-widget-vivo.html` — **este e o alvo**. Bolinha viva, trilho de 3 acoes
  acima, luz seguindo o cursor, pulsacao organica, aviso de captura.
- `estudo-widget-trilho.html` — as 4 versoes de movimento do trilho (a escolhida
  foi a **V1 · Arco**).
- `estudo-widget-captura.html` — o estudo de cor e atrito que originou tudo.

### A TAREFA

Portar o comportamento de `estudo-widget-vivo.html` para o widget real em
`src/widget/`. Em ordem de valor:

1. **A bolinha emissiva** (luz em camadas, pulsacao, seguir o cursor)
2. **O trilho de 3 acoes ACIMA da bolinha** (escrever / imagem / abrir), com
   sub-hover em cada um
3. **O aviso de captura** ("Guardado no Dott" com tipo e conteudo)
4. **Abrir o app em 1 clique** pelo trilho (hoje custa 2 cliques e abre um
   painel de 340x300 a toa)
5. **Imagem por arquivo** (hoje so existe colar, e sem aviso nenhum)

### ARMADILHAS JA PAGAS — leia, isso e o mais valioso aqui

**1. `zoom` de CSS quebra o arrasto no WebView2.**
Coordenada de ponteiro e medida de layout desalinham e o dnd-kit erra o alvo.
Use `getCurrentWebview().setZoom()`, NUNCA `zoom` de CSS. Ja corrigido, nao
reintroduza.

**2. `mask-image` nos paineis prende `position: fixed`.**
Mascara cria bloco de contencao: modal dentro de painel fica preso nele em vez
de cobrir a tela. Todo modal vai por `src/components/ModalPortal.tsx`. Isso ja
causou um bug de "overlay aparece vazio" que levou horas.

**3. `<button>` dentro de `<button>` e HTML invalido.**
O parser ARRANCA o filho e joga como irmao. Foi o que quebrou o trilho no
prototipo. Item de trilho e `<div role="button" tabindex="0">`.

**4. Variavel em gradiente NAO anima sem `@property`.**
Sem registrar, o navegador pula de valor em vez de interpolar, e a pulsacao
simplesmente nao existe. Registre `--nx`, `--ny`, `--p1`, `--p2`, `--p3`.

**5. `inset` negativo nas camadas de luz desloca o gradiente.**
Com a caixa aumentada, as posicoes em porcentagem passam a se referir a caixa
maior e o nucleo cai fora do circulo. Use `inset: 0`.

**6. Nao pinte branco no nucleo.**
Use camadas em `mix-blend-mode: screen` sobre preto: preto nao muda nada,
sobreposicoes somam ate estourar, e o branco EMERGE. Pintado vira disco leitoso.

**7. Nao use `transparent` pra dissolver borda.**
E interpretado como preto transparente e lava a cor no meio do caminho. Use
`oklch(... / 0)` ou `rgb(... / 0)` da MESMA cor.

**8. Ao mexer no CSS do orbe, nao esqueca o `display:flex` de centralizar.**
Ja aconteceu: a marca foi parar no canto.

### Numeros que ja foram decididos e medidos (use, nao rechute)

- **Curva-mola de entrada** (gerada da fisica de oscilador amortecido, passa 1%
  do ponto e assenta):
  `linear(0, .0235, .0826, .1637, .2561, .3522, .4466, .5357, .6173, .69, .7535, .8079, .8536, .8914, .922, .9465, .9656, .9802, .9911, .9989, 1.0043, 1.0079, 1.0099, 1.0109, 1.0111, 1.0107, 1.01)`
- **Saida:** `cubic-bezier(0.4, 0, 1, 1)` — entrar e decisao (420ms), sair e
  obediencia (130ms)
- **Escalonamento do trilho:** 35 ms entre os tres
- **Espera antes do trilho aparecer:** 300 a 500 ms (fonte: nngroup e baymard);
  esconder so apos 500 ms fora
- **Alvo minimo:** 24x24 px (WCAG 2.2). Os botoes do trilho tem 36px.
- **Pulsacao:** periodos 6,4s / 8,1s / 5,1s / 9,3s — nao sao multiplos entre si
  de proposito, e a segunda luz pulsa em FASE INVERTIDA da primeira
- **Alcance da proximidade:** 220px, com curva ao quadrado (fica frio mais tempo
  e esquenta rapido no fim)
- **Grao:** `feTurbulence fractalNoise baseFrequency .8, numOctaves 3,
  stitchTiles=stitch`, opacidade .07, `mix-blend-mode: overlay`

### Como verificar (isto importa)

- **Nao da pra ver a janela do app nativo.** Screenshot e controle de tela nao
  alcancam o Tauri.
- **Da pra ver no navegador:** `npm run dev` e abrir a porta. Screenshot
  funciona por HTTP (nao por `file://`).
- Servidor de prototipo ja configurado: porta 4599 serve a raiz do projeto.
- **O painel escondido congela o relogio de animacao.** Se precisar provar que
  uma animacao roda, avance `animation.currentTime` na mao e amostre os valores.
- Depois de compilar: `npx tauri build`. **Feche o app antes**, senao o build
  falha com "Access is denied" no `.exe`.

### Leis do projeto (nao negociaveis)

- **100% offline, SEM IA.** Nenhuma chamada de rede, nenhum modelo. O motor de
  sugestao (`src/lib/interpret.ts`) e heuristica local e deve continuar sendo.
- **Sem acentos e sem emojis em ARQUIVO** (protecao de encoding). Na conversa
  com o operador, portugues correto COM acentos.
- **Sem jargao tecnico com o operador.** Fale pelo resultado.
- Valide efeito visual no APP NATIVO, nao so no navegador: o WebView2 ja se
  comportou diferente do Chrome tres vezes.

### O que o operador ainda nao confirmou

Duas coisas do laco principal continuam sem verificacao dele:
1. Clicar num card do inbox deve abrir a folha de acoes no meio da tela
2. Arrastar um card deve mostrar "Soltar em ‹pasta›" no cursor antes de soltar

Se ele reclamar de alguma das duas, comece por ai — sao mais importantes que o
widget.

### Oportunidade maior registrada (nao implementada)

O operador quer que o widget vire um **substituto do historico da area de
transferencia do Windows** (Win+V). O angulo defendido: o Windows perde tudo ao
reiniciar, nao tem busca e para no colar; o Dott transforma o que voce copiou em
nota que sobrevive e vira trabalho. Ressalva de produto ja levantada: capturar
todo Ctrl+C exige observar a area de transferencia o tempo todo, o que num
produto vendido como offline precisa ser escolha explicita e sempre visivel.

Comece confirmando o que voce entendeu e qual dos cinco itens vai atacar
primeiro.

## FIM DO BLOCO
