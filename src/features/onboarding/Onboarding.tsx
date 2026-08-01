import { useEffect, useState, type CSSProperties } from 'react'
import './onboarding.css'

/** Onboarding de primeiro uso — 5 passos animados sobre o app real.
 *  Aparece so na primeira vez (flag dott:onboarding-seen). Pode ser revisto
 *  disparando o evento 'dott:replay-onboarding' (ex.: por um menu de ajuda). */
const SEEN_KEY = 'dott:onboarding-seen'
const TOTAL = 5

function wasSeen(): boolean {
  try { return !!localStorage.getItem(SEEN_KEY) } catch { return false }
}

export function Onboarding() {
  const [open, setOpen] = useState(() => !wasSeen())
  const [i, setI] = useState(0)
  const [closing, setClosing] = useState(false)

  // Permite re-abrir o onboarding de fora (menu de ajuda futuro).
  useEffect(() => {
    const replay = () => { setI(0); setClosing(false); setOpen(true) }
    window.addEventListener('dott:replay-onboarding', replay)
    return () => window.removeEventListener('dott:replay-onboarding', replay)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') go(i + 1)
      else if (e.key === 'ArrowLeft') go(i - 1)
      else if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) return null

  function go(n: number) {
    if (n >= TOTAL) { finish(); return }
    setI(Math.max(0, Math.min(TOTAL - 1, n)))
  }

  function finish() {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignora */ }
    setClosing(true)
    setTimeout(() => { setOpen(false); setClosing(false) }, 250)
  }

  const active = (n: number) => `ob-step${i === n ? ' is-active' : ''}`
  const last = i === TOTAL - 1

  return (
    <div className={`ob-overlay${closing ? ' is-closing' : ''}`}>
      <div className="ob-skip-x" title="Pular introdução" onClick={finish}>✕</div>
      <div className="ob-card" role="dialog" aria-label="Introdução ao Dott">

        <div className="ob-stage">
          <div className={active(0)}>
            <div className="s1-orb"><div className="s1-ring" /><div className="s1-dot" /><div className="s1-word">Dott</div></div>
          </div>
          <div className={active(1)}>
            <div className="s2">
              <div className="s2-keys"><span className="k">Ctrl</span><span className="k">Shift</span><span className="k">Space</span></div>
              <div className="s2-card"><span className="tag">IDEIA</span> &nbsp;ideia nova…</div>
              <div className="s2-tray">INBOX</div>
            </div>
          </div>
          <div className={active(2)}>
            <div className="s3">
              <div className="q" style={{ '--qc': 'var(--q-p)' } as CSSProperties}><h5>Projetos</h5><small>tem fim</small></div>
              <div className="q" style={{ '--qc': 'var(--q-a)' } as CSSProperties}><h5>Áreas</h5><small>contínuo</small></div>
              <div className="q" style={{ '--qc': 'var(--q-r)' } as CSSProperties}><h5>Recursos</h5><small>referência</small></div>
              <div className="q" style={{ '--qc': 'var(--q-ar)' } as CSSProperties}><h5>Arquivo</h5><small>inativo</small></div>
            </div>
          </div>
          <div className={active(3)}>
            <div className="s4">
              <div className="s4-inbox">INBOX</div>
              <div className="s4-target">PROJETOS</div>
              <div className="s4-card"><div className="nt">NOTA</div><div className="ln a" /><div className="ln b" /></div>
            </div>
          </div>
          <div className={active(4)}>
            <div className="s5">
              <svg viewBox="0 0 230 130">
                <path className="edge e1" d="M55,40 L165,55" />
                <path className="edge e2" d="M165,55 L100,100" />
                <circle className="node n1" cx="55" cy="40" r="11" />
                <circle className="node n2" cx="165" cy="55" r="11" />
                <circle className="node n3" cx="100" cy="100" r="11" />
              </svg>
            </div>
          </div>
        </div>

        <div className="ob-content">
          <div className={active(0)}>
            <div className="ob-kicker">Boas-vindas</div>
            <h2 className="ob-title">Bem-vindo ao Dott</h2>
            <p className="ob-text">Seu segundo cérebro. Tire as ideias da cabeça — o Dott <b>guarda e organiza</b>, tudo offline, só na sua máquina.</p>
          </div>
          <div className={active(1)}>
            <div className="ob-kicker">1 · Capturar</div>
            <h2 className="ob-title">Primeiro, capture. Sem pensar onde.</h2>
            <p className="ob-text">Teve uma ideia, um link, um trecho? Aperte <span className="ob-kbd">Ctrl+Shift+Space</span> em qualquer app e jogue na <b>Inbox</b>. Onde guardar fica pra depois.</p>
            <div className="ob-note"><span className="ob-badge">GTD</span><span>Capturar antes de organizar é o hábito que vem do GTD. A Inbox segura até <b>10</b> itens de propósito — quando enche, é hora de organizar.</span></div>
          </div>
          <div className={active(2)}>
            <div className="ob-kicker">2 · Organizar · método PARA</div>
            <h2 className="ob-title">Depois, organize em 4 lugares</h2>
            <p className="ob-text">O <b>PARA</b> separa tudo por quão acionável é:</p>
            <div className="ob-paralist">
              <div className="ob-pl"><span className="pd" style={{ background: 'var(--q-p)' }} /><strong>Projetos</strong><span>o que você quer ver concluído <i>(ex.: lançar o site)</i></span></div>
              <div className="ob-pl"><span className="pd" style={{ background: 'var(--q-a)' }} /><strong>Áreas</strong><span>o que você cuida sem prazo <i>(ex.: saúde, finanças)</i></span></div>
              <div className="ob-pl"><span className="pd" style={{ background: 'var(--q-r)' }} /><strong>Recursos</strong><span>o que você guarda pra usar um dia <i>(ex.: leituras)</i></span></div>
              <div className="ob-pl"><span className="pd" style={{ background: 'var(--q-ar)' }} /><strong>Arquivo</strong><span>o que já serviu, mas não some</span></div>
            </div>
            <div className="ob-note is-tip"><span className="ob-badge">DICA</span><span>Na dúvida? Escolha o lugar <b>mais acionável</b>: Projetos › Áreas › Recursos › Arquivo.</span></div>
          </div>
          <div className={active(3)}>
            <div className="ob-kicker">3 · Processar</div>
            <h2 className="ob-title">Esvazie a Inbox</h2>
            <p className="ob-text">Arraste cada card pro lugar certo no board. Ele vira uma <b>nota</b>, prontinha pra editar. A Inbox não é um destino — é uma caixa de entrada.</p>
          </div>
          <div className={active(4)}>
            <div className="ob-kicker">4 · Conectar</div>
            <h2 className="ob-title">Ligue as ideias</h2>
            <p className="ob-text">Escreva <span className="ob-kbd">[[assim]]</span> dentro de uma nota pra conectar com outra. Com o tempo, tudo vira uma <b>constelação</b> sua. Pronto — agora é com você.</p>
          </div>
        </div>

        <div className="ob-foot">
          <div className="ob-dots">
            {Array.from({ length: TOTAL }, (_, n) => <i key={n} className={i === n ? 'on' : ''} />)}
          </div>
          {i > 0 && <button className="ob-btn ghost" onClick={() => go(i - 1)}>Voltar</button>}
          {!last && <button className="ob-btn ghost" onClick={finish}>Pular</button>}
          <button className="ob-btn primary" onClick={() => go(i + 1)}>{last ? 'Começar a usar o Dott' : 'Próximo'}</button>
        </div>
      </div>
    </div>
  )
}
