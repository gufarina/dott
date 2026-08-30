/** SlashMenu.tsx — o menu de "/" para estrutura de bloco (TASK-325/326,
 * item 2): titulo, lista, citacao, imagem. So aparece com "/" sozinho no
 * inicio de uma linha vazia (slashCommands.ts decide isso, puro e testado).
 *
 * Teclado: ↑/↓ navega, Enter escolhe, Escape fecha sem tocar o texto. O
 * listener e nativo (capture) em `view.dom`, na frente do proprio
 * CodeMirror — assim Enter/Escape nunca viram quebra de linha ou comando
 * do editor enquanto o menu esta aberto. */
import { useEffect, useMemo, useState, type RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import { Icon } from '../../components/Icon'
import { SLASH_COMMANDS, applySlashCommand, type SlashCommand, type SlashHitWithCoords } from './slashCommands'
import s from './SlashMenu.module.css'

export type SlashState = SlashHitWithCoords

interface Props {
  view: EditorView | null
  state: SlashState | null
  onClose: () => void
  /** "Imagem" nao insere prefixo — pede ao chamador pra abrir o seletor de
   *  arquivo na posicao onde a linha "/" ficava (reusa o MESMO caminho de
   *  anexo do paste/drop, ver NoteEditor.tsx). */
  onPickImage: (pos: number) => void
  /** Mesmo motivo de SelectionToolbar.tsx: `coordsAtPos` e viewport, o menu
   *  e `absolute` dentro deste ancestral posicionado. */
  containerRef: RefObject<HTMLDivElement | null>
  /** Comandos que este consumidor nao oferece (ex: "Imagem" no editor de
   *  card do Inbox - TASK-333 urgente: sem isso o item ficaria clicavel sem
   *  fazer nada, o mesmo anti-padrao do item 2 desta task). Default: nenhum. */
  exclude?: SlashCommand['id'][]
}

export function SlashMenu({ view, state, onClose, onPickImage, containerRef, exclude }: Props) {
  const [active, setActive] = useState(0)
  const items = useMemo(
    () => (state ? SLASH_COMMANDS.filter(c => c.matches(state.filter) && !exclude?.includes(c.id)) : []),
    [state, exclude],
  )

  useEffect(() => { setActive(0) }, [state?.filter, state?.lineFrom])

  useEffect(() => {
    if (!view || !state) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!items.length) return
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActive(a => (a + 1) % items.length) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActive(a => (a - 1 + items.length) % items.length) }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); choose(items[active]) }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    view.dom.addEventListener('keydown', onKeyDown, true)
    return () => view.dom.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, state, items, active])

  if (!view || !state || !items.length) return null

  function choose(cmd: SlashCommand) {
    if (!view || !state) return
    const pos = state.lineFrom
    view.dispatch(applySlashCommand(view.state, state, cmd))
    onClose()
    if (cmd.id === 'imagem') onPickImage(pos)
    else view.focus()
  }

  const origin = containerRef.current?.getBoundingClientRect()
  const top = state.coords.bottom + 6 - (origin?.top ?? 0)
  const left = state.coords.left - (origin?.left ?? 0)

  return (
    <div className={s.menu} style={{ top, left }} onMouseDown={e => e.preventDefault()}>
      <div className={s.head}>Estrutura</div>
      {items.map((cmd, i) => (
        <button
          key={cmd.id}
          type="button"
          className={`${s.item} ${i === active ? s.active : ''}`}
          onMouseEnter={() => setActive(i)}
          onClick={() => choose(cmd)}
        >
          {cmd.icon ? <Icon name={cmd.icon} size={13} /> : <b className={s.glyph}>{cmd.glyph}</b>}
          {cmd.label}
        </button>
      ))}
    </div>
  )
}
