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
      {/* O anel aberto — o cerebro que nunca fecha.
          CONCENTRICO COM O PONTO, e isso e conta, nao olho: os dois extremos do
          arco estao a exatamente 8.8 do centro (12,12), nos angulos -15deg e
          -65deg. Se as pontas nao ficarem na distancia do raio, o navegador
          reposiciona o centro do circulo pra conseguir encaixar o arco e o anel
          sai torto em relacao a bola — foi exatamente o que aconteceu antes. */}
      <path
        d="M20.5 9.722A8.8 8.8 0 1 1 15.719 4.024"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* o pensamento — mesmo centro do anel */}
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
    </svg>
  )
}
