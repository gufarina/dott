import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { useStore } from '../store'
import { Icon } from './Icon'
import { TYPE_ACCENT_FIX } from '../lib/cardTypeClass'
import { useScrollEdgeFade } from '../hooks/useScrollEdgeFade'
import s from './SearchModal.module.css'

interface Props { open: boolean; onClose: () => void }

interface SearchItem {
  type: 'note' | 'folder' | 'card'
  name: string
  meta: string
  badge: string
  onPick: () => void
}

const LABELS: Record<string, string> = { note: 'Notas', folder: 'Pastas', card: 'Inbox' }
const ICONS: Record<string, string> = { note: '◆', folder: '▤', card: '·' }

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

export function SearchModal({ open, onClose }: Props) {
  const notes = useStore(st => st.notes)
  const para = useStore(st => st.para)
  const inbox = useStore(st => st.inbox)
  const setView = useStore(st => st.setView)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
    // Cards do inbox
    for (const c of inbox) {
      list.push({
        type: 'card',
        name: c.content,
        meta: `Inbox · ${c.time}`,
        badge: (TYPE_ACCENT_FIX[c.type] ?? c.type).toUpperCase(),
        onPick: () => onClose(),
      })
    }
    return list
  }, [notes, para, inbox, setView, onClose])

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['name', 'meta', 'badge'], threshold: 0.4, ignoreLocation: true }),
    [items],
  )

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (open && e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  /** Fade de rolagem na base (TASK-349). `query`/`items` bastam pra remedir -
   *  e o que muda quantos resultados a busca renderiza. */
  const resultsRef = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(resultsRef, [query, items])

  if (!open) return null

  const results = query.trim() ? fuse.search(query, { limit: 14 }).map(r => r.item) : []
  const groups: Record<string, SearchItem[]> = {}
  results.forEach(r => { if (!groups[r.type]) groups[r.type] = []; groups[r.type].push(r) })

  const pick = (it: SearchItem) => { it.onPick(); onClose() }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.inputRow}>
          <span className={s.searchIcon}><Icon name="busca" size={15} /></span>
          <input
            ref={inputRef}
            className={s.input}
            placeholder="Buscar notas, pastas, cards..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className={s.kbd}>ESC</span>
        </div>
        <div ref={resultsRef} className={`${s.results} scrollFadeBottom`}>
          {!query.trim() && <div className={s.empty}>Digite para buscar...</div>}
          {query.trim() && !results.length && <div className={s.empty}>Nada encontrado.</div>}
          {Object.entries(groups).map(([type, list]) => (
            <div key={type}>
              <div className={s.groupLabel}>{LABELS[type] || type}</div>
              {list.map((r, i) => (
                <div key={i} className={s.result} onClick={() => pick(r)}>
                  <div className={s.icon}>{ICONS[r.type]}</div>
                  <div className={s.info}>
                    <div className={s.name}>{r.name}</div>
                    <div className={s.meta}>{r.meta}</div>
                  </div>
                  <span className={s.badge}>{r.badge}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
