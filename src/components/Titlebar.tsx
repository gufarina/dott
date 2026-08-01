import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store'
import s from './Titlebar.module.css'

export function Titlebar({ onSearch, onSettings }: { onSearch?: () => void; onSettings?: () => void }) {
  const theme = useStore(st => st.theme)
  const toggleTheme = useStore(st => st.toggleTheme)
  const view = useStore(st => st.view)
  const setView = useStore(st => st.setView)

  const close = () => getCurrentWindow().close().catch(() => {})
  const minimize = () => getCurrentWindow().minimize().catch(() => {})
  const maximize = () => getCurrentWindow().toggleMaximize().catch(() => {})
  const toggleGraph = () => setView(view === 'graph' ? 'board' : 'graph')

  return (
    <div className={s.titlebar}>
      <div className={s.drag} data-tauri-drag-region>
        <span className={s.logo}>Dott</span>
      </div>
      <div className={s.right}>
        <button className={s.btn} onClick={onSearch} aria-label="Buscar (Ctrl+K)" title="Buscar (Ctrl+K)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4"/><line x1="9.2" y1="9.2" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
        <button className={`${s.btn} ${view === 'graph' ? s.btnActive : ''}`} onClick={toggleGraph} aria-label="Constelação" title="Constelação (grafo de conexões)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="3" y1="4" x2="10" y2="3.5" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="3.5" x2="7" y2="10.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="3" cy="4" r="2" fill="currentColor"/><circle cx="10.5" cy="3.5" r="2" fill="currentColor"/><circle cx="7" cy="10.5" r="2" fill="currentColor"/></svg>
        </button>
        <button className={s.btn} onClick={onSettings} aria-label="Configurações" title="Configurações">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.3"/><path d="M7 .8v1.8M7 11.4v1.8M1.2 7h1.8M11 7h1.8M2.9 2.9l1.3 1.3M9.8 9.8l1.3 1.3M11.1 2.9 9.8 4.2M4.2 9.8 2.9 11.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
        </button>
        <button className={s.btn} onClick={toggleTheme} aria-label="Trocar tema" title="Tema claro/escuro">
          {theme === 'dark' ? '☾' : '☀'}
        </button>

        {/* Controles reais de janela (Windows), minimalistas */}
        <div className={s.winctl}>
          <button className={s.wbtn} onClick={minimize} aria-label="Minimizar">
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.1"/></svg>
          </button>
          <button className={s.wbtn} onClick={maximize} aria-label="Maximizar">
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.1"/></svg>
          </button>
          <button className={`${s.wbtn} ${s.wclose}`} onClick={close} aria-label="Fechar">
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1.3" y1="1.3" x2="8.7" y2="8.7" stroke="currentColor" strokeWidth="1.1"/><line x1="8.7" y1="1.3" x2="1.3" y2="8.7" stroke="currentColor" strokeWidth="1.1"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
