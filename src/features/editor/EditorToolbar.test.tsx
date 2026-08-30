// @vitest-environment jsdom
/** EditorToolbar.test.tsx — TDD (TASK-355, CEO: "os botoes de edicao de
 * texto estao sem funcionalidade"). Rede de protecao pedida no item 4: um
 * botao morto passa no compilador e passa no olho ("a barra esta la, os
 * icones estao la") - so o usuario descobre no clique. Este teste clica
 * CADA UMA das nove acoes contra uma EditorView de verdade (jsdom, sem
 * mock) e confere o documento resultante - se algum botao parar de
 * despachar, ou se a barra voltar a ficar presa em `view=null` depois que
 * o pai atualiza a prop, um destes testes cai. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { EditorToolbar } from './EditorToolbar'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function makeView(doc: string, from: number, to = from): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  return new EditorView({ state: EditorState.create({ doc, selection: { anchor: from, head: to } }), parent })
}

describe('EditorToolbar - as nove acoes despacham na EditorView recebida', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function mount(view: EditorView | null, onPickImage = () => {}) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(<EditorToolbar view={view} onPickImage={onPickImage} />)
    })
  }

  function click(title: string) {
    const btn = container.querySelector(`button[title^="${title}"]`) as HTMLButtonElement
    if (!btn) throw new Error(`botao "${title}" nao encontrado na barra`)
    act(() => btn.click())
  }

  it('Título: aplica "# " na linha (sem selecao, so cursor)', () => {
    const view = makeView('minha nota', 0)
    mount(view)
    click('Título')
    expect(view.state.doc.toString()).toBe('# minha nota')
  })

  it('Negrito: envolve a selecao com **', () => {
    const view = makeView('oi mundo', 3, 8)
    mount(view)
    click('Negrito')
    expect(view.state.doc.toString()).toBe('oi **mundo**')
  })

  it('Itálico: envolve a selecao com _', () => {
    const view = makeView('oi mundo', 3, 8)
    mount(view)
    click('Itálico')
    expect(view.state.doc.toString()).toBe('oi _mundo_')
  })

  it('Lista: aplica "- " na linha', () => {
    const view = makeView('item um', 0)
    mount(view)
    click('Lista')
    expect(view.state.doc.toString()).toBe('- item um')
  })

  it('Checklist: aplica "- [ ] " na linha', () => {
    const view = makeView('lavar louça', 0)
    mount(view)
    click('Checklist')
    expect(view.state.doc.toString()).toBe('- [ ] lavar louça')
  })

  it('Citação: aplica "> " na linha', () => {
    const view = makeView('frase celebre', 0)
    mount(view)
    click('Citação')
    expect(view.state.doc.toString()).toBe('> frase celebre')
  })

  it('Código: envolve a selecao com crase', () => {
    const view = makeView('const x = 1', 0, 5)
    mount(view)
    click('Código')
    expect(view.state.doc.toString()).toBe('`const` x = 1')
  })

  it('Link: com selecao, vira [texto](url) e seleciona "url"', () => {
    const view = makeView('veja isto', 5, 9) // seleciona "isto"
    mount(view)
    click('Link')
    expect(view.state.doc.toString()).toBe('veja [isto](url)')
  })

  it('Imagem: nao mexe no doc - avisa onPickImage com a posicao do cursor', () => {
    const view = makeView('texto', 3)
    const onPickImage = vi.fn()
    mount(view, onPickImage)
    click('Imagem')
    expect(onPickImage).toHaveBeenCalledWith(3)
    expect(view.state.doc.toString()).toBe('texto')
  })

  it('view=null (editor ainda nao montou): clicar em qualquer botao nao quebra e nao muda nada', () => {
    mount(null)
    expect(() => click('Negrito')).not.toThrow()
  })

  it('view chega DEPOIS via rerender (o caso real de NoteEditor/InboxCardEditor): o clique so funciona apos a prop atualizar - nunca fica preso no null da primeira renderizacao', () => {
    const view = makeView('mundo', 0, 5)
    mount(null)
    // Antes da view chegar, o clique nao pode fazer nada (nem lançar).
    expect(() => click('Negrito')).not.toThrow()
    expect(view.state.doc.toString()).toBe('mundo')
    // O pai atualiza a prop (equivalente ao onReady disparando setEditorView).
    act(() => {
      root.render(<EditorToolbar view={view} onPickImage={() => {}} />)
    })
    click('Negrito')
    expect(view.state.doc.toString()).toBe('**mundo**')
  })
})
