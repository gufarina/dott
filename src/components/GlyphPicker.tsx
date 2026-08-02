/* GlyphPicker.tsx — Seletor do pacote de simbolos proprio do Dott.
 *
 * Fica no lugar do "emoji": o usuario escolhe uma MARCA do conjunto do app, que
 * combina com o resto da interface e e igual em qualquer maquina.
 */

import { GLYPH_ORDER, GLYPH_LABEL, NoteGlyph, type GlyphId } from './NoteGlyphs'
import { Icon } from './Icon'
import s from './GlyphPicker.module.css'

export function GlyphPicker({
  atual,
  onEscolher,
  onFechar,
}: {
  atual?: GlyphId
  onEscolher: (g: GlyphId | undefined) => void
  onFechar: () => void
}) {
  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className={s.modal} role="dialog" aria-label="Escolher símbolo">
        <div className={s.header}>
          <span className={s.title}>Símbolo da nota</span>
          <button className={s.close} onClick={onFechar} title="Fechar">
            <Icon name="fechar" size={13} />
          </button>
        </div>

        <p className={s.hint}>Marcas do próprio Dott — iguais em qualquer computador.</p>

        <div className={s.grid}>
          {GLYPH_ORDER.map(g => (
            <button
              key={g}
              className={`${s.cell} ${atual === g ? s.cellAtiva : ''}`}
              title={GLYPH_LABEL[g]}
              onClick={() => onEscolher(g)}
            >
              <NoteGlyph id={g} size={26} />
              <span className={s.cellLabel}>{GLYPH_LABEL[g]}</span>
            </button>
          ))}
        </div>

        {atual && (
          <button className={s.limpar} onClick={() => onEscolher(undefined)}>
            <Icon name="fechar" size={13} /> Tirar o símbolo
          </button>
        )}
      </div>
    </div>
  )
}
