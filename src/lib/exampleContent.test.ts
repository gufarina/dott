/** exampleContent.test.ts - TDD (TASK-367, atualizado TASK-374, e de novo
 * no DEFEITO 2 de 30/08/2026 - CEO ja reclamou 3x que "limpar exemplos" nao
 * limpa nada).
 *
 * planExampleCleanup e uma funcao PURA: nao mexe em disco nem em estado, so
 * decide o que ainda e exemplo.
 *
 * MANDATO do CEO (30/08/2026, DERRUBA a regra anterior): limpar exemplo e
 * IDENTIDADE (o id de seed), nunca igualdade de conteudo. Nota/tarefa/card
 * de exemplo sai mesmo que tenha sido lida, aberta ou editada. A UNICA
 * protecao que sobra e para o OUTRO lado: conteudo do usuario (id que nao e
 * de seed) nunca e apagado, e pasta de exemplo com algo do usuario dentro
 * sobrevive com esse algo dentro.
 *
 * A causa raiz da regra antiga nunca funcionar: o corpo que volta do disco
 * passa por `vault_save`/`vault_load` (src-tauri/src/vault.rs) -
 * `serialize_note` grava `format!("...{}\n", body)` (um "\n" extra no fim) e
 * `parse_note` so tira quebra de linha do INICIO do corpo
 * (`trim_start_matches('\n')`), nunca do fim - entao `n.body === seed.body`
 * nunca mais batia depois do primeiro save. `roundTripPeloVault` abaixo
 * espelha ESSE MESMO formato real (frontmatter + a mesma transformacao de
 * serialize/parse), pra nao repetir o erro da rodada anterior: testar contra
 * um objeto montado a mao na memoria dava verde num app quebrado.
 */
import { describe, expect, it } from 'vitest'
import { INITIAL_INBOX, INITIAL_PARA, SEED_TASKS, planExampleCleanup } from './exampleContent'
import { SEED_NOTES } from './seedNotes'
import type { Note } from '../store'

function withLegacy(notes: Note[]): Note[] {
  return notes.map(n => ({ ...n, legacyTags: [] }))
}

/** Espelha src-tauri/src/vault.rs (serialize_note + parse_note): escreve a
 *  nota no MESMO formato de arquivo real (frontmatter YAML + corpo) e le de
 *  volta pelo MESMO algoritmo de parse (so tira quebra de linha do INICIO do
 *  corpo, nunca do fim) - reproduz o "\n" extra que a rodada anterior nao
 *  cobriu e que fazia a igualdade de conteudo nunca bater. */
function roundTripPeloVault(n: Note): Note {
  const yaml = `title: ${n.title}\ntags:\n${(n.tags ?? []).map(t => `- ${t}`).join('\n')}\n`
  const raw = `---\n${yaml}---\n\n${n.body}\n`
  const rest = raw.slice(4) // tira o "---\n" inicial (strip_prefix)
  const end = rest.indexOf('\n---')
  const body = rest.slice(end + 4).replace(/^\n+/, '') // trim_start_matches('\n')
  return { ...n, body }
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

describe('planExampleCleanup - MANDATO 30/08/2026: exemplo EDITADO sai igual (identidade, nao conteudo)', () => {
  it('nota de exemplo com o corpo alterado AINDA sai do plano (id de seed manda)', () => {
    const notes = withLegacy(SEED_NOTES).map(n =>
      n.id === 'n1' ? { ...n, body: n.body + '\n\nAdicionei minha propria anotacao aqui.' } : n
    )
    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.noteIds).toContain('n1')
    expect(plan.noteIds.sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
  })

  it('nota de exemplo com o titulo alterado AINDA sai do plano', () => {
    const notes = withLegacy(SEED_NOTES).map(n => (n.id === 'n2' ? { ...n, title: 'Meu proprio titulo' } : n))
    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.noteIds).toContain('n2')
  })

  it('tarefa do tutorial com o texto alterado AINDA sai do plano', () => {
    const tasks = SEED_TASKS.map(t => (t.id === 't1' ? { ...t, text: 'Minha propria tarefa' } : t))
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.taskIds.sort()).toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
  })

  it('tarefa do tutorial com prazo definido pela pessoa AINDA sai do plano (id de seed manda)', () => {
    const tasks = SEED_TASKS.map(t => (t.id === 't2' ? { ...t, deadline: '2026-12-31' } : t))
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.taskIds).toContain('t2')
  })

  it('tarefa nova da pessoa (id fora do seed) nao e removida, so as tarefas de exemplo saem', () => {
    const tasks = [...SEED_TASKS, { id: 'tXYZ', done: false, text: 'Coisa minha' }]
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.taskIds).not.toContain('tXYZ')
    expect(plan.taskIds).toEqual(expect.arrayContaining(['t1', 't2', 't3']))
  })

  it('REGRESSAO (causa raiz medida): nota de exemplo que passou por um ciclo salvar+carregar do vault (formato REAL de disco, corpo com "\\n" extra) continua reconhecida - a rodada anterior so testava objeto de memoria e dava verde num app quebrado', () => {
    const notes = withLegacy(SEED_NOTES).map(roundTripPeloVault)
    // Prova que o round-trip realmente introduz a divergencia que quebrava
    // a regra antiga (`n.body === seed.body`) - senao o teste nao provaria nada.
    const n1 = notes.find(n => n.id === 'n1')!
    const seed1 = SEED_NOTES.find(n => n.id === 'n1')!
    expect(n1.body).not.toBe(seed1.body)
    expect(n1.body).toBe(seed1.body + '\n')

    const plan = planExampleCleanup(notes, INITIAL_PARA, SEED_TASKS, INITIAL_INBOX)
    expect(plan.noteIds.sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
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

  it('pasta de exemplo com tarefa de seed EDITADA dentro AINDA entra no plano (a tarefa sai junto, id manda)', () => {
    const tasks = SEED_TASKS.map(t => (t.id === 't1' ? { ...t, text: 'Editei essa' } : t))
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    // t1 tem id de seed - sai igual (mandato 30/08/2026), entao a pasta
    // 'start' nao tem mais nada vivo dentro e tambem sai.
    expect(plan.taskIds).toContain('t1')
    expect(plan.folders.map(f => f.folderId)).toContain('start')
  })

  it('pasta de exemplo com tarefa NOVA da pessoa dentro NAO entra no plano', () => {
    const tasks = [...SEED_TASKS, { id: 'tMeuId01', done: false, text: 'Minha tarefa', folderId: 'start' }]
    const plan = planExampleCleanup(withLegacy(SEED_NOTES), INITIAL_PARA, tasks, INITIAL_INBOX)
    expect(plan.folders.map(f => f.folderId)).not.toContain('start')
  })
})
