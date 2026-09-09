// @vitest-environment jsdom
/** ImageViewer.dataUrl.test.ts
 *
 * MEDIDO (defeito anterior a 30/08/2026, so ficou visivel quando o handler
 * global de rejeicao entrou em src/main.tsx, mesmo commit a86a1a6 que
 * introduziu o `fetch(dataUrl)` aqui): salvar a anotacao da imagem fazia
 * `fetch()` sobre um `data:` URL. `connect-src` da CSP
 * (src-tauri/tauri.conf.json) nunca incluiu `data:` - so `img-src` inclui
 * (por isso a imagem sempre apareceu normal). O fetch era bloqueado, a
 * promise rejeitava sem handler proprio, e a anotacao nunca era salva.
 *
 * `dataUrlToFile` decodifica o base64 na mao (`atob`), sem rede nenhuma -
 * fora do alcance de qualquer CSP.
 */
import { describe, expect, it } from 'vitest'
import { dataUrlToFile } from './ImageViewer'

// 1x1 PNG transparente (base64 real, gerado por qualquer canvas.toDataURL).
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

describe('dataUrlToFile - converte data: URL em File sem rede (sem fetch)', () => {
  it('decodifica o base64 e usa o mime do PROPRIO cabecalho do data URL', () => {
    const dataUrl = `data:image/png;base64,${PNG_1X1_B64}`
    const file = dataUrlToFile(dataUrl, 'annotation.png')

    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/png')
    expect(file.name).toBe('annotation.png')
    expect(file.size).toBeGreaterThan(0)
  })

  it('le o mime real quando NAO e image/png (markerjs pode devolver outro tipo)', () => {
    // mesmos bytes, cabecalho diferente - a funcao nao pode cravar 'image/png'.
    const dataUrl = `data:image/jpeg;base64,${PNG_1X1_B64}`
    const file = dataUrlToFile(dataUrl, 'annotation.jpg')
    expect(file.type).toBe('image/jpeg')
  })

  it('lanca (nunca devolve silenciosamente algo quebrado) se o data URL nao for base64', () => {
    expect(() => dataUrlToFile('data:image/png,nao-base64', 'x.png')).toThrow()
  })
})
