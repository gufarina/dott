/* tags.ts - Etiquetas e normalizacao de titulo.
 *
 * O que ligava notas a mao ([[wiki-links]]) foi removido do Dott: quem liga
 * agora e o motor em lib/graphify.ts, sozinho. Aqui sobrou so o que o usuario
 * escreve de proposito: a #etiqueta.
 */

const TAG_RE = /#([\wÀ-ž-]+)/g

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

/** Normaliza título para comparação (case-insensitive, trim) */
export function normalizeTitle(t: string): string {
  return t.trim().toLowerCase()
}
