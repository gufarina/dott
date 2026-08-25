import { useRef, useState } from 'react'
import { useStore } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { Icon } from '../../components/Icon'
import { GlyphPicker } from '../../components/GlyphPicker'
import { NoteGlyph } from '../../components/NoteGlyphs'
import s from './FolderNotesView.module.css'

export function FolderNotesView() {
  const folder = useStore(st => st.folder)
  const category = useStore(st => st.category)
  const notes = useStore(st => st.notes)
  const graph = useStore(st => st.graph)
  const para = useStore(st => st.para)
  const setView = useStore(st => st.setView)
  const createNote = useStore(st => st.createNote)
  const createFolder = useStore(st => st.createFolder)
  const setFolderCover = useStore(st => st.setFolderCover)
  const setNoteCover = useStore(st => st.setNoteCover)
  const fileRef = useRef<HTMLInputElement>(null)
  const noteFileRef = useRef<HTMLInputElement>(null)

  /** Nota que esta recebendo capa/simbolo agora. */
  const [alvoNota, setAlvoNota] = useState<string | null>(null)
  const [seletorSimbolo, setSeletorSimbolo] = useState<string | null>(null)
  const [novaPasta, setNovaPasta] = useState(false)
  const [nomePasta, setNomePasta] = useState('')

  const folderNotes = notes.filter(n => n.folderId === folder)
  const folderObj = category && folder
    ? para[category]?.folders.find(f => f.id === folder)
    : undefined

  const openNote = (id: string) => setView('editor', { note: id })

  const newNote = () => {
    if (!folder) return
    const id = createNote(folder, 'Nova nota')
    showToast('info', 'Nota criada', 'Escreva do seu jeito. O Dott conecta sozinho.')
    setView('editor', { note: id })
  }

  const criarPasta = () => {
    const nome = nomePasta.trim()
    if (!nome || !category) return
    createFolder(category, nome)
    showToast('info', 'Pasta criada', `"${nome}" adicionada em ${para[category]?.label ?? 'PARA'}.`)
    setNomePasta('')
    setNovaPasta(false)
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

  /** Capa da NOTA (vem do hover no card). */
  const onNoteFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const id = alvoNota
    setAlvoNota(null)
    if (!file || !id) return
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Não foi possível salvar a imagem.'); return }
    setNoteCover(id, url)
    showToast('info', 'Capa da nota', 'Imagem aplicada.')
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
        <button className={s.coverBtn} onClick={pickCover} title="Trocar capa da pasta">
          <Icon name="imagem" size={13} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      </div>

      {/* Barra de acoes: UM botao por item, cada um com icone e rotulo. */}
      <div className={s.toolbar}>
        <span className={s.count}>{folderNotes.length} nota{folderNotes.length === 1 ? '' : 's'}</span>
        <button className={s.btnNew} onClick={newNote} title="Criar uma nota nesta pasta">
          <Icon name="nota" size={14} /> Nova nota
        </button>
        <button className={s.btnNewAlt} onClick={() => setNovaPasta(v => !v)} title="Criar outra pasta nesta categoria">
          <Icon name="pasta" size={14} /> Nova pasta
        </button>
      </div>

      {novaPasta && (
        <div className={s.newFolderRow}>
          <Icon name="pasta" size={14} className={s.newFolderIcon} />
          <input
            className={s.newFolderInput}
            placeholder={`Nome da pasta em ${category ? para[category]?.label ?? '' : ''}...`}
            value={nomePasta}
            autoFocus
            onChange={e => setNomePasta(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') criarPasta()
              if (e.key === 'Escape') { setNovaPasta(false); setNomePasta('') }
            }}
          />
          <button className={s.newFolderOk} onClick={criarPasta} title="Criar pasta">
            <Icon name="mais" size={14} />
          </button>
          <button className={s.newFolderCancel} onClick={() => { setNovaPasta(false); setNomePasta('') }} title="Cancelar">
            <Icon name="fechar" size={13} />
          </button>
        </div>
      )}

      <div className={s.body}>
        {folderNotes.length === 0 ? (
          <div className={s.empty}>
            <p>Nenhuma nota nesta pasta ainda.</p>
            <button className={s.btnNewBig} onClick={newNote}>
              <Icon name="nota" size={15} /> Criar primeira nota
            </button>
          </div>
        ) : (
          <div className={s.grid}>
            {folderNotes.map(n => (
              <div key={n.id} className={s.card} onClick={() => openNote(n.id)}>
                <div className={s.thumb}>
                  {n.cover
                    ? <img src={n.cover} className={s.thumbImg} alt="" />
                    : n.glyph
                      ? <span className={s.thumbGlyph}><NoteGlyph id={n.glyph} size={34} /></span>
                      : null}
                  {(graph.byNote[n.id]?.length ?? 0) > 0 && (
                    <span className={s.badge} title="Conexoes que o Dott achou sozinho">
                      {graph.byNote[n.id].length} ligada{graph.byNote[n.id].length > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* So aparece no hover: dar capa ou simbolo a nota. */}
                  <div className={s.hoverBar} onClick={e => e.stopPropagation()}>
                    <button
                      className={s.hoverBtn}
                      title="Usar imagem do computador"
                      onClick={() => { setAlvoNota(n.id); noteFileRef.current?.click() }}
                    >
                      <Icon name="imagem" size={13} />
                    </button>
                    <button
                      className={s.hoverBtn}
                      title="Escolher um símbolo do Dott"
                      onClick={() => setSeletorSimbolo(n.id)}
                    >
                      <Icon name="simbolo" size={13} />
                    </button>
                    {(n.cover || n.glyph) && (
                      <button
                        className={s.hoverBtn}
                        title="Tirar capa/símbolo"
                        onClick={() => {
                          if (n.cover) setNoteCover(n.id, '')
                          if (n.glyph) useStore.getState().setNoteGlyph(n.id, undefined)
                        }}
                      >
                        <Icon name="fechar" size={13} />
                      </button>
                    )}
                  </div>
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

      <input ref={noteFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onNoteFile} />

      {seletorSimbolo && (
        <GlyphPicker
          atual={notes.find(n => n.id === seletorSimbolo)?.glyph}
          onEscolher={g => {
            useStore.getState().setNoteGlyph(seletorSimbolo, g)
            setSeletorSimbolo(null)
          }}
          onFechar={() => setSeletorSimbolo(null)}
        />
      )}
    </div>
  )
}
