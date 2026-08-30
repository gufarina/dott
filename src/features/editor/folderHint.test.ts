/** folderHint.test.ts — TDD (Kent Beck: teste antes do codigo).
 * Cobre so a regra de histerese (nao-piscar) e o corte de "ja esta la",
 * puro, sem CodeMirror e sem DOM. */
import { describe, expect, it } from 'vitest'
import { applyFolderHint, INITIAL_HINT_STATE, pickFolderCandidate } from './folderHint'
import type { FolderSuggestion } from '../../lib/interpret'
import type { Note, Quadrant } from '../../store'

function sug(folderId: string, score = 5): FolderSuggestion {
  return { categoryId: 'projects', folderId, folderName: folderId, categoryLabel: 'Projetos', score, reason: 'teste' }
}

describe('applyFolderHint (regra de nao-piscar)', () => {
  it('nada mostrado + candidato valido: aparece na hora (primeira vez nao espera 2 rodadas)', () => {
    const next = applyFolderHint(INITIAL_HINT_STATE, sug('aurora'))
    expect(next.shown?.folderId).toBe('aurora')
  })

  it('nada mostrado + sem candidato: continua nada', () => {
    const next = applyFolderHint(INITIAL_HINT_STATE, null)
    expect(next.shown).toBeNull()
  })

  it('mesma pasta de novo: mantem, sem mexer em desafiante', () => {
    const s1 = applyFolderHint(INITIAL_HINT_STATE, sug('aurora'))
    const s2 = applyFolderHint(s1, sug('aurora', 9))
    expect(s2.shown?.folderId).toBe('aurora')
    expect(s2.challengerStreak).toBe(0)
  })

  it('candidato diferente UMA vez nao troca (nao pisca no primeiro empate)', () => {
    const s1 = applyFolderHint(INITIAL_HINT_STATE, sug('aurora'))
    const s2 = applyFolderHint(s1, sug('viagem'))
    expect(s2.shown?.folderId).toBe('aurora')
    expect(s2.challengerId).toBe('viagem')
    expect(s2.challengerStreak).toBe(1)
  })

  it('candidato diferente DUAS vezes seguidas troca', () => {
    let s = applyFolderHint(INITIAL_HINT_STATE, sug('aurora'))
    s = applyFolderHint(s, sug('viagem'))
    s = applyFolderHint(s, sug('viagem'))
    expect(s.shown?.folderId).toBe('viagem')
    expect(s.challengerStreak).toBe(0)
  })

  it('desafiante troca de identidade: streak reinicia (nao soma desafiantes diferentes)', () => {
    let s = applyFolderHint(INITIAL_HINT_STATE, sug('aurora'))
    s = applyFolderHint(s, sug('viagem'))   // desafiante A, streak 1
    s = applyFolderHint(s, sug('financas')) // desafiante B, streak reinicia pra 1
    expect(s.shown?.folderId).toBe('aurora')
    expect(s.challengerId).toBe('financas')
    expect(s.challengerStreak).toBe(1)
  })

  it('rodada sem candidato nao apaga o que ja estava mostrado (sem flicker)', () => {
    const s1 = applyFolderHint(INITIAL_HINT_STATE, sug('aurora'))
    const s2 = applyFolderHint(s1, null)
    expect(s2.shown?.folderId).toBe('aurora')
    expect(s2.challengerStreak).toBe(0)
  })
})

describe('pickFolderCandidate (recorte pra nota-contra-pasta)', () => {
  const para: Record<string, Quadrant> = {
    projects: {
      id: 'projects', label: 'Projetos', color: 'red', suggestions: [],
      folders: [
        { id: 'aurora', name: 'Cliente Aurora', bg: '', notes: 0, tasks: 0, total: 0, stagnant: false },
      ],
    },
  }
  const outrasNotas: Note[] = [
    { id: 'n1', title: 'Kickoff Aurora', date: '', updatedAt: '', folderId: 'aurora', img: false, body: 'prazo e reuniao com a aurora', tags: [] },
  ]
  const notaAtual: Note = { id: 'atual', title: '', date: '', updatedAt: '', img: false, body: '', tags: [] }

  it('acha pasta quando o texto bate com o conteudo de uma pasta existente', () => {
    const cand = pickFolderCandidate('Reunião com a Aurora', 'Fechamos o prazo da reunião com a Aurora', notaAtual, para, outrasNotas)
    expect(cand?.folderId).toBe('aurora')
  })

  it('nao sugere a propria pasta onde a nota ja esta', () => {
    const jaNaPasta: Note = { ...notaAtual, folderId: 'aurora' }
    const cand = pickFolderCandidate('Reunião com a Aurora', 'Fechamos o prazo da reunião com a Aurora', jaNaPasta, para, outrasNotas)
    expect(cand).toBeNull()
  })

  it('texto vazio nunca sugere nada', () => {
    const cand = pickFolderCandidate('', '', notaAtual, para, outrasNotas)
    expect(cand).toBeNull()
  })

  it('nunca inclui a propria nota como evidencia (senao ela combinaria consigo mesma)', () => {
    const cand = pickFolderCandidate('Nota qualquer', 'texto sem relacao nenhuma com nada', notaAtual, para, [])
    expect(cand).toBeNull()
  })
})
