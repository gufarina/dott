import { useEffect, type RefObject } from 'react'

/* TASK-349 (28/08/2026): o CEO viu o card da pasta "Leituras" cortado em
   linha reta na base da area de rolagem do PARA e pediu o mesmo fade que ja
   existia no TOPO (`.qHeader::after`, PARAGrid.module.css). O fade de baixo
   NAO pode ser permanente: numa lista curta, sem nada cortado, um fade fixo
   vira sombra no vazio (o proprio CEO nomeou o risco). Este hook resolve a
   condicao sem re-render do React: alterna a classe `is-fade-bottom` DIRETO
   no elemento de rolagem (via ref, fora do ciclo de estado), e o CSS
   (`.scrollFadeBottom`, reset.css) so acende a opacidade do fade quando essa
   classe esta presente. Reusado por toda area de rolagem com o mesmo corte:
   ver DESIGN.md secao 21 "Fade de rolagem na base" pro contrato completo e a
   lista de onde foi aplicado. */

const FADE_CLASS = 'is-fade-bottom'
/** Margem de folga: evita que arredondamento de subpixel deixe a classe
    piscando ligada/desligada bem no ultimo pixel do scroll. */
const EPSILON = 1

export function useScrollEdgeFade<T extends HTMLElement>(
  ref: RefObject<T | null>,
  watch: unknown[] = [],
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const hasMore = el.scrollHeight - el.scrollTop - el.clientHeight > EPSILON
      el.classList.toggle(FADE_CLASS, hasMore)
    }

    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // Cobre resize da JANELA/paineis (o container muda de altura sem o
    // conteudo mudar) - mudanca de CONTEUDO (lista cresce/encolhe) e coberta
    // pelo array `watch` que o chamador passa (ex.: numero de itens).
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch)
}
