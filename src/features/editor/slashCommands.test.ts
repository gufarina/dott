/** slashCommands.test.ts — TDD (Kent Beck: teste antes do codigo).
 * Roda sobre EditorState puro, sem DOM — mesmo padrao de markdownCommands.test.ts. */
import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { SLASH_COMMANDS, applySlashCommand, slashLineAt } from './slashCommands'

function stateWith(doc: string, pos: number): EditorState {
  return EditorState.create({ doc, selection: { anchor: pos } })
}

describe('slashLineAt', () => {
  it('linha com so "/" no cursor: abre com filtro vazio', () => {
    const state = stateWith('/', 1)
    const hit = slashLineAt(state)
    expect(hit).not.toBeNull()
    expect(hit!.filter).toBe('')
  })

  it('linha com "/tit" no cursor: filtro e "tit"', () => {
    const state = stateWith('/tit', 4)
    const hit = slashLineAt(state)
    expect(hit!.filter).toBe('tit')
  })

  it('linha com texto ANTES do "/" nao conta (nao e inicio de linha)', () => {
    const state = stateWith('oi /', 4)
    expect(slashLineAt(state)).toBeNull()
  })

  it('cursor no meio da linha (nao no fim) nao conta', () => {
    const state = stateWith('/tit depois', 4)
    expect(slashLineAt(state)).toBeNull()
  })

  it('selecao nao vazia nao conta', () => {
    const state = EditorState.create({ doc: '/tit', selection: { anchor: 0, head: 4 } })
    expect(slashLineAt(state)).toBeNull()
  })

  it('linha sem barra nenhuma nao conta', () => {
    const state = stateWith('titulo', 6)
    expect(slashLineAt(state)).toBeNull()
  })

  it('segunda linha do documento tambem funciona (nao so a primeira)', () => {
    const state = stateWith('primeira linha\n/lis', 19)
    const hit = slashLineAt(state)
    expect(hit).not.toBeNull()
    expect(hit!.filter).toBe('lis')
  })
})

describe('SLASH_COMMANDS (catalogo)', () => {
  it('tem os cinco comandos da proposta: h1, h2, lista, citacao, imagem', () => {
    const ids = SLASH_COMMANDS.map(c => c.id)
    expect(ids).toEqual(['h1', 'h2', 'lista', 'citacao', 'imagem'])
  })

  it('filtro por prefixo do rotulo (sem acento, sem caixa) restringe a lista', () => {
    const bateu = SLASH_COMMANDS.filter(c => c.matches('tit'))
    expect(bateu.map(c => c.id)).toEqual(['h1', 'h2'])
  })

  it('filtro vazio bate com todos', () => {
    expect(SLASH_COMMANDS.every(c => c.matches(''))).toBe(true)
  })
})

describe('applySlashCommand', () => {
  it('h1: troca a linha "/tit" por "# " com o cursor logo depois', () => {
    const state = stateWith('/tit', 4)
    const hit = slashLineAt(state)!
    const tr = applySlashCommand(state, hit, SLASH_COMMANDS[0])
    const next = state.update(tr).state
    expect(next.doc.toString()).toBe('# ')
    expect(next.selection.main.head).toBe(2)
  })

  it('citacao: troca a linha por "> "', () => {
    const state = stateWith('/cit', 4)
    const hit = slashLineAt(state)!
    const cmd = SLASH_COMMANDS.find(c => c.id === 'citacao')!
    const tr = applySlashCommand(state, hit, cmd)
    const next = state.update(tr).state
    expect(next.doc.toString()).toBe('> ')
  })

  it('lista: troca a linha por "- "', () => {
    const state = stateWith('/lis', 4)
    const hit = slashLineAt(state)!
    const cmd = SLASH_COMMANDS.find(c => c.id === 'lista')!
    const tr = applySlashCommand(state, hit, cmd)
    const next = state.update(tr).state
    expect(next.doc.toString()).toBe('- ')
  })

  it('imagem: so limpa a linha (quem insere a imagem de fato e o chamador)', () => {
    const state = stateWith('/img', 4)
    const hit = slashLineAt(state)!
    const cmd = SLASH_COMMANDS.find(c => c.id === 'imagem')!
    const tr = applySlashCommand(state, hit, cmd)
    const next = state.update(tr).state
    expect(next.doc.toString()).toBe('')
  })
})
