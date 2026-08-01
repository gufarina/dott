import { useRef } from 'react'
import { useStore } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import s from './FolderNotesView.module.css'

export function FolderNotesView() {
  const folder = useStore(st => st.folder)
  const category = useStore(st => st.category)
  const notes = useStore(st => st.notes)
  const para = useStore(st => st.para)
  const setView = useStore(st => st.setView)
  const createNote = useStore(st => st.createNote)
  const setFolderCover = useStore(st => st.setFolderCover)
  const fileRef = useRef<HTMLInputElement>(null)

  const folderNotes = notes.filter(n => n.folderId === folder)
  const folderObj = category && folder
    ? para[category]?.folders.find(f => f.id === folder)
    : undefined

  const openNote = (id: string) => setView('editor', { note: id })

  const newNote = () => {
    if (!folder) return
    const id = createNote(folder, 'Nova nota')
    showToast('info', 'Nota criada', 'Comece a escrever — usa [[ ]] para conectar.')
    setView('editor', { note: id })
  }

  const pickCover = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !category || !folder) return
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Não foi possível salvar a imagem.'); return }
    setFolderCover(category, folder, url)
    showToast('info', 'Capa definida', `Capa de "${folderObj?.name ?? 'pasta'}" atualizada.`)
  }

  return (
    <div className={s.wrap}>
      <div className={s.banner}>
        {folderObj?.cover
          ? <img src={folderObj.cover} className={s.bannerImg} alt="" />
          : <div className={s.bannerBg} style={{ background: folderObj?.bg }} />
        }
        <div className={s.bannerScrim} />
        <span className={s.bannerName}>{folderObj?.name ?? 'Notas'}</span>
        <button className={s.coverBtn} onClick={pickCover} title="Trocar capa">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="12" height="9" rx="1.5"/>
            <circle cx="4.5" cy="6" r="1"/>
            <path d="M1 10l3-3 2 2 3-3 4 4"/>
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      </div>

      <div className={s.toolbar}>
        <span className={s.count}>{folderNotes.length} nota{folderNotes.length === 1 ? '' : 's'}</span>
        <button className={s.btnNew} onClick={newNote}>+ Nova nota</button>
      </div>

      <div className={s.body}>
        {folderNotes.length === 0 ? (
          <div className={s.empty}>
            <p>Nenhuma nota nesta pasta ainda.</p>
            <button className={s.btnNewBig} onClick={newNote}>Criar primeira nota</button>
          </div>
        ) : (
          <div className={s.grid}>
            {folderNotes.map(n => (
              <div key={n.id} className={s.card} onClick={() => openNote(n.id)}>
                <div className={s.thumb}>
                  {n.links.length > 0 && <span className={s.badge}>{n.links.length} ↗</span>}
                  {n.backlinks.length > 0 && <span className={`${s.badge} ${s.back}`}>← {n.backlinks.length}</span>}
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardTitle}>{n.title}</div>
                  <div className={s.cardDate}>{n.updatedAt || n.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
