/** markdownCommands.test.ts — TDD (Kent Beck: teste antes do codigo).
 * Roda sobre EditorState puro (@codemirror/state), sem DOM: testa a
 * transacao que cada botao da toolbar produz, nao o CodeMirror renderizado. */
import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { toggleWrap, toggleLinePrefix, toggleOrderedList, toggleChecklist, insertLink } from './markdownCommands'

function stateWith(doc: string, from: number, to = from): EditorState {
  return EditorState.create({ doc, selection: { anchor: from, head: to } })
}

function apply(state: EditorState, spec: ReturnType<typeof toggleWrap>) {
  return state.update(spec).state
}

describe('toggleWrap (bold **, italic _)', () => {
  it('sem selecao: insere a marca dupla e poe o cursor no meio', () => {
    const state = stateWith('', 0)
    const next = apply(state, toggleWrap(state, '**'))
    expect(next.doc.toString()).toBe('****')
    expect(next.selection.main.from).toBe(2)
    expect(next.selection.main.to).toBe(2)
  })

  it('com selecao: envolve o texto selecionado com a marca', () => {
    const state = stateWith('oi mundo', 3, 8) // seleciona "mundo"
    const next = apply(state, toggleWrap(state, '**'))
    expect(next.doc.toString()).toBe('oi **mundo**')
    // selecao passa a cobrir "mundo" (sem as marcas)
    expect(next.doc.sliceString(next.selection.main.from, next.selection.main.to)).toBe('mundo')
  })

  it('negrito em texto ja negrito (marca fora da selecao) DESFAZ, nao empilha', () => {
    const state = stateWith('oi **mundo** tchau', 5, 10) // seleciona "mundo" (marcas ao redor, fora da selecao)
    const next = apply(state, toggleWrap(state, '**'))
    expect(next.doc.toString()).toBe('oi mundo tchau')
    expect(next.doc.sliceString(next.selection.main.from, next.selection.main.to)).toBe('mundo')
  })

  it('negrito quando a selecao inclui as proprias marcas tambem desfaz', () => {
    const state = stateWith('oi **mundo** tchau', 3, 12) // seleciona "**mundo**" inteiro
    const next = apply(state, toggleWrap(state, '**'))
    expect(next.doc.toString()).toBe('oi mundo tchau')
  })

  it('italico usa marca propria (_) e nao empilha', () => {
    const state = stateWith('oi _mundo_ tchau', 4, 9)
    const next = apply(state, toggleWrap(state, '_'))
    expect(next.doc.toString()).toBe('oi mundo tchau')
  })
})

describe('toggleLinePrefix (heading, quote, lista)', () => {
  it('aplica o prefixo na linha do cursor', () => {
    const state = stateWith('titulo', 2)
    const next = apply(state, toggleLinePrefix(state, '# ', ['## ']))
    expect(next.doc.toString()).toBe('# titulo')
  })

  it('aplicar de novo remove (toggle)', () => {
    let state = stateWith('titulo', 2)
    state = apply(state, toggleLinePrefix(state, '# ', ['## ']))
    const next = apply(state, toggleLinePrefix(state, '# ', ['## ']))
    expect(next.doc.toString()).toBe('titulo')
  })

  it('trocar de h1 para h2 substitui a marca, nao acumula', () => {
    let state = stateWith('titulo', 2)
    state = apply(state, toggleLinePrefix(state, '# ', ['## ']))
    const next = apply(state, toggleLinePrefix(state, '## ', ['# ']))
    expect(next.doc.toString()).toBe('## titulo')
  })

  it('quote cobre todas as linhas selecionadas', () => {
    const state = stateWith('linha um\nlinha dois', 0, 19)
    const next = apply(state, toggleLinePrefix(state, '> ', []))
    expect(next.doc.toString()).toBe('> linha um\n> linha dois')
  })
})

describe('toggleOrderedList', () => {
  it('numera cada linha selecionada em sequencia', () => {
    const state = stateWith('a\nb\nc', 0, 5)
    const next = apply(state, toggleOrderedList(state))
    expect(next.doc.toString()).toBe('1. a\n2. b\n3. c')
  })

  it('aplicar de novo remove a numeracao', () => {
    let state = stateWith('a\nb\nc', 0, 5)
    state = apply(state, toggleOrderedList(state))
    const next = apply(state, toggleOrderedList(state))
    expect(next.doc.toString()).toBe('a\nb\nc')
  })
})

describe('toggleChecklist', () => {
  it('aplica "- [ ] " em cada linha selecionada', () => {
    const state = stateWith('a\nb', 0, 3)
    const next = apply(state, toggleChecklist(state))
    expect(next.doc.toString()).toBe('- [ ] a\n- [ ] b')
  })

  it('aplicar de novo remove (toggle), mesmo com item marcado [x]', () => {
    const state = stateWith('- [ ] a\n- [x] b', 0, 15)
    const next = apply(state, toggleChecklist(state))
    expect(next.doc.toString()).toBe('a\nb')
  })
})

describe('comandos de bloco sao mutuamente exclusivos (TASK-359)', () => {
  it('checklist sobre citacao TROCA o prefixo, nunca soma', () => {
    const state = stateWith('> alguma coisa', 2)
    const next = apply(state, toggleChecklist(state))
    expect(next.doc.toString()).toBe('- [ ] alguma coisa')
  })

  it('citacao sobre checklist TROCA o prefixo, nunca soma', () => {
    const state = stateWith('- [ ] alguma coisa', 2)
    const next = apply(state, toggleLinePrefix(state, '> ', []))
    expect(next.doc.toString()).toBe('> alguma coisa')
  })

  it('titulo sobre lista TROCA o prefixo, nunca soma', () => {
    const state = stateWith('- item', 2)
    const next = apply(state, toggleLinePrefix(state, '# ', ['## ', '### ']))
    expect(next.doc.toString()).toBe('# item')
  })

  it('lista sobre checklist TROCA o prefixo (nao so remove "- " e deixa "[ ] " orfao)', () => {
    const state = stateWith('- [ ] item', 2)
    const next = apply(state, toggleLinePrefix(state, '- ', ['* ', '+ ']))
    expect(next.doc.toString()).toBe('- item')
  })

  it('checklist sobre lista TROCA o prefixo, nunca soma', () => {
    const state = stateWith('- item', 2)
    const next = apply(state, toggleChecklist(state))
    expect(next.doc.toString()).toBe('- [ ] item')
  })

  it('checklist sobre titulo TROCA o prefixo, nunca soma', () => {
    const state = stateWith('# item', 2)
    const next = apply(state, toggleChecklist(state))
    expect(next.doc.toString()).toBe('- [ ] item')
  })
})

describe('insertLink', () => {
  it('sem selecao: insere placeholder e seleciona o texto do link', () => {
    const state = stateWith('', 0)
    const next = apply(state, insertLink(state, false))
    expect(next.doc.toString()).toBe('[texto do link](url)')
    expect(next.doc.sliceString(next.selection.main.from, next.selection.main.to)).toBe('texto do link')
  })

  it('com selecao: envolve como label e seleciona o placeholder de url', () => {
    const state = stateWith('veja isto', 5, 9) // seleciona "isto"
    const next = apply(state, insertLink(state, false))
    expect(next.doc.toString()).toBe('veja [isto](url)')
    expect(next.doc.sliceString(next.selection.main.from, next.selection.main.to)).toBe('url')
  })

  it('imagem usa a marca com "!" na frente', () => {
    const state = stateWith('', 0)
    const next = apply(state, insertLink(state, true))
    expect(next.doc.toString()).toBe('![descrição](url)')
  })
})
