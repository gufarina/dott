// @vitest-environment jsdom
/** store.renameFolder.test.ts - TDD (pedido do CEO em 04/09/2026: "preciso
 * poder alterar de novo o nome das pastas").
 *
 * Regra de comportamento: renomear troca SO o rotulo. Nota e tarefa moram
 * amarradas pelo id da pasta (folderId), entao nada muda de lugar nem se
 * perde - mesma Invariante: Durabilidade que deleteFolder respeita.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { useStore } from './store'

describe('renameFolder', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
  })

  it('troca o nome da pasta e nao mexe em nenhuma outra da categoria', () => {
    useStore.getState().renameFolder('projects', 'start', 'Meu novo nome')

    const folders = useStore.getState().para.projects.folders
    expect(folders.find(f => f.id === 'start')?.name).toBe('Meu novo nome')
    expect(folders.find(f => f.id === 'primeiro')?.name).toBe('Meu primeiro projeto')
  })

  it('nota e tarefa da pasta continuam na pasta depois de renomear (amarradas pelo id)', () => {
    const notasAntes = useStore.getState().notes.filter(n => n.folderId === 'start').length
    const tarefasAntes = useStore.getState().tasks.filter(t => t.folderId === 'start').length

    useStore.getState().renameFolder('projects', 'start', 'Comece aqui mesmo')

    expect(useStore.getState().notes.filter(n => n.folderId === 'start')).toHaveLength(notasAntes)
    expect(useStore.getState().tasks.filter(t => t.folderId === 'start')).toHaveLength(tarefasAntes)
  })

  it('nome so com espaco e ignorado - pasta sem nome ficaria inalcancavel na tela', () => {
    useStore.getState().renameFolder('projects', 'start', '   ')
    expect(useStore.getState().para.projects.folders.find(f => f.id === 'start')?.name).toBe('Comece aqui')
  })

  it('espaco sobrando nas pontas e aparado', () => {
    useStore.getState().renameFolder('projects', 'start', '  Aparado  ')
    expect(useStore.getState().para.projects.folders.find(f => f.id === 'start')?.name).toBe('Aparado')
  })

  it('categoria ou pasta que nao existe nao quebra nada', () => {
    expect(() => useStore.getState().renameFolder('nao-existe', 'start', 'X')).not.toThrow()
    expect(() => useStore.getState().renameFolder('projects', 'nao-existe', 'X')).not.toThrow()
    expect(useStore.getState().para.projects.folders.find(f => f.id === 'start')?.name).toBe('Comece aqui')
  })
})
