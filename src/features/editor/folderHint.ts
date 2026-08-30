/** folderHint.ts — modulo profundo: interface estreita (aplicar uma leitura
 * nova, pegar um candidato do texto ao vivo), a regra de nao-piscar por
 * dentro. Nao inventa motor nenhum: reusa `suggestFolder` de
 * `lib/interpret.ts`, a MESMA logica que ja sugere pasta no Inbox
 * (InboxPanel.tsx) — nota-contra-pasta e card-contra-pasta sao a mesma
 * pergunta, respondida uma vez so.
 *
 * As quatro regras de comportamento (da proposta CANVAS, TASK-325/326):
 *   1. Nunca rouba o cursor — isto e so dado; quem desenha o chip decide.
 *   2. So recalcula depois do silencio — quem chama decide QUANDO (800ms,
 *      a mesma janela do autosave); este modulo so decide O QUE fazer com
 *      cada leitura nova.
 *   3. Nao pisca — `applyFolderHint`: so troca de pasta mostrada se o novo
 *      candidato vencer duas rodadas seguidas, nunca no primeiro sinal.
 *   4. Diz por que, em portugues — o `reason` de FolderSuggestion ja e
 *      isso (nenhuma palavra tecnica, nenhum numero), so exibido como veio.
 */
import { suggestFolder, type FolderSuggestion } from '../../lib/interpret'
import type { Note, Quadrant } from '../../store'

export interface FolderHintState {
  /** A sugestao que a UI mostra agora (ou null: nenhum chip). */
  shown: FolderSuggestion | null
  /** Pasta diferente da mostrada que esta tentando assumir. */
  challengerId: string | null
  /** Quantas rodadas seguidas o desafiante venceu. */
  challengerStreak: number
}

export const INITIAL_HINT_STATE: FolderHintState = { shown: null, challengerId: null, challengerStreak: 0 }

/** Le o texto AO VIVO e devolve a melhor pasta candidata, ou null.
 *  Nunca sugere a pasta onde a nota ja esta (ai nao ha o que mover), e
 *  nunca usa a propria nota como evidencia contra si mesma. */
export function pickFolderCandidate(
  title: string,
  body: string,
  currentNote: Note,
  para: Record<string, Quadrant>,
  notes: Note[],
): FolderSuggestion | null {
  const content = `${title}\n${body}`
  if (!content.trim()) return null
  const outras = notes.filter(n => n.id !== currentNote.id)
  const candidato = suggestFolder(content, 'NOTA', para, outras)
  if (!candidato) return null
  if (candidato.folderId === currentNote.folderId) return null
  return candidato
}

/** Aplica uma leitura nova do motor ao estado do chip. Regra de histerese:
 *  primeira aparicao e imediata (nada estava mostrado, nada pra "piscar");
 *  troca de pasta ja mostrada exige o mesmo desafiante vencer 2 rodadas
 *  seguidas. Rodada sem candidato nao apaga o que ja estava no ar. */
export function applyFolderHint(state: FolderHintState, candidate: FolderSuggestion | null): FolderHintState {
  if (!state.shown) {
    return candidate ? { shown: candidate, challengerId: null, challengerStreak: 0 } : state
  }
  if (!candidate || candidate.folderId === state.shown.folderId) {
    return { shown: candidate ?? state.shown, challengerId: null, challengerStreak: 0 }
  }
  if (state.challengerId === candidate.folderId) {
    const streak = state.challengerStreak + 1
    if (streak >= 2) return { shown: candidate, challengerId: null, challengerStreak: 0 }
    return { ...state, challengerStreak: streak }
  }
  return { ...state, challengerId: candidate.folderId, challengerStreak: 1 }
}

/** Notas silenciadas nesta sessao ("Agora nao") — memoria SO de UI, nunca
 *  vai pro disco (estado derivado). Modulo (nao React) pra sobreviver a
 *  NoteEditor desmontar/remontar ao trocar de tela dentro do mesmo app aberto. */
const dismissedThisSession = new Set<string>()

export function dismissFolderHint(noteId: string): void {
  dismissedThisSession.add(noteId)
}

export function isFolderHintDismissed(noteId: string): boolean {
  return dismissedThisSession.has(noteId)
}
