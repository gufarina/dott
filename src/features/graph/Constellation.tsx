import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import s from './Constellation.module.css'

const W = 900
const H = 620

/** Uma cor por tema. Sequencia fixa: o tema nao muda de cor entre sessoes. */
const CORES = ['#e05a38', '#4a8fd9', '#9b6cdb', '#3db37a', '#d98c3a', '#3db3b3', '#e05aa0', '#b4966e']

/** Constelacao: o mapa das conexoes que o Dott achou SOZINHO.
 *  Nada aqui foi digitado pelo usuario: o motor (lib/graphify.ts) le as notas,
 *  liga o que se parece e agrupa em temas. Cada linha sabe dizer por que existe. */
export function Constellation() {
  const notes = useStore(st => st.notes)
  const graph = useStore(st => st.graph)
  const setView = useStore(st => st.setView)
  const [alvo, setAlvo] = useState<string | null>(null)

  const layout = useMemo(() => {
    const { nodes, communities } = graph
    const pos = new Map<string, { x: number; y: number }>()
    if (nodes.length === 0) return pos

    // Cada tema ganha um satelite proprio; quem ficou sozinho vai pro anel de fora.
    const grupos: string[][] = communities.map(c => c.notes)
    const soltas = nodes.filter(n => n.community === -1).map(n => n.id)
    const centros: Array<{ cx: number; cy: number; r: number }> = []
    const G = Math.max(grupos.length, 1)
    // Um tema so ocupa a tela inteira; varios temas viram satelites em volta.
    const raioMiolo = G <= 1 ? 0 : Math.min(W, H) * 0.34
    const raioTema = G <= 1 ? Math.min(W, H) * 0.36 : Math.min(118, 30 + 74 / Math.sqrt(G))

    grupos.forEach((g, i) => {
      const ang = (i / G) * 2 * Math.PI - Math.PI / 2
      centros.push({
        cx: W / 2 + Math.cos(ang) * raioMiolo,
        cy: H / 2 + Math.sin(ang) * raioMiolo,
        r: G <= 1 ? Math.min(raioTema, 70 + g.length * 26) : Math.max(34, Math.min(raioTema, 16 + g.length * 13)),
      })
    })

    grupos.forEach((g, i) => {
      const c = centros[i]
      g.forEach((id, j) => {
        const ang = (j / Math.max(g.length, 1)) * 2 * Math.PI - Math.PI / 2
        pos.set(id, { x: c.cx + Math.cos(ang) * c.r, y: c.cy + Math.sin(ang) * c.r })
      })
    })

    soltas.forEach((id, j) => {
      const ang = (j / Math.max(soltas.length, 1)) * 2 * Math.PI - Math.PI / 2
      pos.set(id, { x: W / 2 + Math.cos(ang) * (Math.min(W, H) * 0.46), y: H / 2 + Math.sin(ang) * (Math.min(W, H) * 0.46) })
    })

    return pos
  }, [graph])

  const byId = useMemo(() => Object.fromEntries(graph.nodes.map(n => [n.id, n])), [graph])
  const tituloDe = (id: string) => notes.find(n => n.id === id)?.title ?? ''
  const corDe = (com: number) => (com < 0 ? 'var(--border2)' : CORES[com % CORES.length])

  const destaque = alvo ? new Set([alvo, ...(graph.byNote[alvo] ?? []).map(v => v.id)]) : null
  const noAlvo = alvo ? byId[alvo] : null
  const vizinhosAlvo = alvo ? (graph.byNote[alvo] ?? []) : []

  if (notes.length === 0) {
    return (
      <div className={s.wrap}>
        <div className={s.header}><span className={s.title}>Constelação</span></div>
        <div className={s.vazio}>Escreva sua primeira nota. As conexões aparecem sozinhas.</div>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={s.header}>
        <span className={s.title}>Constelação</span>
        <span className={s.hint}>
          {graph.stats.notes} {graph.stats.notes === 1 ? 'nota' : 'notas'}
          {' · '}{graph.stats.edges} {graph.stats.edges === 1 ? 'conexão' : 'conexões'}
          {' · '}{graph.stats.communities} {graph.stats.communities === 1 ? 'tema' : 'temas'}
        </span>
        <span className={s.legenda}>
          <span className={s.chave}><i className={s.linhaAchada} /> achada no texto ({graph.stats.achadas})</span>
          <span className={s.chave}><i className={s.linhaInferida} /> inferida por semelhança ({graph.stats.inferidas})</span>
        </span>
      </div>

      <div className={s.palco}>
        <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} onClick={() => setAlvo(null)}>
          {graph.edges.map((e, i) => {
            const a = layout.get(e.a), b = layout.get(e.b)
            if (!a || !b) return null
            const apagada = destaque ? !(destaque.has(e.a) && destaque.has(e.b)) : false
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={corDe(byId[e.a]?.community ?? -1)}
                strokeWidth={e.confidence === 'ACHADA' ? 1.6 : 1}
                strokeDasharray={e.confidence === 'ACHADA' ? undefined : '3 4'}
                strokeOpacity={apagada ? 0.06 : 0.2 + Math.min(e.weight, 1) * 0.45}
              />
            )
          })}

          {graph.nodes.map(n => {
            const p = layout.get(n.id)
            if (!p) return null
            const r = 6 + Math.min(n.degree, 6) * 1.9
            const apagado = destaque ? !destaque.has(n.id) : false
            return (
              <g
                key={n.id}
                className={s.node}
                opacity={apagado ? 0.16 : 1}
                onClick={ev => { ev.stopPropagation(); setAlvo(a => (a === n.id ? null : n.id)) }}
                onDoubleClick={ev => { ev.stopPropagation(); setView('editor', { note: n.id }) }}
              >
                <circle cx={p.x} cy={p.y} r={r} fill={corDe(n.community)} fillOpacity={n.community < 0 ? 0.35 : 0.85} />
                {alvo === n.id && <circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke={corDe(n.community)} strokeWidth="1.2" />}
                <text x={p.x} y={p.y + r + 11} textAnchor="middle" className={s.label}>
                  {n.title.length > 18 ? n.title.slice(0, 16) + '…' : n.title}
                </text>
              </g>
            )
          })}
        </svg>

        <aside className={s.painel}>
          {noAlvo ? (
            <>
              <div className={s.painelTitulo}>{noAlvo.title}</div>
              {noAlvo.terms.length > 0 && (
                <div className={s.conceitos}>
                  {noAlvo.terms.slice(0, 5).map(t => <span key={t} className={s.conceito}>{t}</span>)}
                </div>
              )}
              <div className={s.painelLabel}>
                {vizinhosAlvo.length > 0 ? `${vizinhosAlvo.length} ${vizinhosAlvo.length > 1 ? 'conexões' : 'conexão'}` : 'Nenhuma conexão ainda'}
              </div>
              {vizinhosAlvo.map(v => (
                <div key={v.id} className={s.vizinho} onClick={() => setView('editor', { note: v.id })}>
                  <div className={s.vizinhoTopo}>
                    <span className={`${s.marca} ${v.confidence === 'ACHADA' ? s.achada : ''}`}>
                      {v.confidence === 'ACHADA' ? 'achada' : 'inferida'}
                    </span>
                    <span className={s.vizinhoTitulo}>{tituloDe(v.id)}</span>
                  </div>
                  <div className={s.vizinhoWhy}>{v.why}</div>
                </div>
              ))}
              <button className={s.abrir} onClick={() => setView('editor', { note: noAlvo.id })}>Abrir a nota</button>
            </>
          ) : (
            <>
              <div className={s.painelLabel}>Temas que o Dott encontrou</div>
              {graph.communities.length === 0 && (
                <div className={s.painelVazio}>
                  Ainda não há tema formado. Escreva mais algumas notas: as conexões aparecem sozinhas, sem você marcar nada.
                </div>
              )}
              {graph.communities.map(c => (
                <div key={c.id} className={s.tema}>
                  <span className={s.bolinha} style={{ background: corDe(c.id) }} />
                  <div>
                    <div className={s.temaNome}>{c.label}</div>
                    <div className={s.temaQtd}>{c.notes.length} {c.notes.length === 1 ? 'nota' : 'notas'}</div>
                  </div>
                </div>
              ))}
              <div className={s.dica}>Clique num ponto para ver por que ele está ligado. Duplo-clique abre a nota.</div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
