// @vitest-environment jsdom
/** LiveMarkdownEditor.test.tsx — TDD (TASK-355, CEO: "os botoes de edicao de
 * texto estao sem funcionalidade"). Causa raiz: NoteEditor.tsx e
 * InboxCardEditor.tsx passavam `view={editorRef.current?.view ?? null}` pra
 * EditorToolbar/SelectionToolbar/SlashMenu — uma leitura de ref DENTRO do
 * JSX, avaliada de novo a cada render, mas nada garantia que um NOVO render
 * aconteceria depois do CodeMirror terminar de montar (o mount do
 * `@uiw/react-codemirror` popula `.view` por dentro de um efeito PROPRIO,
 * que nao avisa o pai). Em NoteEditor.tsx isso deixava a barra presa em
 * `null` pra sempre em boa parte dos casos (cursor sem selecao, sem "/",
 * sem sugestao de pasta — os tres unicos gatilhos de rerender do componente
 * fazem `return state` / bail-out quando o valor nao muda de verdade).
 *
 * O conserto: `LiveMarkdownEditor` agora aceita `onReady`, ligado direto no
 * `onCreateEditor` que o `@uiw/react-codemirror` ja suporta — o proprio
 * mecanismo da biblioteca pra avisar "a EditorView esta pronta", em vez de
 * torcer pra algum OUTRO estado do componente pai disparar um rerender por
 * coincidencia. Este teste prova que `onReady` dispara com uma EditorView
 * de verdade, DENTRO do mesmo `act()` da montagem — sem precisar de nenhum
 * evento seguinte pra "acordar" o pai. */
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { EditorView } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { LiveMarkdownEditor } from './LiveMarkdownEditor'

// React 19 exige este sinal pra `act()` flushar de verdade fora do
// testing-library (que normalmente liga isto por baixo dos panos).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('LiveMarkdownEditor - onReady avisa quando a EditorView monta', () => {
  let container: HTMLDivElement
  let root: Root | undefined

  afterEach(() => {
    if (root) act(() => root!.unmount())
    container.remove()
  })

  it('chama onReady com uma EditorView de verdade, sem exigir outro render do pai', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    let readyView: EditorView | null = null
    act(() => {
      root!.render(
        <LiveMarkdownEditor value="ola mundo" onChange={() => {}} onReady={v => { readyView = v }} />,
      )
    })

    expect(readyView).not.toBeNull()
    expect(readyView!.state.doc.toString()).toBe('ola mundo')
  })

  it('a view do onReady e a MESMA que o ref exposto (ninguem precisa escolher entre os dois)', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const ref = createRef<ReactCodeMirrorRef>()

    let readyView: EditorView | null = null
    act(() => {
      root!.render(
        <LiveMarkdownEditor ref={ref} value="x" onChange={() => {}} onReady={v => { readyView = v }} />,
      )
    })

    expect(readyView).not.toBeNull()
    expect(ref.current?.view).toBe(readyView)
  })
})
