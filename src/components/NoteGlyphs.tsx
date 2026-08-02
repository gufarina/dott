/* NoteGlyphs.tsx — Pacote de SIMBOLOS da nota (o "emoji" exclusivo do Dott).
 *
 * Nao e emoji do sistema de proposito: emoji muda de desenho em cada maquina e
 * nao combina com o resto do app. Estes sao marcas proprias, na mesma gramatica
 * geometrica do pacote de icones (circulo, quadrado, losango, linha) — so que
 * pensadas como MARCA de capa, nao como botao: traco mais grosso, forma cheia,
 * legiveis a 20px no card e a 64px no banner.
 *
 * O simbolo escolhido fica no frontmatter da nota (campo `glyph`), entao viaja
 * junto do .md e sobrevive a backup/restauracao.
 */

export type GlyphId =
  | 'orbita' | 'eclipse' | 'semente' | 'faisca' | 'onda' | 'grade'
  | 'cume' | 'chave' | 'marco' | 'pulso' | 'alvo' | 'camadas'
  | 'ciclo' | 'livro' | 'codigo' | 'elo' | 'norte' | 'prisma'
  | 'raiz' | 'gota' | 'torre' | 'malha'

/** Ordem de exibicao no seletor. */
export const GLYPH_ORDER: GlyphId[] = [
  'orbita', 'eclipse', 'semente', 'faisca', 'onda', 'grade',
  'cume', 'chave', 'marco', 'pulso', 'alvo', 'camadas',
  'ciclo', 'livro', 'codigo', 'elo', 'norte', 'prisma',
  'raiz', 'gota', 'torre', 'malha',
]

export const GLYPH_LABEL: Record<GlyphId, string> = {
  orbita: 'Orbita', eclipse: 'Eclipse', semente: 'Semente', faisca: 'Faisca',
  onda: 'Onda', grade: 'Grade', cume: 'Cume', chave: 'Chave',
  marco: 'Marco', pulso: 'Pulso', alvo: 'Alvo', camadas: 'Camadas',
  ciclo: 'Ciclo', livro: 'Livro', codigo: 'Codigo', elo: 'Elo',
  norte: 'Norte', prisma: 'Prisma', raiz: 'Raiz', gota: 'Gota',
  torre: 'Torre', malha: 'Malha',
}

const G: Record<GlyphId, React.ReactElement> = {
  orbita:  <><ellipse cx="12" cy="12" rx="9.5" ry="4.6" transform="rotate(-28 12 12)"/><circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none"/></>,
  eclipse: <><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6a8.4 8.4 0 0 0 0 16.8z" fill="currentColor" stroke="none"/></>,
  semente: <><path d="M12 21c-4.4 0-7.5-3.2-7.5-7.6C4.5 8.2 12 3 12 3s7.5 5.2 7.5 10.4C19.5 17.8 16.4 21 12 21z"/><circle cx="12" cy="13.6" r="2.6" fill="currentColor" stroke="none"/></>,
  faisca:  <><path d="M12 2.6l2.3 6.6 6.6 2.3-6.6 2.3L12 20.4l-2.3-6.6L3.1 11.5l6.6-2.3z" fill="currentColor" stroke="none"/></>,
  onda:    <><path d="M2.8 14.4c2.3-3.6 4.1-3.6 6.4 0s4.1 3.6 6.4 0 4.1-3.6 5.6-1.6"/><path d="M2.8 9.2c2.3-3.6 4.1-3.6 6.4 0s4.1 3.6 6.4 0 4.1-3.6 5.6-1.6" opacity=".45"/></>,
  grade:   <><rect x="3.2" y="3.2" width="7.2" height="7.2" rx="1.6" fill="currentColor" stroke="none"/><rect x="13.6" y="3.2" width="7.2" height="7.2" rx="1.6"/><rect x="3.2" y="13.6" width="7.2" height="7.2" rx="1.6"/><rect x="13.6" y="13.6" width="7.2" height="7.2" rx="1.6" fill="currentColor" stroke="none"/></>,
  cume:    <><path d="M2.4 19.2l6.2-11 4 6.4 2.6-3.8 6.4 8.4z" fill="currentColor" stroke="none"/><circle cx="17.4" cy="5.6" r="2.2"/></>,
  chave:   <><circle cx="7.6" cy="8" r="4.3"/><path d="M10.6 11l9 9M16.4 16.4l-2.3 2.3M19 19l-2.3 2.3"/></>,
  marco:   <><path d="M5.6 21V3.6h11.6l-2.6 4.2 2.6 4.2H5.6" fill="currentColor" stroke="none"/><path d="M5.6 21V3.6"/></>,
  pulso:   <><path d="M2.4 12.4h4.2l2.4-6.2 3.6 12L15 12.4h6.6"/><circle cx="21.6" cy="12.4" r="1.7" fill="currentColor" stroke="none"/></>,
  alvo:    <><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.9"/><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/></>,
  camadas: <><path d="M12 2.8l9 4.6-9 4.6-9-4.6z" fill="currentColor" stroke="none"/><path d="M3 12.4l9 4.6 9-4.6"/><path d="M3 17.2l9 4.6 9-4.6" opacity=".5"/></>,
  ciclo:   <><path d="M20 12a8 8 0 1 1-2.9-6.2"/><path d="M20.6 3.6v4.8h-4.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/></>,
  livro:   <><path d="M3.6 4.4h6a3 3 0 0 1 3 3v12a2.4 2.4 0 0 0-2.4-2.4H3.6z" fill="currentColor" stroke="none"/><path d="M20.4 4.4h-6a3 3 0 0 0-3 3v12a2.4 2.4 0 0 1 2.4-2.4h6.6z"/></>,
  codigo:  <><path d="M8.4 7.2L3.2 12l5.2 4.8M15.6 7.2L20.8 12l-5.2 4.8"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
  elo:     <><circle cx="8.4" cy="12" r="5.2"/><circle cx="15.6" cy="12" r="5.2"/></>,
  norte:   <><path d="M12 2.4l3.4 9.6L12 21.6 8.6 12z" fill="currentColor" stroke="none"/><path d="M2.4 12h19.2" opacity=".45"/></>,
  prisma:  <><path d="M12 2.6L21.4 19H2.6z"/><path d="M12 2.6V19" opacity=".5"/><circle cx="12" cy="14" r="2.1" fill="currentColor" stroke="none"/></>,
  raiz:    <><path d="M12 2.8v8.4"/><path d="M12 11.2c0 4-3.2 4.4-4.8 6.4-1 1.3-1.2 2.6-1.2 3.6M12 11.2c0 4 3.2 4.4 4.8 6.4 1 1.3 1.2 2.6 1.2 3.6"/><circle cx="12" cy="4.6" r="2.4" fill="currentColor" stroke="none"/></>,
  gota:    <><path d="M12 2.8s6.6 7 6.6 11.2A6.6 6.6 0 0 1 5.4 14C5.4 9.8 12 2.8 12 2.8z" fill="currentColor" stroke="none"/></>,
  torre:   <><rect x="8.8" y="3.2" width="6.4" height="17.6" rx="1.6"/><path d="M8.8 8.4h6.4M8.8 13.6h6.4"/><circle cx="12" cy="5.8" r="1.15" fill="currentColor" stroke="none"/></>,
  malha:   <><path d="M12 3.2L20 8v8l-8 4.8L4 16V8z"/><path d="M12 3.2v17.6M4 8l16 8M20 8L4 16" opacity=".4"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></>,
}

export function NoteGlyph({ id, size = 20, className }: { id: GlyphId; size?: number; className?: string }) {
  const shape = G[id]
  if (!shape) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  )
}

export function isGlyphId(v: unknown): v is GlyphId {
  return typeof v === 'string' && (GLYPH_ORDER as string[]).includes(v)
}
