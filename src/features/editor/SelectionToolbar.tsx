/** SelectionToolbar.tsx — a barra flutuante por selecao (TASK-325/326, item 2).
 * So aparece com texto selecionado: negrito, italico, link — as tres marcas
 * INLINE que fazem sentido em cima de um trecho escolhido. Estrutura de
 * bloco (titulo, lista, citacao, imagem) mora no menu de "/" (SlashMenu.tsx),
 * canal separado de proposito (ver a proposta, secao 2).
 *
 * View rasa por design: cada botao so despacha a transacao que
 * markdownCommands.ts (ja testado, ja usado pela toolbar antiga) devolve. */
import type { RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import { Icon } from '../../components/Icon'
import { toggleWrap, insertLink } from './markdownCommands'
import { toolbarPosition, type SelectionInfo } from './selectionTracking'
import s from './SelectionToolbar.module.css'

const WIDTH = 96
const HEIGHT = 34

interface Props {
  view: EditorView | null
  info: SelectionInfo | null
  /** Ancestral `position: relative` — as coordenadas de `coordsAtPos` sao
   *  de VIEWPORT; `position: fixed` puro quebraria dentro de um ancestral
   *  com `transform` (o `motion.div` da transicao de tela em App.tsx cria
   *  um novo "containing block" pra fixed). Por isso a barra e `absolute`
   *  dentro deste container, com a origem dele subtraida abaixo. */
  containerRef: RefObject<HTMLDivElement | null>
}

export function SelectionToolbar({ view, info, containerRef }: Props) {
  if (!view || !info) return null

  const origin = containerRef.current?.getBoundingClientRect()
  const raw = toolbarPosition(info.start, info.end, WIDTH, HEIGHT, window.innerWidth)
  const top = raw.top - (origin?.top ?? 0)
  const left = raw.left - (origin?.left ?? 0)

  const run = (fn: (v: EditorView) => void) => {
    fn(view)
    view.focus()
  }

  return (
    <div className={s.toolbar} style={{ top, left }} onMouseDown={e => e.preventDefault()}>
      <button type="button" className={s.btn} title="Negrito (Ctrl+B)" onClick={() => run(v => v.dispatch(toggleWrap(v.state, '**')))}>
        <Icon name="negrito" size={14} />
      </button>
      <button type="button" className={s.btn} title="Itálico (Ctrl+I)" onClick={() => run(v => v.dispatch(toggleWrap(v.state, '_')))}>
        <Icon name="italico" size={14} />
      </button>
      <span className={s.sep} />
      <button type="button" className={s.btn} title="Link" onClick={() => run(v => v.dispatch(insertLink(v.state, false)))}>
        <Icon name="link" size={14} />
      </button>
    </div>
  )
}
