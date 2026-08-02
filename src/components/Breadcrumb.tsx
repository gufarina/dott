import { useStore } from '../store'
import { Icon } from './Icon'
import s from './Breadcrumb.module.css'

export function Breadcrumb() {
  const view = useStore(st => st.view)
  const category = useStore(st => st.category)
  const folder = useStore(st => st.folder)
  const para = useStore(st => st.para)
  const navigateBack = useStore(st => st.navigateBack)
  const setView = useStore(st => st.setView)

  if (view === 'board') return null

  const quad = category ? para[category] : null
  const folderObj = folder && quad ? quad.folders.find(f => f.id === folder) : null

  return (
    <div className={s.breadcrumb}>
      <button className={s.back} onClick={navigateBack} title="Voltar" aria-label="Voltar">
        <Icon name="voltar" size={14} />
      </button>
      <span className={s.item} onClick={() => setView('board', {})}>PARA</span>
      {quad && (
        <>
          <span className={s.sep}>›</span>
          <span
            className={`${s.item} ${!folder ? s.active : ''}`}
            onClick={() => setView('board', {})}
          >
            {quad.label}
          </span>
        </>
      )}
      {folderObj && (
        <>
          <span className={s.sep}>›</span>
          <span className={`${s.item} ${s.active}`}>{folderObj.name}</span>
        </>
      )}
    </div>
  )
}
