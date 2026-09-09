import { forwardRef } from 'react'
import s from './Field.module.css'

/* Campos canonicos do Dott (TASK-461): Input, Textarea, Select.

   Mesmo contrato do Button: `variante="bare"` (padrao) nao pinta nada e existe
   pra que campo com geometria propria passe pelo componente canonico sem mudar
   de aparencia; `variante="campo"` veste a pele oficial (a receita que estava
   presa dentro do Modal).

   O ganho que nao e visual: acessibilidade. Um campo sem rotulo associado e
   invisivel pra leitor de tela, e a auditoria achou campo assim no app. Aqui,
   passar `rotulo` resolve - vira `aria-label` quando nao existe <label> visivel. */

type Variante = 'campo' | 'bare'

function classes(variante: Variante, className: string | undefined, extra = '') {
  return [variante === 'bare' ? s.bare : s.base, extra, className ?? ''].filter(Boolean).join(' ')
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variante?: Variante
  /** Vira aria-label quando nao ha <label> visivel ligado ao campo. */
  rotulo?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variante = 'bare', rotulo, className, ...props },
  ref
) {
  return <input ref={ref} className={classes(variante, className)} aria-label={props['aria-label'] ?? rotulo} {...props} />
})

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variante?: Variante
  rotulo?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { variante = 'bare', rotulo, className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={classes(variante, className, variante === 'campo' ? s.multi : '')}
      aria-label={props['aria-label'] ?? rotulo}
      {...props}
    />
  )
})

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  variante?: Variante
  rotulo?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { variante = 'bare', rotulo, className, ...props },
  ref
) {
  return <select ref={ref} className={classes(variante, className)} aria-label={props['aria-label'] ?? rotulo} {...props} />
})
