// @vitest-environment jsdom
// Diagnostico 2: depois de anotar a imagem (save1), o corpo em memoria do
// NoteEditor (bodyRef, fonte do fallback de readLiveBody) fica sem
// atualizar - qualquer acao seguinte na MESMA nota-imagem (editar titulo,
// add/remover etiqueta) grava de volta o corpo VELHO por cima da anotacao
// nova, sem passar por note-switch nenhum.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore, type Note } from '../../store'
import { NoteEditor } from './NoteEditor'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type ImgProps = { onSave: (id: string, title: string, body: string) => void }
let capturedImg: ImgProps[] = []

vi.mock('./ImageViewer', () => ({
  ImageViewer: (props: ImgProps) => {
    capturedImg.push(props)
    return null
  },
}))

const IMAGE_NOTE: Note = {
  id: 'n1', title: 'Print da tela', date: '', updatedAt: '', img: true,
  folderId: 'start', tags: ['trabalho'], body: '![imagem](vault://velha.png)\n\n#trabalho',
}

describe('NoteEditor - corpo da nota-imagem apos anotar (sem trocar de nota)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    capturedImg = []
    useStore.setState({ note: 'n1', notes: [IMAGE_NOTE] })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('adicionar etiqueta depois de anotar NAO reverte a imagem pra versao velha', () => {
    const saveNote = vi.fn(async (id: string, t: string, body: string) => {
      // saveNote real atualiza o `notes` do store - simula isso aqui.
      useStore.setState(s => ({
        notes: s.notes.map(n => n.id === id ? { ...n, title: t, body } : n),
      }))
    })
    useStore.setState({ saveNote })

    act(() => { root.render(<NoteEditor />) })

    // 1) usuario anota a imagem - vira imagem NOVA.
    const { onSave } = capturedImg[capturedImg.length - 1]
    act(() => { onSave('n1', 'Print da tela', '![imagem](vault://nova.png)') })
    expect(saveNote.mock.calls[0][2]).toContain('vault://nova.png')

    // 2) sem trocar de nota, usuario remove a etiqueta existente pela UI
    // (clique no X do chip - mesmo caminho de applyTagChange do "+").
    const rmBtn = container.querySelector('[class*="tagRm"]') as HTMLSpanElement
    act(() => { rmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) })

    expect(saveNote).toHaveBeenCalledTimes(2)
    const corpoSegundoSave = saveNote.mock.calls[1][2]
    expect(corpoSegundoSave).toContain('vault://nova.png')
    expect(corpoSegundoSave).not.toContain('vault://velha.png')
  })
})
