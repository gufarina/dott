/** tags.test.ts — TDD (Kent Beck: teste antes do codigo).
 * TASK-360: a #etiqueta escrita pela UI passa a viver no CORPO da nota (fonte
 * unica de verdade). Cobre so as funcoes puras que escrevem/apagam a marcacao
 * no texto, sem CodeMirror e sem store. */
import { describe, expect, it } from 'vitest'
import { addTagToBody, extractTags, mergeTags, reattachTags, removeTagFromBody, withoutTrailingTagLine } from './tags'

describe('addTagToBody', () => {
  it('corpo sem etiqueta nenhuma: abre uma linha nova no fim com a #etiqueta', () => {
    const out = addTagToBody('Ideia qualquer sobre o produto.', 'urgente')
    expect(out).toBe('Ideia qualquer sobre o produto.\n\n#urgente')
    expect(extractTags(out)).toEqual(['urgente'])
  })

  it('corpo vazio (nota nova): o corpo vira so a #etiqueta', () => {
    expect(addTagToBody('', 'raiz')).toBe('#raiz')
  })

  it('ja existe uma linha so de etiquetas no fim: junta na mesma linha', () => {
    const out = addTagToBody('Texto.\n\n#primeira', 'segunda')
    expect(out).toBe('Texto.\n\n#primeira #segunda')
    expect(extractTags(out)).toEqual(['primeira', 'segunda'])
  })

  it('etiqueta repetida (mesmo caso ou nao) nao duplica', () => {
    const out = addTagToBody('Texto #urgente no meio.', 'URGENTE')
    expect(out).toBe('Texto #urgente no meio.')
    expect(extractTags(out)).toEqual(['urgente'])
  })

  it('aceita # digitado junto no campo sem duplicar o simbolo', () => {
    expect(addTagToBody('Texto.', '#foco')).toBe('Texto.\n\n#foco')
  })

  it('nao mexe no resto do corpo do usuario', () => {
    const body = '# Titulo\n\nPrimeiro paragrafo.\n\nSegundo paragrafo com #existente.'
    const out = addTagToBody(body, 'novo')
    expect(out.startsWith('# Titulo\n\nPrimeiro paragrafo.\n\nSegundo paragrafo com #existente.')).toBe(true)
    expect(extractTags(out)).toEqual(expect.arrayContaining(['existente', 'novo']))
  })
})

describe('removeTagFromBody', () => {
  it('etiqueta sozinha numa linha de etiquetas: some a linha e a nota volta ao texto puro', () => {
    const body = addTagToBody('Nota qualquer.', 'unica')
    expect(removeTagFromBody(body, 'unica')).toBe('Nota qualquer.')
  })

  it('uma entre varias na mesma linha: so ela sai, a linha continua', () => {
    const body = 'Texto.\n\n#primeira #segunda'
    expect(removeTagFromBody(body, 'primeira')).toBe('Texto.\n\n#segunda')
  })

  it('etiqueta escrita no meio da prosa: sai so a marcacao, a frase continua legivel', () => {
    const body = 'Comprar #urgente cimento amanha.'
    const out = removeTagFromBody(body, 'urgente')
    expect(out).toBe('Comprar cimento amanha.')
    expect(extractTags(out)).toEqual([])
  })

  it('etiqueta que nao existe no corpo: corpo sai igual', () => {
    expect(removeTagFromBody('Texto sem nada.', 'fantasma')).toBe('Texto sem nada.')
  })

  it('ida e volta (adicionar e remover) devolve o corpo original', () => {
    const original = 'Reuniao de amanha às 10h.'
    const withTag = addTagToBody(original, 'trabalho')
    expect(removeTagFromBody(withTag, 'trabalho')).toBe(original)
  })
})

describe('mergeTags (TASK-364: corpo + campo separado)', () => {
  it('junta as duas listas sem duplicar', () => {
    expect(mergeTags(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('lista antiga vazia: sobra so o que o corpo tem', () => {
    expect(mergeTags(['a'], [])).toEqual(['a'])
  })
})

describe('withoutTrailingTagLine (TASK-364: nota-imagem com Etiqueta continua reconhecida)', () => {
  it('tira a linha dedicada de etiquetas do fim', () => {
    const withTag = addTagToBody('![imagem](a.png)', 'ideia')
    expect(withoutTrailingTagLine(withTag)).toBe('![imagem](a.png)')
  })

  it('sem linha de etiquetas: corpo sai igual', () => {
    expect(withoutTrailingTagLine('![imagem](a.png)')).toBe('![imagem](a.png)')
  })

  it('etiqueta escrita inline (nao numa linha dedicada): nao mexe', () => {
    const body = 'Comprar #urgente cimento.'
    expect(withoutTrailingTagLine(body)).toBe(body)
  })
})

describe('reattachTags (TASK-364: nota-imagem reanotada nao perde etiqueta)', () => {
  it('etiqueta do corpo velho volta pro corpo novo', () => {
    const oldBody = addTagToBody('![imagem](a.png)', 'ideia')
    const out = reattachTags(oldBody, '![imagem](b.png)')
    expect(extractTags(out)).toEqual(['ideia'])
    expect(out).toContain('![imagem](b.png)')
  })

  it('corpo velho sem etiqueta: corpo novo sai intacto', () => {
    expect(reattachTags('![imagem](a.png)', '![imagem](b.png)')).toBe('![imagem](b.png)')
  })
})
