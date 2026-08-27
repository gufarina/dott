/* Modal.tsx — vocabulario UNICO de modal do app (TASK-297).
 *
 * Antes existiam DOIS jeitos de perguntar uma coisa curta ao usuario: o
 * modal "Virar tarefa" (feio, com um icone de checkbox flutuando dentro do
 * input) e a barra inline "Nova tarefa"/"Nova pasta" dentro da pasta
 * (espremida, botao +, botao x). Agora os dois passam por aqui.
 *
 * Atomo -> molecula -> organismo (Brad Frost): ModalButton e ModalInput sao
 * atomos; ModalField e a molecula (label + controle); Modal e o organismo
 * (overlay + card + header + corpo + rodape). Sempre via ModalPortal —
 * nasce dentro de um shell com mask-image e position:fixed se referiria ao
 * shell, nao a tela (ver o comentario em ModalPortal.tsx).
 */

import { forwardRef, useEffect } from 'react'
import { ModalPortal } from './ModalPortal'
import { Icon } from './Icon'
import s from './Modal.module.css'

export function Modal({
  title,
  onClose,
  children,
  width = 420,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  // Escape fecha de qualquer lugar do modal — antes cada tela reimplementava
  // isso no onKeyDown do proprio input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <ModalPortal>
      <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div className={s.card} style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
          <div className={s.header}>
            <span className={s.title}>{title}</span>
            <button className={s.close} onClick={onClose} title="Fechar" aria-label="Fechar">
              <Icon name="fechar" size={13} />
            </button>
          </div>
          <div className={s.body}>{children}</div>
        </div>
      </div>
    </ModalPortal>
  )
}

export function ModalHint({ children }: { children: React.ReactNode }) {
  return <p className={s.hint}>{children}</p>
}

export function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

export const ModalInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function ModalInput(props, ref) {
    return <input ref={ref} className={s.input} {...props} />
  }
)

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className={s.footer}>{children}</div>
}

export function ModalButton({
  variant = 'ghost',
  className,
  ...props
}: { variant?: 'primary' | 'ghost' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `${s.btn} ${variant === 'primary' ? s.primary : s.ghost} ${className ?? ''}`
  return <button className={cls} {...props} />
}
