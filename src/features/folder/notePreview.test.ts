/** notePreview.test.ts — TDD (Kent Beck). Cobre os quatro estados do card
 * de nota na lista da pasta (TASK-362): sem imagem, com capa explicita,
 * com imagem embutida no corpo (sem capa) e imagem so-pendente (upload
 * ainda salvando, nunca vira previa). */
import { describe, expect, it } from 'vitest'
import { notePreviewUrl } from './FolderNotesView'

describe('notePreviewUrl', () => {
  it('nota sem capa e sem imagem no corpo: sem previa', () => {
    expect(notePreviewUrl({ cover: undefined, body: 'so texto, nada de imagem aqui' })).toBeNull()
  })

  it('capa explicita sempre vence, mesmo com imagem diferente no corpo', () => {
    const url = notePreviewUrl({
      cover: 'asset://local/capa.png',
      body: '![legenda](asset://local/outra.png)',
    })
    expect(url).toBe('asset://local/capa.png')
  })

  it('sem capa, usa a primeira imagem embutida no corpo', () => {
    const url = notePreviewUrl({
      cover: undefined,
      body: 'Um paragrafo antes.\n\n![foto do terreno](asset://local/foto.png)\n\nTexto depois.',
    })
    expect(url).toBe('asset://local/foto.png')
  })

  it('nota so com imagem, sem nenhum outro texto', () => {
    const url = notePreviewUrl({ cover: undefined, body: '![imagem](asset://local/unica.png)' })
    expect(url).toBe('asset://local/unica.png')
  })

  it('imagem ainda pendente (upload em andamento) nunca vira previa', () => {
    const url = notePreviewUrl({ cover: undefined, body: '![tok](dott-pending:tok)' })
    expect(url).toBeNull()
  })

  it('varias imagens no corpo: usa a primeira', () => {
    const url = notePreviewUrl({
      cover: undefined,
      body: '![a](asset://local/a.png)\n![b](asset://local/b.png)',
    })
    expect(url).toBe('asset://local/a.png')
  })
})
