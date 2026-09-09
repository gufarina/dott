/** store.taskMigration.test.ts - TDD (TASK-374).
 *
 * O "grupo" morreu (decisao do CEO, 29/08/2026: segunda hierarquia paralela
 * a Pasta nao faz sentido). Quem ja usava o app tem `tasks.json` no formato
 * antigo (grupos com items dentro). flattenLegacyTasks/isLegacyTaskShape sao
 * funcoes PURAS: nao mexem em disco, so decidem o que fazer com o array
 * salvo. Prova a REGRA ABSOLUTA - nenhuma tarefa pode sumir na migracao,
 * nenhum campo pode mudar. */
import { describe, expect, it } from 'vitest'
import { flattenLegacyTasks, isLegacyTaskShape } from './store'

describe('flattenLegacyTasks (formato antigo -> lista achatada)', () => {
  it('achata grupos preservando id, texto, concluida, prazo, pasta e anotacao de cada tarefa', () => {
    const legacy = [
      { id: 'g1', name: 'Comece aqui', color: '#e05a38', items: [
        { id: 't1', done: false, text: 'Ler a nota de boas-vindas', folderId: 'start' },
        { id: 't2', done: true, text: 'Capturar 3 pensamentos', folderId: 'start', deadline: '2026-09-01', notes: 'anotacao real' },
      ] },
      { id: 'g2', name: 'Explorar o Dott', color: '#4a8fd9', items: [
        { id: 't4', done: false, text: 'Abrir a Constelação' },
      ] },
    ]

    const flat = flattenLegacyTasks(legacy)

    expect(flat).toHaveLength(3)
    expect(flat.map(t => t.id)).toEqual(['t1', 't2', 't4'])
    expect(flat[1]).toEqual({ id: 't2', done: true, text: 'Capturar 3 pensamentos', folderId: 'start', deadline: '2026-09-01', notes: 'anotacao real' })
    // t4 nao tinha pasta no grupo - continua sem pasta depois de achatar.
    expect(flat[2].folderId).toBeUndefined()
  })

  it('grupo vazio (items: []) simplesmente nao contribui tarefa nenhuma - nada quebra', () => {
    const legacy = [{ id: 'gX', name: 'Vazio', color: '#000', items: [] }]
    expect(flattenLegacyTasks(legacy)).toEqual([])
  })

  it('formato NOVO (ja achatado) passa direto, sem alteracao nenhuma', () => {
    const flat = [
      { id: 't1', done: false, text: 'Tarefa solta' },
      { id: 't2', done: true, text: 'Outra', folderId: 'habitos' },
    ]
    expect(flattenLegacyTasks(flat)).toEqual(flat)
  })

  it('array vazio devolve array vazio', () => {
    expect(flattenLegacyTasks([])).toEqual([])
  })
})

describe('isLegacyTaskShape (decide se precisa migrar e regravar)', () => {
  it('detecta o formato antigo (algum item tem "items")', () => {
    expect(isLegacyTaskShape([{ id: 'g1', name: 'X', color: '#000', items: [] }])).toBe(true)
  })

  it('formato novo (tarefas soltas) nao e detectado como antigo', () => {
    expect(isLegacyTaskShape([{ id: 't1', done: false, text: 'Tarefa' }])).toBe(false)
  })

  it('array vazio nao e formato antigo', () => {
    expect(isLegacyTaskShape([])).toBe(false)
  })
})
