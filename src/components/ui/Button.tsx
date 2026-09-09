import { forwardRef } from 'react'
import s from './Button.module.css'

/* Botao canonico do Dott (TASK-461).

   A auditoria de design mediu 101 `<button>` nativos em 24 arquivos e nenhum
   ponto unico pra mudar o botao do app. Este e o ponto unico.

   Tres defeitos reais que ele resolve de uma vez, e que nenhuma busca por
   "estilo" acharia:
   1. 81 dos 101 botoes nao declaravam `type`. O padrao do HTML e "submit" -
      hoje o app nao tem <form>, entao nao explode; no dia que tiver, explode
      em 81 lugares. Aqui o padrao vira "button".
   2. So a variante primaria tinha anel de foco. Quem navega no teclado ficava
      sem saber onde estava em todas as outras.
   3. `<button>` dentro de `<button>` e HTML invalido - armadilha ja registrada
      no mapa de conhecimento deste repo. `as="span"` da a saida legitima: o
      elemento vira span com `role="button"` e responde a Enter/Espaco igual. */

type Variante = 'primary' | 'ghost' | 'danger' | 'icon' | 'bare'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `bare` (padrao) nao pinta nada: pra botao que ja tem geometria propria e
   *  so precisa dos invariantes. Ver o comentario de `.bare` no CSS. */
  variante?: Variante
  /** Icone-so no porte menor (`--icon-btn-sm`). So vale com variante="icon". */
  pequeno?: boolean
  /** Renderiza como <span role="button"> em vez de <button>. Unico uso
   *  legitimo: quando o alvo ja vive DENTRO de outro botao. */
  as?: 'button' | 'span'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'bare', pequeno = false, as = 'button', className, type, disabled, onClick, onKeyDown, ...props },
  ref
) {
  const cls = [
    variante === 'bare' ? s.bare : s.base,
    variante !== 'bare' && variante !== 'icon' ? s[variante] : '',
    variante === 'icon' ? s.icon : '',
    variante === 'icon' && pequeno ? s.iconSm : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if (as === 'span') {
    // Um <span> nao e focavel nem acionavel sozinho: sem tabIndex ele some pro
    // teclado, e sem o handler de tecla ele so responde a mouse. Os dois vem
    // juntos de proposito - meia semantica seria pior que nenhuma.
    return (
      <span
        className={cls}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : (onClick as unknown as React.MouseEventHandler<HTMLSpanElement>)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).click()
          }
          ;(onKeyDown as unknown as React.KeyboardEventHandler<HTMLSpanElement>)?.(e)
        }}
        {...(props as unknown as React.HTMLAttributes<HTMLSpanElement>)}
      />
    )
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...props}
    />
  )
})
