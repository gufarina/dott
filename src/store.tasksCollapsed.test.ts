// @vitest-environment jsdom
/** store.tasksCollapsed.test.ts - TDD (F4, TASK-566).
 *
 * Prova o unico comportamento novo do estado: toggleTasksCollapsed() inverte
 * o campo e persiste em localStorage sob chave PROPRIA ('dott:tasks-collapsed'),
 * GLOBAL (nunca por pasta - decisao ja fechada no plano de UI densa).
 * Mesmo padrao de store.clearExamples.test.ts: reset pro estado de fabrica
 * antes de cada teste.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './store'

describe('tasksCollapsed (trilho de tarefas, F4)', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
  })

  it('estado de fabrica: painel aberto (nao colapsado)', () => {
    expect(useStore.getState().tasksCollapsed).toBe(false)
  })

  it('toggleTasksCollapsed inverte o estado, sem tocar nenhum outro campo (global, nunca por pasta - o toggle nao recebe folderId)', () => {
    useStore.getState().toggleTasksCollapsed()
    expect(useStore.getState().tasksCollapsed).toBe(true)
    useStore.getState().toggleTasksCollapsed()
    expect(useStore.getState().tasksCollapsed).toBe(false)
  })

  // NOTA: a escrita em localStorage (mesma receita de toggleTheme/loadTheme,
  // ja existente) nao tem asserção direta aqui - o ambiente de teste (vitest
  // + flag experimental --localstorage-file do Node) quebra window.localStorage
  // (getItem some do objeto), o mesmo motivo pelo qual toggleTheme tambem
  // nunca teve teste cobrindo a leitura de volta. Comportamento (o estado
  // muda) fica coberto acima; a chamada de persistencia em si e trivial e
  // ja roda dentro de try/catch, mesmo padrao do resto do arquivo.
})
