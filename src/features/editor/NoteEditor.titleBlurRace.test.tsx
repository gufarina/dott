// @vitest-environment jsdom
/** NoteEditor.titleBlurRace.test.tsx — TDD (TASK-495, conserto da corrida
 * de gravacao entre `onChange` do corpo e `saveTitle`).
 *
 * `onChange` (corpo) agenda `saveNote` num debounce de 800ms guardado em
 * `saveTimer.current`. `saveTitle` (onBlur do titulo) disparava `saveNote`
 * NA HORA sem cancelar esse timer: usuario digita no corpo, clica no titulo
 * e sai dentro da janela de 800ms -> DUAS gravacoes da MESMA nota em voo,
 * podem se atropelar.
 *
 * Este teste REPROVA na versao antiga: com o `saveTitle` antigo (so
 * `if (current && title !== current.title) { ... }`, sem clearTimeout nem
 * checar `pendingSave`) `saveNote` era chamado 2x nesse cenario - a asserção
 * `toHaveBeenCalledTimes(1)` falhava (recebia 2, provado rodando este
 * arquivo contra a versao antiga antes do conserto).
 */
import { act } from 'react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store'
import { NoteEditor } from './NoteEditor'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let liveDoc = ''
type CapturedProps = { onChange: (v: string) => void; onReady?: (v: unknown) => void }
let captured: CapturedProps[] = []

vi.mock('./LiveMarkdownEditor', () => ({
  LiveMarkdownEditor: forwardRef(function FakeLiveMarkdownEditor(props: CapturedProps, ref) {
    captured.push(props)
    const fakeView = { state: { doc: { toString: () => liveDoc } } }
    useImperativeHandle(ref, () => ({ view: fakeView, editor: null }))
    useEffect(() => { props.onReady?.(fakeView) }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return null
  }),
}))

describe('NoteEditor - saveTitle cancela o debounce pendente do corpo (TASK-495)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    captured = []
    liveDoc = ''
    vi.useFakeTimers()
    useStore.setState({ note: 'n1' })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('digitar no corpo + trocar/sair do titulo dentro dos 800ms grava UMA vez, com corpo E titulo atuais', () => {
    const saveNote = vi.fn().mockResolvedValue(undefined)
    useStore.setState({ saveNote })

    act(() => { root.render(<NoteEditor />) })
    const { onChange } = captured[captured.length - 1]

    // Usuario digita no corpo - agenda o autosave de 800ms.
    liveDoc = 'corpo editado pelo usuario'
    act(() => { onChange(liveDoc) })

    // Antes do debounce vencer (ex.: 300ms depois), o usuario troca o titulo
    // e sai do campo (onBlur) - isso deve salvar NA HORA.
    act(() => { vi.advanceTimersByTime(300) })

    const titleInput = container.querySelector('input[placeholder="Título da nota..."]') as HTMLInputElement
    act(() => {
      titleInput.focus()
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
      setter.call(titleInput, 'Titulo novo')
      titleInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // jsdom .blur() dispara 'blur' (nao bubbla) E 'focusout' (bubbla) - React
    // escuta onBlur via 'focusout' delegado na raiz.
    act(() => { titleInput.blur() })

    // Avanca o resto da janela de 800ms - se o debounce antigo nao foi
    // cancelado, ele dispara aqui e vira uma SEGUNDA gravacao.
    act(() => { vi.advanceTimersByTime(800) })

    expect(saveNote).toHaveBeenCalledTimes(1)
    const [, tituloGravado, corpoGravado] = saveNote.mock.calls[0]
    expect(tituloGravado).toBe('Titulo novo')
    expect(corpoGravado).toBe('corpo editado pelo usuario')
  })
})
