import { useRef, useState } from 'react'
import { useStore } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { Icon } from '../../components/Icon'
import { Modal, ModalField, ModalInput, ModalFooter, ModalButton } from '../../components/Modal'
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
  const tasks = useStore(st => st.tasks)
  const addTask = useStore(st => st.addTask)
  const addGroup = useStore(st => st.addGroup)
  const toggleTask = useStore(st => st.toggleTask)
  const setFolderCover = useStore(st => st.setFolderCover)
  const setNoteCover = useStore(st => st.setNoteCover)
  const fileRef = useRef<HTMLInputElement>(null)
  const noteFileRef = useRef<HTMLInputElement>(null)

  /** Nota que esta recebendo capa/simbolo agora. */
  const [alvoNota, setAlvoNota] = useState<string | null>(null)
  const [seletorSimbolo, setSeletorSimbolo] = useState<string | null>(null)
  const [novaPasta, setNovaPasta] = useState(false)
  const [nomePasta, setNomePasta] = useState('')
  const [novaTarefa, setNovaTarefa] = useState(false)
  const [textoTarefa, setTextoTarefa] = useState('')

  const folderNotes = notes.filter(n => n.folderId === folder)
  /** Tarefas desta pasta, achatadas dos grupos e com o grupo junto. */
  const folderTasks = tasks.flatMap(g => g.items
    .filter(t => t.folderId === folder)
    .map(t => ({ ...t, grupo: g })))
  const tarefasAbertas = folderTasks.filter(t => !t.done).length
  const tarefasFeitas = folderTasks.length - tarefasAbertas
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

  /** Cria a tarefa JA amarrada nesta pasta. Se nao houver nenhuma lista ainda,
   *  cria uma com o nome da propria pasta - assim a tarefa nunca fica orfa. */
  const criarTarefa = () => {
    const texto = textoTarefa.trim()
    if (!texto || !folder) return
    const nomeLista = folderObj?.name ?? 'Tarefas'
    // A lista espelha a pasta: se ja existe uma com esse nome, usa; senao cria.
    // Cair em tasks[0] jogaria a tarefa de "Habitos" dentro de "Comece aqui".
    const grupoId = tasks.find(g => g.name === nomeLista)?.id ?? addGroup(nomeLista)
    if (!grupoId) return
    addTask(grupoId, texto, folder)
    setTextoTarefa('')
    showToast('info', 'Tarefa criada', `Em "${nomeLista}", na pasta e na lista de tarefas.`)
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

      {/* Barra de acoes: UM botao por item, cada um com icone e rotulo.
          A pasta guarda NOTA e TAREFA - por isso os dois nascem aqui. */}
      <div className={s.toolbar}>
        <span className={s.count}>
          {folderNotes.length} nota{folderNotes.length === 1 ? '' : 's'}
          {folderTasks.length > 0 && (
            <> · {tarefasAbertas} de {folderTasks.length} tarefa{folderTasks.length === 1 ? '' : 's'} aberta{tarefasAbertas === 1 ? '' : 's'}</>
          )}
        </span>
        <button className={s.btnNew} onClick={newNote} title="Criar uma nota nesta pasta">
          <Icon name="nota" size={14} /> Nova nota
        </button>
        <button className={s.btnNewAlt} onClick={() => setNovaTarefa(true)} title="Criar uma tarefa nesta pasta">
          <Icon name="tarefa" size={14} /> Nova tarefa
        </button>
        <button className={s.btnNewAlt} onClick={() => setNovaPasta(true)} title="Criar outra pasta nesta categoria">
          <Icon name="pasta" size={14} /> Nova pasta
        </button>
      </div>

      {novaTarefa && (
        <Modal title="Nova tarefa" onClose={() => { setNovaTarefa(false); setTextoTarefa('') }}>
          <ModalField label={`Em ${folderObj?.name ?? 'nesta pasta'}`}>
            <ModalInput
              placeholder="O que precisa ser feito?"
              value={textoTarefa}
              autoFocus
              onChange={e => setTextoTarefa(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarTarefa() }}
            />
          </ModalField>
          <ModalFooter>
            <ModalButton variant="ghost" onClick={() => { setNovaTarefa(false); setTextoTarefa('') }}>Cancelar</ModalButton>
            <ModalButton variant="primary" onClick={criarTarefa}>
              <Icon name="tarefa" size={13} /> Criar tarefa
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}

      {novaPasta && (
        <Modal title="Nova pasta" onClose={() => { setNovaPasta(false); setNomePasta('') }}>
          <ModalField label={`Em ${category ? para[category]?.label ?? '' : ''}`}>
            <ModalInput
              placeholder="Nome da pasta"
              value={nomePasta}
              autoFocus
              onChange={e => setNomePasta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarPasta() }}
            />
          </ModalField>
          <ModalFooter>
            <ModalButton variant="ghost" onClick={() => { setNovaPasta(false); setNomePasta('') }}>Cancelar</ModalButton>
            <ModalButton variant="primary" onClick={criarPasta}>
              <Icon name="pasta" size={13} /> Criar pasta
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}

      <div className={s.body}>
        {/* As tarefas da pasta vem ANTES das notas: sao o que tem prazo. */}
        {folderTasks.length > 0 && (
          <section className={s.secaoTarefas}>
            <div className={s.secaoTitulo}>
              <Icon name="tarefa" size={13} />
              Tarefas desta pasta
              <span className={s.secaoContagem}>{tarefasFeitas}/{folderTasks.length}</span>
            </div>
            <div className={s.listaTarefas}>
              {folderTasks.map(t => (
                <div key={t.id} className={s.linhaTarefa}>
                  <button
                    className={`${s.tarefaCheck} ${t.done ? s.tarefaFeita : ''}`}
                    onClick={() => toggleTask(t.id)}
                    title={t.done ? 'Reabrir' : 'Concluir'}
                    aria-label={t.done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                  />
                  <button
                    className={s.tarefaCorpo}
                    onClick={() => setView('task', { task: t.id })}
                    title="Abrir a tarefa"
                  >
                    <span className={`${s.tarefaTexto} ${t.done ? s.tarefaTextoFeito : ''}`}>{t.text}</span>
                    <span className={s.tarefaMeta}>
                      <span className={s.tarefaGrupo}>
                        <span className={s.tarefaPonto} style={{ background: t.grupo.color }} />
                        {t.grupo.name}
                      </span>
                      {t.deadline && (
                        <span className={`${s.tarefaPrazo} ${t.over ? s.prazoAtrasado : t.urgent ? s.prazoHoje : ''}`}>
                          {t.over ? 'atrasado' : t.urgent ? 'hoje' : t.deadline.slice(5).replace('-', '/')}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {folderNotes.length === 0 ? (
          <div className={s.empty}>
            <p>{folderTasks.length > 0 ? 'Nenhuma nota nesta pasta ainda.' : 'Esta pasta está vazia.'}</p>
            <div className={s.emptyAcoes}>
              <button className={s.btnNewBig} onClick={newNote}>
                <Icon name="nota" size={15} /> Criar primeira nota
              </button>
              {folderTasks.length === 0 && (
                <button className={s.btnNewBigAlt} onClick={() => setNovaTarefa(true)}>
                  <Icon name="tarefa" size={15} /> Criar primeira tarefa
                </button>
              )}
            </div>
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
