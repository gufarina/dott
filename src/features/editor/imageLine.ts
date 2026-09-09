/** imageLine.ts — reconhece uma linha de markdown que E uma imagem (a
 * linha inteira, nada de texto antes ou depois): `![legenda](url)`.
 *
 * Pura de proposito (sem CodeMirror, sem DOM) pra imageBlocks.ts poder
 * confiar nela sem precisar de um EditorView pra testar. O arquivo em
 * disco continua sendo so isto — markdown legivel por qualquer editor;
 * o widget em imageBlocks.ts e so a CAMADA VISUAL por cima, nunca um
 * formato proprio (mesma regra do liveMarkup.ts). */

/** Prefixo de URL que marca "upload ainda salvando no disco" — nunca
 *  persistido por muito tempo (vira a URL real assim que o anexo grava),
 *  mas continua sendo texto markdown comum se alguem abrir o .md puro. */
export const PENDING_PREFIX = 'dott-pending:'

export interface ImageLineHit {
  alt: string
  url: string
  pending: boolean
}

const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/

export function matchImageLine(lineText: string): ImageLineHit | null {
  const m = IMAGE_LINE_RE.exec(lineText.trim())
  if (!m) return null
  const [, alt, url] = m
  return { alt, url, pending: url.startsWith(PENDING_PREFIX) }
}

/** Markdown temporario pra um upload em andamento — token unico pra achar
 *  e substituir a linha certa quando o `saveImageFile` terminar. */
export function pendingImageMarkdown(token: string): string {
  return `![${token}](${PENDING_PREFIX}${token})`
}
