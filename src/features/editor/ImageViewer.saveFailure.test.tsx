// @vitest-environment jsdom
/** Prova que uma falha DENTRO de `onSave` (conversao do data: URL que o
 * editor devolve) mostra o toast ESPECIFICO desta acao ("Nao foi possivel
 * salvar a anotacao"), NUNCA vira rejeicao solta, e MANTEM o editor aberto
 * (o usuario pode tentar salvar de novo - so fecha no caminho de sucesso,
 * ver ImageViewer.closesAfterSave.test.tsx). `saveImageFile` fica mockado
 * resolvendo com sucesso: se o codigo chegasse la, `onSave` (prop do
 * componente) teria sido chamado - o teste prova que a falha de CONVERSAO
 * barra o fluxo ANTES disso.
 *
 * `react-filerobot-image-editor` e mockado (carregado via `React.lazy` no
 * componente): o mock captura o `onSave` que o ImageViewer passa pra
 * biblioteca e devolve um marcador simples no DOM, sem precisar montar o
 * editor de verdade (Konva nao roda em jsdom). */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'
import { removeAttachment } from '../../lib/attachments'
import * as Toast from '../../components/Toast'

vi.mock('../../lib/attachments', () => ({
  removeAttachment: vi.fn().mockResolvedValue(undefined),
  saveImageFile: vi.fn().mockResolvedValue('vault://seria-a-nova.png'),
  // Resolve com um blob valido - o botao "Editar imagem" so fica habilitado
  // com o blob pronto (mesma trava de origem cruzada do teste blobSrc).
  readAttachmentBlobUrl: vi.fn().mockResolvedValue('blob:mock-1'),
}))

type FilerobotOnSave = (savedImageData: { imageBase64?: string }) => void | Promise<void>
let capturedOnSave: FilerobotOnSave | null = null

vi.mock('react-filerobot-image-editor', () => ({
  default: (props: { onSave: FilerobotOnSave }) => {
    capturedOnSave = props.onSave
    return <div data-testid="filerobot-mock" />
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImageViewer - falha na conversao do data: URL nunca vira rejeicao solta', () => {
  let container: HTMLDivElement
  let root: Root
  let unhandled: unknown[]

  beforeEach(() => {
    capturedOnSave = null
    unhandled = []
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    window.addEventListener('unhandledrejection', capture)
  })

  const capture = (e: PromiseRejectionEvent) => { unhandled.push(e.reason) }

  afterEach(() => {
    window.removeEventListener('unhandledrejection', capture)
    act(() => root.unmount())
    container.remove()
  })

  it('data: URL sem base64 barra ANTES de chegar no saveImageFile, mostra o toast especifico e mantem o editor aberto', async () => {
    const toastSpy = vi.spyOn(Toast, 'showToast')
    const onSave = vi.fn()

    act(() => {
      root.render(<ImageViewer noteId="n1" title="Print" url="vault://velha.png" onSave={onSave} />)
    })

    // Espera o blob (async) antes de abrir - o botao so habilita com ele.
    await act(async () => { await Promise.resolve() })

    const btn = container.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    act(() => { btn.click() })

    // Suspense + lazy: o mock do editor entra async, espera resolver.
    await act(async () => { await Promise.resolve() })

    expect(capturedOnSave).toBeTruthy()
    // imageBase64 sem ";base64," - dataUrlToFile rejeita explicitamente.
    await act(async () => {
      await capturedOnSave!({ imageBase64: 'data:image/png,nao-base64' })
    })

    // Nunca chegou no saveImageFile (mockado pra "sucesso") - onSave prova isso.
    expect(onSave).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('warn', 'Erro', 'Não foi possível salvar a anotação.')
    // O editor continua montado - o usuario pode tentar salvar de novo.
    expect(document.querySelector('[data-testid="filerobot-mock"]')).toBeTruthy()
    // E a imagem ORIGINAL continua no vault: a faxina do arquivo velho so
    // acontece depois que a nota ja aponta pra imagem nova. Apagar aqui
    // seria perder a imagem do usuario num salvamento que nem aconteceu.
    expect(removeAttachment).not.toHaveBeenCalled()
    // De verdade nao escapou como rejeicao nao tratada pro handler global.
    await new Promise(r => setTimeout(r, 0))
    expect(unhandled).toHaveLength(0)
  })
})
