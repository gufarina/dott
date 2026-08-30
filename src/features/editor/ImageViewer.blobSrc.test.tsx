// @vitest-environment jsdom
/** Prova que o ImageViewer troca a origem do <img> alvo para um `blob:`
 * (mesma origem do app) assim que os bytes do anexo chegam do lado nativo -
 * ANTES de qualquer uso pelo markerjs2. MEDIDO (30/08/2026,
 * node_modules/markerjs2/../src/core/Renderer.ts): o markerjs2 desenha esse
 * mesmo <img> num <canvas> (ctx.drawImage) e depois chama canvas.toDataURL()
 * pra gerar a anotacao. Origem cruzada (http://asset.localhost, diferente da
 * origem do app) sem CORS deixa o canvas "tainted" e toDataURL() lanca
 * SecurityError - dentro de img.onload, fora da cadeia de Promise, entao o
 * render nem chega a rejeitar: so trava mudo, e nenhum try/catch no ouvinte
 * de 'render' alcanca isso.
 *
 * jsdom nao tem <canvas> 2D real nem o modelo de "tainted canvas" do
 * navegador, entao este teste NAO reproduz o SecurityError em si - prova a
 * MITIGACAO: o <img> que o markerjs2 vai usar deixa de apontar pra URL
 * cross-origin assim que o blob chega, e o blob anterior e liberado ao
 * trocar de imagem/desmontar (sem isso vazaria memoria a cada abertura). */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'

let resolveRead: ((v: string | null) => void) | null = null

vi.mock('../../lib/attachments', () => ({
  saveImageFile: vi.fn(),
  readAttachmentBlobUrl: vi.fn(
    () => new Promise<string | null>((resolve) => { resolveRead = resolve })
  ),
}))

vi.mock('markerjs2', () => ({
  MarkerArea: class {
    settings = {}
    uiStyleSettings = {}
    addEventListener() {}
    show() {}
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImageViewer - troca a origem do <img> por blob: antes do markerjs usar', () => {
  let container: HTMLDivElement
  let root: Root
  let revokeSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resolveRead = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // jsdom nao implementa URL.revokeObjectURL - stub so pra medir a chamada.
    revokeSpy = vi.fn()
    ;(URL as unknown as { revokeObjectURL: typeof revokeSpy }).revokeObjectURL = revokeSpy
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('mostra a url original ate o blob chegar, depois troca pro blob e revoga ao trocar de nota', async () => {
    const ORIGINAL = 'http://asset.localhost/attachments/img1.png'

    act(() => {
      root.render(<ImageViewer noteId="n1" title="Foto" url={ORIGINAL} onSave={vi.fn()} />)
    })

    const img = container.querySelector('img') as HTMLImageElement
    // Sem flash em branco: mostra a url original enquanto o anexo carrega.
    expect(img.src).toBe(ORIGINAL)

    await act(async () => {
      resolveRead!('blob:mock-1')
    })

    expect(img.src).toBe('blob:mock-1')
    expect(revokeSpy).not.toHaveBeenCalled()

    // Troca de nota (outra imagem): o blob da imagem anterior tem que sumir.
    act(() => {
      root.render(
        <ImageViewer
          noteId="n2"
          title="Outra foto"
          url="http://asset.localhost/attachments/img2.png"
          onSave={vi.fn()}
        />
      )
    })

    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1')
  })
})
