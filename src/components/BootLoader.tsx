import { motion } from 'framer-motion'
import s from './BootLoader.module.css'

/** Splash de carregamento exibido no boot, enquanto o vault hidrata.
 *  Animação "Convergência PARA" (V2). Some com fade quando booting vira false. */
export function BootLoader() {
  return (
    <motion.div
      className={s.overlay}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className={s.stage}>
        <div className={s.spin}>
          <span className={s.arm}><i /></span>
          <span className={s.arm}><i /></span>
          <span className={s.arm}><i /></span>
          <span className={s.arm}><i /></span>
        </div>
        <span className={s.core} />
      </div>
      <div className={s.word}><span>Dott</span><i /></div>
    </motion.div>
  )
}
