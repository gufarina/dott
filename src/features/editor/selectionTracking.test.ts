/** selectionTracking.test.ts — TDD. So a matematica de posicionamento (onde
 * a barra flutuante fica em cima da selecao, sem sair da tela) — pura, sem
 * CodeMirror e sem DOM real. */
import { describe, expect, it } from 'vitest'
import { toolbarPosition } from './selectionTracking'

describe('toolbarPosition', () => {
  it('fica centralizada acima da selecao, com respiro', () => {
    const start = { top: 200, left: 100, right: 100, bottom: 216 }
    const end = { top: 200, left: 180, right: 180, bottom: 216 }
    const pos = toolbarPosition(start, end, 96, 34, 1200)
    expect(pos.top).toBe(200 - 34 - 8)
    expect(pos.left).toBe((100 + 180) / 2 - 96 / 2)
  })

  it('nunca deixa a barra sair pela esquerda da tela', () => {
    const start = { top: 50, left: 0, right: 0, bottom: 66 }
    const end = { top: 50, left: 4, right: 4, bottom: 66 }
    const pos = toolbarPosition(start, end, 96, 34, 1200)
    expect(pos.left).toBeGreaterThanOrEqual(8)
  })

  it('nunca deixa a barra sair pela direita da tela', () => {
    const start = { top: 50, left: 1190, right: 1190, bottom: 66 }
    const end = { top: 50, left: 1198, right: 1198, bottom: 66 }
    const pos = toolbarPosition(start, end, 96, 34, 1200)
    expect(pos.left).toBeLessThanOrEqual(1200 - 96 - 8)
  })

  it('usa o topo mais alto quando a selecao cobre mais de uma linha', () => {
    const start = { top: 300, left: 40, right: 40, bottom: 316 }
    const end = { top: 340, left: 60, right: 60, bottom: 356 }
    const pos = toolbarPosition(start, end, 96, 34, 1200)
    expect(pos.top).toBe(300 - 34 - 8)
  })
})
