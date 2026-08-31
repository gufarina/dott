// @vitest-environment jsdom
/** REGRESSAO REAL (30/08/2026, build 0.2.21): o botao "Editar imagem" nao
 * fazia NADA no app publicado - sem erro visivel, sem toast, editor nunca
 * abria. Causa raiz MEDIDA rodando o app de verdade (Vite dev + Playwright,
 * console do navegador): `react-filerobot-image-editor@5.0.1` tem 3
 * arquivos no `lib/` publicado que usam `React.createElement` SEM
 * `import React from 'react'` (HistoryButtons.js, Tabs/TabsNavbar/index.js,
 * Tabs/TabsResponsive.js) - `ReferenceError: React is not defined` na
 * primeira montagem, sem boundary nenhuma pra pegar. Consertado por patch
 * via patch-package (patches/react-filerobot-image-editor+5.0.1.patch).
 *
 * Este teste NAO cobre a causa raiz em si (o defeito mora dentro do pacote,
 * e Konva nao roda em jsdom sem o pacote nativo `canvas` - ver nota no
 * relatorio da TASK-407) - cobre a BLINDAGEM que devia existir desde o
 * inicio e faltava: se o editor (por QUALQUER motivo - este bug, um chunk
 * corrompido, uma falha pontual de rede no import dinamico) explodir ao
 * montar, o clique NUNCA mais falha mudo. O mock abaixo reproduz o exato
 * sintoma (um componente que lanca no primeiro render) sem depender do
 * pacote real. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'
import * as Toast from '../../components/Toast'

vi.mock('../../lib/attachments', () => ({
  removeAttachment: vi.fn().mockResolvedValue(undefined),
  saveImageFile: vi.fn(),
  readAttachmentBlobUrl: vi.fn().mockResolvedValue('blob:mock-1'),
}))

vi.mock('react-filerobot-image-editor', () => ({
  default: () => {
    throw new Error('ReferenceError: React is not defined (simulado)')
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImageViewer - o editor explodindo ao montar nunca falha mudo', () => {
  let container: HTMLDivElement
  let root: Root
  let unhandled: unknown[]
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    unhandled = []
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    window.addEventListener('unhandledrejection', capture)
    // React tambem loga o proprio boilerplate de erro - so espiamos, sem silenciar.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  const capture = (e: PromiseRejectionEvent) => { unhandled.push(e.reason) }

  afterEach(() => {
    window.removeEventListener('unhandledrejection', capture)
    consoleErrorSpy.mockRestore()
    act(() => root.unmount())
    container.remove()
  })

  it('mostra o toast de erro, loga com marca propria e fecha a tela - o app continua de pe', async () => {
    const toastSpy = vi.spyOn(Toast, 'showToast')

    act(() => {
      root.render(<ImageViewer noteId="n1" title="Print" url="vault://velha.png" onSave={vi.fn()} />)
    })
    await act(async () => { await Promise.resolve() }) // blob chega

    const btn = container.querySelector('button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    act(() => { btn.click() })
    await act(async () => { await Promise.resolve() }) // Suspense/lazy resolve e explode

    // O ImageViewer inteiro (botao, imagem) continua vivo - so o editor
    // que quebrou desaparece. Nao e o app inteiro indo pra FailScreen.
    expect(container.querySelector('button')).toBeTruthy()
    expect(container.querySelector('[class*="editorOverlay"]')).toBeNull()

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ImageViewer] falha ao abrir o editor', expect.any(Error))
    expect(toastSpy).toHaveBeenCalledWith('warn', 'Erro', 'Não foi possível abrir o editor de imagem.')

    // De verdade nao escapou como rejeicao nao tratada pro handler global.
    await new Promise((r) => setTimeout(r, 0))
    expect(unhandled).toHaveLength(0)
  })
})
