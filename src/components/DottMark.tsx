/* DottMark.tsx — A marca do Dott.
 *
 * O QUE SIGNIFICA (nenhum traco e enfeite):
 *   - o PONTO cheio no centro  = o pensamento que voce capturou. E o nome do app.
 *   - o ANEL em volta          = o segundo cerebro que guarda esse pensamento.
 *   - a ABERTURA no anel       = ele nunca fecha; sempre cabe mais.
 *
 * Le em 16px (barra de tarefas) porque a silhueta e uma so: ponto dentro de anel.
 *
 * HISTORICO DE DESCARTES (pra ninguem tentar de novo):
 *   - o "+" original nao dizia nada e podia ser qualquer app de adicionar coisa;
 *   - a versao com um ponto SOLTO na abertura (a "ligacao saindo") foi reprovada:
 *     desgrudado do anel ele lia como rabinho/sujeira, nao como significado.
 *     Simbolo que precisa de legenda pra funcionar nao esta funcionando.
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
      {/* o anel aberto — o cerebro que nunca fecha.
          Pontas arredondadas: a abertura tem que parecer decisao, nao corte. */}
      <path
        d="M18.55 6.9a8.85 8.85 0 1 1-5.6-3.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* o pensamento */}
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
    </svg>
  )
}
