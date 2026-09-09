// @vitest-environment jsdom
/** store.processCard.test.ts - FASE CORRIGIR (item 1).
 *
 * processCard chamava createNote (grava .md vazio) e saveNote (grava o corpo
 * real) como dois invoke('vault_save') concorrentes pro mesmo id, sem await.
 * Se o vazio resolvesse por ultimo, a nota nascia em branco no disco e o
 * card do inbox ja tinha sido removido: dado perdido. Agora e uma unica
 * escrita, com o corpo final desde o nascimento da nota.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { invoke } from '@tauri-apps/api/core'
import { useStore } from './store'

describe('processCard (corrida createNote/saveNote eliminada)', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
    vi.mocked(invoke).mockClear()
  })

  it('a nota criada a partir de um card ja nasce com o corpo real, nao vazio', () => {
    const card = useStore.getState().inbox.find(c => c.id === 'i1')!
    const noteId = useStore.getState().processCard('i1', 'start')!

    const note = useStore.getState().notes.find(n => n.id === noteId)!
    expect(note.body).toBe(card.content)
    expect(note.body).not.toBe('')
  })

  it('so existe UMA escrita (vault_save) no disco por nota criada a partir de um card', () => {
    const card = useStore.getState().inbox.find(c => c.id === 'i2')!
    useStore.getState().processCard('i2', 'start')

    const saveCalls = vi.mocked(invoke).mock.calls.filter(c => c[0] === 'vault_save')
    expect(saveCalls).toHaveLength(1)
    expect((saveCalls[0][1] as { note: { body: string } }).note.body).toBe(card.content)
  })

  it('o card processado sai do inbox', () => {
    useStore.getState().processCard('i3', 'start')
    expect(useStore.getState().inbox.some(c => c.id === 'i3')).toBe(false)
  })
})
