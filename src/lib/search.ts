/* search.ts — Fuzzy search via Fuse.js
 *
 * Índice reconstruído sempre que a lista de notas muda (Zustand subscription).
 * Busca em título + corpo + tags. Threshold 0.35 = bom balanço precisão/recall.
 */

import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Note } from '../store'

const OPTIONS: IFuseOptions<Note> = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'tags',  weight: 0.3 },
    { name: 'body',  weight: 0.2 },
  ],
  threshold: 0.35,
  includeScore: true,
  minMatchCharLength: 2,
}

export function createIndex(notes: Note[]): Fuse<Note> {
  return new Fuse(notes, OPTIONS)
}

export function searchNotes(index: Fuse<Note>, query: string, limit = 12): Note[] {
  if (!query.trim()) return []
  return index.search(query, { limit }).map(r => r.item)
}
