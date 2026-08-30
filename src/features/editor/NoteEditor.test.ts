/** NoteEditor.test.ts — TDD (TASK-364, CEO: "nota so de imagem ganha
 * etiqueta e troca de tela sozinha, conserta junto"). Cobre so
 * `parseImageOnly`, puro, sem CodeMirror e sem store: precisa continuar
 * reconhecendo uma nota-imagem mesmo depois dela ganhar uma linha de
 * #etiquetas no fim (lib/tags.ts, addTagToBody). */
import { describe, expect, it } from 'vitest'
import { addTagToBody } from '../../lib/tags'
import { parseImageOnly } from './NoteEditor'

describe('parseImageOnly (TASK-364: nota-imagem com Etiqueta continua reconhecida)', () => {
  it('so imagem, sem etiqueta: reconhece como sempre reconheceu', () => {
    expect(parseImageOnly('![imagem](acervo/foto.png)')).toBe('acervo/foto.png')
  })

  it('imagem com UMA etiqueta no fim: continua reconhecida, url intacta', () => {
    const body = addTagToBody('![imagem](acervo/foto.png)', 'obra')
    expect(parseImageOnly(body)).toBe('acervo/foto.png')
  })

  it('imagem com VARIAS etiquetas no fim: continua reconhecida', () => {
    let body = addTagToBody('![imagem](acervo/foto.png)', 'obra')
    body = addTagToBody(body, 'cliente')
    expect(parseImageOnly(body)).toBe('acervo/foto.png')
  })

  it('etiqueta inline colada na mesma linha da imagem: nao e nota-imagem (nao ha linha dedicada)', () => {
    expect(parseImageOnly('![imagem](acervo/foto.png) #obra')).toBeNull()
  })

  it('texto de verdade alem da imagem: continua nao sendo nota-imagem', () => {
    expect(parseImageOnly('![imagem](acervo/foto.png)\n\nAlguma legenda escrita.')).toBeNull()
  })
})
