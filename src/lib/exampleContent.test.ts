/** exampleContent.test.ts - TDD (TASK-367, atualizado TASK-374).
 *
 * planExampleCleanup e uma funcao PURA: nao mexe em disco nem em estado, so
 * decide o que ainda e exemplo. Cobre a REGRA ABSOLUTA (nunca apagar o que a
 * pessoa escreveu) e a preservacao de exemplo editado.
 *
 * TASK-374: o "grupo" morreu - SEED_TASKS e planExampleCleanup agora operam
 * numa lista unica e achatada de tarefas (TaskItem[]), sem wrapper nenhum.
 */
import { describe, expect, it } from 'vitest'
import { INITIAL_INBOX, INITIAL_PARA, SEED_TASKS, planExampleCleanup } from './exampleContent'
import { SEED_NOTES } from './seedNotes'
import type { Note } from '../store'

function withLegacy(notes: Note[]): Note[] {
  return notes.map(n => ({ ...n, legacyTags: [] }))
}

describe('planExampleCleanup - estado intocado (recem instalado)', () => {
  const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)

  it('marca as 5 notas de exemplo inteiras pra sair', () => {
    expect(plan.noteIds.sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
  })

  it('marca as 6 tarefas do tutorial pra sair (3 com pasta, 3 sem pasta)', () => {
    expect(plan.taskIds.sort()).toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
  })

  it('marca os 4 itens do inbox de exemplo', () => {
    expect(plan.inboxIds.sort()).toEqual(['i1', 'i2', 'i3', 'i4'])
  })

  it('marca as pastas de exemplo - vazias, sem capa, sem nota nem tarefa viva sobrando', () => {
    const ids = plan.folders.map(f => f.folderId).sort()
    expect(ids).toEqual(['concluidos', 'habitos', 'leituras', 'modelos', 'primeiro', 'saude', 'start'])
  })
})

describe('planExampleCleanup - nota escrita pela pessoa nunca entra no plano', () => {
  it('nota criada pelo usuario (id fora do seed) fica de fora', () => {
    const notes = [...withLegacy(SEED_NOTES), {
      id: 'n' + 'abc123def456', title: 'Minha nota real', date: '01/01', updatedAt: '01/01',
      folderId: 'primeiro', img: false, body: 'Coisa que eu escrevi.', tags: [],
    } as Note]
    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.noteIds).not.toContain('nabc123def456')
    expect(plan.noteIds.sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
  })
})

describe('planExampleCleanup - exemplo EDITADO pela pessoa e preservado', () => {
  it('nota de exemplo com o corpo alterado sai do plano', () => {
    const notes = withLegacy(SEED_NOTES).map(n =>
      n.id === 'n1' ? { ...n, body: n.body + '\n\nAdicionei minha proria anotacao aqui.' } : n
    )
    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.noteIds).not.toContain('n1')
    expect(plan.noteIds.sort()).toEqual(['n2', 'n3', 'n4', 'n5'])
  })

  it('nota de exemplo com o titulo alterado sai do plano', () => {
    const notes = withLegacy(SEED_NOTES).map(n => (n.id === 'n2' ? { ...n, title: 'Meu proprio titulo' } : n))
    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.noteIds).not.toContain('n2')
  })

  it('tarefa do tutorial com o texto alterado sai do plano, as outras continuam', () => {
    const tasks = SEED_TASKS.map(t => (t.id === 't1' ? { ...t, text: 'Minha propria tarefa' } : t))
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.taskIds).not.toContain('t1')
    expect(plan.taskIds.sort()).toEqual(['t2', 't3', 't4', 't5', 't6'])
  })

  it('tarefa do tutorial com prazo definido pela pessoa sai do plano mesmo com o texto igual', () => {
    const tasks = SEED_TASKS.map(t => (t.id === 't2' ? { ...t, deadline: '2026-12-31' } : t))
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.taskIds).not.toContain('t2')
  })

  it('tarefa nova da pessoa (id fora do seed) nao e removida, so as tarefas de exemplo saem', () => {
    const tasks = [...SEED_TASKS, { id: 'tXYZ', done: false, text: 'Coisa minha' }]
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.taskIds).not.toContain('tXYZ')
    expect(plan.taskIds).toEqual(expect.arrayContaining(['t1', 't2', 't3']))
  })
})

describe('planExampleCleanup - coerencia: pasta com conteudo vivo nunca vira fantasma', () => {
  it('pasta de exemplo com uma nota real dentro NAO entra no plano', () => {
    const notes = [...withLegacy(SEED_NOTES), {
      id: 'nRealUser01', title: 'Minha nota', date: '01/01', updatedAt: '01/01',
      folderId: 'start', img: false, body: 'Texto meu.', tags: [],
    } as Note]
    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.folders.map(f => f.folderId)).not.toContain('start')
  })

  it('pasta de exemplo com capa definida pela pessoa NAO entra no plano', () => {
    const para = {
      ...INITIAL_PARA,
      resources: {
        ...INITIAL_PARA.resources,
        folders: INITIAL_PARA.resources.folders.map(f => (f.id === 'modelos' ? { ...f, cover: 'asset://minha-capa.png' } : f)),
      },
    }
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), para, SEED_TASKS, INITIAL_INBOX)
    expect(plan.folders.map(f => f.folderId)).not.toContain('modelos')
  })

  it('pasta de exemplo com tarefa editada (preservada) dentro NAO entra no plano', () => {
    const tasks = SEED_TASKS.map(t => (t.id === 't1' ? { ...t, text: 'Editei essa' } : t))
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    // t1 preservado ainda aponta pra folderId 'start' - a pasta tem que sobreviver.
    expect(plan.folders.map(f => f.folderId)).not.toContain('start')
  })
})
