/** Fonte unica da paleta de DADO (etiqueta do usuario, no da constelacao) -
 *  TASK-461. Os 8 tons de verdade vivem em `src/styles/tokens.css`
 *  (--tag-1 a --tag-8), declarados nos DOIS temas. Este arquivo so guarda os
 *  NOMES dos tokens - nunca o hex - pra nao duplicar a paleta de novo em
 *  TypeScript (era o defeito: `TAG_COLORS` em store.ts e `CORES` em
 *  Constellation.tsx eram os MESMOS 8 hex do tema ESCURO, cravados duas
 *  vezes, entao etiqueta e no de constelacao ficavam saturados tambem no
 *  tema claro).
 *
 *  Consumidor DOM (etiqueta, span, div): use `var(--tag-N)` direto no style -
 *  acompanha troca de tema sozinho, sem re-render. `tagVar(index)` devolve
 *  essa string pronta.
 *  Consumidor que precisa do VALOR resolvido (SVG fill/stroke por indice
 *  numerico ciclico onde o proprio app ja gerencia o re-render pelo estado
 *  de tema, ou canvas/konva que nao entende var()): use `resolveTagColor` -
 *  o valor fica PRESO ao tema do instante da chamada, re-chame quando o
 *  tema mudar. */
export const TAG_TOKENS = [
  '--tag-1', '--tag-2', '--tag-3', '--tag-4',
  '--tag-5', '--tag-6', '--tag-7', '--tag-8',
] as const

function tokenAt(index: number): string {
  const i = ((index % TAG_TOKENS.length) + TAG_TOKENS.length) % TAG_TOKENS.length
  return TAG_TOKENS[i]
}

/** `var(--tag-N)` pronto pra um `style` de elemento DOM. */
export function tagVar(index: number): string {
  return `var(${tokenAt(index)})`
}

/** Valor resolvido (cor real) do token no tema vigente. So pra consumidor
 *  que nao entende `var()` (canvas/konva) - re-chamar apos troca de tema. */
export function resolveTagColor(index: number): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(tokenAt(index)).trim()
  return value || 'currentColor'
}
