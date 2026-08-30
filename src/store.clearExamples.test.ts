// @vitest-environment jsdom
/** store.clearExamples.test.ts - TDD (TASK-367).
 *
 * Prova de ponta a ponta contra o estado REAL da store (o que o app tem no
 * primeiro uso): clearExamples() so apaga o que veio pronto, nunca o que a
 * pessoa escreveu, e um exemplo editado sobrevive.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { useStore } from './store'

describe('clearExamples', () => {
  beforeEach(() => {
    // Cada teste parte do estado de fabrica (default do create<AppState>).
    useStore.setState(useStore.getInitialState(), true)
  })

  it('apaga as 5 notas, os 4 itens do inbox, as 6 tarefas e as 7 pastas de exemplo quando nada foi tocado', () => {
    const before = useStore.getState().previewExampleCleanup()
    expect(before.noteIds).toHaveLength(5)
    expect(before.inboxIds).toHaveLength(4)
    expect(before.taskIds).toHaveLength(6)
    expect(before.folders).toHaveLength(7)

    useStore.getState().clearExamples()

    const after = useStore.getState()
    expect(after.notes).toHaveLength(0)
    expect(after.inbox).toHaveLength(0)
    expect(after.tasks).toHaveLength(0)
    expect(Object.values(after.para).flatMap(q => q.folders)).toHaveLength(0)
  })

  it('o que a pessoa escreveu (nota, tarefa, card de inbox, pasta criada por ela) sobrevive intacto', () => {
    const { createNote, saveNote, createFolder, addTask } = useStore.getState()

    const folderId = (() => {
      createFolder('resources', 'Minha pasta')
      const cats = useStore.getState().para
      return cats.resources.folders.find(f => f.name === 'Minha pasta')!.id
    })()

    const noteId = createNote(folderId, 'Minha nota de verdade')
    saveNote(noteId, 'Minha nota de verdade', 'Um texto que eu escrevi do meu jeito.')

    const taskId = addTask('Minha propria tarefa')

    useStore.setState(s => ({ inbox: [...s.inbox, { id: 'iMeuCardReal', type: 'NOTA' as const, content: 'Coisa minha', time: 'agora' }] }))

    useStore.getState().clearExamples()

    const after = useStore.getState()
    expect(after.notes.map(n => n.id)).toEqual([noteId])
    expect(after.notes[0].body).toBe('Um texto que eu escrevi do meu jeito.')
    expect(after.tasks.map(t => t.id)).toEqual([taskId])
    expect(after.inbox.map(c => c.id)).toEqual(['iMeuCardReal'])
    expect(Object.values(after.para).flatMap(q => q.folders).map(f => f.id)).toEqual([folderId])
  })

  it('nota de exemplo EDITADA pela pessoa sobrevive a limpeza, e o restante do exemplo some', () => {
    const { saveNote } = useStore.getState()
    const n1 = useStore.getState().notes.find(n => n.id === 'n1')!
    saveNote('n1', n1.title, n1.body + '\n\nAdicionei uma frase minha aqui.')

    useStore.getState().clearExamples()

    const after = useStore.getState()
    expect(after.notes.map(n => n.id)).toEqual(['n1'])
    expect(after.notes[0].body).toContain('Adicionei uma frase minha aqui.')
    // A pasta "start" (onde n1 mora) sobrevive porque ainda tem uma nota viva.
    expect(after.para.projects.folders.map(f => f.id)).toContain('start')
  })

  it('o grafo nao aponta mais pra nenhuma nota apagada depois da limpeza', async () => {
    useStore.getState().clearExamples()
    // O grafo e estado DERIVADO, reconstruido fora do caminho sincrono da
    // escrita (item 5) - da tempo do rebuild agendado (setTimeout 0) rodar.
    await new Promise(resolve => setTimeout(resolve, 0))
    const after = useStore.getState()
    const idsVivos = new Set(after.notes.map(n => n.id))
    for (const node of after.graph.nodes) expect(idsVivos.has(node.id)).toBe(true)
    for (const edge of after.graph.edges) {
      expect(idsVivos.has(edge.a)).toBe(true)
      expect(idsVivos.has(edge.b)).toBe(true)
    }
  })

  it('chamar clearExamples de novo depois de ja limpo nao quebra nada (plano vazio)', () => {
    useStore.getState().clearExamples()
    const plan = useStore.getState().previewExampleCleanup()
    expect(plan.noteIds).toHaveLength(0)
    expect(plan.folders).toHaveLength(0)
    expect(() => useStore.getState().clearExamples()).not.toThrow()
  })

  it('card de inbox de exemplo EDITADO pela pessoa sobrevive a limpeza; o intocado some', () => {
    useStore.setState(s => ({
      inbox: s.inbox.map(c => (c.id === 'i3' ? { ...c, content: 'Texto real que eu escrevi aqui.' } : c)),
    }))

    useStore.getState().clearExamples()

    const after = useStore.getState()
    expect(after.inbox.map(c => c.id)).toEqual(['i3'])
    expect(after.inbox[0].content).toBe('Texto real que eu escrevi aqui.')
  })
})

describe('addTask sem pasta (TASK-374: o bug do Inbox morreu junto com o grupo)', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
  })

  it('tarefa criada so com texto (o jeito que o Inbox cria hoje) fica SEM pasta - nunca herda a pasta de outra tarefa que ja existia', () => {
    // Ja existem tarefas de exemplo amarradas a pasta 'start' (SEED_TASKS).
    const antes = useStore.getState().tasks.filter(t => t.folderId === 'start').length
    expect(antes).toBeGreaterThan(0)

    const { addTask } = useStore.getState()
    const id = addTask('Card do inbox virou tarefa')

    const criada = useStore.getState().tasks.find(t => t.id === id)!
    expect(criada.folderId).toBeUndefined()
  })
})
