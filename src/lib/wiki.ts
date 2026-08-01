/* wiki.ts — Motor de wiki-links estilo Obsidian
 *
 * Convenções:
 *   [[Título da Nota]]        — link para nota pelo título
 *   [[Título|alias]]          — link com texto alternativo
 *   #tag                      — extrai tags do corpo
 *
 * Invariante: links são por TÍTULO, não por ID. Resolve em runtime.
 */

export interface WikiLink {
  raw: string       // texto original: "[[Título]]"
  target: string    // título alvo normalizado
  alias?: string    // alias opcional
  pos: number       // posição no texto (para highlight)
}

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g
const TAG_RE = /#([\wÀ-ž-]+)/g

/** Extrai todos os [[wiki-links]] de um corpo de texto */
export function extractLinks(body: string): WikiLink[] {
  const links: WikiLink[] = []
  let m: RegExpExecArray | null
  WIKILINK_RE.lastIndex = 0
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    links.push({
      raw: m[0],
      target: normalizeTitle(m[1]),
      alias: m[2],
      pos: m.index,
    })
  }
  return links
}

/** Extrai #tags do corpo */
export function extractTags(body: string): string[] {
  const tags: string[] = []
  let m: RegExpExecArray | null
  TAG_RE.lastIndex = 0
  while ((m = TAG_RE.exec(body)) !== null) {
    tags.push(m[1].toLowerCase())
  }
  return [...new Set(tags)]
}

/** Reconstrói o índice de backlinks a partir do conjunto completo de notas */
export function buildBacklinks(
  notes: Array<{ id: string; title: string; links: string[] }>
): Record<string, string[]> {
  const bl: Record<string, string[]> = {}
  for (const note of notes) {
    for (const target of note.links) {
      if (!bl[target]) bl[target] = []
      if (!bl[target].includes(note.id)) bl[target].push(note.id)
    }
  }
  return bl
}

/** Normaliza título para comparação de links (case-insensitive, trim) */
export function normalizeTitle(t: string): string {
  return t.trim().toLowerCase()
}

/** Dado o texto até o cursor, retorna a query de wiki-link em aberto (se houver) */
export function getOpenLinkQuery(textBeforeCursor: string): string | null {
  const idx = textBeforeCursor.lastIndexOf('[[')
  if (idx === -1) return null
  const after = textBeforeCursor.slice(idx + 2)
  // Se fechou antes do cursor, não está aberto
  if (after.includes(']]')) return null
  return after
}
