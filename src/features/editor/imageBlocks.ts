/** imageBlocks.ts — decoracao viva que troca uma linha `![legenda](url)`
 * pelo BLOCO de imagem de verdade (proposta CANVAS, TASK-325/326, item 3):
 * largura total da coluna, cantos arredondados, legenda opcional embaixo, e
 * dois chips no hover (substituir/remover) — nunca abre menu, nunca troca
 * de tela.
 *
 * O arquivo em disco continua `![legenda](url)`, markdown puro — isto e so
 * a CAMADA VISUAL por cima (mesma promessa de liveMarkup.ts, nunca um
 * round-trip HTML). Reusa `saveImageFile`/`removeAttachment` de
 * lib/attachments.ts — a MESMA rotina que paste/drop ja usa (NoteEditor.tsx),
 * nao um caminho novo de gravar/apagar anexo.
 *
 * Performance: mesma trava de liveMarkup.ts — so varre `view.visibleRanges`,
 * so reconstroi em doc/viewport/selecao mudando. */
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'
import { removeAttachment, saveImageFile } from '../../lib/attachments'
import { matchImageLine, type ImageLineHit } from './imageLine'
import './imageBlocks.css'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Mesma gramatica do pacote Icon.tsx (16x16, traco 1.5) — path data copiado
 *  de la (rever/lixo) porque o widget e DOM puro, sem React por dentro
 *  (mesmo padrao do BulletWidget em liveMarkup.ts). */
const ICON_PATHS: Record<'rever' | 'lixo', string[]> = {
  rever: ['M13.4 8a5.4 5.4 0 1 1-1.95-4.15', 'M13.8 2.4v3.3h-3.3'],
  lixo: [
    'M2.8 4.4h10.4',
    'M6.2 4.4V3.2a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 .8.8v1.2',
    'M4.2 4.4l.6 8a.9.9 0 0 0 .9.8h4.6a.9.9 0 0 0 .9-.8l.6-8',
  ],
}

function icon(name: keyof typeof ICON_PATHS): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  for (const d of ICON_PATHS[name]) {
    const p = document.createElementNS(SVG_NS, 'path')
    p.setAttribute('d', d)
    svg.appendChild(p)
  }
  return svg
}

function toolButton(name: keyof typeof ICON_PATHS, title: string, danger: boolean, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.title = title
  btn.setAttribute('aria-label', title)
  btn.className = danger ? 'cm-livemd-img-btn cm-livemd-img-btn-danger' : 'cm-livemd-img-btn'
  btn.appendChild(icon(name))
  btn.addEventListener('mousedown', e => e.preventDefault()) // nao rouba o foco do editor
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick() })
  return btn
}

class ImageWidget extends WidgetType {
  constructor(
    private readonly view: EditorView,
    private readonly from: number,
    private readonly to: number,
    private readonly hit: ImageLineHit,
  ) {
    super()
  }

  eq(other: ImageWidget): boolean {
    return other.hit.url === this.hit.url && other.hit.alt === this.hit.alt && other.hit.pending === this.hit.pending
  }

  private replaceLine(insert: string) {
    // As coordenadas foram capturadas na ultima varredura; se o doc mudou
    // por outro caminho nesse meio-tempo o pior caso e um dispatch levemente
    // desalinhado — aceitavel pro alcance desta troca (clique e imediato).
    this.view.dispatch({ changes: { from: this.from, to: this.to, insert } })
  }

  private async pickReplacement() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', () => {
      void (async () => {
        const file = input.files?.[0]
        if (!file) return
        const url = await saveImageFile(file)
        if (!url) return
        this.replaceLine(`![${this.hit.alt}](${url})`)
        if (!this.hit.pending) void removeAttachment(this.hit.url)
      })()
    })
    input.click()
  }

  private remove() {
    this.view.dispatch({ changes: { from: this.from, to: this.to, insert: '' } })
    if (!this.hit.pending) void removeAttachment(this.hit.url)
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cm-livemd-imgblock'

    if (this.hit.pending) {
      wrap.classList.add('cm-livemd-imgblock-pending')
      const ph = document.createElement('div')
      ph.className = 'cm-livemd-img-shimmer'
      wrap.appendChild(ph)
      const cap = document.createElement('div')
      cap.className = 'cm-livemd-img-cap'
      cap.textContent = 'salvando no seu acervo…'
      wrap.appendChild(cap)
      return wrap
    }

    const tools = document.createElement('div')
    tools.className = 'cm-livemd-img-tools'
    tools.appendChild(toolButton('rever', 'Substituir imagem', false, () => void this.pickReplacement()))
    tools.appendChild(toolButton('lixo', 'Remover imagem', true, () => this.remove()))
    wrap.appendChild(tools)

    const img = document.createElement('img')
    img.src = this.hit.url
    img.alt = this.hit.alt
    img.className = 'cm-livemd-img'
    wrap.appendChild(img)

    if (this.hit.alt && this.hit.alt !== 'imagem') {
      const cap = document.createElement('div')
      cap.className = 'cm-livemd-img-cap'
      cap.textContent = this.hit.alt
      wrap.appendChild(cap)
    }

    return wrap
  }

  ignoreEvent(): boolean {
    // Bloco de imagem nao e texto: nenhum evento nele deve mover o cursor
    // ou disparar o comportamento default do CodeMirror.
    return true
  }
}

function buildImageDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      const hit = matchImageLine(line.text)
      if (hit) {
        builder.add(line.from, line.to, Decoration.replace({ widget: new ImageWidget(view, line.from, line.to, hit), block: true }))
      }
      pos = line.to + 1
    }
  }
  return builder.finish()
}

export const imageBlocks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildImageDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildImageDecorations(update.view)
      }
    }
  },
  { decorations: v => v.decorations }
)
