import { useEffect } from 'react'

/**
 * TASK-319 (28/08/2026) - RUSTLINE.
 * Ordem do CEO: "o gradiente so deve aparecer nos botoes com hover... e o
 * gradiente tem que ser animado com o mouse seguindo". O desenho (token
 * `--dott-gradient-glow`, classe `.hoverGlow`, o `::after` que le
 * `--glow-x`/`--glow-y` via `translate`) ja esta pronto em reset.css - o
 * contrato exato que este hook cumpre esta documentado la, em cima da regra
 * `.hoverGlow`. NAO mexer no CSS a partir daqui.
 *
 * Um UNICO ouvinte de documento resolve qual `.hoverGlow` esta sob o
 * ponteiro, em vez de um laco por botao - por isso um botao novo so precisa
 * da classe (ver FolderNotesView.tsx, Modal.tsx, Onboarding.tsx,
 * InboxPanel.tsx: nenhum deles chama este hook, so tem a classe no JSX).
 * Monte esta hook UMA vez, perto da raiz da janela que tem botoes com
 * `.hoverGlow` (hoje: App()). A janela do widget nao usa - sem consumidor,
 * sem custo.
 *
 * O laco de `requestAnimationFrame` so existe enquanto o ponteiro esta em
 * cima de um `.hoverGlow`: fora disso, `parar()` cancela e o mecanismo fica
 * mudo (mesma garantia do laco de luz do widget - Widget.tsx).
 */

// Mesma formula da spec do gradiente fluido do widget (independente da taxa
// de quadro - a 60Hz e 144Hz o resultado por segundo de relogio e identico).
const LAMBDA = 18       // /s - sugestao do CANVAS: mais calmo que o nucleo do
                        // widget (26/s), mais vivo que o bloom dele (11/s).
const GLOW_Y_MAX = 4    // px - TRAVA DE CONTRASTE (reset.css). Nao afrouxar
                        // sem falar com o CANVAS: o nucleo nao pode subir ate
                        // a linha do texto.
const DT_TETO = 0.064   // s - se a maquina engasgar, a luz nao teleporta
const EPS = 0.05        // px - abaixo disso, assentou

const damp = (cur: number, alvo: number, lambda: number, dt: number) =>
  cur + (alvo - cur) * (1 - Math.exp(-lambda * dt))

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function useHoverGlowCursor() {
  useEffect(() => {
    // Lido uma vez, como o laco de luz do widget (Widget.tsx) ja faz - se o
    // SO mudar a preferencia no meio da sessao, o proximo mount deste
    // componente le o valor novo.
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reducao de movimento: nao roda o laco. O hover acende parado, porque
    // `--glow-x`/`--glow-y` ficam no `initial-value` (0px/0px) do
    // `@property` em reset.css - nada aqui precisa escrever nada.
    if (calmo) return

    let el: HTMLElement | null = null
    let curX = 0, curY = 0
    let targetX = 0, targetY = 0
    let running = false
    let raf = 0
    let last = 0

    const tick = (t: number) => {
      if (!el) { running = false; return }
      const dt = last ? Math.min(DT_TETO, (t - last) / 1000) : 1 / 60
      last = t
      curX = damp(curX, targetX, LAMBDA, dt)
      curY = damp(curY, targetY, LAMBDA, dt)
      const parado = Math.abs(curX - targetX) < EPS && Math.abs(curY - targetY) < EPS
      if (parado) { curX = targetX; curY = targetY }
      el.style.setProperty('--glow-x', `${curX.toFixed(2)}px`)
      el.style.setProperty('--glow-y', `${curY.toFixed(2)}px`)
      if (parado) { running = false; return }   // zero quadro em repouso
      raf = requestAnimationFrame(tick)
    }

    const acorda = () => {
      if (running) return
      running = true
      last = 0
      raf = requestAnimationFrame(tick)
    }

    // Perde o hover: para o laco e SOLTA a posicao onde estava (nao anima de
    // volta ao centro) - a transicao de opacidade do CSS ja apaga a luz.
    const parar = () => {
      cancelAnimationFrame(raf)
      running = false
      el = null
    }

    const onMove = (e: PointerEvent) => {
      const alvoEl = (e.target as Element | null)?.closest?.('.hoverGlow') as HTMLElement | null
      if (alvoEl !== el) {
        if (!alvoEl) { parar(); return }
        el = alvoEl
        curX = 0; curY = 0   // comeca do repouso ao entrar num botao novo
      }
      if (!el) return
      const r = el.getBoundingClientRect()
      targetX = e.clientX - (r.left + r.width / 2)
      targetY = clamp(e.clientY - (r.top + r.height / 2), -GLOW_Y_MAX, GLOW_Y_MAX)
      acorda()
    }

    const raiz = document.documentElement
    raiz.addEventListener('pointermove', onMove)
    raiz.addEventListener('pointerleave', parar)
    return () => {
      raiz.removeEventListener('pointermove', onMove)
      raiz.removeEventListener('pointerleave', parar)
      cancelAnimationFrame(raf)
    }
  }, [])
}
