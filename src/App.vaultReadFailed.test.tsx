// @vitest-environment jsdom
/** App.vaultReadFailed.test.tsx - TASK-495 item 2.
 *
 * O Rust emite `vault-read-failed` ({ count, files }) quando uma ou mais
 * notas nao puderam ser lidas do disco (arquivo travado por antivirus /
 * OneDrive / indexador) - a nota NAO foi perdida, so nao entrou na lista
 * desta vez. Ate aqui, ninguem no front escutava esse evento: emitir sem
 * ouvinte nao avisa ninguem. Este teste prova que o App ESCUTA e mostra um
 * Toast para gente, sem jargao tecnico.
 *
 * Como prova que reprova sem o conserto: antes da mudanca em App.tsx, o
 * `useEffect` de boot so registrava `listen('inbox-changed', ...)` e
 * `listen('shortcut-register-failed', ...)` - nao existia handler nenhum
 * para `vault-read-failed`, entao `capturedHandlers['vault-read-failed']`
 * ficaria `undefined` e o `expect(handler).toBeTruthy()` reprovaria antes
 * mesmo de chegar no toast.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

type EventHandler = (e: { payload: unknown }) => void
const capturedHandlers: Record<string, EventHandler> = {}

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((name: string, handler: EventHandler) => {
    capturedHandlers[name] = handler
    return Promise.resolve(() => { delete capturedHandlers[name] })
  }),
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({ onCloseRequested: vi.fn().mockResolvedValue(() => {}) })),
}))

import App from './App'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// App monta TabBar/listas com ResizeObserver e o hook de glow com
// matchMedia - jsdom nao tem nenhum dos dois. Polyfill minimo so pra render
// nao quebrar; nada disto e o que o teste verifica.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: typeof NoopResizeObserver }).ResizeObserver = NoopResizeObserver
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('App - aviso de nota ilegivel (vault-read-failed)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    for (const k of Object.keys(capturedHandlers)) delete capturedHandlers[k]
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('escuta vault-read-failed e mostra um aviso humano, sem jargao tecnico', async () => {
    act(() => { root.render(<App />) })
    // Deixa o boot (hydrate + import('@tauri-apps/api/event').then(...)) resolver.
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })

    const handler = capturedHandlers['vault-read-failed']
    expect(handler).toBeTruthy()

    act(() => { handler({ payload: { count: 1, files: ['nota-x.md'] } }) })

    const texto = container.textContent ?? ''
    expect(texto).toContain('Não consegui abrir uma nota')
    expect(texto).toContain('continua salva no seu computador')
    // Nada de jargao tecnico na cara do usuario.
    expect(texto).not.toMatch(/I\/O|vault|lock|nota-x\.md/i)
  })

  it('no plural, usa "N notas" (linguagem natural, nao so o numero)', async () => {
    act(() => { root.render(<App />) })
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })

    const handler = capturedHandlers['vault-read-failed']
    act(() => { handler({ payload: { count: 3, files: ['a.md', 'b.md', 'c.md'] } }) })

    const texto = container.textContent ?? ''
    expect(texto).toContain('3 notas')
    expect(texto).toContain('continuam salvas no seu computador')
  })
})
