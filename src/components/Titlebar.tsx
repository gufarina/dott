import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store'
import { Icon } from './Icon'
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
          <Icon name="busca" size={14} />
        </button>
        <button className={`${s.btn} ${view === 'graph' ? s.btnActive : ''}`} onClick={toggleGraph} aria-label="Constelação" title="Constelação (grafo de conexões)">
          <Icon name="grafo" size={14} />
        </button>
        <button className={s.btn} onClick={onSettings} aria-label="Configurações" title="Configurações">
          <Icon name="ajustes" size={14} />
        </button>
        <button className={s.btn} onClick={toggleTheme} aria-label="Trocar tema" title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
          <Icon name="tema" size={14} />
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
