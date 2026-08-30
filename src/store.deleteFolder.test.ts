// @vitest-environment jsdom
/** store.deleteFolder.test.ts - TDD (feature pedida pelo CEO pra 0.2.17:
 * "hoje nao existe botao de excluir pasta").
 *
 * Regra de comportamento (decisao do CEO, ja tomada): excluir pasta NUNCA
 * destroi nota nem tarefa do usuario (Invariante: Durabilidade - nota e
 * arquivo do usuario, legivel daqui a dez anos). A pasta some; o que estava
 * dentro perde o folderId e continua existindo, sem pasta.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { useStore } from './store'

describe('deleteFolder', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
  })

  it('pasta vazia: exclui so ela, sem afetar nenhuma outra pasta da categoria', () => {
    // 'primeiro' (Meu primeiro projeto) nasce vazia - nenhuma nota/tarefa de
    // exemplo aponta pra ela.
    const antes = useStore.getState().para.projects.folders.map(f => f.id)
    expect(antes).toContain('primeiro')

    useStore.getState().deleteFolder('projects', 'primeiro')

    const depois = useStore.getState().para.projects.folders
    expect(depois.map(f => f.id)).not.toContain('primeiro')
    expect(depois.map(f => f.id)).toContain('start') // a outra pasta da categoria sobrevive intacta
  })

  it('pasta com conteudo: some, mas TODAS as notas e tarefas continuam existindo, agora sem pasta', () => {
    // 'start' (Comece aqui) tem as 5 notas de exemplo (n1..n5) e 3 tarefas (t1,t2,t3).
    const notasAntes = useStore.getState().notes.filter(n => n.folderId === 'start').map(n => n.id)
    const tarefasAntes = useStore.getState().tasks.filter(t => t.folderId === 'start').map(t => t.id)
    expect(notasAntes).toHaveLength(5)
    expect(tarefasAntes).toHaveLength(3)
    const totalNotasAntes = useStore.getState().notes.length
    const totalTarefasAntes = useStore.getState().tasks.length

    useStore.getState().deleteFolder('projects', 'start')

    const depois = useStore.getState()
    // A pasta some.
    expect(depois.para.projects.folders.map(f => f.id)).not.toContain('start')
    // Nenhuma nota nem tarefa foi apagada - so perderam a pasta.
    expect(depois.notes).toHaveLength(totalNotasAntes)
    expect(depois.tasks).toHaveLength(totalTarefasAntes)
    for (const id of notasAntes) {
      const nota = depois.notes.find(n => n.id === id)
      expect(nota).toBeDefined()
      expect(nota!.folderId).toBeUndefined()
    }
    for (const id of tarefasAntes) {
      const tarefa = depois.tasks.find(t => t.id === id)
      expect(tarefa).toBeDefined()
      expect(tarefa!.folderId).toBeUndefined()
    }
  })

  it('as quatro gavetas do PARA nunca sao excluiveis (deleteFolder so mexe em folders[] dentro da gaveta)', () => {
    const antesQuadrantes = Object.keys(useStore.getState().para)
    // Nao existe folderId igual ao id de uma gaveta - chamar com o id da
    // propria gaveta nao apaga a gaveta, so procura (e nao acha) uma pasta
    // com esse id dentro dela.
    useStore.getState().deleteFolder('projects', 'projects')

    expect(Object.keys(useStore.getState().para)).toEqual(antesQuadrantes)
    expect(useStore.getState().para.projects).toBeDefined()
    // Nenhuma pasta de verdade foi afetada.
    expect(useStore.getState().para.projects.folders.map(f => f.id)).toEqual(antesQuadrantes.includes('projects') ? ['start', 'primeiro'] : [])
  })

  it('a contagem das outras pastas fica correta na hora, sem precisar de nenhuma acao extra', () => {
    // Move uma nota de 'primeiro' pra 'start' antes de fazer a conta valer a pena.
    const { createNote } = useStore.getState()
    createNote('primeiro', 'Nota em Meu primeiro projeto')
    expect(useStore.getState().para.projects.folders.find(f => f.id === 'primeiro')!.notes).toBe(1)

    useStore.getState().deleteFolder('projects', 'start')

    // 'primeiro' nao foi tocada - continua com a contagem certa.
    const primeiro = useStore.getState().para.projects.folders.find(f => f.id === 'primeiro')!
    expect(primeiro.notes).toBe(1)
    // 'start' sumiu de fato.
    expect(useStore.getState().para.projects.folders.map(f => f.id)).toEqual(['primeiro'])
  })

  it('categoria inexistente ou pasta inexistente: no-op, nao quebra nem apaga nada', () => {
    const antes = useStore.getState()
    expect(() => useStore.getState().deleteFolder('categoria-que-nao-existe', 'start')).not.toThrow()
    expect(() => useStore.getState().deleteFolder('projects', 'pasta-que-nao-existe')).not.toThrow()
    const depois = useStore.getState()
    expect(depois.notes).toHaveLength(antes.notes.length)
    expect(depois.tasks).toHaveLength(antes.tasks.length)
    expect(depois.para.projects.folders.map(f => f.id)).toEqual(antes.para.projects.folders.map(f => f.id))
  })
})
