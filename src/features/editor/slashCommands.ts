/** slashCommands.ts — modulo profundo: interface estreita (achar a linha "/",
 * aplicar um comando), o catalogo de comandos de bloco por dentro. Mesma
 * familia de markdownCommands.ts: le o `EditorState` e devolve o
 * `TransactionSpec`, nao toca DOM — testavel sem navegador (ver
 * slashCommands.test.ts).
 *
 * Gatilho: "/" sozinho no INICIO de uma linha vazia (nao no meio de texto,
 * nao com o cursor no meio da linha) — a decisao da proposta CANVAS
 * (TASK-325/326), pra nunca disparar em cima de barra que faz parte do
 * texto normal ("e/ou", datas, caminhos). */
import type { EditorState, TransactionSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { fold } from '../../lib/graphify'
import type { IconName } from '../../components/Icon'
import type { Rect } from './selectionTracking'

export interface SlashHit {
  lineFrom: number
  lineTo: number
  /** O que foi digitado depois da "/" — filtra o menu. */
  filter: string
}

const SLASH_RE = /^\/(\w*)$/

/** So dispara com cursor sem selecao, na PONTA de uma linha que e "/" +
 *  filtro opcional e mais nada — o "inicio de linha vazia" da proposta. */
export function slashLineAt(state: EditorState): SlashHit | null {
  const { from, to } = state.selection.main
  if (from !== to) return null
  const line = state.doc.lineAt(from)
  if (from !== line.to) return null
  const m = SLASH_RE.exec(line.text)
  if (!m) return null
  return { lineFrom: line.from, lineTo: line.to, filter: m[1] }
}

export interface SlashCommand {
  id: 'h1' | 'h2' | 'lista' | 'citacao' | 'imagem'
  label: string
  /** Glifo curto (H1/H2) — quando o pacote de icones nao tem simbolo pra isso. */
  glyph?: string
  /** Icone do pacote proprio (Icon.tsx), quando existe um que fala sozinho. */
  icon?: IconName
  /** Prefixo de bloco a inserir no lugar da linha "/comando". `imagem` nao
   *  tem: quem insere de fato e o chamador (o mesmo caminho de anexo que
   *  ja existe pra colar/soltar), aqui so limpamos a linha. */
  prefix?: string
  /** Filtro por prefixo do rotulo, sem acento e sem caixa. */
  matches: (filter: string) => boolean
}

function byLabel(label: string): (filter: string) => boolean {
  const alvo = fold(label)
  return (filter: string) => alvo.startsWith(fold(filter))
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Título 1', glyph: 'H1', prefix: '# ', matches: byLabel('Título 1') },
  { id: 'h2', label: 'Título 2', glyph: 'H2', prefix: '## ', matches: byLabel('Título 2') },
  { id: 'lista', label: 'Lista', icon: 'listaPontos', prefix: '- ', matches: byLabel('Lista') },
  { id: 'citacao', label: 'Citação', icon: 'citacao', prefix: '> ', matches: byLabel('Citação') },
  { id: 'imagem', label: 'Imagem', icon: 'imagem', matches: byLabel('Imagem') },
]

/** `state` fica na assinatura por simetria com markdownCommands.ts (mesma
 *  familia: le o EditorState, devolve o TransactionSpec) — nenhum comando
 *  de bloco precisa dele hoje, mas o proximo (ex: algo sensivel ao
 *  contexto ao redor da linha) nao vai exigir mudar a interface. */
export function applySlashCommand(_state: EditorState, hit: SlashHit, cmd: SlashCommand): TransactionSpec {
  const insert = cmd.prefix ?? ''
  return {
    changes: { from: hit.lineFrom, to: hit.lineTo, insert },
    selection: { anchor: hit.lineFrom + insert.length },
  }
}

export interface SlashHitWithCoords extends SlashHit {
  /** Retangulo do inicio da linha (`view.coordsAtPos`) — ancora o menu. */
  coords: Rect
}

/** Extensao que avisa o React quando o cursor entra/sai de uma linha "/" —
 *  mesmo padrao de `trackSelection` em selectionTracking.ts. */
export function trackSlashLine(onChange: (hit: SlashHitWithCoords | null) => void) {
  return EditorView.updateListener.of(update => {
    if (!update.docChanged && !update.selectionSet) return
    const hit = slashLineAt(update.state)
    if (!hit) { onChange(null); return }
    const coords = update.view.coordsAtPos(hit.lineFrom)
    if (!coords) { onChange(null); return }
    onChange({ ...hit, coords })
  })
}
