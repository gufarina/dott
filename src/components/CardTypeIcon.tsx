/* CardTypeIcon.tsx — Icone do TIPO do card capturado.
 *
 * Substitui as strings de SVG cruas que eram injetadas com
 * dangerouslySetInnerHTML no InboxPanel e no Widget (dois lugares, dois
 * desenhos diferentes, nenhum tipado). Agora e um componente so, no mesmo
 * estilo do resto: grade 16, traco 1.5, ponto cheio como assinatura.
 *
 * Cada desenho mostra O QUE O CARD E — nada de forma abstrata.
 */

import type { CardType } from '../store'

const P: Record<CardType, React.ReactElement> = {
  // Folha escrita
  NOTA: <><path d="M3.6 2.4h5.6l3.2 3.2v8a.8.8 0 0 1-.8.8h-8a.8.8 0 0 1-.8-.8z"/><path d="M9.2 2.4v3.2h3.2"/><path d="M5.6 9h4.4M5.6 11.4h3"/></>,
  // Chaves de codigo
  CODIGO: <><path d="M5.8 4.6L2.4 8l3.4 3.4M10.2 4.6L13.6 8l-3.4 3.4"/></>,
  // Terminal: prompt e cursor
  SHELL: <><rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6"/><path d="M4.6 6.6l1.8 1.6-1.8 1.6"/><path d="M8.4 10.4h3"/></>,
  // Corrente: endereco na web
  URL: <><path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1"/><path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1"/></>,
  LINK: <><path d="M6.6 9.4a2.6 2.6 0 0 0 3.9.3l2-2a2.6 2.6 0 0 0-3.7-3.7l-1.1 1.1"/><path d="M9.4 6.6a2.6 2.6 0 0 0-3.9-.3l-2 2a2.6 2.6 0 0 0 3.7 3.7l1.1-1.1"/></>,
  // Faisca: pensamento solto
  IDEIA: <><path d="M8 1.8l1.5 4.7 4.7 1.5-4.7 1.5L8 14.2l-1.5-4.7L1.8 8l4.7-1.5z" fill="currentColor" stroke="none"/></>,
  // Onda sonora
  AUDIO: <><path d="M2.4 8h1.4M6 4.4v7.2M9.2 2.6v10.8M12.4 5.6v4.8M14.6 7.2v1.6"/></>,
  // Quadro com o play
  VIDEO: <><rect x="1.8" y="3" width="12.4" height="10" rx="1.8"/><path d="M6.6 6.2l3.6 1.8-3.6 1.8z" fill="currentColor" stroke="none"/></>,
  // Moldura com sol e horizonte
  IMAGEM: <><rect x="2.2" y="3.4" width="11.6" height="9.2" rx="1.6"/><circle cx="5.6" cy="6.6" r="1" fill="currentColor" stroke="none"/><path d="M2.8 11.2l3-2.8 2 1.9 2.6-2.6 2.8 2.8"/></>,
  // Arquivo generico
  ARQUIVO: <><path d="M4 1.8h4.8L12 5v9.2a.8.8 0 0 1-.8.8H4a.8.8 0 0 1-.8-.8V2.6a.8.8 0 0 1 .8-.8z"/><path d="M8.8 1.8V5H12"/></>,
  // Balao de instrucao com a faisca: texto pra um modelo
  PROMPT: <><path d="M2.2 4.4a1.6 1.6 0 0 1 1.6-1.6h8.4a1.6 1.6 0 0 1 1.6 1.6v5a1.6 1.6 0 0 1-1.6 1.6H6.4l-3 2.6v-2.6h-.6a.6.6 0 0 1-.6-.6z"/><circle cx="8" cy="6.9" r="1.3" fill="currentColor" stroke="none"/></>,
  // Caixa marcada
  TAREFA: <><rect x="2.4" y="2.4" width="11.2" height="11.2" rx="2.4"/><path d="M5.2 8.2l1.9 1.9 3.7-3.9"/></>,
  // Pessoa
  CONTATO: <><circle cx="8" cy="5.6" r="2.6"/><path d="M3 13.6c0-2.7 2.3-4.4 5-4.4s5 1.7 5 4.4"/></>,
}

export function CardTypeIcon({ type, size = 11 }: { type: CardType; size?: number }) {
  const shape = P[type] ?? P.NOTA
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  )
}
