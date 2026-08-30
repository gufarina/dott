/** selectionTracking.ts — modulo profundo: interface estreita (uma extensao
 * que avisa quando a selecao muda, uma funcao que calcula onde por a barra),
 * a matematica de posicionamento por dentro. A proposta CANVAS
 * (TASK-325/326, item 2): a barra fixa de dez botoes morre; no lugar, uma
 * barra que so existe quando ha texto selecionado, flutuando acima dele.
 */
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

export interface Rect {
  top: number
  left: number
  right: number
  bottom: number
}

export interface SelectionInfo {
  from: number
  to: number
  /** Retangulo do INICIO e do FIM da selecao (`view.coordsAtPos`), ja em
   *  coordenadas de viewport — o mesmo sistema de `getBoundingClientRect`,
   *  por isso a barra pode usar `position: fixed` direto, sem converter. */
  start: Rect
  end: Rect
}

/** Onde a barra deve ficar: centralizada acima da selecao, sem vazar pra
 *  fora da largura da tela. Pura — testada sem CodeMirror (ver .test.ts). */
export function toolbarPosition(
  start: Rect,
  end: Rect,
  toolbarWidth: number,
  toolbarHeight: number,
  viewportWidth: number,
  gap = 8,
): { top: number; left: number } {
  const top = Math.min(start.top, end.top) - toolbarHeight - gap
  const centro = (start.left + end.right) / 2
  const left = Math.max(gap, Math.min(centro - toolbarWidth / 2, viewportWidth - toolbarWidth - gap))
  return { top, left }
}

/** Recalcula o retangulo da selecao atual pra dentro do viewport. Reusado
 *  tanto por mudanca de selecao/documento quanto por scroll (TASK-333 item
 *  4: `coordsAtPos` da a posicao NO MOMENTO em que roda; rolar o
 *  `.cm-scroller` move o texto sem mudar `from`/`to`, entao sem recalcular
 *  a barra ficava presa no lugar antigo, flutuando sobre texto errado). */
function computeSelectionInfo(view: EditorView, from: number, to: number): SelectionInfo | null {
  if (from === to) return null
  const start = view.coordsAtPos(from)
  const end = view.coordsAtPos(to, -1)
  if (!start || !end) return null
  return { from, to, start, end }
}

/** Extensao que chama `onChange` com a selecao atual (ou null, se vazia) a
 *  cada mudanca de selecao/documento E a cada scroll do editor (a selecao
 *  continua a mesma, so a posicao na tela mudou). So dado — quem desenha a
 *  barra e decide se mostra e onde e o componente React que consome isto. */
export function trackSelection(onChange: (info: SelectionInfo | null) => void) {
  return ViewPlugin.fromClass(class {
    private view: EditorView
    private onScroll = () => {
      const { from, to } = this.view.state.selection.main
      onChange(computeSelectionInfo(this.view, from, to))
    }
    constructor(view: EditorView) {
      this.view = view
      view.scrollDOM.addEventListener('scroll', this.onScroll, { passive: true })
    }
    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet) return
      const { from, to } = update.view.state.selection.main
      onChange(computeSelectionInfo(update.view, from, to))
    }
    destroy() {
      this.view.scrollDOM.removeEventListener('scroll', this.onScroll)
    }
  })
}
