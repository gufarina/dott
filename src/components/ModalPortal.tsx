/* ModalPortal.tsx — Tira o modal de dentro dos paineis.
 *
 * POR QUE ISSO EXISTE (bug real, 02/ago/2026):
 * os shells (.panelLeft, .panelRight, .central) usam `mask-image: paint(squircle)`
 * pro canto squircle. Mascara CRIA BLOCO DE CONTENCAO — entao um filho com
 * `position: fixed; inset: 0` para de se referir a TELA e passa a se referir ao
 * PAINEL. Resultado: o modal "Processar para..." nascia presa na coluna de 280px
 * do inbox, cortado pelo overflow, e o usuario via o fundo escuro com "nada dentro".
 *
 * Portal manda o modal pro <body>, fora de qualquer mascara. Todo overlay que
 * nasce DENTRO de um shell tem que passar por aqui.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.dataset.dottPortal = ''
    document.body.appendChild(el)
    setAlvo(el)
    return () => { el.remove() }
  }, [])

  if (!alvo) return null
  return createPortal(children, alvo)
}
