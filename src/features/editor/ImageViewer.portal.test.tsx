// @vitest-environment jsdom
/** REGRESSAO MEDIDA (31/08/2026, build 0.2.23 instalado na maquina do CEO):
 * o editor de imagem abria "sem controle nenhum" - a barra de abas
 * (Ajustar/Ajuste fino/Filtros/Marca d'agua/Desenhar/Redimensionar), o
 * desfazer/refazer, o Salvar e o fechar SUMIAM; so sobravam as dimensoes, o
 * icone de layout e o zoom, todos no MEIO da barra de cima.
 *
 * Causa raiz MEDIDA dentro do binario real (harness que monta a Nota-imagem
 * de verdade, clica em "Editar imagem" sozinho e le o DOM):
 *
 *   .central:  600x696 @300,44      <- painel do meio, App.module.css
 *   overlay:   1200x750 @0,0        <- position:fixed, tamanho certo
 *   .FIE_buttons-save-btn-button: @49,49    -> elementFromPoint = <button class="_tab_...">
 *   .FIE_tabs_navbar:             @33,98    -> elementFromPoint = <div class="_list_...">
 *   .FIE_buttons-history-btns:    @982,49   -> elementFromPoint = elemento do painel direito
 *   .FIE_topbar-center-options:   @427,49   -> DENTRO de .central, unico que sobrevivia
 *
 * O `.editorOverlay` (position: fixed; inset: 0) media a janela inteira, mas
 * `.central` tem `mask-image: paint(squircle)` (App.module.css) e MASCARA
 * RECORTA A PINTURA de toda a subarvore: tudo que caia fora da caixa de
 * .central (600px no meio da tela) simplesmente nao era pintado - z-index
 * nao alcanca, porque o corte acontece depois. So o pedaco central do editor
 * aparecia, e por acaso e exatamente onde ficam dimensoes/zoom.
 *
 * O markerjs2 (editor anterior) nunca sofreu disso porque montava a UI dele
 * ANEXADA AO <body>, fora da mascara. O Filerobot renderiza dentro do
 * container React que a gente da - entao quem tem que sair da mascara e o
 * nosso overlay, via portal pro <body>.
 *
 * Este teste falha sem o portal: sem ele o overlay nasce dentro do container
 * do componente (logo, dentro de .central no app real) e volta a ser
 * recortado. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'

vi.mock('../../lib/attachments', () => ({
  removeAttachment: vi.fn().mockResolvedValue(undefined),
  saveImageFile: vi.fn(),
  readAttachmentBlobUrl: vi.fn().mockResolvedValue('blob:mock-1'),
}))

// O editor de verdade (Konva) nao roda em jsdom; o que este teste mede e
// ONDE o overlay e montado, nao o que tem dentro dele.
vi.mock('react-filerobot-image-editor', () => ({
  default: () => <div data-testid="fie" />,
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImageViewer - o overlay do editor escapa da mascara do painel', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    ;(URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('monta o overlay como filho do <body>, nunca dentro do container do componente', async () => {
    await act(async () => {
      root.render(
        <ImageViewer noteId="n1" title="Foto" url="http://asset.localhost/a/img.png" onSave={vi.fn()} />,
      )
    })

    const btn = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Editar imagem',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(false)

    await act(async () => { btn.click() })

    const overlay = document.querySelector('[class*="editorOverlay"]')
    expect(overlay, 'o overlay do editor deveria existir apos o clique').not.toBeNull()
    // O ponto do teste: fora da subarvore do componente (fora da mascara).
    expect(container.contains(overlay!)).toBe(false)
    expect(overlay!.parentElement).toBe(document.body)

    // Fechar continua desmontando o overlay (nao pode vazar no <body>).
    await act(async () => { root.render(<div />) })
    expect(document.querySelector('[class*="editorOverlay"]')).toBeNull()
  })
})
