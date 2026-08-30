import { useLayoutEffect, useRef } from 'react'
import { Icon, IconName } from './Icon'
import s from './TabBar.module.css'

/** TabBar — componente unico de aba/filtro do app (TASK-333).
 *
 * Antes desta consolidacao, Inbox/Tags (InboxPanel) e PRAZO/Tudo (TasksPanel)
 * eram DOIS desenhos diferentes (sublinhado com contador vs. pilula com
 * contorno) com a MESMA logica de medicao da aba ativa copiada nos dois
 * arquivos. Isto junta os dois: um componente, um CSS, uma logica de
 * medicao — qualquer grupo de aba novo do app usa este componente, nunca
 * escreve o proprio.
 *
 * O padrao vencedor e o do Inbox/Tags: rotulo + icone + contador (pill,
 * opcional) + barrinha ativa que desliza (`.tabIndicator`, reset.css).
 */
export interface TabBarItem {
  key: string
  label: string
  icon: IconName
  /** Contador de quantidade (ex. 4 itens no Inbox). Omitido = sem badge
   *  (ex. filtro PRAZO/Tudo, que nao tem uma contagem propria). */
  count?: number
  title?: string
}

interface TabBarProps {
  items: TabBarItem[]
  activeKey: string
  onChange: (key: string) => void
  /** Cor da barrinha deslizante — cai no fallback --accent do .tabIndicator
   *  (reset.css) se omitido. */
  indicatorColor?: string
  /** 'standalone' (padrao) = a aba E o cabecalho (altura 44px, borda
   *  inferior propria, padding lateral) - o caso Inbox/Tags, onde a aba
   *  ocupa a faixa inteira sozinha. 'inline' = a aba mora DENTRO de um
   *  cabecalho que ja tem sua propria altura/borda/padding (o caso
   *  Tarefas: titulo + filtro na MESMA linha) - o componente entao so
   *  contribui a fileira de botoes + a barrinha, sem chrome duplicado. */
  variant?: 'standalone' | 'inline'
}

export function TabBar({ items, activeKey, onChange, indicatorColor, variant = 'standalone' }: TabBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  /** Mede a aba ativa e escreve --indicator-x/--indicator-w no container
   *  (heranca ate o `.tabIndicator`, mesmo mecanismo de --glow-x/--glow-y em
   *  .hoverGlow). useLayoutEffect roda antes da pintura — o indicador nasce
   *  no lugar certo, sem deslizar do zero no primeiro quadro.
   *  ResizeObserver no container e em cada botao remede em resize da janela
   *  e sempre que um rotulo mudar de largura (contador trocando de digito). */
  useLayoutEffect(() => {
    const container = containerRef.current
    const active = btnRefs.current[activeKey]
    if (!container || !active) return

    const medir = () => {
      container.style.setProperty('--indicator-x', `${active.offsetLeft}px`)
      container.style.setProperty('--indicator-w', `${active.offsetWidth}px`)
    }
    medir()

    const ro = new ResizeObserver(medir)
    ro.observe(container)
    for (const el of Object.values(btnRefs.current)) if (el) ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, items.map(i => i.count).join(',')])

  return (
    <div
      className={`${s.tabs} ${variant === 'inline' ? s.inline : ''}`}
      ref={containerRef}
      style={indicatorColor ? ({ '--tab-indicator-color': indicatorColor } as React.CSSProperties) : undefined}
    >
      {items.map(item => (
        <button
          key={item.key}
          ref={el => { btnRefs.current[item.key] = el }}
          className={`${s.tab} ${activeKey === item.key ? s.active : ''}`}
          onClick={() => onChange(item.key)}
          title={item.title}
        >
          <Icon name={item.icon} size={13} /> {item.label}
          {item.count !== undefined && <span className={s.badge}>{item.count}</span>}
        </button>
      ))}
      <span className="tabIndicator" />
    </div>
  )
}
