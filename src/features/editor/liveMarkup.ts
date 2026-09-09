/** liveMarkup.ts — decoracao viva de markdown no editor.
 *
 * DECISAO DO CEO (28/08/2026, ordem urgente sobre TASK-333): a marca (`#`,
 * `**`, `-`, `>`) SOME SEMPRE - nao ha mais "linha ativa" que revela a marca
 * crua. A primeira versao seguia o padrao Obsidian/Bear (revelar na linha do
 * cursor, pra poder editar); o CEO testou e recusou DUAS vezes: aplicar
 * negrito e ver `**palavra**` com os asteriscos a mostra "e inaceitavel, e
 * premissa". Decisao encerrada, sem excecao.
 *
 * Com a marca invisivel SEMPRE, navegar por ela vira problema (o cursor
 * atravessaria posicoes sem nenhum desenho na tela). Por isso as MESMAS
 * decorations que escondem a marca tambem entram em `EditorView.atomicRanges`
 * (`hiddenMarksField`, abaixo): setas, backspace e selecao tratam cada marca
 * escondida como UMA unidade so - um toque atravessa o `**` inteiro, nunca
 * duas teclas pro mesmo ponto, e o cursor nunca "para" dentro dela.
 *
 * Cobre: titulo 1 (`# `), titulo 2 (`## `), negrito (`**texto**`), item de
 * lista (`- `), item de checklist (`- [ ] ` / `- [x] `, com caixa clicavel -
 * TASK-359), link (`[texto](url)`) e codigo inline (`` `codigo` ``).
 * Imagem ja virou bloco de verdade (imageBlocks.ts). A cerca de bloco
 * (` ``` `) fica CRUA de proposito (TASK-333, item 7) - cerca e estrutura,
 * nao estilo; Obsidian e Bear tambem deixam a cerca visivel.
 *
 * Checklist (TASK-359, CEO: "o item checklist esta estranho... nao parece
 * checklist nada"). MEDIDO antes do conserto: nao havia NENHUM tratamento
 * pra `- [ ] ` aqui - o contrato do editor (marca sempre invisivel) so era
 * cumprido pra titulo/negrito/lista/citacao. Pior: `- [ ] texto` bate no
 * `LIST_RE` de baixo (comeca com "- " seguido de nao-espaco), entao a linha
 * virava um item de LISTA com o texto cru "[ ] texto" sobrando depois do
 * marcador - exatamente a bolinha vermelha + colchete a mostra da captura
 * do CEO. Consertado: `CHECKLIST_RE` e checado ANTES de `LIST_RE` (mesma
 * ordem de `markdownCommands.ts`) e vira uma caixa de marcar de verdade
 * (`ChecklistWidget`), CSS 1:1 copiado de `.check`/`.check.done` em
 * `features/tasks/TasksPanel.module.css` (REUSE, nunca uma segunda peca -
 * ver `liveMarkup.css`). Clicar despacha a troca de "[ ] " <-> "[x] " direto
 * na `EditorView`, mesmo mecanismo de widget clicavel que `imageBlocks.ts`
 * ja usa pros botoes de substituir/remover imagem (mousedown.preventDefault
 * pra nao roubar o foco do editor, click faz o trabalho e para a propagacao).
 *
 * Performance (lei do produto): o recalculo nunca varre o documento inteiro.
 * `buildDecorations` so itera `view.visibleRanges` (o viewport renderizado),
 * e o ViewPlugin so reconstroi em mudanca de doc, de viewport ou de selecao.
 */
import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

const HEADING_RE = /^(#{1,2})(\s+)(.*)$/
// Checado ANTES de LIST_RE: "- [ ] texto" tambem bate no regex de lista
// (comeca com "- " seguido de nao-espaco) - sem essa ordem o item de
// checklist vira bullet de lista com "[ ] texto" cru sobrando (TASK-359).
const CHECKLIST_RE = /^-\s\[([ xX])\]\s(?=\S)/
const LIST_RE = /^(\s*)-(\s+)(?=\S)/
const QUOTE_RE = /^>(\s+)(?=\S)/
const BOLD_RE = /\*\*([^*\n]+?)\*\*/g

class BulletWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-livemd-bullet'
    span.textContent = '•'
    return span
  }
  ignoreEvent(): boolean {
    return false
  }
}

/** Caixa de marcar de verdade no lugar do marcador cru "- [ ] "/"- [x] "
 *  (TASK-359). Visual REUSADO 1:1 de `.check`/`.check.done`
 *  (features/tasks/TasksPanel.module.css, ver liveMarkup.css) - o app ja
 *  tinha essa peca desenhada e aprovada, nao inventa uma segunda. Clique
 *  despacha a troca do marcador direto na `EditorView`, mesmo padrao de
 *  widget clicavel de `imageBlocks.ts` (mousedown.preventDefault pra nao
 *  roubar foco do editor; click troca e para a propagacao). */
class ChecklistWidget extends WidgetType {
  constructor(
    private readonly view: EditorView,
    private readonly from: number,
    private readonly to: number,
    private readonly checked: boolean,
  ) {
    super()
  }

  eq(other: ChecklistWidget): boolean {
    return other.checked === this.checked
  }

  toDOM(): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = this.checked ? 'cm-livemd-checkbox cm-livemd-checkbox-done' : 'cm-livemd-checkbox'
    btn.title = this.checked ? 'Desmarcar item' : 'Marcar item'
    btn.setAttribute('aria-label', btn.title)
    btn.addEventListener('mousedown', e => e.preventDefault())
    btn.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      const insert = this.checked ? '- [ ] ' : '- [x] '
      this.view.dispatch({ changes: { from: this.from, to: this.to, insert } })
    })
    return btn
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** As duas decorations nascem juntas: `decorations` e o que o CodeMirror
 * desenha; `hidden` e SO os trechos de marca escondidos (subconjunto de
 * `decorations`) - vira `EditorView.atomicRanges` pra cursor/backspace
 * tratarem cada marca como uma unidade so, nunca dois passos pro mesmo ponto. */
function buildDecorations(view: EditorView): { decorations: DecorationSet; hidden: DecorationSet } {
  const builder = new RangeSetBuilder<Decoration>()
  const hiddenBuilder = new RangeSetBuilder<Decoration>()
  const state = view.state

  const hide = (from: number, to: number, deco: Decoration) => {
    builder.add(from, to, deco)
    hiddenBuilder.add(from, to, deco)
  }

  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = state.doc.lineAt(pos)
      const text = line.text

      const hMatch = HEADING_RE.exec(text)
      if (hMatch) {
        const level = hMatch[1].length
        builder.add(
          line.from,
          line.from,
          Decoration.line({ class: level === 1 ? 'cm-livemd-h1' : 'cm-livemd-h2' })
        )
        const markEnd = line.from + hMatch[1].length + hMatch[2].length
        hide(line.from, markEnd, Decoration.replace({}))
      } else {
        const ckMatch = CHECKLIST_RE.exec(text)
        const lMatch = !ckMatch ? LIST_RE.exec(text) : null
        const qMatch = !ckMatch && !lMatch ? QUOTE_RE.exec(text) : null
        if (ckMatch) {
          const checked = ckMatch[1] !== ' '
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: checked ? 'cm-livemd-checklist cm-livemd-checklist-done' : 'cm-livemd-checklist' })
          )
          const markEnd = line.from + ckMatch[0].length
          hide(line.from, markEnd, Decoration.replace({ widget: new ChecklistWidget(view, line.from, markEnd, checked) }))
          if (checked) {
            builder.add(markEnd, line.to, Decoration.mark({ class: 'cm-livemd-checklist-strike' }))
          }
        } else if (lMatch) {
          builder.add(line.from, line.from, Decoration.line({ class: 'cm-livemd-li' }))
          const dashStart = line.from + lMatch[1].length
          const dashEnd = dashStart + 1 + lMatch[2].length
          hide(dashStart, dashEnd, Decoration.replace({ widget: new BulletWidget() }))
        } else if (qMatch) {
          builder.add(line.from, line.from, Decoration.line({ class: 'cm-livemd-quote' }))
          const markEnd = line.from + 1 + qMatch[1].length
          hide(line.from, markEnd, Decoration.replace({}))
        }
      }

      // Ranges tem que entrar no builder em ordem estritamente crescente de
      // posicao (regra do RangeSetBuilder). Por isso o negrito nunca soma
      // uma decoration cobrindo o match inteiro (que colidiria de novo com
      // o inicio das decorations de esconder marca): so o texto de DENTRO
      // ganha a marca de negrito, nunca os `**`.
      BOLD_RE.lastIndex = 0
      let bMatch: RegExpExecArray | null
      while ((bMatch = BOLD_RE.exec(text))) {
        const start = line.from + bMatch.index
        const end = start + bMatch[0].length
        hide(start, start + 2, Decoration.replace({}))
        builder.add(start + 2, end - 2, Decoration.mark({ class: 'cm-livemd-strong' }))
        hide(end - 2, end, Decoration.replace({}))
      }

      pos = line.to + 1
    }
  }
  return { decorations: builder.finish(), hidden: hiddenBuilder.finish() }
}

/** Extension unica: decoration viva restrita ao viewport, recalculada so
 * quando doc, viewport ou selecao mudam (nunca a cada frame gratuito). */
const liveMarkdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    hidden: DecorationSet
    constructor(view: EditorView) {
      const built = buildDecorations(view)
      this.decorations = built.decorations
      this.hidden = built.hidden
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        const built = buildDecorations(update.view)
        this.decorations = built.decorations
        this.hidden = built.hidden
      }
    }
  },
  { decorations: v => v.decorations }
)

/** Interface estreita: um unico extension exportado. Por dentro, o plugin
 * de decoration + o facet de ranges atomicas (marca escondida = uma unidade
 * so pro cursor) - ver comentario grande no topo do arquivo. */
export const liveMarkdown = [
  liveMarkdownPlugin,
  EditorView.atomicRanges.of(view => view.plugin(liveMarkdownPlugin)?.hidden ?? Decoration.none),
]
