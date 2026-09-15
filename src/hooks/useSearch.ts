import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useStore } from '../store'
import { TYPE_ACCENT_FIX } from '../lib/cardTypeClass'

/** TASK-566: extraido do antigo SearchModal (Ctrl+K abria um modal
 *  centralizado - o CEO reprovou: campo da titlebar era um input FALSO,
 *  so decoracao clicavel). A busca agora vive DE VERDADE na titlebar
 *  (Titlebar.tsx); este hook so monta o indice e roda o Fuse - nao
 *  conhece modal, painel suspenso nem teclado. */

export interface SearchItem {
  type: 'note' | 'folder' | 'card'
  name: string
  meta: string
  badge: string
  onPick: () => void
}

export interface SearchGroup {
  type: string
  label: string
  items: SearchItem[]
}

export const SEARCH_LABELS: Record<string, string> = { note: 'Notas', folder: 'Pastas', card: 'Inbox' }
export const SEARCH_ICONS: Record<string, string> = { note: '◆', folder: '▤', card: '·' }

/** Decide o alvo do `setView('editor', ...)` para uma Nota achada na busca.
 * Puro (sem store, sem DOM) pra poder testar a decisao isolada. Categoria e
 * pasta so entram quando os DOIS resolvem (breadcrumb/Voltar corretos); do
 * contrario abre so pelo id da Nota - NoteEditor le a Nota por `note` no
 * store e nao exige categoria/pasta pra renderizar (ver NoteEditor.tsx). */
export function editorTargetFor(category: string, folderId: string | undefined, noteId: string) {
  return category && folderId
    ? { category, folder: folderId, note: noteId }
    : { note: noteId }
}

/** Hook puro de dados: monta o indice buscavel (Pastas/Notas/Inbox), roda o
 *  Fuse (mesma config de sempre) e devolve os resultados agrupados por tipo,
 *  na ordem de relevancia. Quem chama decide onde renderizar e como navegar. */
export function useSearch(query: string) {
  const notes = useStore(st => st.notes)
  const para = useStore(st => st.para)
  const inbox = useStore(st => st.inbox)
  const setView = useStore(st => st.setView)

  const items = useMemo<SearchItem[]>(() => {
    const list: SearchItem[] = []

    const folderName = (fid?: string) => {
      for (const qid of Object.keys(para)) {
        const f = para[qid].folders.find(x => x.id === fid)
        if (f) return f.name
      }
      return ''
    }
    const categoryOf = (fid?: string) => {
      for (const qid of Object.keys(para)) {
        if (para[qid].folders.some(f => f.id === fid)) return qid
      }
      return ''
    }

    // Pastas
    for (const qid of Object.keys(para)) {
      const q = para[qid]
      for (const f of q.folders) {
        list.push({
          type: 'folder',
          name: f.name,
          meta: `${q.label} · ${f.notes} notas`,
          badge: q.label.toUpperCase(),
          onPick: () => setView('canvas', { category: qid, folder: f.id }),
        })
      }
    }
    // Notas
    for (const n of notes) {
      const cat = categoryOf(n.folderId)
      list.push({
        type: 'note',
        name: n.title,
        meta: folderName(n.folderId) || 'Nota',
        badge: 'NOTA',
        onPick: () => setView('editor', editorTargetFor(cat, n.folderId, n.id)),
      })
    }
    // Cards do inbox (sem tela propria pra abrir - so aparecem na busca)
    for (const c of inbox) {
      list.push({
        type: 'card',
        name: c.content,
        meta: `Inbox · ${c.time}`,
        badge: (TYPE_ACCENT_FIX[c.type] ?? c.type).toUpperCase(),
        onPick: () => {},
      })
    }
    return list
  }, [notes, para, inbox, setView])

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['name', 'meta', 'badge'], threshold: 0.4, ignoreLocation: true }),
    [items],
  )

  const results = useMemo(
    () => (query.trim() ? fuse.search(query, { limit: 14 }).map(r => r.item) : []),
    [query, fuse],
  )

  const groups = useMemo<SearchGroup[]>(() => {
    const map: Record<string, SearchItem[]> = {}
    results.forEach(r => { (map[r.type] ??= []).push(r) })
    return Object.entries(map).map(([type, groupItems]) => ({
      type,
      label: SEARCH_LABELS[type] || type,
      items: groupItems,
    }))
  }, [results])

  return { results, groups }
}
