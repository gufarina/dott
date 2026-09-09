// @vitest-environment jsdom
/** store.attachmentOrfao.test.ts - FASE CORRIGIR (itens 3 e 4).
 *
 * deleteNote e setNoteCover apagavam do disco a imagem antiga sem checar se
 * a mesma url ainda era usada por OUTRA nota (ou pelo corpo da propria nota,
 * no caso da capa) - podia apagar um anexo vivo. Agora so apaga quando
 * nenhuma nota mais referencia a url.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { invoke } from '@tauri-apps/api/core'
import { useStore } from './store'

const IMG = 'asset://imagem-compartilhada.png'

describe('attachment orfao - deleteNote nao apaga imagem que outra nota ainda usa', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
    vi.mocked(invoke).mockClear()
  })

  it('apagar a nota A mantem a imagem no disco enquanto a nota B ainda a usa no corpo', () => {
    const idA = useStore.getState().createNote('start', 'Nota A', `![img](${IMG})`)
    const idB = useStore.getState().createNote('start', 'Nota B', `![img](${IMG})`)
    vi.mocked(invoke).mockClear()

    useStore.getState().deleteNote(idA)

    const removeCalls = vi.mocked(invoke).mock.calls.filter(c => c[0] === 'attachment_remove')
    expect(removeCalls).toHaveLength(0)
    const ids = useStore.getState().notes.map(n => n.id)
    expect(ids).not.toContain(idA)
    expect(ids).toContain(idB)
  })

  it('apagar a ultima nota que usa a imagem apaga o anexo do disco', () => {
    const idA = useStore.getState().createNote('start', 'Nota A', `![img](${IMG})`)
    vi.mocked(invoke).mockClear()

    useStore.getState().deleteNote(idA)

    const removeCalls = vi.mocked(invoke).mock.calls.filter(c => c[0] === 'attachment_remove')
    expect(removeCalls).toHaveLength(1)
  })
})

describe('attachment orfao - setNoteCover nao apaga a capa antiga se o corpo da propria nota ainda a usa', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true)
    vi.mocked(invoke).mockClear()
  })

  it('trocar a capa mantem a imagem antiga no disco quando ela ainda aparece no corpo', () => {
    const id = useStore.getState().createNote('start', 'Nota com imagem no corpo', `![img](${IMG})`)
    useStore.getState().setNoteCover(id, IMG)
    vi.mocked(invoke).mockClear()

    useStore.getState().setNoteCover(id, 'asset://outra-capa.png')

    const removeCalls = vi.mocked(invoke).mock.calls.filter(c => c[0] === 'attachment_remove')
    expect(removeCalls).toHaveLength(0)
  })

  it('trocar a capa apaga a antiga quando ela nao esta mais em uso em lugar nenhum', () => {
    const id = useStore.getState().createNote('start', 'Nota sem imagem no corpo', 'Corpo sem imagem.')
    useStore.getState().setNoteCover(id, IMG)
    vi.mocked(invoke).mockClear()

    useStore.getState().setNoteCover(id, 'asset://outra-capa.png')

    const removeCalls = vi.mocked(invoke).mock.calls.filter(c => c[0] === 'attachment_remove')
    expect(removeCalls).toHaveLength(1)
  })
})
