/** SearchModal.test.tsx — TDD (Kent Beck: teste antes do codigo).
 * Cobre so a decisao pura de `editorTargetFor` (TASK-333 item 2: clicar numa
 * Nota sem folderId/categoria resolvivel no Ctrl+K fechava o modal e nao
 * fazia nada, em silencio). Sem store, sem DOM. */
import { describe, expect, it } from 'vitest'
import { editorTargetFor } from './SearchModal'

describe('editorTargetFor (Ctrl+K -> abrir Nota)', () => {
  it('categoria e pasta resolvidas: navega com os tres campos (Voltar funciona)', () => {
    expect(editorTargetFor('projects', 'aurora', 'n1')).toEqual({
      category: 'projects', folder: 'aurora', note: 'n1',
    })
  })

  it('sem folderId: ainda assim abre a Nota, so pelo id', () => {
    expect(editorTargetFor('projects', undefined, 'n1')).toEqual({ note: 'n1' })
  })

  it('sem categoria resolvivel (folderId orfao): ainda assim abre a Nota, so pelo id', () => {
    expect(editorTargetFor('', 'aurora', 'n1')).toEqual({ note: 'n1' })
  })

  it('sem os dois: abre a Nota, so pelo id - nunca clique em silencio', () => {
    expect(editorTargetFor('', undefined, 'n1')).toEqual({ note: 'n1' })
  })
})
