import { motion } from 'framer-motion'
import s from './BootLoader.module.css'

/**
 * Abertura do app.
 *
 * RACIONAL: a abertura E A MARCA SE FORMANDO — o mesmo ponto e o mesmo anel do
 * icone e do widget, nada inventado so pra essa tela. O anel se desenha em volta
 * do ponto enquanto o vault carrega, e e literalmente o que esta acontecendo: o
 * segundo cerebro se fechando em volta do que voce guardou. Quando termina, o
 * anel completa e a tela sai.
 *
 * A versao anterior tinha 4 bolinhas coloridas do PARA girando. Bonita, mas
 * orfa: aquelas cores nao apareciam em mais nenhum lugar do app e nao tinham
 * relacao com o icone nem com o widget — tres aberturas contando tres historias.
 */
export function BootLoader() {
  return (
    <motion.div
      className={s.overlay}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
    >
      <svg className={s.marca} viewBox="0 0 24 24" fill="none" aria-label="Carregando o Dott" role="img">
        {/* trilho: onde o anel vai passar */}
        <circle cx="12" cy="12" r="8.8" className={s.trilho} strokeWidth="2.6" />
        {/* o anel se desenhando */}
        <circle cx="12" cy="12" r="8.8" className={s.anel} strokeWidth="2.6" strokeLinecap="round" />
        {/* o pensamento */}
        <circle cx="12" cy="12" r="4.4" className={s.ponto} />
      </svg>
      <span className={s.nome}>Dott</span>
    </motion.div>
  )
}
