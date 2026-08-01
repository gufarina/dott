import { useStore } from '../../store'
import { normalizeTitle } from '../../lib/wiki'
import s from './Constellation.module.css'

const W = 600
const H = 400

export function Constellation() {
  const notes = useStore(st => st.notes)
  const setView = useStore(st => st.setView)

  const titleToId = Object.fromEntries(notes.map(n => [normalizeTitle(n.title), n.id]))

  // Layout radial simples — sem simulação de física
  const nodes = notes.map((n, i) => {
    const angle = (i / notes.length) * 2 * Math.PI - Math.PI / 2
    const r = 6 + Math.min(n.links.length + n.backlinks.length, 6) * 2
    return { ...n, r, x: W / 2 + Math.cos(angle) * 160, y: H / 2 + Math.sin(angle) * 160 }
  })

  const edges: { sx: number; sy: number; tx: number; ty: number }[] = []
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  for (const n of notes) {
    for (const link of n.links) {
      const t = byId[titleToId[link]]
      const src = byId[n.id]
      if (t && src) edges.push({ sx: src.x, sy: src.y, tx: t.x, ty: t.y })
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.header}>
        <span className={s.title}>Constelação</span>
        <span className={s.hint}>{notes.length} notas · {edges.length} conexões</span>
      </div>
      <svg className={s.svg} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <radialGradient id="ng" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".9" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity=".25" />
          </radialGradient>
        </defs>
        {edges.map((e, i) => (
          <line key={i} x1={e.sx} y1={e.sy} x2={e.tx} y2={e.ty}
            stroke="var(--border2)" strokeWidth="1" strokeOpacity=".5" />
        ))}
        {nodes.map(n => (
          <g key={n.id} className={s.node} onClick={() => setView('editor', { note: n.id })}>
            <circle cx={n.x} cy={n.y} r={n.r} fill="url(#ng)" />
            <text x={n.x} y={n.y + n.r + 11} textAnchor="middle" className={s.label}>
              {n.title.length > 16 ? n.title.slice(0, 14) + '…' : n.title}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
