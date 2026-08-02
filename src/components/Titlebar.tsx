import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store'
import { Icon } from './Icon'
import { DottMark } from './DottMark'
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
        <DottMark size={15} className={s.mark} />
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
            <Icon name="minimizar" size={11} />
          </button>
          <button className={s.wbtn} onClick={maximize} aria-label="Maximizar">
            <Icon name="maximizar" size={11} />
          </button>
          <button className={`${s.wbtn} ${s.wclose}`} onClick={close} aria-label="Fechar">
            <Icon name="fechar" size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
