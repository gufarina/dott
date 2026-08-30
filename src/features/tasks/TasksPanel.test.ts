/** TasksPanel.test.ts — TDD (Kent Beck: teste antes do codigo).
 * TASK-373: prova, com dado, que o filtro sem prazo mostra tarefas ABERTAS
 * no estado padrao do app - por isso "A Fazer" e o rotulo honesto, "Tudo"
 * era mentira. TASK-374: prova que agruparPorPasta organiza por Pasta (a
 * unica hierarquia que sobrou depois do "grupo" morrer) e que tarefa sem
 * Pasta cai sempre no balde "Sem pasta". Cobre so as decisoes puras
 * extraidas de TasksPanel.tsx, sem store, sem DOM (mesmo padrao de
 * SearchModal.test.tsx). */
import { describe, expect, it } from 'vitest'
import { visibleTasks, contarAbertas, contarAbertasComPrazo, agruparPorPasta } from './TasksPanel'
import type { Quadrant, TaskItem } from '../../store'

const tarefa = (over: Partial<TaskItem>): TaskItem => ({
  id: over.id ?? 't', done: false, text: 'tarefa', ...over,
})

const lista: TaskItem[] = [
  tarefa({ id: 't1', done: false, deadline: '2026-09-01' }),
  tarefa({ id: 't2', done: false }),
  tarefa({ id: 't3', done: true, deadline: '2026-08-01' }),
  tarefa({ id: 't4', done: true }),
]

describe('visibleTasks (aba PRAZO / A Fazer)', () => {
  it('estado padrao do app (showCompleted=false): a aba sem prazo mostra SO as abertas - prova que "Tudo" mentia e "A Fazer" e o nome certo', () => {
    const out = visibleTasks(lista, false, false)
    expect(out.map(t => t.id)).toEqual(['t1', 't2'])
  })

  it('com "Ver concluidas" ligado, a aba sem prazo mostra literalmente tudo (abertas e concluidas)', () => {
    const out = visibleTasks(lista, false, true)
    expect(out.map(t => t.id)).toEqual(['t1', 't2', 't3', 't4'])
  })

  it('aba PRAZO: so as abertas que tem prazo marcado', () => {
    const out = visibleTasks(lista, true, false)
    expect(out.map(t => t.id)).toEqual(['t1'])
  })

  it('aba PRAZO + Ver concluidas: qualquer tarefa (aberta ou nao) com prazo', () => {
    const out = visibleTasks(lista, true, true)
    expect(out.map(t => t.id)).toEqual(['t1', 't3'])
  })
})

describe('contadores das abas (mesma forma do INBOX/TAGS)', () => {
  it('contarAbertas conta so as nao concluidas, de todos os grupos', () => {
    expect(contarAbertas(lista)).toBe(2)
  })

  it('contarAbertasComPrazo conta so as abertas que tem prazo', () => {
    expect(contarAbertasComPrazo(lista)).toBe(1)
  })

  it('lista vazia: os dois contadores dao zero', () => {
    expect(contarAbertas([])).toBe(0)
    expect(contarAbertasComPrazo([])).toBe(0)
  })
})

const para: Record<string, Quadrant> = {
  areas: {
    id: 'areas', label: 'Áreas', color: '#4a8fd9', suggestions: [],
    folders: [{ id: 'habitos', name: 'Hábitos', bg: '#000', notes: 0, tasks: 0, total: 0, stagnant: false }],
  },
  projects: {
    id: 'projects', label: 'Projetos', color: '#e05a38', suggestions: [],
    folders: [{ id: 'start', name: 'Comece aqui', bg: '#000', notes: 0, tasks: 0, total: 0, stagnant: false }],
  },
}

describe('agruparPorPasta (TASK-374: Pasta e a UNICA hierarquia, "grupo" morreu)', () => {
  it('cada tarefa cai na secao da sua Pasta, com o nome e a cor da Pasta (nunca um nome escolhido a mao)', () => {
    const tasks: TaskItem[] = [
      tarefa({ id: 't1', folderId: 'habitos' }),
      tarefa({ id: 't2', folderId: 'start' }),
      tarefa({ id: 't3', folderId: 'habitos' }),
    ]
    const secoes = agruparPorPasta(tasks, para)
    const habitos = secoes.find(sec => sec.chave === 'habitos')!
    expect(habitos.nome).toBe('Hábitos')
    expect(habitos.cor).toBe('#4a8fd9')
    expect(habitos.items.map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('tarefa SEM pasta cai no balde automatico "Sem pasta" - nunca um grupo com nome escolhido a mao', () => {
    const tasks: TaskItem[] = [tarefa({ id: 't1', folderId: 'habitos' }), tarefa({ id: 't2' })]
    const secoes = agruparPorPasta(tasks, para)
    const semPasta = secoes.find(sec => sec.chave === 'sem-pasta')!
    expect(semPasta.nome).toBe('Sem pasta')
    expect(semPasta.folderId).toBeUndefined()
    expect(semPasta.items.map(t => t.id)).toEqual(['t2'])
  })

  it('o balde "Sem pasta" existe mesmo quando NENHUMA tarefa esta sem pasta - e o lugar sempre disponivel pra capturar uma tarefa nova sem contexto', () => {
    const tasks: TaskItem[] = [tarefa({ id: 't1', folderId: 'habitos' })]
    const secoes = agruparPorPasta(tasks, para)
    expect(secoes.find(sec => sec.chave === 'sem-pasta')).toBeDefined()
  })

  it('Pasta sem NENHUMA tarefa nao aparece como secao - so Pastas com tarefa viva ganham secao', () => {
    const tasks: TaskItem[] = [tarefa({ id: 't1', folderId: 'habitos' })]
    const secoes = agruparPorPasta(tasks, para)
    expect(secoes.find(sec => sec.chave === 'start')).toBeUndefined()
  })

  it('bug morto (TASK-374): tarefa criada sem pasta (ex.: vinda do Inbox) NUNCA e misturada numa secao de Pasta - antes caia no primeiro "grupo" que existisse, mesmo sem relacao nenhuma', () => {
    // Cenario exato do bug antigo: ja existem tarefas em 'habitos' quando a
    // tarefa do Inbox (sem folderId) e criada.
    const tasks: TaskItem[] = [tarefa({ id: 't1', folderId: 'habitos' }), tarefa({ id: 'tInbox' })]
    const secoes = agruparPorPasta(tasks, para)
    const habitos = secoes.find(sec => sec.chave === 'habitos')!
    expect(habitos.items.map(t => t.id)).not.toContain('tInbox')
    const semPasta = secoes.find(sec => sec.chave === 'sem-pasta')!
    expect(semPasta.items.map(t => t.id)).toContain('tInbox')
  })
})
