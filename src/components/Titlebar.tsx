import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store'
import { flushNoteEditor } from '../features/editor/NoteEditor'
import { Icon } from './Icon'
import { DottMark } from './DottMark'
import s from './Titlebar.module.css'

/** Caminho UNICO de fechamento da janela principal - usado pelo botao desta
 *  barra E pelo onCloseRequested nativo (App.tsx, Alt+F4/barra de tarefas),
 *  pra nao duplicar a logica de flush (CORRIGIR item 3 desta rodada).
 *  `destroy()` (nao `close()`) fecha sem reemitir onCloseRequested - sem
 *  isso o proprio flush+close daria um loop com o listener de App.tsx.
 *  Item 1: aguarda flushNoteEditor() ANTES de fechar - o autosave (ate
 *  800ms) da nota aberta chega ao disco antes da janela sumir. */
export async function closeMainWindow() {
  await flushNoteEditor()
  await getCurrentWindow().destroy().catch(() => {})
}

export function Titlebar({ onSearch, onSettings }: { onSearch?: () => void; onSettings?: () => void }) {
  const theme = useStore(st => st.theme)
  const toggleTheme = useStore(st => st.toggleTheme)
  const view = useStore(st => st.view)
  const setView = useStore(st => st.setView)

  const minimize = () => getCurrentWindow().minimize().catch(() => {})
  const maximize = () => getCurrentWindow().toggleMaximize().catch(() => {})
  const toggleGraph = () => setView(view === 'graph' ? 'board' : 'graph')

  return (
    <div className={s.titlebar}>
      <div className={s.drag} data-tauri-drag-region>
        <DottMark size={15} className={s.mark} />
        <span className={s.logo}>Dott</span>
        <span className={s.version} title={`Dott v${__APP_VERSION__}`}>v{__APP_VERSION__}</span>
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
          <button className={`${s.wbtn} ${s.wclose}`} onClick={closeMainWindow} aria-label="Fechar">
            <Icon name="fechar" size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
