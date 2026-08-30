// @vitest-environment jsdom
/** Prova que uma falha DENTRO do listener de 'render' (conversao do data:
 * URL) mostra o toast ESPECIFICO desta acao ("Nao foi possivel salvar a
 * anotacao") e NUNCA vira rejeicao solta - o listener e `async`, sem
 * try/catch isso cairia no handler global generico (src/main.tsx,
 * unhandledrejection). `saveImageFile` fica mockado resolvendo com
 * sucesso: se o codigo chegasse la, `onSave` teria sido chamado - o
 * teste prova que a falha de CONVERSAO barra o fluxo ANTES disso. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'
import * as Toast from '../../components/Toast'

vi.mock('../../lib/attachments', () => ({
  saveImageFile: vi.fn().mockResolvedValue('vault://seria-a-nova.png'),
}))

type RenderHandler = (event: { dataUrl: string }) => void | Promise<void>
let renderHandler: RenderHandler | null = null

vi.mock('markerjs2', () => ({
  MarkerArea: class {
    settings = {}
    uiStyleSettings = {}
    addEventListener(name: string, handler: RenderHandler) {
      if (name === 'render') renderHandler = handler
    }
    show() {}
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImageViewer - falha na conversao do data: URL nunca vira rejeicao solta', () => {
  let container: HTMLDivElement
  let root: Root
  let unhandled: unknown[]

  beforeEach(() => {
    renderHandler = null
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

  it('data: URL sem base64 barra ANTES de chegar no saveImageFile, mostra o toast especifico', async () => {
    const toastSpy = vi.spyOn(Toast, 'showToast')
    const onSave = vi.fn()

    act(() => {
      root.render(<ImageViewer noteId="n1" title="Print" url="vault://velha.png" onSave={onSave} />)
    })

    const btn = container.querySelector('button') as HTMLButtonElement
    act(() => { btn.click() })

    expect(renderHandler).toBeTruthy()
    // dataUrl sem ";base64," - dataUrlToFile rejeita explicitamente.
    await act(async () => {
      await renderHandler!({ dataUrl: 'data:image/png,nao-base64' })
    })

    // Nunca chegou no saveImageFile (mockado pra "sucesso") - onSave prova isso.
    expect(onSave).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('warn', 'Erro', 'Não foi possível salvar a anotação.')
    // De verdade nao escapou como rejeicao nao tratada pro handler global.
    await new Promise(r => setTimeout(r, 0))
    expect(unhandled).toHaveLength(0)
  })
})
