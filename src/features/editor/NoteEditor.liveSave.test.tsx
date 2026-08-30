// @vitest-environment jsdom
/** NoteEditor.liveSave.test.tsx — TDD (DEFEITO 1, incidente de corrupcao
 * medido na maquina do CEO em 27/08/2026: `n1.md` foi gravado com o corpo
 * embaralhado depois de uma edicao - ver comentario grande em cima dos refs
 * `currentIdRef`/`titleRef`/`readLiveBody` em NoteEditor.tsx pra causa raiz
 * completa).
 *
 * Dois testes, um por metade do conserto:
 *
 * 1) "onChange tem identidade estavel" - a causa raiz media: `onChange` era
 *    recriado a cada render do NoteEditor (fechava `current`/`title` direto
 *    da render). Isso muda a REFERENCIA da funcao passada pro editor
 *    controlado toda vez que o store muda por QUALQUER motivo - inclusive o
 *    `graph` que se recalcula sozinho ~0ms depois de TODO `saveNote` (via
 *    scheduleGraphRebuild, store.ts). O `@uiw/react-codemirror` redespacha
 *    `StateEffect.reconfigure` na EditorView viva sempre que `onChange` troca
 *    de referencia - reconfigurar a view bem no instante em que o usuario
 *    retoma a digitacao (logo apos o autosave de 800ms) e o gatilho mais
 *    provavel da nota embaralhada.
 *
 * 2) "salvar le o doc VIVO, nunca um estado cacheado" - a DEFESA pedida
 *    junto do conserto: simula a MESMA divergencia que a corrupcao provou
 *    existir (o doc que a EditorView tem de verdade e diferente do que o
 *    app guardou em `val`/`bodyRef` num momento anterior) e confere que o
 *    save usa sempre o doc real, nunca a copia velha.
 */
import { act } from 'react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store'
import { NoteEditor } from './NoteEditor'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Doc "de verdade" que a EditorView fake devolve - mutavel de fora do
 *  React, exatamente como o doc de uma EditorView real. */
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

describe('NoteEditor - defesa do DEFEITO 1 (gravar nota e ato sagrado)', () => {
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

  it('a identidade de onChange passada ao editor NAO MUDA quando o store atualiza por outro motivo (ex.: graph)', () => {
    act(() => { root.render(<NoteEditor />) })
    const onChangeInicial = captured[captured.length - 1].onChange
    expect(typeof onChangeInicial).toBe('function')

    // Mesma coisa que scheduleGraphRebuild faz ~0ms depois de QUALQUER
    // saveNote: atualiza `graph` com um objeto novo, o NoteEditor
    // re-renderiza (ele assina `st.graph`).
    act(() => {
      useStore.setState({
        graph: {
          nodes: [], edges: [], communities: [], byNote: {},
          stats: { notes: 0, edges: 0, communities: 0, achadas: 0, inferidas: 0 },
        },
      })
    })

    const onChangeDepois = captured[captured.length - 1].onChange
    expect(onChangeDepois).toBe(onChangeInicial)
  })

  it('o autosave grava o doc VIVO da EditorView, nunca o `val` cacheado no momento do keystroke', () => {
    const saveNote = vi.fn().mockResolvedValue(undefined)
    useStore.setState({ saveNote })

    act(() => { root.render(<NoteEditor />) })
    const { onChange } = captured[captured.length - 1]

    // Usuario digita "## Como fun" - onChange reporta esse texto.
    liveDoc = '## Como fun'
    act(() => { onChange(liveDoc) })

    // Divergencia (o mesmo tipo que a corrupcao provou existir): o doc REAL
    // da EditorView segue pra "## Como funciona" por um caminho que nao
    // passa pelo `onChange` do React (ex.: reconfigure no meio da digitacao).
    // `val`/`bodyRef` internos do NoteEditor ainda acham que o texto e
    // "## Como fun".
    liveDoc = '## Como funciona'

    // 800ms do debounce de autosave.
    act(() => { vi.advanceTimersByTime(800) })

    expect(saveNote).toHaveBeenCalledTimes(1)
    const [, , corpoGravado] = saveNote.mock.calls[0]
    expect(corpoGravado).toBe('## Como funciona')
  })
})
