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

/** Uma linha feita so de #etiquetas (nada mais) — o lugar onde a UI escreve. */
const TAG_LINE_RE = /^(?:#[\wÀ-ž-]+\s*)+$/

/** Escreve uma #etiqueta no CORPO (TASK-360: fonte unica de verdade, nunca
 *  metadado por fora). Se o corpo ja termina numa linha so de etiquetas,
 *  entra nela; senao abre uma linha nova no fim. Nunca toca o resto do texto
 *  que o usuario escreveu — no-friction tambem vale pra Etiqueta. */
export function addTagToBody(body: string, rawTag: string): string {
  const tag = rawTag.trim().replace(/^#/, '').toLowerCase()
  if (!tag || extractTags(body).includes(tag)) return body
  const trimmed = body.replace(/\s+$/, '')
  const lastLine = trimmed.slice(trimmed.lastIndexOf('\n') + 1)
  if (TAG_LINE_RE.test(lastLine)) return `${trimmed} #${tag}`
  return trimmed ? `${trimmed}\n\n#${tag}` : `#${tag}`
}

/** Apaga uma #etiqueta do CORPO, onde quer que ela esteja escrita (linha
 *  dedicada ou no meio da prosa). Fecha o buraco que sobra sem deixar
 *  espaco duplo nem linha em branco extra. */
export function removeTagFromBody(body: string, rawTag: string): string {
  const tag = rawTag.trim().replace(/^#/, '').toLowerCase()
  if (!tag) return body
  const re = new RegExp(`#${tag}\\b`, 'gi')
  return body
    .replace(re, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n')
    .replace(/\s+$/, '')
}

/** Uniao de duas listas de etiquetas sem duplicar (TASK-364: corpo + campo
 *  separado do frontmatter). As duas entradas ja chegam em minusculo. */
export function mergeTags(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])]
}

/** Tira a linha dedicada de #etiquetas do fim do corpo, se houver (TASK-364:
 *  reconhecer "nota so de imagem" mesmo com Etiqueta - o reconhecimento
 *  precisa ver so a imagem, sem a linha que addTagToBody escreveu). */
export function withoutTrailingTagLine(body: string): string {
  const trimmed = body.replace(/\s+$/, '')
  const lastLine = trimmed.slice(trimmed.lastIndexOf('\n') + 1)
  if (!TAG_LINE_RE.test(lastLine)) return body
  return trimmed.slice(0, trimmed.length - lastLine.length).replace(/\s+$/, '')
}

/** Recoloca no corpo NOVO as etiquetas que o corpo VELHO tinha (TASK-364:
 *  reanotar uma nota-imagem troca o corpo inteiro pela imagem nova - sem
 *  isto, qualquer #etiqueta que estivesse no corpo desaparecia junto). */
export function reattachTags(oldBody: string, newBody: string): string {
  return extractTags(oldBody).reduce((body, tag) => addTagToBody(body, tag), newBody)
}
