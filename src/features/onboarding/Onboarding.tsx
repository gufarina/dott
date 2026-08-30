import { useEffect, useState, type CSSProperties } from 'react'
import { Icon } from '../../components/Icon'
import { getStorageMode, setStorageMode, waitlistEmail, isValidEmail, joinWaitlist } from '../../lib/online'
import './onboarding.css'

/** Onboarding de primeiro uso - 6 passos animados sobre o app real.
 *  Aparece so na primeira vez (flag dott:onboarding-seen). Pode ser revisto
 *  disparando o evento 'dott:replay-onboarding' (ex.: por um menu de ajuda).
 *  O evento 'dott:open-online' abre direto o ultimo passo (escolha de onde as
 *  notas moram), sozinho. E por ai que as Configuracoes reusam esta tela. */
const SEEN_KEY = 'dott:onboarding-seen'
const TOTAL = 6
const ONLINE = TOTAL - 1

function wasSeen(): boolean {
  try { return !!localStorage.getItem(SEEN_KEY) } catch { return false }
}

export function Onboarding() {
  const [open, setOpen] = useState(() => !wasSeen())
  const [i, setI] = useState(0)
  const [closing, setClosing] = useState(false)
  const [soloOnline, setSoloOnline] = useState(false)
  const [mode, setMode] = useState(getStorageMode)
  const [email, setEmail] = useState(waitlistEmail)
  const [door, setDoor] = useState<'idle' | 'form' | 'done'>(() => (waitlistEmail() ? 'done' : 'idle'))

  // Permite re-abrir o onboarding de fora (menu de ajuda futuro).
  useEffect(() => {
    const replay = () => { setSoloOnline(false); setI(0); setClosing(false); setOpen(true) }
    const online = () => { setSoloOnline(true); setI(ONLINE); setClosing(false); setOpen(true) }
    window.addEventListener('dott:replay-onboarding', replay)
    window.addEventListener('dott:open-online', online)
    return () => {
      window.removeEventListener('dott:replay-onboarding', replay)
      window.removeEventListener('dott:open-online', online)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (door === 'form' && e.key !== 'Escape') return
      if (soloOnline && e.key !== 'Escape') return
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

  function pickLocal() { setStorageMode('local'); setMode('local'); setDoor(waitlistEmail() ? 'done' : 'idle') }

  function pickCloud() { setDoor(d => (d === 'done' ? 'done' : 'form')) }

  async function sendEmail() {
    if (!isValidEmail(email)) return
    await joinWaitlist(email)
    setDoor('done')
  }

  const active = (n: number) => `ob-step${i === n ? ' is-active' : ''}`
  const last = i === TOTAL - 1

  return (
    <div className={`ob-overlay${closing ? ' is-closing' : ''}`}>
      <div className="ob-skip-x" title="Pular introdução" onClick={finish}><Icon name="fechar" size={14} /></div>
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
          <div className={active(5)}>
            <div className="s6">
              <div className="s6-side">
                <div className="s6-box is-here"><span className="s6-dot" /></div>
                <div className="s6-cap">este computador</div>
              </div>
              <div className="s6-link" aria-hidden="true"><i /><i /><i /></div>
              <div className="s6-side">
                <div className="s6-box is-soon"><span className="s6-cloud" /></div>
                <div className="s6-cap">seus outros aparelhos</div>
              </div>
            </div>
          </div>
          <div className={active(4)}>
            <div className="s5">
              <svg viewBox="0 0 230 130">
                <path className="edge e1" d="M55,40 L165,55" />
                <path className="edge e2" d="M165,55 L100,100" />
                <path className="edge e3" d="M55,40 L100,100" />
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
            <p className="ob-text">Seu segundo cérebro. Tire as ideias da cabeça — o Dott <b>guarda e organiza</b>. Você escolhe onde elas ficam.</p>
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
            <h2 className="ob-title">As ideias se ligam sozinhas</h2>
            <p className="ob-text">Você não marca nada. O Dott lê o que você escreveu e liga as notas que falam da mesma coisa, na sua máquina. Com o tempo, tudo vira uma <b>constelação</b> sua.</p>
            <div className="ob-note is-tip"><span className="ob-badge">SEMPRE HONESTO</span><span>Cada ligação diz de onde veio: <b>achada</b> quando estava escrita no texto, <b>inferida</b> quando o Dott deduziu por semelhança.</span></div>
          </div>
          <div className={active(5)}>
            <div className="ob-kicker">Onde suas notas moram</div>
            <h2 className="ob-title">Você escolhe onde guardar</h2>
            <p className="ob-text">Dá pra manter tudo só aqui, ou levar suas notas pra todo aparelho que você usa. Dá pra mudar de ideia depois, em Configurações.</p>

            <div className="ob-choices">
              <button type="button" className={`ob-choice${mode === 'local' && door !== 'form' ? ' is-on' : ''}`} onClick={pickLocal}>
                <span className="ob-ch-head"><strong>Só neste computador</strong><i className="ob-tag">agora</i></span>
                <span className="ob-ch-txt">Suas notas viram arquivos de texto numa pasta sua. Abre sem internet, e continuam lá mesmo sem o Dott.</span>
              </button>
              <button type="button" className={`ob-choice is-soon${door !== 'idle' ? ' is-on' : ''}`} onClick={pickCloud}>
                <span className="ob-ch-head"><strong>Em todos os aparelhos</strong><i className="ob-tag is-soon">em breve</i></span>
                <span className="ob-ch-txt">O mesmo Dott no trabalho, em casa e no celular, sempre com a última versão da nota.</span>
              </button>
            </div>

            {door === 'form' && (
              <div className="ob-door">
                <p className="ob-door-txt">Essa parte ainda não está pronta. Deixa seu e-mail que eu te aviso no dia em que abrir. É o mesmo gesto de sempre: escreve e dá <b>Enter</b>.</p>
                <div className="ob-door-row">
                  <input
                    className="ob-door-input"
                    type="email"
                    autoFocus
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void sendEmail() } }}
                  />
                  <button type="button" className="ob-btn primary hoverGlow" disabled={!isValidEmail(email)} onClick={() => void sendEmail()}>Avise-me</button>
                </div>
                <p className="ob-door-fine">Só pra isso. Sem newsletter, sem cadastro, sem senha.</p>
              </div>
            )}

            {door === 'done' && (
              <div className="ob-note"><span className="ob-badge">NA LISTA</span><span>Anotado: <b>{email}</b>. Quando o Dott Online abrir, você fica sabendo antes.</span></div>
            )}
          </div>
        </div>

        <div className="ob-foot">
          {soloOnline ? <div className="ob-dots" /> : (
            <div className="ob-dots">
              {Array.from({ length: TOTAL }, (_, n) => <i key={n} className={i === n ? 'on' : ''} />)}
            </div>
          )}
          {!soloOnline && i > 0 && <button className="ob-btn ghost" onClick={() => go(i - 1)}>Voltar</button>}
          {!soloOnline && !last && <button className="ob-btn ghost" onClick={finish}>Pular</button>}
          <button className="ob-btn primary hoverGlow" onClick={() => (soloOnline ? finish() : go(i + 1))}>
            {soloOnline ? 'Fechar' : last ? 'Começar a usar o Dott' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
