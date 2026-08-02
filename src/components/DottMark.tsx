/* DottMark.tsx — A marca do Dott.
 *
 * O QUE SIGNIFICA (nenhum traco e enfeite):
 *   - o PONTO cheio no centro  = o pensamento que voce capturou. E o nome do app.
 *   - o ANEL em volta          = o segundo cerebro que guarda esse pensamento.
 *   - a FALHA no anel          = ele nunca fecha; sempre cabe mais.
 *   - o PONTO menor na falha   = a ligacao ([[wiki-link]]) saindo pra outra nota.
 *
 * Le em 16px (barra de tarefas) porque a silhueta e uma so: ponto dentro de anel.
 * O "+" antigo foi descartado: nao dizia nada sobre o produto e podia ser
 * qualquer app de adicionar coisa.
 */

export function DottMark({
  size = 20,
  className,
  title,
}: {
  size?: number
  className?: string
  title?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* o anel aberto — o cerebro que nunca fecha */}
      <path
        d="M17.9 6.4a8.4 8.4 0 1 1-4.6-2.7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* o pensamento */}
      <circle cx="12" cy="12" r="4.15" fill="currentColor" />
      {/* a ligacao saindo */}
      <circle cx="19.15" cy="4.85" r="2.25" fill="currentColor" />
    </svg>
  )
}
