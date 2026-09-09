// @vitest-environment jsdom
/** store.semPasta.test.ts - TDD (CONSERTO, 30/08/2026: apagar uma pasta
 * nunca destroi Nota, mas escondida da navegacao normal quebra a mesma
 * confianca que apagar quebraria - CEO). `notasSemPasta` e a MESMA funcao
 * que o balde "Sem pasta" do PARAGrid usa pra decidir se desenha (so
 * quando > 0) e que FolderNotesView usa pra listar o conteudo do balde -
 * testar esta funcao E testar o estado que as duas telas consomem.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { useStore, notasSemPasta } from './store'

describe('notasSemPasta (balde "Sem pasta" da tela inicial)', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
  })

  it('instalacao intocada: nenhuma nota de exemplo esta sem pasta - o balde nao teria nada pra desenhar', () => {
    expect(notasSemPasta(useStore.getState().notes)).toHaveLength(0)
  })

  it('apos excluir uma pasta com notas, TODAS elas aparecem no estado que o balde "Sem pasta" consome', () => {
    // 'start' (Comece aqui) tem as 5 notas de exemplo (n1..n5).
    const idsDaPasta = useStore.getState().notes.filter(n => n.folderId === 'start').map(n => n.id).sort()
    expect(idsDaPasta).toHaveLength(5)

    useStore.getState().deleteFolder('projects', 'start')

    const semPasta = notasSemPasta(useStore.getState().notes)
    expect(semPasta.map(n => n.id).sort()).toEqual(idsDaPasta)
    // Nao e so um id perdido no meio - a nota inteira (titulo, corpo) segue viva.
    for (const nota of semPasta) {
      expect(nota.title).toBeTruthy()
    }
  })

  it('nota que NUNCA teve pasta (criada solta) tambem cai no balde, sem precisar de deleteFolder', () => {
    useStore.setState(s => ({
      notes: [...s.notes, {
        id: 'nSolta', title: 'Nota solta', date: '', updatedAt: '', img: false, body: '', tags: [],
      }],
    }))

    expect(notasSemPasta(useStore.getState().notes).map(n => n.id)).toContain('nSolta')
  })

  it('excluir uma pasta VAZIA nao cria nenhuma entrada no balde "Sem pasta"', () => {
    // 'primeiro' (Meu primeiro projeto) nasce vazia.
    useStore.getState().deleteFolder('projects', 'primeiro')
    expect(notasSemPasta(useStore.getState().notes)).toHaveLength(0)
  })

  it('mover a nota orfa de volta pra uma pasta real tira ela do balde', () => {
    useStore.getState().deleteFolder('projects', 'start')
    const [orfa] = notasSemPasta(useStore.getState().notes)
    expect(orfa).toBeDefined()

    useStore.getState().moveNote(orfa.id, 'primeiro')

    expect(notasSemPasta(useStore.getState().notes).map(n => n.id)).not.toContain(orfa.id)
  })
})
