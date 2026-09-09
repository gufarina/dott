/** imageLine.test.ts — TDD (Kent Beck). Regex pura que decide se uma linha
 * do markdown e um "bloco de imagem" (a linha inteira, nada mais) e separa
 * legenda/url — sem CodeMirror, sem DOM. */
import { describe, expect, it } from 'vitest'
import { PENDING_PREFIX, matchImageLine, pendingImageMarkdown } from './imageLine'

describe('matchImageLine', () => {
  it('casa uma linha que e so a imagem', () => {
    const hit = matchImageLine('![imagem](asset://local/foo.png)')
    expect(hit).toEqual({ alt: 'imagem', url: 'asset://local/foo.png', pending: false })
  })

  it('legenda vira o alt (mostrada embaixo da imagem)', () => {
    const hit = matchImageLine('![Tela de aprovação, versão 2](asset://x.png)')
    expect(hit?.alt).toBe('Tela de aprovação, versão 2')
  })

  it('nao casa linha com texto ANTES ou DEPOIS da imagem', () => {
    expect(matchImageLine('veja: ![x](y.png)')).toBeNull()
    expect(matchImageLine('![x](y.png) legenda solta')).toBeNull()
  })

  it('nao casa paragrafo comum', () => {
    expect(matchImageLine('so um paragrafo normal')).toBeNull()
  })

  it('reconhece o marcador de pendente (upload em andamento)', () => {
    const md = pendingImageMarkdown('tok123')
    const hit = matchImageLine(md)
    expect(hit).toEqual({ alt: 'tok123', url: `${PENDING_PREFIX}tok123`, pending: true })
  })
})
