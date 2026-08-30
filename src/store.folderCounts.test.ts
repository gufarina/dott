// @vitest-environment jsdom
/** store.folderCounts.test.ts - TDD (DEFEITO 2, parte 2 - CEO ja reclamou
 * 3x: "folders.json diz que 'Comece aqui' tem 9 notas, mas o vault inteiro
 * tem 12 notas somando TUDO").
 *
 * `folder.notes`/`.tasks`/`.total` (dentro de `para`) sao campos DERIVADOS.
 * Ate aqui, cada acao que mexia em nota/tarefa tinha que lembrar de chamar
 * `recountFolders` ANTES de salvar - o caso medido foi `clearExamples`
 * esquecendo (porque a limpeza nunca apagava nada de verdade, ver
 * exampleContent.test.ts), mas a mesma classe de defeito reaparece em
 * QUALQUER acao futura que mexa em `notes`/`tasks` sem passar pelo mesmo
 * cuidado.
 *
 * Este teste NAO chama nenhuma acao existente da store - escreve direto em
 * `notes`/`tasks` via `useStore.setState`, exatamente como uma acao futura
 * "esquecida" faria, e prova que o numero exibido se AUTOCORRIGE mesmo
 * assim: a contagem nunca pode ser so um valor salvo que envelhece.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { useStore } from './store'

describe('contagem de pasta (para.folders[].notes/.tasks/.total) nunca fica presa a um valor velho', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
    // O `para` de fabrica (INITIAL_PARA, exampleContent.ts) nasce com os
    // contadores zerados de proposito - so `hydrate()` (nunca chamado neste
    // teste) ou uma mudanca de referencia em `notes`/`tasks` disparam o
    // primeiro recalculo. Forca esse primeiro recalculo pra cada teste
    // partir de uma contagem JA correta, do mesmo jeito que o app real
    // parte depois do hydrate.
    useStore.setState(s => ({ notes: [...s.notes] }))
  })

  it('escrever em `notes` direto (sem passar por nenhuma acao da store) ainda recalcula o numero certo', () => {
    const antes = useStore.getState().para.projects.folders.find(f => f.id === 'start')!.notes
    expect(antes).toBe(5) // as 5 notas de exemplo (n1..n5) nascem em 'start'

    // Simula uma acao FUTURA que mexe em `notes` sem lembrar de recontar -
    // exatamente a classe de erro que quebrou `clearExamples`.
    useStore.setState(s => ({
      notes: s.notes.filter(n => n.id !== 'n1' && n.id !== 'n2'),
    }))

    const depois = useStore.getState().para.projects.folders.find(f => f.id === 'start')!.notes
    expect(depois).toBe(3)
  })

  it('escrever em `tasks` direto tambem recalcula `.tasks`/`.total` da pasta', () => {
    const antes = useStore.getState().para.projects.folders.find(f => f.id === 'start')!.total
    expect(antes).toBe(3) // t1, t2, t3 (SEED_TASKS) nascem em 'start'

    useStore.setState(s => ({
      tasks: s.tasks.filter(t => t.id !== 't1'),
    }))

    const depois = useStore.getState().para.projects.folders.find(f => f.id === 'start')!.total
    expect(depois).toBe(2)
  })

  it('editar o CORPO de uma nota (sem mover nem apagar) nao mexe na contagem - so recalcula quando o numero de verdade muda', () => {
    const antes = useStore.getState().para.projects.folders.find(f => f.id === 'start')!.notes
    const paraRefAntes = useStore.getState().para

    useStore.setState(s => ({
      notes: s.notes.map(n => (n.id === 'n1' ? { ...n, body: n.body + ' mudou' } : n)),
    }))

    const depois = useStore.getState().para.projects.folders.find(f => f.id === 'start')!.notes
    expect(depois).toBe(antes)
    // Referencia de `para` preservada quando nada de fato mudou na contagem
    // - nao gera regravacao (nem re-render) a toa.
    expect(useStore.getState().para).toBe(paraRefAntes)
  })
})
